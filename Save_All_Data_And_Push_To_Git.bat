@echo off
chcp 65001 >nul
title SAVE ALL DATA, POSTERS & PUSH TO WEBSITE
echo ========================================================
echo   💾 NAMI ANIME / MER DONGHUA - DATA & POSTER SYNC
echo ========================================================
echo.
echo [1/3] Exporting SQLite database to seed_export.json...
python -c "import asyncio, sys; sys.path.insert(0, 'backend'); from app.services.data_persistence import sync_database_to_export_json; asyncio.run(sync_database_to_export_json())"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to export database!
    pause
    exit /b 1
)

echo.
echo [2/3] Building and updating git staging...
copy /Y backend\merdonghua.db merdonghua.db >nul 2>&1
"C:\Program Files\Git\cmd\git.exe" add .

echo.
echo [3/3] Committing and Pushing to GitHub (Render / Vercel Deploy)...
"C:\Program Files\Git\cmd\git.exe" commit -m "chore: permanent sync of all database records, posters, and episodes"
"C:\Program Files\Git\cmd\git.exe" push origin main

echo.
echo ========================================================
echo   ✅ SUCCESS! All images, titles and data are saved
echo   and pushed to the live website permanently!
echo ========================================================
echo.
pause
