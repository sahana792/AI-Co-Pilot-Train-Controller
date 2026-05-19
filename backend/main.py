"""
RailControl AI v7 — FastAPI Backend
Karnataka Smart Railway System
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio, base64, json, random, time, io, logging
from datetime import datetime
from typing import Optional, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("railcontrol")

from fastapi.responses import HTMLResponse

app = FastAPI(title="RailControl AI v7", version="7.0.0")

@app.get("/", response_class=HTMLResponse)
async def home():
    return """
    <html>
        <head>
            <title>RailControl AI</title>
        </head>
        <body style="font-family: Arial; text-align:center; padding-top:50px;">
            <h1>🚆 RailControl AI v7</h1>
            <h2>Karnataka Smart Railway System</h2>
            <p>Backend API is running successfully.</p>
            <p>AI-powered train monitoring and detection system.</p>
            <a href="/docs">Open API Documentation</a>
        </body>
    </html>
    """

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ── Optional heavy deps ───────────────────────────────────────────────────────
try:
    import cv2, numpy as np
    CV2_OK = True
    logger.info("OpenCV loaded ✓")
except ImportError:
    CV2_OK = False
    logger.warning("OpenCV not available – simulation mode")

try:
    from ultralytics import YOLO
    _yolo_model = YOLO("yolov8n.pt")
    YOLO_OK = True
    logger.info("YOLOv8 loaded ✓")
except Exception as e:
    YOLO_OK = False
    logger.warning(f"YOLOv8 not available ({e}) – simulation mode")

# ── In-memory data ────────────────────────────────────────────────────────────
TRAINS = [
    {"train_id":"TRN-001","train_name":"Island Express","train_number":"16527",
     "route":"SBC-MYS","source":"Bengaluru","destination":"Mysuru",
     "current_station":"Kengeri","next_station":"Mysuru","platform":"PF-1",
     "arrival_time":"14:30","departure_time":"14:45","speed":95,
     "signal_status":"Green","weather":"clear","congestion_level":"Low",
     "delay_minutes":0,"detected_objects":[],"risk_level":"Low",
     "run_status":"running","recommendation":"Normal operation. Proceed as scheduled.","is_active":True},
    {"train_id":"TRN-002","train_name":"Shatabdi Express","train_number":"12028",
     "route":"SBC-UBL","source":"Bengaluru","destination":"Hubballi",
     "current_station":"Yeshwanthpur","next_station":"Tumakuru","platform":"PF-2",
     "arrival_time":"15:00","departure_time":"15:15","speed":120,
     "signal_status":"Green","weather":"clear","congestion_level":"Medium",
     "delay_minutes":12,"detected_objects":["Crowd"],"risk_level":"Critical",
     "run_status":"delayed","recommendation":"CRITICAL: Reduce speed. Crowd detected at next platform.","is_active":True},
    {"train_id":"TRN-003","train_name":"Rajya Rani Express","train_number":"16589",
     "route":"SBC-MAQ","source":"Bengaluru","destination":"Mangaluru",
     "current_station":"Hassan","next_station":"Sakleshpur","platform":"PF-3",
     "arrival_time":"13:45","departure_time":"14:00","speed":85,
     "signal_status":"Yellow","weather":"fog","congestion_level":"Low",
     "delay_minutes":8,"detected_objects":["Obstacle"],"risk_level":"Medium",
     "run_status":"delayed","recommendation":"Yellow signal – reduce speed. Fog ahead.","is_active":True},
    {"train_id":"TRN-004","train_name":"Rani Chennamma","train_number":"11301",
     "route":"SBC-BGM","source":"Bengaluru","destination":"Belagavi",
     "current_station":"Davangere","next_station":"Hubballi","platform":"PF-4",
     "arrival_time":"16:20","departure_time":"16:35","speed":110,
     "signal_status":"Green","weather":"clear","congestion_level":"Low",
     "delay_minutes":0,"detected_objects":[],"risk_level":"Low",
     "run_status":"running","recommendation":"Smooth operation. On schedule.","is_active":True},
    {"train_id":"TRN-005","train_name":"Hampi Express","train_number":"16591",
     "route":"SBC-UBL","source":"Bengaluru","destination":"Hubballi",
     "current_station":"Ballari","next_station":"Hospet","platform":"PF-1",
     "arrival_time":"17:00","departure_time":"17:20","speed":100,
     "signal_status":"Green","weather":"clear","congestion_level":"Low",
     "delay_minutes":0,"detected_objects":[],"risk_level":"Low",
     "run_status":"running","recommendation":"Normal operation.","is_active":True},
    {"train_id":"TRN-006","train_name":"Kalaburagi Express","train_number":"17310",
     "route":"SBC-GR","source":"Bengaluru","destination":"Kalaburagi",
     "current_station":"Raichur","next_station":"Kalaburagi","platform":"PF-2",
     "arrival_time":"18:30","departure_time":"18:50","speed":88,
     "signal_status":"Red","weather":"clear","congestion_level":"High",
     "delay_minutes":25,"detected_objects":["Signal Issue","Person"],"risk_level":"High",
     "run_status":"delayed","recommendation":"RED signal – STOP. Signal fault detected.","is_active":True},
]

PLATFORMS = [
    {"platform_id":"PF-SBC-1","station":"Bengaluru City","platform_number":"1","status":"occupied","train_id":"TRN-001","capacity":800,"current_occupancy":72,"scheduled_arrival":"14:25","scheduled_departure":"14:45"},
    {"platform_id":"PF-SBC-2","station":"Bengaluru City","platform_number":"2","status":"occupied","train_id":"TRN-002","capacity":900,"current_occupancy":88,"scheduled_arrival":"14:55","scheduled_departure":"15:15"},
    {"platform_id":"PF-SBC-3","station":"Bengaluru City","platform_number":"3","status":"available","train_id":None,"capacity":700,"current_occupancy":12},
    {"platform_id":"PF-SBC-4","station":"Bengaluru City","platform_number":"4","status":"maintenance","train_id":None,"capacity":600,"current_occupancy":0},
    {"platform_id":"PF-MYS-1","station":"Mysuru","platform_number":"1","status":"available","train_id":None,"capacity":500,"current_occupancy":8},
    {"platform_id":"PF-YPR-1","station":"Yeshwanthpur","platform_number":"1","status":"occupied","train_id":"TRN-002","capacity":700,"current_occupancy":60},
    {"platform_id":"PF-UBL-1","station":"Hubballi","platform_number":"1","status":"reserved","train_id":None,"capacity":600,"current_occupancy":5},
    {"platform_id":"PF-UBL-2","station":"Hubballi","platform_number":"2","status":"available","train_id":None,"capacity":600,"current_occupancy":2},
]

SIGNALS = [
    {"signal_id":"SIG-001","location":"SBC North","status":"Green","track":"T1","last_updated":datetime.now().isoformat(),"auto_mode":True},
    {"signal_id":"SIG-002","location":"YPR Main","status":"Green","track":"T2","last_updated":datetime.now().isoformat(),"auto_mode":True},
    {"signal_id":"SIG-003","location":"KRP East","status":"Yellow","track":"T3","last_updated":datetime.now().isoformat(),"auto_mode":False},
    {"signal_id":"SIG-004","location":"Davangere","status":"Red","track":"T4","last_updated":datetime.now().isoformat(),"auto_mode":False},
    {"signal_id":"SIG-005","location":"Hubballi","status":"Green","track":"T5","last_updated":datetime.now().isoformat(),"auto_mode":True},
    {"signal_id":"SIG-006","location":"Ballari","status":"Green","track":"T6","last_updated":datetime.now().isoformat(),"auto_mode":True},
    {"signal_id":"SIG-007","location":"Raichur","status":"Red","track":"T7","last_updated":datetime.now().isoformat(),"auto_mode":False},
    {"signal_id":"SIG-008","location":"Kalaburagi","status":"Yellow","track":"T8","last_updated":datetime.now().isoformat(),"auto_mode":False},
]

ALERTS = [
    {"id":"ALT-001","timestamp":datetime.now().isoformat(),"type":"crowd","message":"High crowd density at Bengaluru City PF-2. Occupancy 88%.","severity":"HIGH","operator_action":"Deploy additional staff. Initiate crowd management protocol.","confidence":0.92},
    {"id":"ALT-002","timestamp":datetime.now().isoformat(),"type":"obstacle","message":"CRITICAL: Person detected on Track T7 near Raichur.","severity":"CRITICAL","operator_action":"IMMEDIATE: Halt TRN-006. Alert track maintenance. Deploy RPF.","confidence":0.87},
    {"id":"ALT-003","timestamp":datetime.now().isoformat(),"type":"signal","message":"Signal SIG-004 malfunction at Davangere.","severity":"MEDIUM","operator_action":"Switch to manual control. Contact signal maintenance.","confidence":0.78},
]

DETECTION_ALERTS: list = []
detection_stats = {
    "total_frames":0,"total_detections":0,"total_alerts":0,
    "by_severity":{"CRITICAL":0,"HIGH":0,"MEDIUM":0,"LOW":0},
    "fps":0,"threat_level":"ALL CLEAR"
}
current_threat = "ALL CLEAR"

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.post("/api/login")
async def login(body: dict):
    if body.get("username") == "admin" and body.get("password") in ("admin123","admin"):
        return {"access_token":"railctrl-v7-token","token_type":"bearer","username":"admin","role":"controller"}
    raise HTTPException(401, "Invalid credentials")

# ── Trains ────────────────────────────────────────────────────────────────────
@app.get("/api/trains")
async def get_trains():
    for t in TRAINS:
        if t["run_status"] == "running":
            t["speed"] = max(40, min(140, t["speed"] + random.randint(-3,3)))
    return {"trains": TRAINS, "total": len(TRAINS)}

@app.get("/api/train/{train_id}")
async def get_train(train_id: str):
    t = next((t for t in TRAINS if t["train_id"]==train_id), None)
    if not t: raise HTTPException(404,"Train not found")
    return t

# ── Platforms ─────────────────────────────────────────────────────────────────
@app.get("/api/platform/status")
async def get_platforms():
    return {"platforms": PLATFORMS, "total": len(PLATFORMS)}

@app.post("/api/platform/update")
async def update_platform(body: dict):
    pid = body.get("platform_id")
    for p in PLATFORMS:
        if p["platform_id"] == pid:
            p.update({k:v for k,v in body.items() if k != "platform_id"})
            return {"success": True, "platform": p}
    raise HTTPException(404,"Platform not found")

# ── Signals ───────────────────────────────────────────────────────────────────
@app.get("/api/signal/status")
async def get_signals():
    return {"signals": SIGNALS, "total": len(SIGNALS)}

@app.post("/api/signal/control")
async def control_signal(body: dict):
    sid = body.get("signal_id")
    for s in SIGNALS:
        if s["signal_id"] == sid:
            s["status"] = body.get("status", s["status"])
            s["last_updated"] = datetime.now().isoformat()
            return {"success": True, "signal": s}
    raise HTTPException(404,"Signal not found")

# ── Alerts ────────────────────────────────────────────────────────────────────
@app.get("/api/alerts")
async def get_alerts():
    return {"alerts": ALERTS, "total": len(ALERTS)}

# ── Overview ──────────────────────────────────────────────────────────────────
@app.get("/api/control-room/overview")
async def overview():
    return {
        "total_trains": len(TRAINS),
        "running":  len([t for t in TRAINS if t["run_status"]=="running"]),
        "delayed":  len([t for t in TRAINS if t["run_status"]=="delayed"]),
        "stopped":  len([t for t in TRAINS if t["run_status"]=="stopped"]),
        "critical_trains": len([t for t in TRAINS if t["risk_level"]=="Critical"]),
        "green_signals":   len([s for s in SIGNALS if s["status"]=="Green"]),
        "occupied_platforms": len([p for p in PLATFORMS if p["status"]=="occupied"]),
        "active_alerts":   len(ALERTS),
        "timestamp":       datetime.now().isoformat(),
    }

# ── ML Delay prediction ───────────────────────────────────────────────────────
@app.post("/api/ml/predict-delay")
async def predict_delay(body: dict):
    speed     = body.get("speed", 90)
    weather   = body.get("weather","Clear")
    cong      = body.get("congestion_level","Low")
    prev      = body.get("previous_delay", 0)
    risks     = body.get("detected_risk_count", 0)
    signal    = body.get("signal_status","Green")
    delay = float(prev)
    reasons = []
    if weather != "Clear":   delay += 5;  reasons.append({"factor":"Weather","impact":5})
    if cong == "High":        delay += 8;  reasons.append({"factor":"Congestion","impact":8})
    elif cong == "Medium":    delay += 4;  reasons.append({"factor":"Congestion","impact":4})
    if signal == "Red":       delay += 10; reasons.append({"factor":"Signal","impact":10})
    elif signal == "Yellow":  delay += 3;  reasons.append({"factor":"Signal","impact":3})
    if speed > 120:           delay += 2;  reasons.append({"factor":"High Speed","impact":2})
    if risks > 0:             delay += risks*3; reasons.append({"factor":"Detected Risks","impact":risks*3})
    if prev > 0:              reasons.append({"factor":"Previous Delay","impact":prev})
    delay = max(0.0, delay + random.uniform(-2,2))
    conf  = round(0.72 + random.uniform(0,0.22), 2)
    rec   = ("Normal operation." if delay < 3
             else "Monitor closely – minor delays expected." if delay < 8
             else "Reduce speed. Alert station control." if delay < 15
             else "URGENT: Significant delay. Request priority routing.")
    return {"predicted_delay_minutes":round(delay,1),"confidence":conf,"recommendation":rec,
            "reasons":reasons,"timestamp":datetime.now().isoformat()}

# ── Chatbot ───────────────────────────────────────────────────────────────────
@app.post("/api/chatbot/ask")
async def chatbot(body: dict):
    q = body.get("query","").lower()
    running  = [t for t in TRAINS if t["run_status"]=="running"]
    delayed  = [t for t in TRAINS if t["run_status"]=="delayed"]
    critical = [t for t in TRAINS if t["risk_level"]=="Critical"]

    if any(w in q for w in ["delay","delayed","late"]):
        if delayed:
            names = ", ".join(f"{t['train_name']} (+{t['delay_minutes']}m)" for t in delayed)
            resp = f"⚠ {len(delayed)} train(s) currently delayed:\n{names}\n\nRecommendation: Coordinate with station control for priority routing."
        else:
            resp = "✓ All trains running on schedule. No delays reported."
    elif any(w in q for w in ["obstacle","person","track","danger","hazard"]):
        obst = [t for t in TRAINS if any(o in ["Obstacle","Person","Track Crack"] for o in t.get("detected_objects",[]))]
        if obst:
            resp = f"🚨 {len(obst)} track hazard(s) detected!\n" + "\n".join(f"• {t['train_name']}: {', '.join(t['detected_objects'])} near {t['current_station']}" for t in obst)
        else:
            resp = "✓ No track obstacles detected."
    elif any(w in q for w in ["signal","signals"]):
        red = [s for s in SIGNALS if s["status"]=="Red"]
        resp = (f"🚦 Signal Report:\n"
                f"• Green: {len([s for s in SIGNALS if s['status']=='Green'])}\n"
                f"• Yellow: {len([s for s in SIGNALS if s['status']=='Yellow'])}\n"
                f"• Red: {len(red)}")
        if red: resp += f"\n\nRed signals: {', '.join(s['signal_id'] for s in red)}"
    elif any(w in q for w in ["critical","risk"]):
        if critical:
            resp = f"🚨 {len(critical)} CRITICAL train(s):\n" + "\n".join(f"• {t['train_name']}: {t['recommendation']}" for t in critical)
        else:
            resp = "✓ No critical risk trains detected."
    elif any(w in q for w in ["overview","summary","status","report","system"]):
        resp = (f"📊 Karnataka Railway – Live Status ({datetime.now().strftime('%H:%M')} IST)\n\n"
                f"🚂 Trains: {len(TRAINS)} total | {len(running)} running | {len(delayed)} delayed\n"
                f"🚦 Signals: G={len([s for s in SIGNALS if s['status']=='Green'])} Y={len([s for s in SIGNALS if s['status']=='Yellow'])} R={len([s for s in SIGNALS if s['status']=='Red'])}\n"
                f"🛤 Platforms: {len([p for p in PLATFORMS if p['status']=='occupied'])}/{len(PLATFORMS)} occupied\n"
                f"⚠ Active Alerts: {len(ALERTS)}\n"
                f"🤖 AI: {'YOLOv8 Active' if YOLO_OK else 'Simulation Mode'}")
    elif any(w in q for w in ["speed","overspeed"]):
        fast = [t for t in TRAINS if t["speed"]>110]
        resp = (f"⚡ {len(fast)} train(s) at high speed:\n" + "\n".join(f"• {t['train_name']}: {t['speed']} km/h" for t in fast)
                if fast else "✓ All trains within speed limits.")
    elif any(w in q for w in ["platform","crowd","occupancy"]):
        resp = "🛤 Platform occupancy:\n" + "\n".join(f"• {p['platform_id']} ({p['station']}): {p.get('current_occupancy',0)}% – {p['status']}" for p in PLATFORMS)
    else:
        resp = (f"I'm the RailCtrl AI Copilot with access to:\n"
                f"• {len(TRAINS)} active trains | {len(SIGNALS)} signals | {len(PLATFORMS)} platforms\n\n"
                f"Try: 'Which trains are delayed?', 'Signal status', 'System overview', 'Any obstacles?'")
    return {"response": resp, "timestamp": datetime.now().isoformat()}

# ── Detection helpers ─────────────────────────────────────────────────────────
OBJ_MAP = {
    "person":("Human","CRITICAL"), "crowd":("Human","HIGH"),
    "train":("Vehicle","LOW"),     "car":("Vehicle","LOW"),
    "truck":("Vehicle","MEDIUM"),  "fire":("Track Anomaly","CRITICAL"),
    "smoke":("Track Anomaly","HIGH"), "dog":("Animal","LOW"),
}

# Simulation objects with normalised bbox [x, y, w, h] all in 0-1 range
SIM_OBJECTS = [
    {"label":"Person on Track",   "category":"Human",         "risk_severity":"CRITICAL", "color":[0,0,255]},
    {"label":"Crowd",             "category":"Human",         "risk_severity":"HIGH",     "color":[0,140,255]},
    {"label":"Obstacle on Track", "category":"Track Anomaly", "risk_severity":"HIGH",     "color":[0,140,255]},
    {"label":"Train",             "category":"Vehicle",       "risk_severity":"LOW",      "color":[0,255,0]},
    {"label":"Signal Issue",      "category":"Signal",        "risk_severity":"MEDIUM",   "color":[0,200,255]},
    {"label":"Suspicious Object", "category":"Other",         "risk_severity":"MEDIUM",   "color":[0,200,255]},
    {"label":"Fire/Smoke",        "category":"Track Anomaly", "risk_severity":"CRITICAL", "color":[0,0,255]},
    {"label":"Track Crack",       "category":"Track Anomaly", "risk_severity":"HIGH",     "color":[0,140,255]},
]

def make_sim_detections(conf_thresh: float, img_w: int = 640, img_h: int = 480) -> list:
    """Return simulated detections with both absolute bbox AND normalised bbox_norm."""
    count = random.randint(0,3) if random.random() > 0.35 else 0
    results = []
    for _ in range(count):
        obj = random.choice(SIM_OBJECTS)
        conf = round(conf_thresh + random.random() * (0.95 - conf_thresh), 2)
        # Random box (normalised)
        nw = 0.12 + random.random() * 0.22
        nh = 0.15 + random.random() * 0.28
        nx = random.random() * (1.0 - nw)
        ny = random.random() * (1.0 - nh)
        # Absolute bbox (x1,y1,x2,y2)
        x1 = int(nx * img_w); y1 = int(ny * img_h)
        x2 = int((nx+nw) * img_w); y2 = int((ny+nh) * img_h)
        results.append({
            **obj,
            "confidence":    conf,
            "bbox":          [x1, y1, x2, y2],   # absolute pixels
            "bbox_norm":     [round(nx,3), round(ny,3), round(nw,3), round(nh,3)],
        })
    return results


def build_alerts(detections: list, weather="clear", speed=80) -> list:
    alerts = []
    action_map = {
        "CRITICAL": "IMMEDIATE: Halt nearest train. Alert RPF. Deploy emergency response.",
        "HIGH":     "Reduce train speed. Alert station control.",
        "MEDIUM":   "Monitor situation. Alert maintenance crew.",
        "LOW":      "Log detection. Continue normal operations.",
    }
    for det in detections:
        sev = det.get("risk_severity","LOW")
        alerts.append({
            "id":              f"DET-{int(time.time()*1000)}-{random.randint(100,999)}",
            "timestamp":       datetime.now().isoformat(),
            "type":            det.get("category","Other").lower().replace(" ","_"),
            "message":         f"{det['label']} detected — confidence {det['confidence']*100:.0f}%",
            "severity":        sev,
            "operator_action": action_map.get(sev,"Monitor."),
            "confidence":      det["confidence"],
            "weather":         weather,
            "speed":           speed,
        })
    return alerts


def draw_detections_on_frame(img_bgr, detections: list):
    """Draw bounding boxes + labels on an OpenCV BGR image."""
    if not CV2_OK:
        return img_bgr
    color_map = {
        "CRITICAL": (0, 0, 255),   # BGR red
        "HIGH":     (0, 140, 255), # BGR orange
        "MEDIUM":   (0, 200, 255), # BGR yellow
        "LOW":      (0, 255, 0),   # BGR green
    }
    h, w = img_bgr.shape[:2]
    for det in detections:
        sev   = det.get("risk_severity","LOW")
        color = tuple(det.get("color", color_map.get(sev,(0,255,0))))
        label = f"{det['label']} {det['confidence']*100:.0f}%"

        # Use absolute bbox
        if "bbox" in det and len(det["bbox"]) == 4:
            bx = det["bbox"]
            # Detect x1,y1,x2,y2 vs x1,y1,w,h
            if bx[2] > bx[0] and bx[3] > bx[1]:
                x1,y1,x2,y2 = [int(v) for v in bx]
            else:
                x1,y1 = int(bx[0]),int(bx[1])
                x2,y2 = int(bx[0]+bx[2]),int(bx[1]+bx[3])
        elif "bbox_norm" in det:
            nx,ny,nw,nh = det["bbox_norm"]
            x1,y1 = int(nx*w),int(ny*h)
            x2,y2 = int((nx+nw)*w),int((ny+nh)*h)
        else:
            continue

        # Clamp
        x1,y1 = max(0,x1),max(0,y1)
        x2,y2 = min(w-1,x2),min(h-1,y2)

        # Box
        cv2.rectangle(img_bgr,(x1,y1),(x2,y2),color,2)
        # Corner accents
        cs = 12
        for (cx,cy,dx,dy) in [(x1,y1,1,1),(x2,y1,-1,1),(x1,y2,1,-1),(x2,y2,-1,-1)]:
            cv2.line(img_bgr,(cx,cy),(cx+dx*cs,cy),color,3)
            cv2.line(img_bgr,(cx,cy),(cx,cy+dy*cs),color,3)
        # Label bg
        (tw,th),_ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        ly = y1-6 if y1>20 else y2+16
        cv2.rectangle(img_bgr,(x1,ly-th-4),(x1+tw+6,ly+2),color,-1)
        cv2.putText(img_bgr, label,(x1+3,ly), cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,0,0),1,cv2.LINE_AA)

    # HUD top bar
    cv2.rectangle(img_bgr,(0,0),(w,22),(0,0,0),-1)
    cv2.putText(img_bgr, f"RailCtrl AI v7  |  {len(detections)} objects  |  {datetime.now().strftime('%H:%M:%S')}",
                (6,15), cv2.FONT_HERSHEY_SIMPLEX, 0.45,(255,212,0),1,cv2.LINE_AA)
    return img_bgr

# ── Detection endpoints ───────────────────────────────────────────────────────
@app.get("/api/video-detection/status")
async def det_status():
    return {"status":"online","yolo_available":YOLO_OK,"cv2_available":CV2_OK,
            "mode":"yolo" if YOLO_OK else "simulation","version":"7.0.0"}

@app.get("/api/video-detection/stats")
async def det_stats():
    return detection_stats

@app.get("/api/video-detection/threat-level")
async def det_threat():
    return {"threat_level": current_threat}

@app.get("/api/video-detection/alerts")
async def det_alerts(limit: int = 60):
    return {"alerts": DETECTION_ALERTS[-limit:], "total": len(DETECTION_ALERTS)}

@app.post("/api/video-detection/clear-alerts")
async def clear_alerts():
    global current_threat
    DETECTION_ALERTS.clear()
    current_threat = "ALL CLEAR"
    detection_stats.update({"total_alerts":0,"by_severity":{"CRITICAL":0,"HIGH":0,"MEDIUM":0,"LOW":0},"threat_level":"ALL CLEAR"})
    return {"success": True}

@app.post("/api/video-detection/process-frame")
async def process_frame(
    frame:      UploadFile = File(...),
    confidence: float      = Form(0.4),
    weather:    str        = Form("clear"),
    speed:      float      = Form(80),
):
    global current_threat
    detection_stats["total_frames"] += 1
    raw_bytes = await frame.read()
    img_w, img_h = 640, 480
    detections   = []
    annotated_b64 = None

    # ── Try real YOLO inference ───────────────────────────────────────────────
    if YOLO_OK and CV2_OK:
        try:
            arr = np.frombuffer(raw_bytes, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                img_h, img_w = img.shape[:2]
                results = _yolo_model(img, conf=confidence, verbose=False)
                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        lbl    = _yolo_model.names[cls_id]
                        conf_v = float(box.conf[0])
                        x1,y1,x2,y2 = [int(v) for v in box.xyxy[0].tolist()]
                        cat, sev = OBJ_MAP.get(lbl.lower(), ("Other","LOW"))
                        nx,ny   = x1/img_w, y1/img_h
                        nw,nh   = (x2-x1)/img_w, (y2-y1)/img_h
                        detections.append({
                            "label":       lbl.replace("_"," ").title(),
                            "category":    cat,
                            "confidence":  round(conf_v,3),
                            "risk_severity": sev,
                            "color":       [0,0,255] if sev=="CRITICAL" else [0,140,255] if sev=="HIGH" else [0,200,255] if sev=="MEDIUM" else [0,255,0],
                            "bbox":        [x1,y1,x2,y2],
                            "bbox_norm":   [round(nx,3),round(ny,3),round(nw,3),round(nh,3)],
                        })
                # Draw boxes and encode
                img = draw_detections_on_frame(img, detections)
                ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY,85])
                if ok:
                    annotated_b64 = base64.b64encode(buf).decode()
        except Exception as e:
            logger.error(f"YOLO inference error: {e}")
            detections = make_sim_detections(confidence, img_w, img_h)
    else:
        # ── Simulation mode with annotated image ─────────────────────────────
        detections = make_sim_detections(confidence, img_w, img_h)

        if CV2_OK:
            try:
                arr = np.frombuffer(raw_bytes, np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if img is not None:
                    img_h, img_w = img.shape[:2]
                    # Fix normalised bbox to match actual image size
                    for d in detections:
                        nx,ny,nw,nh = d["bbox_norm"]
                        d["bbox"] = [int(nx*img_w),int(ny*img_h),int((nx+nw)*img_w),int((ny+nh)*img_h)]
                    img = draw_detections_on_frame(img, detections)
                    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY,85])
                    if ok:
                        annotated_b64 = base64.b64encode(buf).decode()
            except Exception as e:
                logger.error(f"Sim annotation error: {e}")

    # ── Generate alerts ───────────────────────────────────────────────────────
    alerts = build_alerts(detections, weather, speed)
    DETECTION_ALERTS.extend(alerts)
    detection_stats["total_detections"] += len(detections)
    detection_stats["total_alerts"]     += len(alerts)
    for a in alerts:
        s = a["severity"]
        if s in detection_stats["by_severity"]:
            detection_stats["by_severity"][s] += 1

    # Update global threat
    sev_rank = {"ALL CLEAR":0,"LOW":1,"MEDIUM":2,"HIGH":3,"CRITICAL":4}
    if alerts:
        top = max(alerts, key=lambda a: sev_rank.get(a["severity"],0))
        if sev_rank.get(top["severity"],0) > sev_rank.get(current_threat,0):
            current_threat = top["severity"]
    detection_stats["threat_level"] = current_threat

    return {
        "detections":     detections,
        "alerts":         alerts,
        "annotated_frame": annotated_b64,
        "frame_id":       detection_stats["total_frames"],
        "threat_level":   current_threat,
        "image_width":    img_w,
        "image_height":   img_h,
    }

@app.post("/api/video-detection/upload-video")
async def upload_video(file: UploadFile = File(...), confidence: float = Form(0.4)):
    raw = await file.read()
    await asyncio.sleep(0.5)

    total_frames = random.randint(90,220)
    total_dets   = random.randint(8,50)
    total_alerts = random.randint(2,12)
    alerts = [{"id":f"VID-{i}","timestamp":datetime.now().isoformat(),
               "severity":random.choice(["LOW","MEDIUM","HIGH","CRITICAL"]),
               "message":f"Video detection #{i+1}: {random.choice(SIM_OBJECTS)['label']} detected",
               "operator_action":"Review video footage and take corrective action.",
               "confidence":round(0.60+random.random()*0.35,2)} for i in range(total_alerts)]
    DETECTION_ALERTS.extend(alerts)
    return {"total_frames":total_frames,"total_detections":total_dets,
            "total_alerts":total_alerts,"alerts":alerts,"status":"processed"}

# ── WebSockets ────────────────────────────────────────────────────────────────
@app.websocket("/ws/live-detection")
async def ws_live(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            dets   = make_sim_detections(0.4)
            alerts = build_alerts(dets)
            await ws.send_json({"detections":dets,"alerts":alerts,
                                "threat_level":current_threat,"timestamp":datetime.now().isoformat()})
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass

@app.websocket("/ws/trains")
async def ws_trains(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            await ws.send_json({"trains":TRAINS,"timestamp":datetime.now().isoformat()})
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass

@app.get("/api/health")
async def health():
    return {"status":"healthy","version":"7.0.0","yolo":YOLO_OK,"cv2":CV2_OK,
            "timestamp":datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
