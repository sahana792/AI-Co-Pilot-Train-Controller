"""Railway Station Traffic Control routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db, PlatformRecord, SignalRecord, TrainRecord, AlertRecord
from models.schemas import (
    PlatformAllocateRequest, SignalControlRequest,
    RouteConflictRequest, EmergencyOverrideRequest
)
from services.recommendation_service import allocate_platform, check_route_conflict, control_signal
from datetime import datetime

router = APIRouter()


@router.post("/platform/allocate")
async def platform_allocate(req: PlatformAllocateRequest, db: Session = Depends(get_db)):
    platforms = db.query(PlatformRecord).all()
    platform_dicts = [{"platform_id": p.platform_id, "status": p.status, "crowd_level": p.crowd_level} for p in platforms]
    result = allocate_platform(req.train_id, req.priority, platform_dicts)
    if result["success"]:
        platform = db.query(PlatformRecord).filter(PlatformRecord.platform_id == result["platform"]).first()
        if platform:
            platform.status = "occupied"
            platform.assigned_train = req.train_id
            platform.arrival_time = datetime.utcnow()
            db.commit()
        train = db.query(TrainRecord).filter(TrainRecord.train_id == req.train_id).first()
        if train:
            train.platform = result["platform"]
            db.commit()
    return result


@router.get("/platform/status")
async def platform_status(db: Session = Depends(get_db)):
    platforms = db.query(PlatformRecord).all()
    return [
        {
            "platform_id": p.platform_id, "station": p.station,
            "assigned_train": p.assigned_train, "status": p.status,
            "crowd_level": p.crowd_level,
        }
        for p in platforms
    ]


@router.post("/signal/control")
async def signal_control(req: SignalControlRequest, db: Session = Depends(get_db)):
    # Gather detected objects for safety check
    detected = []
    trains = db.query(TrainRecord).all()
    for t in trains:
        detected.extend(t.detected_objects or [])
    result = control_signal(req.signal_id, req.new_status, req.reason, detected)
    # Update DB
    signal = db.query(SignalRecord).filter(SignalRecord.signal_id == req.signal_id).first()
    if signal:
        signal.status = result["new_status"]
        signal.last_updated = datetime.utcnow()
        db.commit()
    return result


@router.get("/signal/status")
async def signal_status(db: Session = Depends(get_db)):
    signals = db.query(SignalRecord).all()
    return [
        {
            "signal_id": s.signal_id, "location": s.location,
            "status": s.status, "controlled_track": s.controlled_track,
            "last_updated": s.last_updated.isoformat() if s.last_updated else None,
        }
        for s in signals
    ]


@router.post("/route/conflict-check")
async def route_conflict_check(req: RouteConflictRequest, db: Session = Depends(get_db)):
    t1 = db.query(TrainRecord).filter(TrainRecord.train_id == req.train_id_1).first()
    t2 = db.query(TrainRecord).filter(TrainRecord.train_id == req.train_id_2).first()
    if not t1 or not t2:
        raise HTTPException(status_code=404, detail="One or both trains not found")
    t1d = {"train_id": t1.train_id, "current_station": t1.current_station, "next_station": t1.next_station, "route": t1.route}
    t2d = {"train_id": t2.train_id, "current_station": t2.current_station, "next_station": t2.next_station, "route": t2.route}
    result = check_route_conflict(t1d, t2d, req.track)
    if result["conflict"]:
        alert = AlertRecord(
            train_id=f"{req.train_id_1}/{req.train_id_2}",
            alert_type="route_conflict",
            severity="High",
            message=f"Route conflict on {req.track}: {'; '.join(result['warnings'])}",
            timestamp=datetime.utcnow(),
        )
        db.add(alert)
        db.commit()
    return result


@router.get("/station/congestion")
async def station_congestion(db: Session = Depends(get_db)):
    platforms = db.query(PlatformRecord).all()
    trains = db.query(TrainRecord).filter(TrainRecord.is_active == True).all()
    occupied = sum(1 for p in platforms if p.status == "occupied")
    total = len(platforms)
    high_crowd = sum(1 for p in platforms if p.crowd_level == "High")
    overall = "Low"
    if high_crowd >= 2 or occupied / max(total, 1) > 0.8:
        overall = "High"
    elif occupied / max(total, 1) > 0.5:
        overall = "Medium"
    return {
        "total_platforms": total,
        "occupied": occupied,
        "available": sum(1 for p in platforms if p.status == "available"),
        "maintenance": sum(1 for p in platforms if p.status == "maintenance"),
        "high_crowd_platforms": high_crowd,
        "active_trains": len(trains),
        "overall_congestion": overall,
        "platform_details": [
            {"platform_id": p.platform_id, "status": p.status, "crowd_level": p.crowd_level, "assigned_train": p.assigned_train}
            for p in platforms
        ],
    }


@router.post("/emergency/override")
async def emergency_override(req: EmergencyOverrideRequest, db: Session = Depends(get_db)):
    train = db.query(TrainRecord).filter(TrainRecord.train_id == req.train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")

    messages = []
    if req.action == "emergency_stop":
        train.speed = 0
        train.signal_status = "Red"
        train.risk_level = "Critical"
        train.recommendation = f"EMERGENCY STOP activated. Reason: {req.reason}"
        messages.append("Train halted. All signals set to Red.")
    elif req.action == "clear_track":
        train.detected_objects = []
        train.risk_level = "Low"
        train.recommendation = "Track cleared. Resume normal operation."
        messages.append("Track cleared. Signals updating.")
    elif req.action == "reroute":
        train.recommendation = f"Rerouting initiated. Reason: {req.reason}"
        messages.append("Reroute command sent to driver.")
    elif req.action == "reduce_speed":
        train.speed = min(train.speed, 40)
        train.recommendation = f"Speed reduced. Reason: {req.reason}"
        messages.append("Speed reduced to 40 km/h.")

    # Log alert
    alert = AlertRecord(
        train_id=req.train_id,
        alert_type="emergency_override",
        severity="Critical" if req.override_level == "Emergency" else "High",
        message=f"Emergency override [{req.action}] by controller. Reason: {req.reason}",
        timestamp=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()

    return {
        "success": True,
        "train_id": req.train_id,
        "action_taken": req.action,
        "messages": messages,
        "override_level": req.override_level,
        "timestamp": datetime.utcnow().isoformat(),
    }
