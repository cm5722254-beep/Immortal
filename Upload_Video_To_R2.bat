@echo off
chcp 65001 >nul
title Cloudflare R2 Video Uploader (Large Files)
cd /d "%~dp0"

echo =====================================================================
echo  🎬 CLOUDFLARE R2 LARGE VIDEO UPLOADER (មិនកំណត់ទំហំ File លើស 300MB)
echo =====================================================================
echo.

if "%~1"=="" (
    python tools\upload_video_to_r2.py
) else (
    python tools\upload_video_to_r2.py "%~1"
)

pause
