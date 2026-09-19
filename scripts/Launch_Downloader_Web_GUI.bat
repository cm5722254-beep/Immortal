@echo off
chcp 65001 >nul
title MER DONGHUA - Visual Downloader & Scanner Studio v5.0
cd /d "%~dp0.."

echo =====================================================================
echo  🎬 MER DONGHUA - MODERN VISUAL DOWNLOADER & SCANNER STUDIO v5.0
echo  (Dark Glassmorphic Web Dashboard + Video Preview + Duplicate Guard)
echo =====================================================================
echo.
echo កំពុងបើកផ្ទាំង Dashboard ក្នុង Browser (http://127.0.0.1:5188)...
echo.

start "" "http://127.0.0.1:5188"
python -X utf8 tools\download\merdonghua_downloader_web_gui.py

pause
