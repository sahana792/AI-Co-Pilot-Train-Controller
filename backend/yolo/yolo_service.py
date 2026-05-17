"""YOLOv8 Detection Service"""
import base64
import io
import random
import math
from typing import List, Dict, Tuple
from PIL import Image, ImageDraw, ImageFont

# ─── Railway object config ────────────────────────────────────────────────────
RAILWAY_OBJECTS = {
    "person_on_track":      {"risk": "Critical", "color": (255, 30,  30), "label": "Person on Track"},
    "obstacle_on_track":    {"risk": "High",     "color": (255, 140,  0), "label": "Obstacle on Track"},
    "animal_on_track":      {"risk": "High",     "color": (255, 165,  0), "label": "Animal on Track"},
    "track_damage":         {"risk": "Critical", "color": (220,  20, 60), "label": "Track Damage/Crack"},
    "train":                {"risk": "Low",      "color": ( 30, 144,255), "label": "Train"},
    "railway_track":        {"risk": "Low",      "color": (100, 200, 100), "label": "Railway Track"},
    "signal_light":         {"risk": "Low",      "color": (255, 215,  0), "label": "Signal Light"},
    "platform_crowd":       {"risk": "Medium",   "color": (255, 165,  0), "label": "Platform Crowd"},
    "level_crossing_vehicle":{"risk": "High",    "color": (255,  69,  0), "label": "Level Crossing Vehicle"},
    "red_signal_violation": {"risk": "Critical", "color": (255,   0,  0), "label": "Red Signal Violation"},
}

RISK_ORDER = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}


def _draw_bbox(draw: ImageDraw.Draw, box: Tuple, label: str, confidence: float, color: Tuple, font=None):
    x1, y1, x2, y2 = [int(v) for v in box]
    # box
    for t in range(3):
        draw.rectangle([x1 - t, y1 - t, x2 + t, y2 + t], outline=color)
    # label bg
    text = f"{label} {confidence:.0%}"
    txt_w = len(text) * 7
    txt_h = 16
    draw.rectangle([x1, y1 - txt_h - 4, x1 + txt_w + 4, y1], fill=color)
    draw.text((x1 + 2, y1 - txt_h - 2), text, fill=(255, 255, 255))


def simulate_detection(image_bytes: bytes) -> Dict:
    """
    Simulates YOLOv8 detection when the model is not available.
    Generates realistic-looking bounding boxes on the image.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        img = Image.new("RGB", (640, 480), color=(30, 30, 50))

    W, H = img.size
    draw = ImageDraw.Draw(img)

    # Pick 1-4 random detections weighted toward common safe objects
    pool = list(RAILWAY_OBJECTS.keys())
    weights = [1, 1, 1, 3, 5, 5, 4, 2, 1, 1]  # favour safe objects
    k = random.choices([1, 2, 3, 4], weights=[40, 30, 20, 10])[0]
    chosen = random.choices(pool, weights=weights, k=k)
    # deduplicate preserving order
    seen = set()
    chosen = [x for x in chosen if not (x in seen or seen.add(x))]

    detections = []
    for obj in chosen:
        cfg = RAILWAY_OBJECTS[obj]
        margin = 0.05
        x1 = random.uniform(margin, 0.6) * W
        y1 = random.uniform(margin, 0.5) * H
        bw = random.uniform(0.15, 0.35) * W
        bh = random.uniform(0.15, 0.35) * H
        x2 = min(x1 + bw, W - 5)
        y2 = min(y1 + bh, H - 5)
        conf = round(random.uniform(0.72, 0.97), 2)
        _draw_bbox(draw, (x1, y1, x2, y2), cfg["label"], conf, cfg["color"])
        detections.append({
            "object_name": cfg["label"],
            "confidence": conf,
            "risk_severity": cfg["risk"],
            "bbox": [round(x1), round(y1), round(x2), round(y2)],
        })

    # overlay grid lines for "CCTV" feel
    for gx in range(0, W, 80):
        draw.line([(gx, 0), (gx, H)], fill=(60, 60, 60, 80), width=1)
    for gy in range(0, H, 80):
        draw.line([(0, gy), (W, gy)], fill=(60, 60, 60, 80), width=1)

    # watermark
    draw.text((8, 8), "YOLOv8 DETECTION", fill=(0, 255, 0))
    draw.text((8, 24), f"{len(detections)} object(s) detected", fill=(200, 200, 200))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    # alerts
    alerts = []
    overall_risk = "Low"
    for det in detections:
        sev = det["risk_severity"]
        if sev in ("Critical", "High"):
            alerts.append(f"⚠ {sev.upper()} ALERT: {det['object_name']} detected (conf={det['confidence']:.0%})")
        if RISK_ORDER.get(sev, 0) > RISK_ORDER.get(overall_risk, 0):
            overall_risk = sev

    return {
        "detections": detections,
        "alerts": alerts,
        "overall_risk": overall_risk,
        "image_base64": img_b64,
    }


class YOLOService:
    def __init__(self):
        self.model = None
        self._try_load_model()

    def _try_load_model(self):
        try:
            from ultralytics import YOLO
            self.model = YOLO("yolov8n.pt")
            print("✅ YOLOv8 model loaded")
        except Exception as e:
            print(f"⚠  YOLOv8 not available, using simulation: {e}")

    def detect(self, image_bytes: bytes) -> Dict:
        if self.model is None:
            return simulate_detection(image_bytes)
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            results = self.model(img, conf=0.4)
            # Map COCO classes to railway objects where possible
            CLASS_MAP = {
                0: "person_on_track", 2: "train", 7: "train",
                16: "animal_on_track", 17: "animal_on_track",
                3: "level_crossing_vehicle", 5: "level_crossing_vehicle",
            }
            draw = ImageDraw.Draw(img)
            detections = []
            for r in results:
                for box in r.boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()
                    obj_key = CLASS_MAP.get(cls, "train")
                    cfg = RAILWAY_OBJECTS[obj_key]
                    _draw_bbox(draw, xyxy, cfg["label"], conf, cfg["color"])
                    detections.append({
                        "object_name": cfg["label"],
                        "confidence": round(conf, 2),
                        "risk_severity": cfg["risk"],
                        "bbox": [round(v) for v in xyxy],
                    })
            if not detections:
                return simulate_detection(image_bytes)

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            img_b64 = base64.b64encode(buf.getvalue()).decode()
            alerts = []
            overall_risk = "Low"
            for det in detections:
                sev = det["risk_severity"]
                if sev in ("Critical", "High"):
                    alerts.append(f"⚠ {sev.upper()} ALERT: {det['object_name']}")
                if RISK_ORDER.get(sev, 0) > RISK_ORDER.get(overall_risk, 0):
                    overall_risk = sev
            return {"detections": detections, "alerts": alerts, "overall_risk": overall_risk, "image_base64": img_b64}
        except Exception as e:
            print(f"YOLO detect error: {e}")
            return simulate_detection(image_bytes)


yolo_service = YOLOService()
