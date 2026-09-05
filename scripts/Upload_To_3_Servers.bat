@echo off
chcp 65001 >nul
title Multi-Server Video Uploader (3 Servers Parallel)
cd /d "%~dp0"

echo =====================================================================
echo  🎬 MULTI-SERVER 3-API PARALLEL VIDEO UPLOADER
echo  Upload វីដេអូទៅកាន់ 3 Servers ក្នុងពេលតែមួយ (Backup & Multi-Mirror)
echo =====================================================================
echo.

if "%~1"=="" (
    python tools\upload_to_3_servers.py
) else (
    python tools\upload_to_3_servers.py "%~1"
)

pause
