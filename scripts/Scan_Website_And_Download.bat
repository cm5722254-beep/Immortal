@echo off
chcp 65001 >nul
title MER DONGHUA - Website Video Scanner and Downloader

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%~dp0.."
set "EXE_FILE=%~dp0MerDonghua_Downloader.exe"
set "PY_SCAN=%ROOT_DIR%\tools\download\scan_and_download.py"
set "PY_GUI=%ROOT_DIR%\tools\download\MerDonghua_Downloader.py"

cd /d "%ROOT_DIR%"

echo.
echo ======================================================================
echo    MER DONGHUA - Scan and Download Videos from Website
echo    Download All Anime Episodes Directly to PC
echo ======================================================================
echo.
echo  [1] Open GUI Downloader and Scanner (MerDonghua_Downloader.exe)
echo  [2] Scan and Download 'Big Brother' (Ep 139 - 153)
echo  [3] Enter custom Website URL or Anime Name
echo.
set "choice="
set /p choice="Select option (1/2/3) [Default: 1]: "

if "%choice%"=="" goto opt1
if "%choice%"=="1" goto opt1
if "%choice%"=="2" goto opt2
if "%choice%"=="3" goto opt3
goto opt1

:opt1
echo.
echo Launching GUI Downloader...
if exist "%EXE_FILE%" (
    start "" "%EXE_FILE%"
    exit /b 0
)
if exist "%ROOT_DIR%\dist\MerDonghua_Downloader.exe" (
    start "" "%ROOT_DIR%\dist\MerDonghua_Downloader.exe"
    exit /b 0
)
start "" python -X utf8 "%PY_GUI%"
exit /b 0

:opt2
echo.
python -X utf8 "%PY_SCAN%" "http://localhost:5173/watch/big-brother"
echo.
pause
exit /b 0

:opt3
echo.
set "target_url="
set /p target_url="Enter Website URL or Anime Name: "
if "%target_url%"=="" set "target_url=http://localhost:5173/watch/big-brother"
python -X utf8 "%PY_SCAN%" "%target_url%"
echo.
pause
exit /b 0
