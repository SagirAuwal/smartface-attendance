@echo off
title SmartFace Production Launcher
echo ===================================================
echo   SMARTFACE ATTENDANCE SYSTEM - PRODUCTION LAUNCHER
echo ===================================================
echo.

echo [1/2] Starting FastAPI Backend on port 8080 (listening on all interfaces)...
start "SmartFace Backend" cmd /c "cd backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8080"

echo [2/2] Starting Next.js Frontend on port 3001...
start "SmartFace Frontend" cmd /c "cd frontend && npm run start -- -p 3001"

echo.
echo ===================================================
echo   SERVERS LAUNCHED SUCCESSFULLY
echo   - Backend API:  http://localhost:8080/docs
echo   - Frontend App: http://localhost:3001
echo ===================================================
echo Press any key to exit this launcher window. (Servers will remain running in background)
pause > nul
