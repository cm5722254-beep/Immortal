@echo off
title MER DONGHUA — 1-Click Telegram Broadcast Tool
echo =====================================================================
echo  🎬 MER DONGHUA / NAMI ANIME — 1-CLICK TELEGRAM BROADCAST
echo =====================================================================
cd /d "%~dp0"
chcp 65001 >nul

if exist "tools\broadcast_1click_telegram.py" (
    python "tools\broadcast_1click_telegram.py"
) else (
    echo [ERROR] Could not locate tools\broadcast_1click_telegram.py!
    echo Current directory: %cd%
)

echo.
pause
