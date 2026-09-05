# MER DONGHUA — System Architecture

## Overview

MER DONGHUA is a full-stack anime & donghua streaming platform with the following architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  React 18 + TypeScript + Vite + Tailwind CSS (SPA)          │
│  Mobile: Capacitor (Android / iOS)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / REST API / JWT
┌──────────────────────▼──────────────────────────────────────┐
│                       API LAYER                              │
│  FastAPI (Python 3.12+) + SQLAlchemy 2 (Async)              │
│  Rate Limiting: slowapi | Auth: JWT + Argon2                 │
└───────────┬──────────────────────────┬──────────────────────┘
            │                          │
┌───────────▼──────────┐  ┌───────────▼──────────────────────┐
│     DATABASE          │  │         CACHE LAYER               │
│  PostgreSQL 16        │  │  Redis 7 (Upstash / Redis Cloud) │
│  (Supabase / Railway) │  │  Response caching, sessions       │
└──────────────────────┘  └───────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────┐
│                     MEDIA STORAGE                             │
│  Cloudflare R2 (Primary)    — Video files (HLS / MP4)        │
│  Cloudflare R2 (Mirror 1)   — Backup / CDN redundancy        │
│  Cloudflare R2 (Mirror 2)   — Additional redundancy          │
└──────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
Huang-anime/
├── .github/                    # GitHub Actions CI/CD
│   ├── workflows/
│   │   ├── build-ios.yml       # iOS build automation
│   │   └── secret-scan.yml     # Credential leak detection
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/                # Route handlers (endpoints)
│   │   ├── core/               # Config, security, database
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic layer
│   │   ├── dependencies/       # FastAPI dependency injection
│   │   └── utils/              # Helper utilities
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example            # ← Copy to .env, fill credentials
│
├── frontend/                   # React + TypeScript SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route-level page components
│   │   ├── services/           # API client (Axios)
│   │   ├── store/              # Zustand global state
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # Frontend utilities
│   ├── android/                # Capacitor Android project
│   ├── ios/                    # Capacitor iOS project
│   └── .env.example            # ← Copy to .env, fill credentials
│
├── modules/                    # Experimental language modules
│   ├── go_streamer/            # Go HLS streamer
│   ├── rust_wasm/              # Rust WASM components
│   ├── elixir_livechat/        # Elixir live chat
│   └── ...                     # 22 total language modules
│
├── tools/                      # Admin & automation scripts
│   ├── multi_server_uploader_gui.py
│   ├── video_downloader_gui.py
│   ├── import_iqiyi_dramas.py
│   └── ...
│
├── scripts/                    # Shell / Batch launcher scripts
├── docs/                       # Project documentation
├── .env.example                # ← Root env template
├── .gitignore                  # Comprehensive ignore rules
├── .gitattributes              # Line ending & binary rules
├── docker-compose.yml          # Full stack local dev
├── LICENSE                     # Proprietary license
├── SECURITY.md                 # Security disclosure policy
└── README.md                   # Project overview
```

## Data Flow

### Video Playback
1. User requests episode → Frontend sends `GET /api/v1/episodes/{id}`
2. Backend validates JWT + RBAC → Returns stream URL
3. Frontend HLS.js player fetches `.m3u8` playlist from Cloudflare R2
4. Video segments streamed directly from CDN (bypasses backend)

### Upload Flow
1. Admin uses `tools/multi_server_uploader_gui.py`
2. Tool uploads to 3× R2 servers in parallel
3. Admin calls API to register episode URL in database
4. Telegram broadcast sent to subscribers

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Passwords | Argon2id hashing |
| Auth | JWT (30m access + 7d refresh) |
| Authorization | RBAC (USER / ADMIN roles) |
| API | slowapi rate limiting |
| Secrets | .env files, git-ignored |
| Storage | Cloudflare R2 presigned URLs |
