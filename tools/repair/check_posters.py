import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
seed_file = os.path.join(base_dir, "backend", "app", "services", "seed_export.json")

with open(seed_file, "r", encoding="utf-8") as f:
    data = json.load(f)

for a in data.get("anime", []):
    if a.get("id") in [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]:
        print(f"[{a.get('id')}] {a.get('title')} | slug: {a.get('slug')}")
        print(f"   poster: {a.get('poster_url')}")
