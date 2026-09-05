@echo off
title MER DONGHUA - One-Click All Video Downloader
echo =====================================================================
echo  🎬 MER DONGHUA / NAMI ANIME - ALL VIDEO RECOVERY & AUTO DOWNLOADER
echo =====================================================================
cd /d "%~dp0"
chcp 65001 >nul

if exist "tools\download_all_website_videos.py" (
    python "tools\download_all_website_videos.py"
) else if exist "NAMI  ANIME\tools\download_all_website_videos.py" (
    python "NAMI  ANIME\tools\download_all_website_videos.py"
) else (
    echo [ERROR] Could not locate tools\download_all_website_videos.py!
    echo Current directory: %cd%
)

echo.
pause

