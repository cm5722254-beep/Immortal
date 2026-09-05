@echo off
title MER DONGHUA - Movie and Episode Link Repair System
echo =====================================================================
echo  🎬 MER DONGHUA / NAMI ANIME - MOVIE & EPISODE LINK REPAIR ENGINE
echo =====================================================================
cd /d "%~dp0"
chcp 65001 >nul

if exist "tools\repair_movie_links.py" (
    python "tools\repair_movie_links.py"
) else (
    echo [ERROR] Could not locate tools\repair_movie_links.py!
    echo Current directory: %cd%
)

echo.
pause
