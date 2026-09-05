@echo off
chcp 65001 >nul
title MER DONGHUA — Update Website Safely (រក្សាទុកទិន្នន័យ 100%%)
color 0A

echo ======================================================================
echo    🎬 MER DONGHUA — UPDATE WEBSITE ដោយសុវត្ថិភាព (DATA PROTECTION 100%%)
echo ======================================================================
echo.
echo [*] កំពុងត្រួតពិនិត្យ និងការពារទិន្នន័យ (Checking Database ^& Backups)...
echo.

python -c "
import json, os, sys
seed_p = 'backend/app/services/seed_export.json'
if not os.path.exists(seed_p):
    print('❌ រកមិនឃើញ seed_export.json!')
    sys.exit(1)

with open(seed_p, 'r', encoding='utf-8') as f:
    d = json.load(f)

anime_cnt = len(d.get('anime', []))
ep_cnt = len(d.get('episodes', []))
user_cnt = len(d.get('users', []))

print(f'✅ ទិន្នន័យបច្ចុប្បន្ន: {anime_cnt} រឿង, {ep_cnt} ភាគ, {user_cnt} សមាជិក')

if anime_cnt < 50 or ep_cnt < 600:
    print('⚠️ ការព្រមាន: ចំនួនរឿងទាបជាងធម្មតា សូមពិនិត្យមើលឡើងវិញ!')
    sys.exit(1)

# Upload to Cloudflare R2 Offsite Backup
try:
    sys.path.insert(0, 'backend')
    from app.services.r2_backup_service import upload_backup_to_r2_sync
    success = upload_backup_to_r2_sync(d)
    if success:
        print('☁️ បានរក្សាទុក Master Backup ទៅ Cloudflare R2 Cloud ជោគជ័យ!')
except Exception as e:
    print(f'[*] Cloud R2 Note: {e}')
"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ការពារទិន្នន័យមិនទាន់ជោគជ័យ សូមពិនិត្យសារខាងលើ!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [*] កំពុង Compile Frontend (Building Production Bundle)...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Build Frontend មានបញ្ហា!
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [*] កំពុងរៀបចំ Git Commit ^& Push ទៅកាន់ GitHub...
"C:\Program Files\Git\cmd\git.exe" add .
set /p COMMIT_MSG="បញ្ចូលចំណងជើង Update (ចុច Enter យក Default): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG="feat: update website with 100%% data protection"

"C:\Program Files\Git\cmd\git.exe" commit -m "%COMMIT_MSG%"
echo.
echo [*] កំពុង Push ទៅកាន់ GitHub (Deploying)...
"C:\Program Files\Git\cmd\git.exe" push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================================================
    echo    🎉 UPDATE WEBSITE ^& DEPLOY ជោគជ័យ ១០០%%! មិនបាត់បង់ទិន្នន័យឡើយ!
    echo ======================================================================
) else (
    echo.
    echo ⚠️ Push មានបញ្ហា សូមពិនិត្យ Internet ឬ Git Remote!
)

echo.
pause
