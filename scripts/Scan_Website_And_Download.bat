@echo off
chcp 65001 >nul
title MER DONGHUA - Website Video Scanner and Downloader

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%~dp0.."
set "EXE_FILE=%~dp0MerDonghua_Downloader.exe"
set "PY_WEB=%ROOT_DIR%\tools\download\merdonghua_downloader_web_gui.py"
set "PY_GUI=%ROOT_DIR%\tools\download\MerDonghua_Downloader.py"
set "PY_SCAN=%ROOT_DIR%\tools\download\scan_and_download.py"

cd /d "%ROOT_DIR%"

echo.
echo ======================================================================
echo    🎬 MER DONGHUA - Visual Downloader and Website Scanner Studio v4.0
echo    Download All Anime Episodes Directly to PC with Khmer Titles
echo ======================================================================
echo.
echo  [1] 🚀 Open NEW Modern Web GUI Studio (v4.0 - Recommanded)
echo  [2] 🖥️ Open Classic Desktop GUI (v3.4)
echo  [3] 🆕 Scan Only New Anime - ស្កេនចាប់តែរឿងថ្មី
echo  [4] ⚡ Quick Scan and Download 'Big Brother' (Ep 139 - 153)
echo  [5] 🔗 Enter custom Website URL or Anime Name
echo.
set "choice="
set /p choice="Select option (1/2/3/4/5) [Default: 1]: "

if "%choice%"=="" goto opt1
if "%choice%"=="1" goto opt1
if "%choice%"=="2" goto opt2
if "%choice%"=="3" goto opt3
if "%choice%"=="4" goto opt4
if "%choice%"=="5" goto opt5
goto opt1

:opt1
echo.
echo Starting Modern Web GUI Studio (http://127.0.0.1:5188)...
start "" python -X utf8 "%PY_WEB%"
exit /b 0

:opt2
echo.
echo Launching Classic Desktop GUI...
start "" pythonw -X utf8 "%PY_GUI%"
exit /b 0

:opt3
echo.
echo Starting Web GUI with [Scan Only New Anime - ស្កេនចាប់តែរឿងថ្មី]...
start "" python -X utf8 "%PY_WEB%"
exit /b 0

:opt4
echo.
python -X utf8 "%PY_SCAN%" "http://localhost:5173/watch/big-brother"
echo.
pause
exit /b 0

:opt5
echo.
set "target_url="
set /p target_url="Enter Website URL or Anime Name: "
if "%target_url%"=="" set "target_url=http://localhost:5173/watch/big-brother"
python -X utf8 "%PY_SCAN%" "%target_url%"
echo.
pause
exit /b 0
