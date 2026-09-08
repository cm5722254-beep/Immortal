@echo off
chcp 65001 >nul
title WatchFlix Anime - Poster Downloader
color 0C

echo =====================================================================
echo    🎬 WATCHFLIX ANIME - DOWNLOAD ALL POSTERS TO DRIVE D:
echo =====================================================================
echo.
echo Target Folder: D:\Anime_Posters
echo.

cd /d "%~dp0"
python download_posters.py

echo.
echo =====================================================================
echo Opening D:\Anime_Posters in File Explorer...
start "" "D:\Anime_Posters"
echo Opening Photo Gallery in Browser...
start "" "D:\Anime_Posters\index.html"
echo =====================================================================
pause
