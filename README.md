# 🚂 RailControl AI v7 — Karnataka Smart Railway System

**AI Copilot for Train Controller** — Futuristic Railway Control Room Dashboard

---

## ⚡ Quick Start

### Linux / Mac
```bash
chmod +x start.sh && ./start.sh
```

### Windows
Double-click `start.bat`

### Manual Setup
```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements-minimal.txt
python main.py

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

**→ Open:** `http://localhost:3000`  
**→ Login:** `admin` / `admin123`

---

## 🎛 Features

| Module | Description |
|--------|-------------|
| **Control Room** | Live SVG track map, animated trains, signal & platform panels |
| **Karnataka Map** | Interactive network — 15 stations, animated trains, heatmap, alerts |
| **🎥 AI Detection** | Webcam + Image + **Video upload with live frame-by-frame detection** |
| **📡 CCTV Monitor** | 6 realistic demo feeds with animated AI bounding boxes |
| **Signal Control** | Toggle Red/Yellow/Green, auto-mode, bulk actions |
| **Train Monitor** | Full fleet table, speed chart, detail panel |
| **Alert Center** | Severity-filtered live alerts with ACK |
| **AI Copilot** | Natural language railway assistant |
| **Delay Prediction** | ML-based prediction with radar/bar charts |
| **Platform Mgmt** | Occupancy bars + status control |
| **Station Control** | Karnataka station network management |
| **Reports** | Analytics — daily trend, route performance charts |
| **Emergency** | E-stop, evacuation, fire protocol, action log |
| **Traffic Control** | Junction management + route conflict resolution |

---

## 📡 CCTV Demo Videos (Auto-loaded)

| Camera | Scene | AI Detections |
|--------|-------|--------------|
| CAM-01 Platform 1 | Platform with crowd & train | 🟠 CROWD + 🔴 PERSON ON YELLOW LINE |
| CAM-02 Track North | Track with approaching train | 🔴 PERSON ON TRACK + 🟠 OBSTACLE |
| CAM-03 Entry Gate | Gate with walking people | 🟢 PERSON ×2 + 🔴 SUSPICIOUS OBJECT |
| CAM-04 Signal YPR | Night signal junction | 🔴 SIGNAL FAULT + 🟢 TRAIN |
| CAM-05 Crowd PF-3 | Dense crowd with heatmap | 🔴 HIGH CROWD DENSITY |
| CAM-06 Track South | Track with worker & debris | 🟢 TRAIN + 🟠 WORKER ON TRACK |

All videos are **H.264 encoded**, loop continuously, and have **live animated bounding boxes** on top.

---

## 🎥 Video Upload Detection

1. Go to **AI Detection** → select **🎬 Video Upload**
2. Upload any MP4, AVI, or MOV file
3. Video plays on screen — AI detects obstacles **frame by frame in real-time**
4. Bounding boxes appear overlaid on the playing video
5. Alerts generated automatically for HIGH/CRITICAL detections

---

## 🤖 Detected Objects

| Object | Severity |
|--------|---------|
| Person on Track | 🔴 CRITICAL |
| Fire / Smoke | 🔴 CRITICAL |
| Crowd | 🟠 HIGH |
| Obstacle on Track | 🟠 HIGH |
| Track Crack | 🟠 HIGH |
| Worker on Track | 🟠 HIGH |
| Signal Issue | 🟡 MEDIUM |
| Suspicious Object | 🟡 MEDIUM |
| Train | 🟢 LOW |

---

## 🏗 Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Recharts  
**Backend:** FastAPI + WebSocket + Python 3.10+  
**AI:** YOLOv8 (ultralytics) + OpenCV + PyTorch (falls back to simulation)  
**Videos:** H.264 MP4, 640×360, 25fps — generated with OpenCV

---

## 🔧 Optional GPU / Full AI Setup
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install ultralytics opencv-python
# Then restart backend — YOLOv8 will auto-activate
```
