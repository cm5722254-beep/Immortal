@echo off
title MER DONGHUA - Share All Local Videos To Website
echo =====================================================================
echo  🎬 MER DONGHUA - SHARE / UPLOAD ALL LOCAL VIDEOS TO WEBSITE
echo =====================================================================
cd /d "%~dp0"
chcp 65001 >nul

if exist "tools\share_all_to_website.py" (
    python "tools\share_all_to_website.py"
) else (
    echo [ERROR] Could not locate tools\share_all_to_website.py!
    echo Current directory: %cd%
)

echo.
pause
