# Deployment Guide

## Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- Docker & Docker Compose (for containerized deployment)
- PostgreSQL 16 (or use Supabase cloud)
- Redis 7 (or use Upstash cloud)

---

## 🐳 Option A: Docker Compose (Recommended for Local Dev)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Huang-anime

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your real credentials

# 3. Set up storage config
cp r2_config.example.json r2_config.json
# Edit r2_config.json with your Cloudflare R2 credentials

cp multi_server_config.example.json multi_server_config.json
# Edit multi_server_config.json with your server credentials

# 4. Start all services
docker compose up -d --build

# Services will be available at:
# - Frontend:  http://localhost:5173
# - Backend:   http://localhost:8000
# - API Docs:  http://localhost:8000/docs
# - PostgreSQL: localhost:5432
# - Redis:     localhost:6379
```

---

## ⚙️ Option B: Manual Setup

### Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Initialize database
python -m app.services.seed_data

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env:
# VITE_API_URL=http://localhost:8000

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## ☁️ Option C: Cloud Deployment

### Backend → Render / Railway

1. Connect your GitHub repo
2. Set environment variables in the dashboard (never put them in code!)
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend → Netlify

```bash
cd frontend
# netlify.toml is already configured
# Just connect repo to Netlify and set:
# VITE_API_URL = https://your-backend-url.render.com
```

### Frontend → Vercel

```bash
# vercel.json is already configured
vercel --prod
```

---

## 📱 Mobile Build

### Android

```bash
cd frontend

# Build web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# Or build APK via command line
cd android
./gradlew assembleRelease
```

### iOS

```bash
cd frontend
npm run build
npx cap sync ios
npx cap open ios
# Build from Xcode
```

---

## 🔄 Database Migrations

```bash
cd backend

# Run fast migration (auto-creates tables)
python fast_migrate.py

# Migrate to Supabase
python migrate_to_supabase.py
```

---

## 📊 Environment Variables Reference

See [`.env.example`](file:///d:/Huang-anime/.env.example) for all required variables.

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `R2_ACCESS_KEY` | Cloudflare R2 access key | ✅ |
| `R2_SECRET_KEY` | Cloudflare R2 secret key | ✅ |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for broadcasts | Optional |
| `FRONTEND_URL` | Allowed CORS origin | ✅ |
| `ENVIRONMENT` | `development` or `production` | ✅ |
