# 📘 ការណែនាំ Deploy ប្រព័ន្ធ Auto-Download & Upload Telegram ឲ្យដើរ ២៤ ម៉ោងលើ Cloud (Method 2)

ឯកសារនេះណែនាំពីរបៀបដាក់ដំណើរការប្រព័ន្ធ **MerDonghua Website → FFmpeg Compress → Telegram Channel Auto-Upload** ឲ្យរត់ស្វ័យប្រវត្តិ **២៤ ម៉ោងលើ Cloud (បិទកុំព្យូទ័រចោលបាន ១០០%)** ដោយមិនប៉ះទង្គិច Session (`AuthKeyDuplicatedError`)។

---

## ⚠️ ហេតុអ្វីត្រូវការ Cloud Server RAM យ៉ាងតិច 2 GB – 4 GB?
1. វីដេអូដើមនៅលើ Cloudflare R2 មានទំហំធំៗ **550 MB – 1.3 GB ក្នុង ១ ភាគ** (ឧ. ភាគ ១ = 1,311.5 MB)។
2. Cloud Free Plan (ដូចជា Render Free 512 MB RAM) **មិនគ្រប់គ្រាន់** សម្រាប់បើក FFmpeg បង្រួមវីដេអូ 1.3 GB ទៅ `720p_low_mb` ទេ (វានឹងគាំង RAM / Restart រហូត)។
3. ប្រព័ន្ធថ្មីបានបន្ថែម `-threads 2` លើ FFmpeg និងលុបឯកសារធំ ~1.3 GB ចោលភ្លាមៗបន្ទាប់ពីបង្រួមរួច ដើម្បីសន្សំ RAM និង Disk អតិបរមា។

---

## 🔐 ជំហានទី ១៖ បង្កើត Exclusive `TELEGRAM_USER_SESSION` សម្រាប់ Cloud តែមួយគត់

ដើម្បីកុំឲ្យគាំង `AuthKeyDuplicatedError`, **ហាមដាច់ខាត** យក Session តែមួយទៅរត់លើកុំព្យូទ័រ និង Cloud ក្នុងពេលតែមួយ!

នៅលើកុំព្យូទ័រ សូមបង្កើត Session ថ្មីផ្ដាច់មុខសម្រាប់ Cloud ដោយប្រើ Script នេះ៖

```bash
python tools/telegram_sync/generate_cloud_session.py
```

ឬប្រើបែប ២ ជំហាន៖

```bash
python tools/telegram_sync/generate_cloud_session.py --send-code
python tools/telegram_sync/generate_cloud_session.py --verify-code <លេខកូដ_OTP>
```

បន្ទាប់មក Copy កូដ `TELEGRAM_USER_SESSION` ដែលចេញមកទុកប្រើក្នុងជំហានបន្ទាប់ (**កុំ Push ចូល Git ឲ្យសោះ**)។

---

## 🌐 អថេរបរិស្ថាន (Environment Variables) ចាំបាច់

| Variable | តម្លៃណែនាំ | មុខងារ |
|---|---|---|
| `TELEGRAM_USER_SESSION` | `<កូដ Session ថ្មីផ្ដាច់មុខ>` | បើក Auto-Sync 24/7 លើ Cloud ស្វ័យប្រវត្តិ |
| `ENABLE_24_7_SYNC` | `1` | បើកមុខងារ Watcher ត្រួតពិនិត្យភាគថ្មីរៀងរាល់ ៥ នាទី |
| `COMPRESSION_PRESET` | `720p_low_mb` | បង្រួមវីដេអូពី 1.3GB មកតូចច្បាស់ងាយ Upload |
| `FORCE_24_7_SYNC` | `1` | *(សម្រាប់ Docker / Worker ផ្ដាច់មុខ)* បើកទោះ OS ណាក៏ដោយ |
| `ENABLE_BOT_COMMANDS` | `0` (Render Backend) / `1` (VPS Worker ទោល) | បើក Command Bot `@animeflickh_bot` លើករណីគ្មាន Backend មេ |

---

## 🚀 ជម្រើសទី A៖ ប្រើ Render Standard Plan (2 GB RAM ឡើងទៅ) លើ Backend ស្រាប់

ប្រសិនបើបង Upgrade Service `immortal-s7ui` នៅលើ Render ពី Free (512 MB) ទៅ **Standard (2 GB RAM)**៖
1. ចូលទៅ **Render Dashboard → Environment Variables** របស់ Service បង។
2. បន្ថែម ឬកែប្រែ៖
   - `TELEGRAM_USER_SESSION` = `<Session ថ្មីផ្ដាច់មុខពីជំហានទី ១>`
   - `ENABLE_24_7_SYNC` = `1`
   - `COMPRESSION_PRESET` = `720p_low_mb`
3. ចុច **Save & Deploy** → ប្រព័ន្ធនឹងត្រួតពិនិត្យ Channel ទាំងអស់ ៨ វិនាទីក្រោយ Boot រួចចាប់ផ្ដើម Download + Compress + Upload រឿងដែលមិនទាន់គ្រប់ភាគដោយស្វ័យប្រវត្តិ ២៤ ម៉ោង។
4. ពិនិត្យស្ថានភាពតាម Website: `https://immortal-s7ui.onrender.com/api/health` ឬតាម Telegram Bot `@animeflickh_bot` ដោយវាយ `/sync_status`, `/sync_audit`, `/sync_start`, `/sync_stop`។

---

## 🐳 ជម្រើសទី B៖ Deploy លើ Cloud VPS / Railway / Contabo / DigitalOcean (RAM 2GB–4GB) ដោយ Docker

ឯកសារត្រៀមស្រាប់សម្រាប់ Cloud VPS មាននៅ៖
- `tools/telegram_sync/cloud_sync_worker.py`
- `tools/telegram_sync/Dockerfile.cloud`
- `tools/telegram_sync/docker-compose.cloud.yml`

### របៀប Run លើ Linux VPS (Ubuntu/Debian 2GB–4GB RAM)៖
```bash
git clone https://github.com/cm5722254-beep/Immortal.git
cd Immortal

cat << 'EOF' > .env.cloud
TELEGRAM_USER_SESSION=YOUR_EXCLUSIVE_SESSION_STRING
ENABLE_24_7_SYNC=1
COMPRESSION_PRESET=720p_low_mb
EOF

docker compose --env-file .env.cloud -f tools/telegram_sync/docker-compose.cloud.yml up -d --build
```

- មើល Log ផ្ទាល់៖ `docker logs -f merdonghua_tg_sync_24_7`
- បើក Dashboard តាម Browser៖ `http://<VPS_IP>:8080/` (ស្វ័យ Refresh រៀងរាល់ ៨ វិនាទី)
- Checkpoint ត្រូវបានរក្សាទុកក្នុង Docker Volume `/data/telegram_sync` មិនបាត់ទេទោះ Restart Server។

---

## 🛡️ ច្បាប់សុវត្ថិភាពសំខាន់បំផុត (ត្រូវចងចាំ!)
1. **បិទ Local Studio ចោល** នៅពេល Cloud កំពុងប្រើ `TELEGRAM_USER_SESSION` (ឬបើចង់បើកតេស្តលើកុំព្យូទ័រ ត្រូវប្រើ Session ផ្សេងដាច់ដោយឡែកពី Cloud ជានិច្ច)។
2. ភាគខ្លីក្រោម **60 វិនាទី** និង Link Trailer (`EP000.mp4`, `{id}`) ត្រូវបានរំលងស្វ័យប្រវត្តិ មិន Upload ចូល Channel ឡើយ។
3. Caption រក្សាទម្រង់ដើមជានិច្ច៖
```text
👉Episode : {ep_num}
👉Quality : 4K Ultra HD
👉Subtitle : Chinese

កុំភ្លេចហៅមិត្តភក្តិឲ្យមើលឲ្យច្រើនៗណាដើម្បីលើកទឹកចិត្ត Admin អគុណ❤️។
```
