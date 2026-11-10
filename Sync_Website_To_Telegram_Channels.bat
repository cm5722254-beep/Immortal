@echo off
chcp 65001 >nul
title MER DONGHUA - Website to Telegram Channel Auto-Sync Studio
cd /d "%~dp0"

echo =====================================================================
echo   MER DONGHUA - WEBSITE TO TELEGRAM CHANNEL AUTO-SYNC STUDIO
echo   Account : +855 88 816 2192
echo   Folder  : https://t.me/addlist/7NvrQmWmBNUwZDNl
echo   Web UI  : http://127.0.0.1:5199
echo =====================================================================
echo.

if exist "venv-py313\Scripts\python.exe" (
    "venv-py313\Scripts\python.exe" -X utf8 "tools\telegram_sync\telegram_channel_sync_studio.py"
) else (
    python -X utf8 "tools\telegram_sync\telegram_channel_sync_studio.py"
)

pause

