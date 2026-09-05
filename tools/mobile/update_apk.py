import os
import zipfile
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_APK = os.path.join(BASE_DIR, "NamiAnime-v1.5-Latest.apk")
TARGET_APK_V16 = os.path.join(BASE_DIR, "NamiAnime-v1.6-Latest.apk")
TARGET_APK_V15 = os.path.join(BASE_DIR, "NamiAnime-v1.5-Latest.apk")
TARGET_APK_MER = os.path.join(BASE_DIR, "MerDonghua-Latest.apk")

NEW_ASSETS_DIR = os.path.join(BASE_DIR, "frontend", "android", "app", "src", "main", "assets")

def update_apk():
    print(f"Reading base APK from: {SOURCE_APK}")
    temp_apk = os.path.join(BASE_DIR, "temp_updated.apk")
    
    # Files to collect from new assets
    new_asset_files = {}
    for root, _, files in os.walk(NEW_ASSETS_DIR):
        for f in files:
            full_p = os.path.join(root, f)
            # Skip embedding redundant giant APKs inside APK assets
            if f.endswith('.apk'):
                continue
            rel_p = os.path.relpath(full_p, NEW_ASSETS_DIR).replace("\\", "/")
            zip_target = f"assets/{rel_p}"
            new_asset_files[zip_target] = full_p

    print(f"Found {len(new_asset_files)} updated asset files to inject.")

    with zipfile.ZipFile(SOURCE_APK, 'r') as zin:
        with zipfile.ZipFile(temp_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                # Skip old public assets and old embedded apks
                if item.filename.startswith("assets/public/") or item.filename.endswith(".apk") and "assets/" in item.filename:
                    continue
                if item.filename == "assets/capacitor.config.json" or item.filename == "assets/capacitor.plugins.json":
                    continue
                # Copy original item
                data = zin.read(item.filename)
                zout.writestr(item, data)
            
            # Inject new assets
            for zip_path, file_path in new_asset_files.items():
                zout.write(file_path, arcname=zip_path)
                print(f"  Injected: {zip_path}")

    # Move to target outputs
    shutil.copy2(temp_apk, TARGET_APK_V16)
    if os.path.exists(temp_apk):
        os.remove(temp_apk)

    # Sign with v2 / v3 and zipalign using uber-apk-signer
    signer_jar = os.path.join(BASE_DIR, "tools", "uber-apk-signer.jar")
    if os.path.exists(signer_jar):
        print("\nSigning APK with official v2/v3 signature...")
        os.system(f'java -jar "{signer_jar}" --apks "{TARGET_APK_V16}" --overwrite --allowResign')

    shutil.copy2(TARGET_APK_V16, TARGET_APK_V15)
    shutil.copy2(TARGET_APK_V16, TARGET_APK_MER)
    
    # Also put in frontend/dist and frontend/public for download
    dist_public = os.path.join(BASE_DIR, "frontend", "dist")
    frontend_public = os.path.join(BASE_DIR, "frontend", "public")
    if os.path.exists(dist_public):
        shutil.copy2(TARGET_APK_V16, os.path.join(dist_public, "NamiAnime-v1.6-Latest.apk"))
        shutil.copy2(TARGET_APK_V16, os.path.join(dist_public, "app.apk"))
    if os.path.exists(frontend_public):
        shutil.copy2(TARGET_APK_V16, os.path.join(frontend_public, "NamiAnime-v1.6-Latest.apk"))
        shutil.copy2(TARGET_APK_V16, os.path.join(frontend_public, "app.apk"))

    size_mb = os.path.getsize(TARGET_APK_V16) / (1024 * 1024)
    print(f"\n[SUCCESS] Updated APK generated successfully!")
    print(f"Output: {TARGET_APK_V16} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    update_apk()
