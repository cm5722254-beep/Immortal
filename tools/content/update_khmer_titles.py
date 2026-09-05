import os
import sys
import json
import sqlite3

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

KHMER_TITLE_MAPPINGS = {
    "renegade-immortal": {
        "title": "គុជអមតះធានី",
        "alt_title": "仙逆 (Renegade Immortal)",
    },
    "perfect-world": {
        "title": "ពិភពថាមពលវេទមន្ត",
        "alt_title": "完美世界 (Perfect World)",
    },
    "a-record-of-a-mortals-journey-to-immortality": {
        "title": "ហានលី",
        "alt_title": "凡人修仙传 (A Mortal's Journey to Immortality)",
    },
    "battle-through-the-heavens": {
        "title": "ប្រយុទ្ធទៅកាន់មេឃា",
        "alt_title": "斗破苍穹 (Battle Through the Heavens)",
    },
    "soul-land-2-the-peerless-tang-clan": {
        "title": "ទឹកដីថាមពលវិញ្ញាណ វគ្គ២",
        "alt_title": "斗罗大陆II绝世唐门 (Soul Land 2)",
    },
    "soul-land": {
        "title": "ទឹកដីថាមពលវិញ្ញាណ",
        "alt_title": "斗罗大陆 (Soul Land)",
    },
    "shrouding-the-heavens": {
        "title": "អាថ៌កំបាំងស្ថានសួគ៏",
        "alt_title": "遮天 (Shrouding the Heavens)",
    },
    "swallowed-star": {
        "title": "លេបផ្កាយ",
        "alt_title": "吞噬星空 (Swallowed Star)",
    },
    "a-will-eternal": {
        "title": "ឆន្ទៈអមតៈ",
        "alt_title": "一念永恒 (A Will Eternal)",
    },
    "big-brother": {
        "title": "សិស្សច្បងកំពូលល្បិច",
        "alt_title": "师兄啊师兄 (Big Brother / My Senior Brother is Too Steady)",
    },
    "my-senior-brother-is-too-steady": {
        "title": "សិស្សច្បងកំពូលល្បិច",
        "alt_title": "师兄啊师兄 (Big Brother)",
    },
    "the-great-ruler": {
        "title": "អ្នកគ្រប់គ្រងពិភព១០០០",
        "alt_title": "大主宰 (The Great Ruler)",
    },
    "martial-universe": {
        "title": "ពិភពក្បាច់គុន",
        "alt_title": "武动乾坤 (Martial Universe)",
    },
    "jade-dynasty": {
        "title": "ដាវទេពជូសៀន",
        "alt_title": "诛仙 (Jade Dynasty)",
    },
    "the-demon-hunter": {
        "title": "អ្នកប្រម៉ាញ់បិសាច",
        "alt_title": "沧元图 (The Demon Hunter)",
    },
    "demon-hunter": {
        "title": "អ្នកប្រម៉ាញ់បិសាច",
        "alt_title": "沧元图 (Demon Hunter)",
    },
    "immortality": {
        "title": "អមតៈភាពក្បាច់គុន",
        "alt_title": "永生 (Immortality)",
    },
    "stellar-transformations": {
        "title": "ការផ្លាស់ប្តូរតារា",
        "alt_title": "星辰变 (Stellar Transformations)",
    },
    "tales-of-demons-and-gods": {
        "title": "និទានព្រះនិងបិសាច",
        "alt_title": "妖神记 (Tales of Demons and Gods)",
    },
    "martial-master": {
        "title": "អាទិទេពសង្គ្រាមក្បាច់គុន",
        "alt_title": "武神主宰 (Martial Master)",
    },
    "apotheosis": {
        "title": "ដំណើរឆ្ពោះទៅរកកំរិតអាទិទេព",
        "alt_title": "百炼成神 (Apotheosis)",
    },
    "tomb-of-fallen-gods": {
        "title": "ផ្នូរអាទិទេព",
        "alt_title": "神墓 (Tomb of Fallen Gods)",
    },
    "tales-of-herding-gods": {
        "title": "និទានព្រះបុរាណ",
        "alt_title": "牧神记 (Tales of Herding Gods)",
    },
    "beyond-times-gaze": {
        "title": "វីរៈបុរសស៊ូឈីង",
        "alt_title": "光阴之外 (Beyond Time's Gaze)",
    },
    "beyond-time-gaze": {
        "title": "វីរៈបុរសស៊ូឈីង",
        "alt_title": "光阴之外 (Beyond Time's Gaze)",
    },
    "sword-of-coming": {
        "title": "ដាវទិពឈិនភីនអាន",
        "alt_title": "剑来 (Sword of Coming)",
    },
    "way-of-choices": {
        "title": "ជ្រើសរើសវាសនា",
        "alt_title": "择天记 (Way of Choices)",
    },
    "ze-tian-ji": {
        "title": "ជ្រើសរើសវាសនា",
        "alt_title": "择天记 (Way of Choices)",
    },
    "in-search-of-gods": {
        "title": "ដំណើរស្វែងរកអាទិទេព",
        "alt_title": "搜神记 (In Search of Gods)",
    },
    "supreme-god-emperor": {
        "title": "មហាទេវរាជ",
        "alt_title": "无上神帝 (Supreme God Emperor)",
    },
    "law-of-the-devil": {
        "title": "ច្បាប់បិសាច",
        "alt_title": "恶魔法则 (Law of the Devil)",
    },
    "coiling-dragon": {
        "title": "កំនើតវីរៈបុរសនាគរាជ",
        "alt_title": "盘龙 (Coiling Dragon)",
    },
    "aliens-among-immortals": {
        "title": "កំពូលឃាតករគ្មានគូប្រៀប",
        "alt_title": "一人之下 (Aliens Among Immortals)",
    },
    "ever-night": {
        "title": "រាត្រីអន្ធការ",
        "alt_title": "将夜 (Ever Night)",
    },
    "slay-the-gods": {
        "title": "ប្រហារព្រះ",
        "alt_title": "斩神 (Slay the Gods)",
    },
    "legend-of-xianwu": {
        "title": "ព្រេងនិទានស៊ានវូ",
        "alt_title": "仙武帝尊 (Legend of Xianwu)",
    },
    "back-as-immortal-lord": {
        "title": "ខ្សែជីវិតអធិរាជអមតៈ",
        "alt_title": "重生之尊 (Back as Immortal Lord)",
    },
    "walking-the-way-all-alone": {
        "title": "ខ្សែជីវិតឯការ",
        "alt_title": "独步万界 (Walking the Way all Alone)",
    },
    "martia-god-asura": {
        "title": "ក្បាច់គុនព្រះអសុរ៉ា",
        "alt_title": "修罗武神 (Martial God Asura)",
    },
    "martial-god-asura": {
        "title": "ក្បាច់គុនព្រះអសុរ៉ា",
        "alt_title": "修罗武神 (Martial God Asura)",
    },
    "my-husband-heroic": {
        "title": "លោកប្តីអស្ចារ្យ",
        "alt_title": "赘婿 (My Husband Heroic)",
    },
    "heroic-husband": {
        "title": "លោកប្តីអស្ចារ្យ",
        "alt_title": "赘婿 (My Husband Heroic)",
    },
    "oriental-martial-academy": {
        "title": "បណ្ឌិតសភាក្បាច់គុនបូព៌ា",
        "alt_title": "东方武院 (Oriental Martial Academy)",
    },
    "a-good-day-to-ascend": {
        "title": "កំណត់ថ្ងៃក្លាយជាអាទិទេព",
        "alt_title": "飞升归日 (A Good Day to Ascend)",
    },
    "threads-of-fate": {
        "title": "ពិភពអាថ៏កំបាំង",
        "alt_title": "诡秘之主 (Threads of Fate: A War Untold)",
    },
    "threads-of-fate-a-war-untold": {
        "title": "ពិភពអាថ៏កំបាំង",
        "alt_title": "诡秘之主 (Threads of Fate: A War Untold)",
    },
    "sword-and-fairy": {
        "title": "ដាវអមត:ជីងធាន",
        "alt_title": "仙剑奇侠传 (Sword and Fairy)",
    },
    "the-wealth-gods": {
        "title": "ស្តេចកំណប់ទូចានឡុង",
        "alt_title": "猪八戒 / 财神 (Zhu Zhanlong)",
    },
    "zhu-zhanlong": {
        "title": "ស្តេចកំណប់ទូចានឡុង",
        "alt_title": "朱瞻墡 (Zhu Zhanlong)",
    },
    "ling-cage": {
        "title": "គុកវិញ្ញាណ",
        "alt_title": "灵笼 (Ling Cage)",
    },
    "the-other-side-of-deep-space": {
        "title": "អាថ៌កំបាំងលំហ",
        "alt_title": "深空彼岸 (The Other Side of Deep Space)",
    },
    "against-the-gods": {
        "title": "អាទិទេពប្រឆាំងស្ថានសួគ៌",
        "alt_title": "逆天邪神 (Against the Gods)",
    },
    "the-gate-of-mystical-realm": {
        "title": "ច្រកទ្វារវេទមន្តអាថ៏កំបាំង",
        "alt_title": "玄门之界 (The Gate of Mystical Realm)",
    },
    "the-degenerate-drawing-jianghu": {
        "title": "សម្ពន្ធ័មនុស្សអាក្រក់",
        "alt_title": "画江湖之不良人 (The Degenerate-Drawing Jianghu)",
    },
    "urban-miracle-doctor": {
        "title": "គ្រូពេទ្យទេវតា",
        "alt_title": "都市绝品仙医 (Urban Miracle Doctor)",
    },
    "dragon-prince-yuan": {
        "title": "រាជបុត្រនាគរាជ",
        "alt_title": "元尊 (Dragon Prince Yuan)",
    },
    "orientalmartialacademy": {
        "title": "បណ្ឌិតសភាក្បាច់គុនបូព៌ា",
        "alt_title": "东方武院 (Oriental Martial Academy)",
    },
    "one-slash-to-the-heavens": {
        "title": "មួយកាំបិតរញ្ជួយមេឃ",
        "alt_title": "顾安 / 一刀震天 (Gu An / One Slash To The Heavens)",
    },
    "talesofherdinggods": {
        "title": "និទានព្រះបុរាណ",
        "alt_title": "牧神记 (Tales of Herding Gods)",
    },
    "tomb-of-failen-god-season-3": {
        "title": "ផ្នូរអាទិទេព រដូវទី៣",
        "alt_title": "神墓 第三季 (Tomb of Fallen Gods S3)",
    },
    "beyondtimesgaze": {
        "title": "វីរៈបុរសស៊ូឈីង",
        "alt_title": "光阴之外 (Beyond Time's Gaze)",
    },
    "alian-among-immortal": {
        "title": "កំពូលឃាតករគ្មានគូប្រៀប",
        "alt_title": "一人之下 (Aliens Among Immortals)",
    },
    "blades-of-the-guardians": {
        "title": "រន្ទះដាវឆ្មាំពិឃាត",
        "alt_title": "镖人 (Blades of the Guardians)",
    },
    "the-ravanges-of-time": {
        "title": "ភ្លើងសង្គ្រាមបំផ្លាញផែនដី",
        "alt_title": "火凤燎原 (The Ravages of Time)",
    },
    "martial-gods-asura-season-2": {
        "title": "ក្បាច់គុនព្រះអសុរ៉ា រដូវកាលទី០២",
        "alt_title": "修罗武神 第二季 (Martial God Asura S2)",
    },
    "martial-gods-asura-season-1": {
        "title": "ក្បាច់គុនព្រះអសុរ៉ា រដូវកាលទី០១",
        "alt_title": "修罗武神 第一季 (Martial God Asura S1)",
    },
    "dragon-ball": {
        "title": "ដ្រាហ្គនបល",
        "alt_title": "七龙珠 (Dragon Ball)",
    },
    "case-closed-detective-conan": {
        "title": "កូណាន់",
        "alt_title": "名侦探柯南 (Detective Conan)",
    },
    "tokyo-revengers": {
        "title": "តូក្យូរីវេនជឺ",
        "alt_title": "东京复仇者 (Tokyo Revengers)",
    },
    "hunter-x-hunter": {
        "title": "ហាន់ទ័រ",
        "alt_title": "全职猎人 (Hunter x Hunter)",
    },
    "solo-leveling-season-3": {
        "title": "ឡើងកម្រិតទោល រដូវទី៣",
        "alt_title": "我独自升级 (Solo Leveling Season 3)",
    },
    "attack-on-titan-season-1": {
        "title": "យក្សវាយលុកទីក្រុង",
        "alt_title": "进击的巨人 (Attack on Titan)",
    },
    "eclipse-of-illusion": {
        "title": "ស្រមោលអាថ៏កំបាំង",
        "alt_title": "幻影 (Eclipse of Illusion)",
    },
}

def clean_title(title: str) -> str:
    """Helper to clean leading 'រឿង' or 'រឿង ' from title string"""
    t = title.strip()
    if t.startswith("រឿង "):
        return t[5:].strip()
    elif t.startswith("រឿង"):
        return t[4:].strip()
    return t

def update_titles():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    seed_path = os.path.join(base_dir, "backend", "app", "services", "seed_export.json")
    db_path = os.path.join(base_dir, "backend", "merdonghua.db")

    print(f"[*] Updating seed_export.json at {seed_path}...")
    if os.path.exists(seed_path):
        with open(seed_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        updated_count = 0
        for anime in data.get("anime", []):
            slug = anime.get("slug", "").lower().strip()
            
            # Match directly or by keyword
            matched_key = None
            if slug in KHMER_TITLE_MAPPINGS:
                matched_key = slug
            else:
                for k in KHMER_TITLE_MAPPINGS:
                    if k in slug or slug in k:
                        matched_key = k
                        break

            if matched_key:
                mapping = KHMER_TITLE_MAPPINGS[matched_key]
                new_title = clean_title(mapping["title"])
                anime["title"] = new_title
                anime["alt_title"] = mapping["alt_title"]
                print(f"  [OK] [{anime['id']}] -> {anime['title']} | {anime['alt_title']}")
                updated_count += 1
            else:
                # Also strip any leading 'រឿង' from current title if present
                old_t = anime.get("title", "")
                cleaned_t = clean_title(old_t)
                if old_t != cleaned_t:
                    anime["title"] = cleaned_t
                    print(f"  [OK-Clean] [{anime['id']}] {old_t} -> {cleaned_t}")
                    updated_count += 1

        with open(seed_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[OK] Successfully updated {updated_count} anime titles in seed_export.json!")

    # Update SQLite database if exists
    if os.path.exists(db_path):
        print(f"[*] Updating SQLite database at {db_path}...")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        db_updated = 0
        cur.execute("SELECT id, slug, title FROM anime")
        rows = cur.fetchall()
        for row in rows:
            aid, slug, current_title = row
            slug_clean = slug.lower().strip() if slug else ""
            
            matched_key = None
            if slug_clean in KHMER_TITLE_MAPPINGS:
                matched_key = slug_clean
            else:
                for k in KHMER_TITLE_MAPPINGS:
                    if k in slug_clean or slug_clean in k:
                        matched_key = k
                        break

            if matched_key:
                mapping = KHMER_TITLE_MAPPINGS[matched_key]
                new_title = clean_title(mapping["title"])
                cur.execute(
                    "UPDATE anime SET title = ?, alt_title = ? WHERE id = ?",
                    (new_title, mapping["alt_title"], aid)
                )
                db_updated += 1
            else:
                cleaned_t = clean_title(current_title or "")
                if current_title != cleaned_t:
                    cur.execute(
                        "UPDATE anime SET title = ? WHERE id = ?",
                        (cleaned_t, aid)
                    )
                    db_updated += 1

        conn.commit()
        conn.close()
        print(f"[OK] Successfully updated {db_updated} anime titles in merdonghua.db!")

    # Upload to Cloudflare R2 Cloud Storage
    try:
        sys.path.insert(0, os.path.join(base_dir, "backend"))
        from app.services.r2_backup_service import upload_backup_to_r2_sync
        with open(seed_path, "r", encoding="utf-8") as f:
            full_data = json.load(f)
        r2_ok = upload_backup_to_r2_sync(full_data)
        print(f"[OK] Synced cleaned titles to Cloudflare R2: {r2_ok}")
    except Exception as e:
        print(f"[WARN] R2 sync error: {e}")

if __name__ == "__main__":
    update_titles()
