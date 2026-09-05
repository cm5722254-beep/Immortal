@echo off
title MER DONGHUA - iQIYI VIP Video Downloader
echo =====================================================================
echo  🎬 MER DONGHUA - iQIYI VIP VIDEO DOWNLOADER (yt-dlp)
echo =====================================================================
cd /d "%~dp0"
chcp 65001 >nul

if exist "tools\iqiyi_downloader.py" (
    python "tools\iqiyi_downloader.py"
) else (
    echo [ERROR] Could not locate tools\iqiyi_downloader.py!
    echo Current directory: %cd%
)

echo.
pause
