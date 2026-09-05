import json
import urllib.request
import csv
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# Load catalog fallback map from CSV
csv_map = {}
if os.path.exists("ALL_MOVIES_CATALOG.csv"):
    with open("ALL_MOVIES_CATALOG.csv", "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 9 and row[8].startswith("http"):
                slug = row[3].strip()
                poster = row[8].strip()
                csv_map[slug] = poster

with open("backend/app/services/seed_export.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Checking {len(data['anime'])} anime posters...")
fixed_count = 0

for a in data["anime"]:
    slug = a.get("slug")
    poster = a.get("poster_url")
    is_working = False
    
    if poster and poster.startswith("http"):
        try:
            req = urllib.request.Request(poster, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    is_working = True
        except Exception:
            is_working = False
    elif poster and poster.startswith("/"):
        is_working = True

    if not is_working:
        print(f"Broken poster for [{a['id']}] {a['title']} ({slug}): {poster}")
        # Try CSV fallback
        if slug in csv_map:
            new_p = csv_map[slug]
            try:
                req = urllib.request.Request(new_p, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=3) as resp:
                    if resp.status == 200:
                        a["poster_url"] = new_p
                        a["banner_url"] = new_p
                        fixed_count += 1
                        print(f" -> FIXED with CSV poster: {new_p}")
            except Exception as e:
                print(f" -> CSV poster also failed: {e}")

# Save updated seed_export.json
with open("backend/app/services/seed_export.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Finished. Fixed {fixed_count} posters.")
