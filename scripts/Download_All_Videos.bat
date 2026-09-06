@echo off
chcp 65001 >nul
title MER DONGHUA - Bulk Video Downloader and Website Scanner

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%~dp0.."
set "EXE_FILE=%~dp0MerDonghua_Downloader.exe"
set "PY_GUI=%ROOT_DIR%\tools\download\MerDonghua_Downloader.py"

cd /d "%ROOT_DIR%"

echo.
echo ======================================================================
echo    MER DONGHUA - Professional Video Downloader and Scanner
echo    Download All Anime with Correct Khmer Names
echo ======================================================================
echo.

if exist "%EXE_FILE%" (
    echo [OK] Launching MerDonghua_Downloader.exe ...
    start "" "%EXE_FILE%"
    exit /b 0
)

if exist "%ROOT_DIR%\dist\MerDonghua_Downloader.exe" (
    echo [OK] Launching dist\MerDonghua_Downloader.exe ...
    start "" "%ROOT_DIR%\dist\MerDonghua_Downloader.exe"
    exit /b 0
)

echo [INFO] EXE not found in scripts - launching via Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not installed!
    pause
    exit /b 1
)

start "" python -X utf8 "%PY_GUI%"
exit /b 0
