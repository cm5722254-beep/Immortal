#!/usr/bin/env python3
"""Safely update local website episode URLs from completed R2 upload rows."""

import argparse
import csv
import json
import os
import re
import tempfile
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_CSV = Path(r"C:\Users\DI Fight\Downloads\r2_uploaded_videos.csv")
SEED_FILE = ROOT_DIR / "backend" / "app" / "services" / "seed_export.json"
STATIC_CATALOG_FILE = ROOT_DIR / "frontend" / "public" / "data" / "catalog.json"

# Explicit title aliases based on the repository's verified CSV-to-anime mapping.
TITLE_TO_ANIME_ID = {
    "ក្បាច់គុនព្រះអសុរ៉ា": 40,
    "កំណត់ថ្ងៃក្លាយជាអាទិទេព": 12,
    "កំនើតវីរៈបុរសនាគរាជ": 23,
    "កំពូលឃាតករគ្មានគូប្រៀប": 22,
    "ខ្សែជីវិតឯការ": 28,
    "ខ្សែជីវិតអធិរាជអមតៈ": 30,
    "គុកវិញ្ញាណ": 38,
    "គុជអមតះធានី": 1,
    "គ្រូពេទ្យទេវតា": 50,
    "ច្បាប់បិសាច": 56,
    "ច្រកទ្វារវេទមន្តអាថ៏កំបាំង": 34,
    "ឆន្ទៈអមតៈ": 8,
    "ជ្រើសរើសវាសនា": 31,
    "ដាវទិពឈិនភីនអាន": 17,
    "ដាវទេពជូសៀន": 41,
    "ដាវអមត ជីងធាន": 19,
    "ដំណើរឆ្ពោះទៅរកកំរិតអាទិទេព": 29,
    "ដំណើរស្វែងរកអាទិទេព": 21,
    "ទឹកដីថាមពលវិញ្ញាណ វគ្គ២": 5,
    "ទេពធីតាអមតៈ": 54,
    "លេបផ្កាយ": 7,
    "និទានព្រះបុរាណ": 14,
    "បណ្ឌិតសភាក្បាច់គុនបូព៌ា": 11,
    "ប្រយុទ្ធទៅកាន់មេឃា វគ្គ៥": 4,
    "ប្រហារព្រះ": 18,
    "ប្រហារព្រះ វគ្ក២": 49,
    "ផ្នូរអាទិទេព រដូវទី៣": 15,
    "ពិភពថាមពលវេទមន្ត": 2,
    "ពិភពនៃក្បាច់គុន វគ្គ៦": 26,
    "ពិភពអាថ៏កំបាំង": 16,
    "ភ្លើងសង្គ្រាមបំផ្លាញផែនដី": 33,
    "មួយកាំបិតរញ្ជួយមេឃ": 13,
    "រន្ទះដាវឆ្មាំពិឃាត": 32,
    "រាត្រីអន្ធការ": 24,
    "លោកប្តីអស្ចារ្យ": 25,
    "វីរៈបុរសស៊ូឈីង": 20,
    "សង្គ្រាមគ្រោះមហន្តរាយ": 67,
    "សង្គ្រាមស្ដេចអមតៈ": 68,
    "សម្ពន្ធ័មនុស្សអាក្រក់": 37,
    "សិស្សច្បងកំពូលល្បិច": 9,
    "ស្តេចកំណប់ទូចានឡុង": 10,
    "ហានលី": 3,
    "Dragon Ball": 42,
    "Case Closed / Detective Conan": 43,
    "Tokyo Revengers": 44,
    "Hunter x Hunter": 45,
    "Solo leveling season 3": 46,
    "Attack on Titan Season 1": 47,
}

KHMER_DIGITS = str.maketrans("០១២៣៤៥៦៧៨៩", "0123456789")
INVISIBLE_CHARS = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff"), None)
EPISODE_SUFFIX = re.compile(
    r"^(?P<title>.+?)\s+(?:ភាគ\s*(?P<khmer>[0-9០-៩]+)|"
    r"(?:episode|ep\.?)\s*(?P<english>[0-9]+)|E(?P<short>[0-9]{1,3}))\s*$",
    re.IGNORECASE,
)


def normalize_title(value: str) -> str:
    value = unicodedata.normalize("NFC", value.translate(INVISIBLE_CHARS))
    return " ".join(value.split()).strip()


def parse_title_and_episode(row: dict[str, str]) -> tuple[str, int] | None:
    clean_title = normalize_title(row.get("Clean Movie Title", ""))
    match = EPISODE_SUFFIX.fullmatch(clean_title)
    if match:
        number = match.group("khmer") or match.group("english") or match.group("short")
        return normalize_title(match.group("title")), int(number.translate(KHMER_DIGITS))

    filename_match = re.search(r"(?:ep|episode)[-_ ]?([0-9]+)", row.get("Filename", ""), re.I)
    if filename_match:
        return clean_title, int(filename_match.group(1))
    return None


def load_source_rows(csv_path: Path) -> tuple[list[tuple[int, int, str]], Counter[str], Counter[str]]:
    title_ids = {normalize_title(title): anime_id for title, anime_id in TITLE_TO_ANIME_ID.items()}
    pending: Counter[str] = Counter()
    unresolved: Counter[str] = Counter()
    candidates: dict[tuple[int, int], set[str]] = defaultdict(set)

    with csv_path.open("r", encoding="utf-8-sig", newline="") as source:
        rows = csv.DictReader(source)
        required = {"Status", "Clean Movie Title", "Public URL"}
        if not rows.fieldnames or not required.issubset(rows.fieldnames):
            raise ValueError(f"CSV must contain columns: {', '.join(sorted(required))}")

        for row in rows:
            status = (row.get("Status") or "").strip().lower()
            if status != "completed":
                pending[status or "empty"] += 1
                continue

            url = (row.get("Public URL") or "").strip()
            parsed = parse_title_and_episode(row)
            if not url or not parsed:
                unresolved[normalize_title(row.get("Clean Movie Title", "(empty title)"))] += 1
                continue

            series_title, episode_number = parsed
            anime_id = title_ids.get(series_title)
            if anime_id is None:
                unresolved[series_title] += 1
                continue
            candidates[(anime_id, episode_number)].add(url)

    conflicts = Counter()
    updates = []
    for (anime_id, episode_number), urls in candidates.items():
        if len(urls) != 1:
            conflicts[f"anime {anime_id}, episode {episode_number}"] += 1
            continue
        updates.append((anime_id, episode_number, next(iter(urls))))
    return updates, pending, unresolved + conflicts


def plan_dataset(data: dict[str, Any], updates: list[tuple[int, int, str]]) -> tuple[int, int, int, int]:
    episode_rows = data.get("episodes", [])
    episode_keys = Counter((episode.get("anime_id"), episode.get("episode_number")) for episode in episode_rows)
    episode_by_key = {
        (episode.get("anime_id"), episode.get("episode_number")): episode
        for episode in episode_rows
        if episode_keys[(episode.get("anime_id"), episode.get("episode_number"))] == 1
    }

    changed = identical = missing = ambiguous = 0
    for anime_id, episode_number, url in updates:
        key = (anime_id, episode_number)
        if episode_keys[key] > 1:
            ambiguous += 1
            continue
        episode = episode_by_key.get(key)
        if episode is None:
            missing += 1
        elif (episode.get("video_url") or "").strip() == url:
            identical += 1
        else:
            changed += 1
    return changed, identical, missing, ambiguous


def write_json_with_backup(path: Path, data: dict[str, Any]) -> None:
    backup = path.with_suffix(path.suffix + ".bak")
    if not backup.exists():
        backup.write_bytes(path.read_bytes())
    descriptor, temporary = tempfile.mkstemp(prefix=f"{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as output:
            json.dump(data, output, ensure_ascii=False, indent=2)
            output.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def apply_updates(path: Path, updates: list[tuple[int, int, str]]) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    episode_rows = data.get("episodes", [])
    episode_counts = Counter((episode.get("anime_id"), episode.get("episode_number")) for episode in episode_rows)
    episode_by_key = {
        (episode.get("anime_id"), episode.get("episode_number")): episode
        for episode in episode_rows
        if episode_counts[(episode.get("anime_id"), episode.get("episode_number"))] == 1
    }
    changed = 0
    for anime_id, episode_number, url in updates:
        episode = episode_by_key.get((anime_id, episode_number))
        if episode is not None and (episode.get("video_url") or "").strip() != url:
            episode["video_url"] = url
            changed += 1
    if changed:
        write_json_with_backup(path, data)
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--seed", type=Path, default=SEED_FILE)
    parser.add_argument("--catalog", type=Path, default=STATIC_CATALOG_FILE)
    parser.add_argument("--apply", action="store_true", help="Write updates; default is dry-run")
    args = parser.parse_args()

    updates, pending, unresolved = load_source_rows(args.csv)
    print(f"Unique mapped completed episode links: {len(updates)}")
    print(f"Non-completed CSV rows left untouched: {sum(pending.values())}")
    for path in (args.seed, args.catalog):
        data = json.loads(path.read_text(encoding="utf-8"))
        changed, identical, missing, ambiguous = plan_dataset(data, updates)
        print(f"{path.relative_to(ROOT_DIR) if path.is_relative_to(ROOT_DIR) else path}:")
        print(f"  URL changes: {changed}; already current: {identical}; episode absent: {missing}; duplicate target key: {ambiguous}")

    if unresolved:
        print(f"Unmatched/conflicting CSV title rows: {sum(unresolved.values())}")
        for title, count in sorted(unresolved.items()):
            print(f"  {count} row(s): {title}")

    if args.apply:
        for path in (args.seed, args.catalog):
            changed = apply_updates(path, updates)
            print(f"Applied {changed} URL change(s) to {path}")
    else:
        print("Dry run only. Pass --apply to update the local JSON catalogs.")


if __name__ == "__main__":
    main()