@echo off
title MER DONGHUA - Movie Poster and Banner PNG Repair System
echo =====================================================================
echo  🎬 MER DONGHUA / NAMI ANIME - MOVIE PNG & BANNER REPAIR ENGINE
echo =====================================================================
cd /d "%~dp0"
chcp 65001 >nul

if exist "tools\repair_movie_png.py" (
    python "tools\repair_movie_png.py"
) else (
    echo [ERROR] Could not locate tools\repair_movie_png.py!
    echo Current directory: %cd%
)

echo.
pause
