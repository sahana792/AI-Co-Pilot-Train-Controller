"""Control Room API – Karnataka-only track map, signals, announcements, crew, shift log"""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database.db import get_db, TrainRecord, PlatformRecord, SignalRecord, AlertRecord
from datetime import datetime
from typing import List
import asyncio, json, random

router = APIRouter()

_announcements: List[dict] = []
_shift_log: List[dict] = []
_ws_clients: List[WebSocket] = []

CREW = [
    {"id": "C001", "name": "Rajesh Kumar",  "role": "Senior Controller", "shift": "Morning", "status": "on-duty"},
    {"id": "C002", "name": "Priya Sharma",  "role": "Signal Operator",   "shift": "Morning", "status": "on-duty"},
    {"id": "C003", "name": "Arun Mehta",    "role": "Platform Manager",  "shift": "Morning", "status": "on-duty"},
    {"id": "C004", "name": "Sunita Patel",  "role": "Controller",        "shift": "Evening", "status": "off-duty"},
    {"id": "C005", "name": "Vikram Singh",  "role": "Emergency Officer", "shift": "Morning", "status": "on-duty"},
]

WEATHER_ZONES = {
    "Bengaluru":  {"weather": "Cloudy", "visibility": "8 km",  "wind": "15 km/h", "temp": "24°C"},
    "Mysuru":     {"weather": "Clear",  "visibility": "15 km", "wind": "10 km/h", "temp": "26°C"},
    "Mangaluru":  {"weather": "Rain",   "visibility": "4 km",  "wind": "40 km/h", "temp": "29°C"},
    "Hubballi":   {"weather": "Clear",  "visibility": "12 km", "wind": "20 km/h", "temp": "31°C"},
    "Belagavi":   {"weather": "Cloudy", "visibility": "9 km",  "wind": "18 km/h", "temp": "27°C"},
}

MAINTENANCE = [
    {"id": "M001", "section": "Track-4 SBC", "type": "Rail Inspection",     "status": "in-progress", "eta": "14:30", "crew": "Team Alpha"},
    {"id": "M002", "section": "SIG-002 YPR", "type": "Signal Calibration",  "status": "scheduled",   "eta": "16:00", "crew": "Team Beta"},
    {"id": "M003", "section": "PF-6 SBC",    "type": "Platform Resurfacing","status": "in-progress", "eta": "Tomorrow", "crew": "Team Gamma"},
]

# Karnataka-specific geo positions for trains
_TRAIN_GEO = {
    "TRN-001": {"lat": 12.907, "lng": 77.483, "heading": 225},  # Kengeri
    "TRN-002": {"lat": 14.465, "lng": 75.919, "heading": 315},  # Davangere
    "TRN-003": {"lat": 13.003, "lng": 76.097, "heading": 270},  # Hassan
    "TRN-004": {"lat": 15.362, "lng": 75.124, "heading": 90},   # Hubballi
    "TRN-005": {"lat": 15.139, "lng": 76.928, "heading": 45},   # Ballari
    "TRN-006": {"lat": 17.329, "lng": 76.820, "heading": 315},  # Kalaburagi
}

# Karnataka Railway Network (SVG coordinate system 700x520)
TRACK_NETWORK = {
    "nodes": [
        {"id": "N1",  "label": "Bengaluru City",    "code": "SBC",  "x": 350, "y": 350, "type": "major"},
        {"id": "N2",  "label": "Yeshwanthpur",      "code": "YPR",  "x": 310, "y": 320, "type": "junction"},
        {"id": "N3",  "label": "KR Puram",           "code": "KRP",  "x": 420, "y": 330, "type": "normal"},
        {"id": "N4",  "label": "Kengeri",            "code": "KGI",  "x": 280, "y": 370, "type": "normal"},
        {"id": "N5",  "label": "Mysuru",             "code": "MYS",  "x": 200, "y": 430, "type": "major"},
        {"id": "N6",  "label": "Hassan",             "code": "HAS",  "x": 170, "y": 340, "type": "normal"},
        {"id": "N7",  "label": "Mangaluru",          "code": "MAQ",  "x": 80,  "y": 270, "type": "major"},
        {"id": "N8",  "label": "Shivamogga",         "code": "SMET", "x": 230, "y": 270, "type": "junction"},
        {"id": "N9",  "label": "Davangere",          "code": "DVG",  "x": 300, "y": 200, "type": "normal"},
        {"id": "N10", "label": "Hubballi",           "code": "UBL",  "x": 250, "y": 130, "type": "major"},
        {"id": "N11", "label": "Dharwad",            "code": "DWR",  "x": 200, "y": 110, "type": "normal"},
        {"id": "N12", "label": "Belagavi",           "code": "BGM",  "x": 160, "y": 70,  "type": "major"},
        {"id": "N13", "label": "Ballari",            "code": "BAY",  "x": 430, "y": 190, "type": "junction"},
        {"id": "N14", "label": "Raichur",            "code": "RC",   "x": 470, "y": 110, "type": "junction"},
        {"id": "N15", "label": "Kalaburagi",         "code": "GR",   "x": 560, "y": 80,  "type": "major"},
    ],
    "edges": [
        {"from": "N1",  "to": "N2",  "track": "Track-1", "signal": "SIG-001"},
        {"from": "N1",  "to": "N3",  "track": "Track-2", "signal": "SIG-002"},
        {"from": "N1",  "to": "N4",  "track": "Track-3", "signal": "SIG-003"},
        {"from": "N4",  "to": "N5",  "track": "Track-3", "signal": "SIG-003"},
        {"from": "N5",  "to": "N6",  "track": "Track-4", "signal": "SIG-004"},
        {"from": "N6",  "to": "N7",  "track": "Track-4", "signal": "SIG-004"},
        {"from": "N6",  "to": "N8",  "track": "Track-5", "signal": "SIG-005"},
        {"from": "N8",  "to": "N9",  "track": "Track-5", "signal": "SIG-005"},
        {"from": "N9",  "to": "N10", "track": "Track-5", "signal": "SIG-005"},
        {"from": "N10", "to": "N11", "track": "Track-6", "signal": "SIG-006"},
        {"from": "N11", "to": "N12", "track": "Track-6", "signal": "SIG-006"},
        {"from": "N2",  "to": "N9",  "track": "Track-7", "signal": "SIG-001"},
        {"from": "N9",  "to": "N13", "track": "Track-7", "signal": "SIG-005"},
        {"from": "N13", "to": "N14", "track": "Track-8", "signal": "SIG-006"},
        {"from": "N14", "to": "N15", "track": "Track-8", "signal": "SIG-006"},
    ],
    "platforms": [
        {"id": "PF-1", "node": "N1", "x": 340, "y": 338},
        {"id": "PF-2", "node": "N1", "x": 360, "y": 338},
        {"id": "PF-3", "node": "N1", "x": 340, "y": 362},
        {"id": "PF-4", "node": "N1", "x": 360, "y": 362},
        {"id": "PF-5", "node": "N1", "x": 375, "y": 350},
        {"id": "PF-6", "node": "N1", "x": 325, "y": 350},
    ],
    "signals_pos": [
        {"id": "SIG-001", "x": 330, "y": 305},
        {"id": "SIG-002", "x": 385, "y": 340},
        {"id": "SIG-003", "x": 315, "y": 360},
        {"id": "SIG-004", "x": 185, "y": 385},
        {"id": "SIG-005", "x": 265, "y": 235},
        {"id": "SIG-006", "x": 225, "y": 120},
    ],
}


async def broadcast(data: dict):
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_text(json.dumps(data))
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


@router.websocket("/ws/controlroom")
async def ws_controlroom(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    _ws_clients.append(websocket)
    try:
        while True:
            trains = db.query(TrainRecord).filter(TrainRecord.is_active == True).all()
            signals = db.query(SignalRecord).all()
            platforms = db.query(PlatformRecord).all()
            alerts = db.query(AlertRecord).filter(AlertRecord.resolved == False).all()
            payload = {
                "type": "live_update",
                "timestamp": datetime.utcnow().isoformat(),
                "trains": [{
                    "train_id": t.train_id,
                    "speed": round(t.speed + random.uniform(-2, 2), 1),
                    "risk_level": t.risk_level,
                    "signal_status": t.signal_status,
                    "delay_minutes": t.delay_minutes,
                    "platform": t.platform,
                } for t in trains],
                "signals": [{"signal_id": s.signal_id, "status": s.status} for s in signals],
                "platforms": [{"platform_id": p.platform_id, "status": p.status, "assigned_train": p.assigned_train} for p in platforms],
                "alert_count": len(alerts),
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)


@router.get("/control-room/track-map")
async def get_track_map(db: Session = Depends(get_db)):
    signals = db.query(SignalRecord).all()
    platforms = db.query(PlatformRecord).all()
    trains = db.query(TrainRecord).filter(TrainRecord.is_active == True).all()
    sig_map = {s.signal_id: s.status for s in signals}
    pf_map = {p.platform_id: {"status": p.status, "train": p.assigned_train} for p in platforms}
    train_positions = []
    for t in trains:
        geo = dict(_TRAIN_GEO.get(t.train_id, {"lat": 13.0, "lng": 76.5, "heading": 0}))
        geo["lat"] += random.uniform(-0.003, 0.003)
        geo["lng"] += random.uniform(-0.003, 0.003)
        train_positions.append({
            "train_id": t.train_id,
            "train_name": getattr(t, "train_name", t.train_id),
            "risk_level": t.risk_level,
            "speed": t.speed,
            "platform": t.platform,
            "delay_minutes": t.delay_minutes,
            "signal_status": t.signal_status,
            **geo,
        })
    return {
        "network": TRACK_NETWORK,
        "signal_states": sig_map,
        "platform_states": pf_map,
        "train_positions": train_positions,
        "stations": [n["label"] for n in TRACK_NETWORK["nodes"]],
    }


@router.get("/control-room/overview")
async def get_overview(db: Session = Depends(get_db)):
    trains = db.query(TrainRecord).filter(TrainRecord.is_active == True).all()
    alerts = db.query(AlertRecord).filter(AlertRecord.resolved == False).all()
    platforms = db.query(PlatformRecord).all()
    signals = db.query(SignalRecord).all()
    delayed = [t for t in trains if t.delay_minutes > 0]
    critical = [t for t in trains if t.risk_level == "Critical"]
    on_time = round(((len(trains) - len(delayed)) / max(len(trains), 1)) * 100, 1)
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "network_health": "degraded" if len(critical) > 1 else "normal",
        "stats": {
            "active_trains": len(trains),
            "delayed_trains": len(delayed),
            "critical_trains": len(critical),
            "on_time_pct": on_time,
            "active_alerts": len(alerts),
            "red_signals": sum(1 for s in signals if s.status == "Red"),
            "crew_on_duty": sum(1 for c in CREW if c["status"] == "on-duty"),
            "platforms_free": sum(1 for p in platforms if p.status == "available"),
        },
        "weather": WEATHER_ZONES,
        "crew": CREW,
        "maintenance": MAINTENANCE,
    }


@router.get("/control-room/live-trains")
async def get_live_trains(db: Session = Depends(get_db)):
    """Enhanced live train status with full details"""
    trains = db.query(TrainRecord).filter(TrainRecord.is_active == True).all()
    result = []
    for t in trains:
        result.append({
            "train_id": t.train_id,
            "train_name": getattr(t, "train_name", t.train_id),
            "train_number": getattr(t, "train_number", ""),
            "source": getattr(t, "source", t.route.split("→")[0].strip() if "→" in t.route else ""),
            "destination": getattr(t, "destination", t.route.split("→")[-1].strip() if "→" in t.route else ""),
            "current_station": t.current_station,
            "next_station": t.next_station,
            "platform": t.platform,
            "arrival_time": getattr(t, "arrival_time", "N/A"),
            "departure_time": getattr(t, "departure_time", "N/A"),
            "speed": t.speed,
            "signal_status": t.signal_status,
            "delay_minutes": t.delay_minutes,
            "risk_level": t.risk_level,
            "run_status": getattr(t, "run_status", "running"),
            "weather": t.weather,
            "congestion_level": t.congestion_level,
            "route": t.route,
        })
    return {"trains": result, "timestamp": datetime.utcnow().isoformat()}


@router.get("/control-room/announcements")
async def get_announcements():
    return {"announcements": list(reversed(_announcements[-30:]))}


@router.post("/control-room/announcements")
async def post_announcement(body: dict):
    ann = {
        "id": len(_announcements) + 1,
        "message": body.get("message", ""),
        "platforms": body.get("platforms", []),
        "priority": body.get("priority", "Normal"),
        "controller": body.get("controller_id", "C001"),
        "timestamp": datetime.utcnow().isoformat(),
    }
    _announcements.append(ann)
    _shift_log.append({
        "time": datetime.utcnow().isoformat(),
        "category": "Platform",
        "event": f"[{ann['priority']}] Announcement: {ann['message'][:80]}",
        "controller": ann["controller"],
    })
    return {"success": True, "announcement": ann}


@router.get("/control-room/shift-log")
async def get_shift_log():
    return {"log": list(reversed(_shift_log[-100:]))}


@router.post("/control-room/shift-log")
async def add_shift_log(body: dict):
    entry = {
        "time": datetime.utcnow().isoformat(),
        "category": body.get("category", "General"),
        "event": body.get("event", ""),
        "controller": body.get("controller_id", "C001"),
        "train_id": body.get("train_id"),
    }
    _shift_log.append(entry)
    return {"success": True, "entry": entry}


@router.get("/control-room/weather")
async def get_weather():
    return {"zones": WEATHER_ZONES, "timestamp": datetime.utcnow().isoformat()}


@router.get("/control-room/crew")
async def get_crew():
    return {"crew": CREW}


@router.get("/control-room/maintenance")
async def get_maintenance():
    return {"tasks": MAINTENANCE}
