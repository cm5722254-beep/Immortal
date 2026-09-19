#!/usr/bin/env python3
"""
Apply new 50 movies data to:
1. ALL_MOVIES_PNG_IMAGES.json
2. frontend/public/data/catalog.json
3. backend/app/services/seed_export.json
4. Supabase Cloud Database (PostgreSQL)
5. Bump catalogService cache version to invalidate browser localStorage cache
"""
import asyncio
import json
import os
import sys
import asyncpg

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"d:\Huang-anime"
DATABASE_URL = "postgresql://postgres.tcrocbddnnfvwdpbokcb:NamiAnime2026%40Pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

NEW_DATA = {
  "generated_at": "2026-09-19",
  "total_movies": 50,
  "summary": {
    "valid_posters": 50,
    "empty_posters": 0,
    "valid_banners": 50,
    "empty_banners": 0
  },
  "movies": [
    {
      "id": 1,
      "title": "គុជអមតះធៀននី",
      "alt_title": "仙逆 (Xian Ni)",
      "slug": "renegade-immortal",
      "year": 2023,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/39/6e/e7/396ee7f0c71b61ebeb6a25b6381148fa.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/1200x/22/8b/1c/228b1c79d7985f5631611dac8ed97d19.jpg",
      "banner_status": "OK"
    },
    {
      "id": 2,
      "title": "ពិភពនៃថាមពលវេទមន្ត",
      "alt_title": "完美世界 (Wanmei Shijie)",
      "slug": "perfect-world",
      "year": 2021,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/3f/1a/10/3f1a10463df30c93c1918e85c0c2ade0.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/1200x/65/92/09/659209536e7e5272c8120bccddff0b0c.jpg",
      "banner_status": "OK"
    },
    {
      "id": 3,
      "title": "ដំណើស្វែងរកជីវិតអមតះ",
      "alt_title": "凡人修仙传 (Fanren Xiu Xian Chuan)",
      "slug": "a-record-of-a-mortals-journey-to-immortality",
      "year": 2020,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/236x/9b/1f/88/9b1f88a6f3018ba4ba70b629d13e805d.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/236x/9b/1f/88/9b1f88a6f3018ba4ba70b629d13e805d.jpg",
      "banner_status": "OK"
    },
    {
      "id": 4,
      "title": "ប្រយុទ្ទទៅកាន់មេឃា វគ្ក៥",
      "alt_title": "斗破苍穹 (Doupo Cangqiong)",
      "slug": "battle-through-the-heavens",
      "year": 2017,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/8a/c9/b8/8ac9b8efb39095d3ea3ee2d1c9da4949.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/8a/c9/b8/8ac9b8efb39095d3ea3ee2d1c9da4949.jpg",
      "banner_status": "OK"
    },
    {
      "id": 5,
      "title": "ទឹកដីថាមពលវិញ្ញាណ វគ្ក២",
      "alt_title": "斗罗大陆II绝世唐门 (Jueshi Tangmen)",
      "slug": "soul-land-2-the-peerless-tang-clan",
      "year": 2023,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/b7/56/fb/b756fb0ca3bc43f527eebc8707bca447.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/b7/56/fb/b756fb0ca3bc43f527eebc8707bca447.jpg",
      "banner_status": "OK"
    },
    {
      "id": 7,
      "title": "លេបផ្កាយ",
      "alt_title": "吞噬星空 (Tunshi Xingkong)",
      "slug": "swallowed-star",
      "year": 2020,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/03/d1/ce/03d1ceb946aec9c2dfde756005ba2111.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/03/d1/ce/03d1ceb946aec9c2dfde756005ba2111.jpg",
      "banner_status": "OK"
    },
    {
      "id": 8,
      "title": "ឆន្ទៈដ៏អស់កល្បជានិច្ច",
      "alt_title": "一念永恒 (Yi Nian Yong Heng)",
      "slug": "a-will-eternal",
      "year": 2020,
      "status": "UPCOMING",
      "poster_url": "https://i.pinimg.com/736x/a2/42/7d/a2427d906710467755ecf6c820bf3c58.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/a2/42/7d/a2427d906710467755ecf6c820bf3c58.jpg",
      "banner_status": "OK"
    },
    {
      "id": 9,
      "title": "សិស្សច្បងកំពូលល្បិច",
      "alt_title": "师兄啊师兄 (Shixiong A Shixiong)",
      "slug": "big-brother",
      "year": 2023,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/ed/31/a7/ed31a79e9a9d1498f63523261e78f147.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/ed/31/a7/ed31a79e9a9d1498f63523261e78f147.jpg",
      "banner_status": "OK"
    },
    {
      "id": 10,
      "title": "អាទិទេពកំណប់",
      "alt_title": "zhu zhanlong",
      "slug": "the-wealth-gods",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/c7/87/45/c787458d3959cbfc3948c1656d807c73.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/c7/87/45/c787458d3959cbfc3948c1656d807c73.jpg",
      "banner_status": "OK"
    },
    {
      "id": 11,
      "title": "បណ្ឌិតសភាក្បាច់គុណ",
      "alt_title": "Tần Vũ",
      "slug": "orientalmartialacademy",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/5d/4b/21/5d4b214b1e75899fbb4d2d90391f38b8.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/5d/4b/21/5d4b214b1e75899fbb4d2d90391f38b8.jpg",
      "banner_status": "OK"
    },
    {
      "id": 12,
      "title": "កំណត់ថ្ងៃក្លាយជាព្រះអាទិទេព",
      "alt_title": "",
      "slug": "a-good-day-to-ascend",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/83/a5/a3/83a5a359496821ff4f17415fd21e8241.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/83/a5/a3/83a5a359496821ff4f17415fd21e8241.jpg",
      "banner_status": "OK"
    },
    {
      "id": 13,
      "title": "កាំបិតមួយទៅកាន់ឋានសួគ៌",
      "alt_title": "Gu An",
      "slug": "one-slash-to-the-heavens",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/fa/32/4c/fa324c0b115fe61806b22ae9905f0d1c.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/fa/32/4c/fa324c0b115fe61806b22ae9905f0d1c.jpg",
      "banner_status": "OK"
    },
    {
      "id": 14,
      "title": "ព្រេងនិទានរបស់ព្រះ",
      "alt_title": "Qin Muer",
      "slug": "talesofherdinggods",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/1200x/1d/19/72/1d19726dbe508589ede095c875958681.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/1200x/1d/19/72/1d19726dbe508589ede095c875958681.jpg",
      "banner_status": "OK"
    },
    {
      "id": 15,
      "title": "ផ្នូររបស់ព្រះដែលដួលរលំ វគ្ក៣",
      "alt_title": "Chen Nan",
      "slug": "tomb-of-failen-god-season-3",
      "year": 2026,
      "status": "COMPLETED",
      "poster_url": "https://i.pinimg.com/736x/86/55/9f/86559fb7c7bb2246db219e9ad0abc3d0.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/86/55/9f/86559fb7c7bb2246db219e9ad0abc3d0.jpg",
      "banner_status": "OK"
    },
    {
      "id": 16,
      "title": "ខ្សែស្រឡាយនៃវាសនា៖ សង្គ្រាមដែលមិនធ្លាប់មាន",
      "alt_title": "",
      "slug": "threads-of-fate-a-war-untold",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/12/64/7f/12647fe7025f0904f1633fb0c4ae5b8d.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/12/64/7f/12647fe7025f0904f1633fb0c4ae5b8d.jpg",
      "banner_status": "OK"
    },
    {
      "id": 17,
      "title": "អាទិទេពដាវ ឈិនភីងអាន វគ្ក២",
      "alt_title": "Chen Ping An",
      "slug": "sword-of-coming",
      "year": 2026,
      "status": "COMPLETED",
      "poster_url": "https://i.pinimg.com/736x/57/57/79/5757799e6e9351029ef244b2417981af.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/57/57/79/5757799e6e9351029ef244b2417981af.jpg",
      "banner_status": "OK"
    },
    {
      "id": 18,
      "title": "ប្រហាអាទិទេព",
      "alt_title": "Li Chi Ye",
      "slug": "slay-the-gods",
      "year": 2026,
      "status": "COMPLETED",
      "poster_url": "https://i.pinimg.com/736x/32/f5/94/32f59467938bc19aaee13ab73c5af4d7.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/32/f5/94/32f59467938bc19aaee13ab73c5af4d7.jpg",
      "banner_status": "OK"
    },
    {
      "id": 19,
      "title": "ស្ដេចដាវអមតះ",
      "alt_title": "",
      "slug": "sword-and-fairy",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/d5/83/24/d58324f38c2bedb43015f00c68515509.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/d5/83/24/d58324f38c2bedb43015f00c68515509.jpg",
      "banner_status": "OK"
    },
    {
      "id": 20,
      "title": "មិនមែនពេលវាលានិងលំហរ",
      "alt_title": "Xu Qing",
      "slug": "beyondtimesgaze",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/0a/82/98/0a8298d7deb58e67ea47b3d05bab3a7e.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/0a/82/98/0a8298d7deb58e67ea47b3d05bab3a7e.jpg",
      "banner_status": "OK"
    },
    {
      "id": 21,
      "title": "ស្វែងរកអាថកំបាំងអាទិទេព",
      "alt_title": "Tu Pa Ye",
      "slug": "in-search-of-gods",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/9a/c6/14/9ac614043ee46e8578ee082cd381e542.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/9a/c6/14/9ac614043ee46e8578ee082cd381e542.jpg",
      "banner_status": "OK"
    },
    {
      "id": 22,
      "title": "ឃាតករអេលាន",
      "alt_title": "",
      "slug": "alian-among-immortal",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/34/19/e7/3419e70a2ed5c28fdce939b6183e29e9.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/2b/d7/b9/2bd7b915080d373af206ee9a7fc5592f.jpg",
      "banner_status": "OK"
    },
    {
      "id": 23,
      "title": "អ្នកប្រយុទ្ទឈាមនាគ",
      "alt_title": "",
      "slug": "coiling-dragon",
      "year": 2026,
      "status": "COMPLETED",
      "poster_url": "https://i.pinimg.com/736x/85/f4/13/85f4132843cf9564ce1ae2d667d4715e.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/85/f4/13/85f4132843cf9564ce1ae2d667d4715e.jpg",
      "banner_status": "OK"
    },
    {
      "id": 24,
      "title": "យប់នៃការស្លាប់",
      "alt_title": "",
      "slug": "ever-night",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/5e/3f/71/5e3f719adb339d6ebb63c9813e1bdacc.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/5e/3f/71/5e3f719adb339d6ebb63c9813e1bdacc.jpg",
      "banner_status": "OK"
    },
    {
      "id": 25,
      "title": "លោកប្ដីអឆរិយះ",
      "alt_title": "",
      "slug": "my-heroic-husband",
      "year": 2026,
      "status": "COMPLETED",
      "poster_url": "https://i.pinimg.com/1200x/3b/13/be/3b13be0dad49dc17433678d37be3a63e.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/1200x/3b/13/be/3b13be0dad49dc17433678d37be3a63e.jpg",
      "banner_status": "OK"
    },
    {
      "id": 26,
      "title": "បុព្វបុរសក្បាច់គុណ វគ្ក៦",
      "alt_title": "",
      "slug": "martial-universe-season-6",
      "year": 2026,
      "status": "COMPLETED",
      "poster_url": "https://i.pinimg.com/736x/3a/29/ec/3a29eccf17b88057ce0be75c5fbacd8d.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/3a/29/ec/3a29eccf17b88057ce0be75c5fbacd8d.jpg",
      "banner_status": "OK"
    },
    {
      "id": 27,
      "title": "យុទ្ទសិល្ប៍អមតះ វគ្ក៥",
      "alt_title": "",
      "slug": "immortality-season-5",
      "year": 2026,
      "status": "COMPLETED",
      "poster_url": "https://i.pinimg.com/736x/06/6b/68/066b682d2265a171addcd8e5217b5305.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/06/6b/68/066b682d2265a171addcd8e5217b5305.jpg",
      "banner_status": "OK"
    },
    {
      "id": 28,
      "title": "ផ្លូវមាគាកំសត់",
      "alt_title": "",
      "slug": "walking-the-way-all-alone",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/18/42/65/184265d092ec32c2d0cbf27c99e4edf6.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/18/42/65/184265d092ec32c2d0cbf27c99e4edf6.jpg",
      "banner_status": "OK"
    },
    {
      "id": 29,
      "title": "ដំណើទៅកាន់ឋាណះអាទិទេព",
      "alt_title": "",
      "slug": "apotheosis",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/5a/3c/f6/5a3cf6a7d9a918eda7416af8734d23d3.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/5a/3c/f6/5a3cf6a7d9a918eda7416af8734d23d3.jpg",
      "banner_status": "OK"
    },
    {
      "id": 30,
      "title": "ដំណើអធិរាធអមតះ",
      "alt_title": "",
      "slug": "back-as-immortal-lord",
      "year": 2026,
      "status": "COMPLETED",
      "poster_url": "https://i.pinimg.com/736x/49/bd/c4/49bdc43e562b23f6e4b7c6c512944b75.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/49/bd/c4/49bdc43e562b23f6e4b7c6c512944b75.jpg",
      "banner_status": "OK"
    },
    {
      "id": 31,
      "title": "ប្រឆាំងនិងវាសនា",
      "alt_title": "",
      "slug": "way-of-choices",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/e2/48/57/e24857dea6bbc8027405198edb47a759.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/e2/48/57/e24857dea6bbc8027405198edb47a759.jpg",
      "banner_status": "OK"
    },
    {
      "id": 32,
      "title": "រន្ទះដាវអ្នកប្រយុទ្ធ",
      "alt_title": "",
      "slug": "blades-of-the-guardians",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/1200x/b0/db/74/b0db74315169186b54c431d4cf8f4608.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/1200x/b0/db/74/b0db74315169186b54c431d4cf8f4608.jpg",
      "banner_status": "OK"
    },
    {
      "id": 33,
      "title": "ភ្លើងសង្រ្គាមបំផ្លាញលោក",
      "alt_title": "",
      "slug": "the-ravanges-of-time",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/11/6f/b9/116fb9c309be9f1173c63099df34f37b.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/11/6f/b9/116fb9c309be9f1173c63099df34f37b.jpg",
      "banner_status": "OK"
    },
    {
      "id": 34,
      "title": "ច្រកទ្វាអាថកំបាំង",
      "alt_title": "",
      "slug": "the-gate-of-mystical-realm",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/84/ae/2a/84ae2ac908a9327d7112b5f2506793b8.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/84/ae/2a/84ae2ac908a9327d7112b5f2506793b8.jpg",
      "banner_status": "OK"
    },
    {
      "id": 35,
      "title": "ត្រើយម្ខាងនែសំហរ",
      "alt_title": "",
      "slug": "the-other-side-of-deep-space",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/31/a1/9e/31a19e0da8777efc5ef3a68bd6ce4f11.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/31/a1/9e/31a19e0da8777efc5ef3a68bd6ce4f11.jpg",
      "banner_status": "OK"
    },
    {
      "id": 36,
      "title": "ដំណើទៅកាន់ឋាណះអាទិទេព វគ្ក២",
      "alt_title": "",
      "slug": "apotheosis-season-3",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/79/7a/ac/797aac6dadf0fa97807e31df277aacae.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/79/7a/ac/797aac6dadf0fa97807e31df277aacae.jpg",
      "banner_status": "OK"
    },
    {
      "id": 37,
      "title": "សម្ព័នមនុស្សអាក្រក់ វគ្ក៧",
      "alt_title": "",
      "slug": "the-degenerate-drawing-jianghu-season-7",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/1200x/14/53/65/1453658398b75682cb0c473a1cb33adc.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/1200x/14/53/65/1453658398b75682cb0c473a1cb33adc.jpg",
      "banner_status": "OK"
    },
    {
      "id": 38,
      "title": "គុកវិញ្ញាណ",
      "alt_title": "",
      "slug": "ling-cage",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpqehx9x7dUZGT2H2uQjwi_iS7NZWr22FyjbKCIe9yvvmhMF4I6HNSP74&s=10",
      "poster_status": "OK",
      "banner_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpqehx9x7dUZGT2H2uQjwi_iS7NZWr22FyjbKCIe9yvvmhMF4I6HNSP74&s=10",
      "banner_status": "OK"
    },
    {
      "id": 39,
      "title": "លោកប្ដីអឆរិយះ វគ្គ២",
      "alt_title": "",
      "slug": "my-heroic-husband-season-2",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/fd/a9/85/fda9855869dd3761b6d8539ea5e203ee.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/fd/a9/85/fda9855869dd3761b6d8539ea5e203ee.jpg",
      "banner_status": "OK"
    },
    {
      "id": 40,
      "title": "អាទិទេពអាស៊ូរ៉ា វគ្ក ២",
      "alt_title": "",
      "slug": "martial-gods-asura-season-2",
      "year": 2026,
      "status": "COMPLETED",
      "poster_url": "https://i.pinimg.com/736x/e0/b7/d2/e0b7d203f623b9120f4087a967cea239.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/e0/b7/d2/e0b7d203f623b9120f4087a967cea239.jpg",
      "banner_status": "OK"
    },
    {
      "id": 41,
      "title": "ដាវទេព ជូសៀន វគ្ក ៤",
      "alt_title": "",
      "slug": "jade-dynasty-season-4",
      "year": 2026,
      "status": "UPCOMING",
      "poster_url": "https://i.pinimg.com/736x/44/9d/1e/449d1e2e60a3caa200a86fd574be3540.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/44/9d/1e/449d1e2e60a3caa200a86fd574be3540.jpg",
      "banner_status": "OK"
    },
    {
      "id": 42,
      "title": "Dragon Ball",
      "alt_title": "",
      "slug": "dragon-ball",
      "year": 2026,
      "status": "UPCOMING",
      "poster_url": "https://i.pinimg.com/736x/d1/ec/56/d1ec56eaea2b1f7fb17834880083b383.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/d1/ec/56/d1ec56eaea2b1f7fb17834880083b383.jpg",
      "banner_status": "OK"
    },
    {
      "id": 43,
      "title": "Case Closed / Detective Conan",
      "alt_title": "",
      "slug": "case-closed-detective-conan",
      "year": 2026,
      "status": "UPCOMING",
      "poster_url": "https://i.pinimg.com/736x/23/6b/8d/236b8d5ce29ea4e637dc3943bed3a28c.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/23/6b/8d/236b8d5ce29ea4e637dc3943bed3a28c.jpg",
      "banner_status": "OK"
    },
    {
      "id": 44,
      "title": "Tokyo Revengers",
      "alt_title": "",
      "slug": "tokyo-revengers",
      "year": 2026,
      "status": "UPCOMING",
      "poster_url": "https://i.pinimg.com/736x/fd/dc/56/fddc56685aa3ebff2468da214b8b3404.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/fd/dc/56/fddc56685aa3ebff2468da214b8b3404.jpg",
      "banner_status": "OK"
    },
    {
      "id": 45,
      "title": "Hunter x Hunter",
      "alt_title": "",
      "slug": "hunter-x-hunter",
      "year": 2026,
      "status": "UPCOMING",
      "poster_url": "https://i.pinimg.com/736x/f6/68/a3/f668a3141dc9ccd4afb7e4545ca1cf6b.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/f6/68/a3/f668a3141dc9ccd4afb7e4545ca1cf6b.jpg",
      "banner_status": "OK"
    },
    {
      "id": 46,
      "title": "Solo leveling season 3",
      "alt_title": "",
      "slug": "solo-leveling-season-3",
      "year": 2026,
      "status": "UPCOMING",
      "poster_url": "https://i.pinimg.com/736x/a7/25/6d/a7256d015c48f7078922b6f3453df985.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/a7/25/6d/a7256d015c48f7078922b6f3453df985.jpg",
      "banner_status": "OK"
    },
    {
      "id": 47,
      "title": "Attack on Titan Season 1",
      "alt_title": "",
      "slug": "attack-on-titan-season-1",
      "year": 2026,
      "status": "UPCOMING",
      "poster_url": "https://i.pinimg.com/736x/d8/34/91/d83491ac30d4c7a2b64b42c7ed67b7b8.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/d8/34/91/d83491ac30d4c7a2b64b42c7ed67b7b8.jpg",
      "banner_status": "OK"
    },
    {
      "id": 48,
      "title": "អាទិទេពអាស៊ូរ៉ា វគ្ក ១",
      "alt_title": "",
      "slug": "martial-gods-asura-season-1",
      "year": 2026,
      "status": "UPCOMING",
      "poster_url": "https://i.pinimg.com/1200x/a0/80/20/a080205abbea3899119d02d0bab72df6.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/1200x/a0/80/20/a080205abbea3899119d02d0bab72df6.jpg",
      "banner_status": "OK"
    },
    {
      "id": 49,
      "title": "ប្រហាអាទិទេព វគ្ក២",
      "alt_title": "",
      "slug": "slay-the-gods-season-2",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/bd/4a/64/bd4a642e42e6c33354e1577341e42110.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/bd/4a/64/bd4a642e42e6c33354e1577341e42110.jpg",
      "banner_status": "OK"
    },
    {
      "id": 50,
      "title": "សង្គ្រាមគ្រោះមហន្តរាយ",
      "alt_title": "",
      "slug": "disaster-war",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/0d/31/88/0d318870eb2930c15dd9ab66623c36d3.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/0d/31/88/0d318870eb2930c15dd9ab66623c36d3.jpg",
      "banner_status": "OK"
    },
    {
      "id": 51,
      "title": "សង្ក្រាមអធិរាជ",
      "alt_title": "",
      "slug": "emperor-war",
      "year": 2026,
      "status": "ONGOING",
      "poster_url": "https://i.pinimg.com/736x/86/b4/2b/86b42b6c51b8191eb7a265d3ef9bd2fa.jpg",
      "poster_status": "OK",
      "banner_url": "https://i.pinimg.com/736x/86/b4/2b/86b42b6c51b8191eb7a265d3ef9bd2fa.jpg",
      "banner_status": "OK"
    }
  ]
}

async def update_all():
    # 1. Update ALL_MOVIES_PNG_IMAGES.json
    png_path = os.path.join(ROOT_DIR, "ALL_MOVIES_PNG_IMAGES.json")
    with open(png_path, "w", encoding="utf-8") as f:
        json.dump(NEW_DATA, f, ensure_ascii=False, indent=2)
    print(f"✅ 1. Saved exact new data to {png_path}")

    # 2. Update frontend/public/data/catalog.json
    cat_path = os.path.join(ROOT_DIR, "frontend", "public", "data", "catalog.json")
    if os.path.exists(cat_path):
        with open(cat_path, "r", encoding="utf-8") as f:
            catalog = json.load(f)

        movies_by_id = {m["id"]: m for m in NEW_DATA["movies"]}
        updated_anime_count = 0
        for a in catalog.get("anime", []):
            mid = a["id"]
            if mid in movies_by_id:
                nm = movies_by_id[mid]
                a["title"] = nm["title"]
                a["alt_title"] = nm["alt_title"]
                a["slug"] = nm["slug"]
                a["year"] = nm["year"]
                a["status"] = nm["status"]
                a["poster_url"] = nm["poster_url"]
                a["banner_url"] = nm["banner_url"]
                updated_anime_count += 1

        catalog["version"] = "3.0.0"
        with open(cat_path, "w", encoding="utf-8") as f:
            json.dump(catalog, f, ensure_ascii=False, indent=2)
        print(f"✅ 2. Updated {updated_anime_count} anime in {cat_path} (Version bumped to 3.0.0)")

    # 3. Update backend/app/services/seed_export.json
    seed_path = os.path.join(ROOT_DIR, "backend", "app", "services", "seed_export.json")
    if os.path.exists(seed_path):
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_data = json.load(f)

        movies_by_id = {m["id"]: m for m in NEW_DATA["movies"]}
        seed_count = 0
        for a in seed_data.get("anime", []):
            mid = a["id"]
            if mid in movies_by_id:
                nm = movies_by_id[mid]
                a["title"] = nm["title"]
                a["alt_title"] = nm["alt_title"]
                a["slug"] = nm["slug"]
                a["year"] = nm["year"]
                a["status"] = nm["status"]
                a["poster_url"] = nm["poster_url"]
                a["banner_url"] = nm["banner_url"]
                seed_count += 1

        seed_data["version"] = 3
        with open(seed_path, "w", encoding="utf-8") as f:
            json.dump(seed_data, f, ensure_ascii=False, indent=2)
        print(f"✅ 3. Updated {seed_count} anime in {seed_path}")

    # 4. Update Supabase Cloud Database (PostgreSQL)
    print("🔌 4. Connecting to Supabase...")
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    db_updated = 0
    for m in NEW_DATA["movies"]:
        mid = m["id"]
        # Check if ID exists
        row = await conn.fetchrow("SELECT id FROM anime WHERE id = $1", mid)
        if row:
            await conn.execute("""
                UPDATE anime
                SET title = $1,
                    alt_title = $2,
                    slug = $3,
                    year = $4,
                    status = $5::animestatus,
                    poster_url = $6,
                    banner_url = $7,
                    updated_at = NOW()
                WHERE id = $8
            """, m["title"], m["alt_title"], m["slug"], m["year"], m["status"], m["poster_url"], m["banner_url"], mid)
            db_updated += 1
        else:
            print(f"   Inserting new anime ID {mid}: {m['title']}")
            await conn.execute("""
                INSERT INTO anime (id, title, alt_title, slug, year, status, poster_url, banner_url, is_published, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6::animestatus, $7, $8, true, NOW(), NOW())
            """, mid, m["title"], m["alt_title"], m["slug"], m["year"], m["status"], m["poster_url"], m["banner_url"])
            db_updated += 1

    print(f"✅ 4. Updated/inserted {db_updated} anime records in Supabase Cloud DB!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(update_all())
