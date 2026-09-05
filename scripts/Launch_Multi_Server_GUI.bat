@echo off
chcp 65001 >nul
title Multi-Server Video Uploader Studio
cd /d "%~dp0"

echo =====================================================================
echo  🚀 STARTING MULTI-SERVER 3-API VIDEO UPLOADER STUDIO...
echo  (Folder ទី ១ ➔ Server 1, Folder ទី ២ ➔ Server 2, Folder ទី ៣ ➔ Server 3)
echo =====================================================================
echo.
echo កំពុងបើកផ្ទាំង Dashboard ក្នុង Browser (http://127.0.0.1:5055)...
echo.

python tools\multi_server_uploader_gui.py

pause
