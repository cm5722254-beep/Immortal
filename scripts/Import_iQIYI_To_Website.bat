@echo off
title MER DONGHUA - Import iQIYI Catalog To Website
echo =====================================================================
echo  🎬 MER DONGHUA — iQIYI DONGHUA & ANIME CATALOG AUTO-IMPORTER
echo =====================================================================
cd /d "%~dp0"
chcp 65001 >nul

if exist "tools\import_iqiyi_catalog.py" (
    python "tools\import_iqiyi_catalog.py"
) else (
    echo [ERROR] Could not locate tools\import_iqiyi_catalog.py!
    echo Current directory: %cd%
)

echo.
pause
