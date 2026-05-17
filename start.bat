@echo off
echo ============================================================
echo    RailControl AI v7 - Karnataka Smart Railway System
echo ============================================================

echo.
echo [1/2] Starting FastAPI backend on port 8000...
cd backend
start "RailCtrl-Backend" cmd /k "pip install -r requirements-minimal.txt && python main.py"
cd ..
timeout /t 4 /nobreak >nul

echo [2/2] Starting React frontend on port 3000...
cd frontend
start "RailCtrl-Frontend" cmd /k "npm install && npm run dev -- --port 3000"
cd ..
timeout /t 4 /nobreak >nul

echo.
echo ============================================================
echo   System is starting!
echo.
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo.
echo   Login    : admin / admin123
echo.
echo   CCTV     : Demo videos load automatically
echo   Detection: Upload any MP4/AVI/MOV for live detection
echo ============================================================
pause
