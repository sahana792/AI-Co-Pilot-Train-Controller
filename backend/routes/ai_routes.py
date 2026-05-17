"""AI routes: YOLO detection, delay prediction, risk, chatbot"""
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db, TrainRecord, AlertRecord
from models.schemas import (
    DelayPredictionRequest, RiskDetectionRequest, RecommendationRequest,
    ChatRequest, YOLOResponse
)
from yolo.yolo_service import yolo_service
from ml.ml_service import ml_service
from services.recommendation_service import get_recommendations
from services.chatbot_service import generate_response
from datetime import datetime
import random

router = APIRouter()

# ─── Risk factors per object ──────────────────────────────────────────────────
OBJECT_RISK = {
    "person_on_track": "Critical", "Person on Track": "Critical",
    "obstacle_on_track": "High", "Obstacle on Track": "High",
    "track_damage": "Critical", "Track Damage/Crack": "Critical",
    "animal_on_track": "High", "Animal on Track": "High",
    "level_crossing_vehicle": "High", "Level Crossing Vehicle": "High",
    "platform_crowd": "Medium", "Platform Crowd": "Medium",
    "red_signal_violation": "Critical",
}
RISK_NUM = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}


@router.post("/detect/yolo")
async def detect_yolo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    result = yolo_service.detect(contents)
    # Auto-create alerts for critical/high detections
    for alert_msg in result.get("alerts", []):
        alert = AlertRecord(
            train_id="CCTV-CAM",
            alert_type="yolo_detection",
            severity=result["overall_risk"],
            message=alert_msg,
            timestamp=datetime.utcnow(),
        )
        db.add(alert)
    db.commit()
    return result


@router.post("/predict-delay")
async def predict_delay(req: DelayPredictionRequest):
    result = ml_service.predict_delay(
        speed=req.speed, distance=req.distance, weather=req.weather,
        signal_status=req.signal_status, congestion=req.congestion,
        previous_delay=req.previous_delay, detected_risk_count=req.detected_risk_count,
    )
    return result


@router.post("/detect-risk")
async def detect_risk(req: RiskDetectionRequest, db: Session = Depends(get_db)):
    risk_factors = []
    risk_score = 0.0

    # Object-based risks
    for obj in req.detected_objects:
        risk = OBJECT_RISK.get(obj)
        if risk:
            risk_factors.append(f"{obj} → {risk}")
            risk_score += RISK_NUM.get(risk, 0)

    # Signal-based
    if req.signal_status == "Red" and req.speed > 10:
        risk_factors.append("Red signal violation")
        risk_score += 3
    elif req.signal_status == "Yellow":
        risk_factors.append("Yellow signal – caution")
        risk_score += 1

    # Speed
    if req.speed > 130:
        risk_factors.append("Overspeeding (>130 km/h)")
        risk_score += 2

    # Congestion
    congestion_bonus = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
    risk_score += congestion_bonus.get(req.congestion_level, 0)

    if risk_score >= 5:
        level = "Critical"
    elif risk_score >= 3:
        level = "High"
    elif risk_score >= 1:
        level = "Medium"
    else:
        level = "Low"

    if not risk_factors:
        risk_factors.append("No risk factors detected")

    # Update train record
    train = db.query(TrainRecord).filter(TrainRecord.train_id == req.train_id).first()
    if train:
        train.risk_level = level
        db.commit()

    return {"risk_level": level, "risk_score": round(min(risk_score, 10), 1), "risk_factors": risk_factors}


@router.post("/recommend-action")
async def recommend_action(req: RecommendationRequest):
    result = get_recommendations(
        train_id=req.train_id, risk_level=req.risk_level,
        detected_objects=req.detected_objects, delay_minutes=req.delay_minutes,
        speed=req.speed, signal_status=req.signal_status,
        congestion_level=req.congestion_level,
    )
    return result


@router.get("/alerts")
async def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(AlertRecord).order_by(AlertRecord.timestamp.desc()).limit(50).all()
    return [
        {
            "id": a.id, "train_id": a.train_id, "alert_type": a.alert_type,
            "severity": a.severity, "message": a.message,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            "resolved": a.resolved,
        }
        for a in alerts
    ]


@router.post("/chatbot")
async def chatbot(req: ChatRequest, db: Session = Depends(get_db)):
    trains = db.query(TrainRecord).filter(TrainRecord.is_active == True).all()
    alerts = db.query(AlertRecord).filter(AlertRecord.resolved == False).all()
    train_dicts = [
        {
            "train_id": t.train_id, "route": t.route, "current_station": t.current_station,
            "next_station": t.next_station, "speed": t.speed, "signal_status": t.signal_status,
            "weather": t.weather, "congestion_level": t.congestion_level,
            "delay_minutes": t.delay_minutes, "detected_objects": t.detected_objects or [],
            "risk_level": t.risk_level, "recommendation": t.recommendation,
        }
        for t in trains
    ]
    alert_dicts = [
        {"id": a.id, "train_id": a.train_id, "severity": a.severity, "message": a.message, "resolved": a.resolved}
        for a in alerts
    ]
    return generate_response(req.message, train_dicts, alert_dicts)
