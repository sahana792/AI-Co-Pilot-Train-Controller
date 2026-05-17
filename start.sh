#!/bin/bash
echo "============================================================"
echo "   RailControl AI v7 — Karnataka Smart Railway System"
echo "============================================================"
echo ""

# Kill any existing processes on ports 3000 and 8000
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true

# ── Backend ───────────────────────────────────────────────────────────────────
echo "[1/2] Starting FastAPI backend on port 8000..."
cd backend
pip install -r requirements-minimal.txt -q --break-system-packages 2>/dev/null \
  || pip install -r requirements-minimal.txt -q
python main.py &
BACKEND_PID=$!
echo "      Backend PID: $BACKEND_PID"
cd ..
sleep 3

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "[2/2] Starting React frontend on port 3000..."
cd frontend
npm install --silent 2>/dev/null
VITE_API_URL=http://localhost:8000/api npm run dev -- --port 3000 --host &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================================"
echo "  ✓ System is running!"
echo ""
echo "  🌐 Frontend : http://localhost:3000"
echo "  🔌 Backend  : http://localhost:8000"
echo "  📖 API Docs : http://localhost:8000/docs"
echo ""
echo "  🔑 Login    : admin / admin123"
echo ""
echo "  📡 CCTV     : Demo videos load automatically"
echo "  🎥 Detection: Upload any MP4/AVI/MOV for live detection"
echo "============================================================"
echo ""
echo "Press Ctrl+C to stop all services"

cleanup() {
  echo ""
  echo "Stopping services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Done."
}
trap cleanup SIGINT SIGTERM
wait
