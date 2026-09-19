@echo off
title NAMI ANIME / MER DONGHUA — Web & API Server
echo =====================================================================
echo  🎬 NAMI ANIME / MER DONGHUA — Local Development Servers (Backend + Frontend)
echo =====================================================================
cd /d "%~dp0"
chcp 65001 >nul

echo 🚀 1. Starting FastAPI Backend Server on http://localhost:8001 ...
if exist "%~dp0..\backend\.env" (
    start "Backend_Server" cmd /k "cd /d %~dp0..\backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload --env-file .env"
) else (
    echo [INFO] Backend .env not configured for local server. Frontend will connect to live Render API.
)

echo 🚀 2. Starting Frontend Web Server on http://localhost:5173 ...
cd /d "%~dp0..\frontend"
npm run dev -- --host --open
pause
