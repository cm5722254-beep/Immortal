# MER DONGHUA (墨尔动画)
### Anime & Donghua Streaming Platform

> **Anime & Donghua — Anytime, Anywhere.**
> A high-performance, full-stack video streaming platform.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python)](backend/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](frontend/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi)](backend/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](frontend/)
[![Security Scan](https://github.com/your-org/your-repo/actions/workflows/secret-scan.yml/badge.svg)](.github/workflows/secret-scan.yml)

---

## 🌟 Features

### 🎬 Streaming & User Experience
- **Cinematic Dark Theme** — dark gradients, glow accents, glassmorphic UI
- **Custom HLS Player** — `.m3u8` & MP4, auto-next episode, keyboard shortcuts
- **Continue Watching** — tracks seconds watched per episode with resume bar
- **Favorites & Watch History** — authenticated user library
- **Threaded Comments & Likes** — discussion per title with reply threads
- **5-Star Community Ratings** — real-time score updates
- **Search & Filter** — debounced search, genre tags, type & status filters

### 🛡️ Admin Management Panel
- **Dashboard KPI Metrics** — users, titles, episodes, total views
- **Full CRUD** — anime/donghua catalog, episodes, subtitles, thumbnails
- **User Moderation** — roles (`USER`, `ADMIN`), active status controls
- **Comment Moderation** — filter reported and deleted content

### 🔒 Security & Architecture
- **Argon2 Password Hashing** — industry-standard cryptographic hashing
- **JWT Token Auth** — 30m access + 7d refresh with auto-refresh interceptors
- **RBAC** — protected routes on both FastAPI and React Router layers
- **Rate Limiting** — `slowapi` on auth & search endpoints
- **3× CDN Redundancy** — Cloudflare R2 primary + 2 mirrors

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12+, FastAPI, SQLAlchemy 2 (Async), PostgreSQL, Pydantic v2 |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router v6 |
| **Mobile** | Capacitor (Android + iOS) |
| **Storage** | Cloudflare R2 (3× redundant) |
| **Cache** | Redis (Upstash / Redis Cloud) |
| **Deployment** | Docker, Netlify, Render, Railway |

---

## 🛠️ Quick Start

> **Read the full guide**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

```bash
# 1. Clone
git clone <repo-url>
cd Huang-anime

# 2. Configure credentials (NEVER commit real credentials!)
cp .env.example .env
cp r2_config.example.json r2_config.json
cp multi_server_config.example.json multi_server_config.json
# Edit each file with your real credentials

# 3. Start with Docker
docker compose up -d --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## 📁 Project Structure

```
Huang-anime/
├── backend/          # FastAPI Python API
├── frontend/         # React + TypeScript SPA + Mobile (Capacitor)
├── modules/          # Experimental language modules (Go, Rust, Elixir...)
├── tools/            # Admin automation & content management scripts
├── docs/             # Architecture, deployment, and security docs
├── .github/          # CI/CD workflows, issue & PR templates
├── .env.example      # Environment variable template
├── r2_config.example.json
├── multi_server_config.example.json
├── docker-compose.yml
├── LICENSE           # Proprietary — All Rights Reserved
└── SECURITY.md       # Vulnerability disclosure policy
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, security model |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, manual, cloud & mobile deployment |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting & credential policy |

---

## 🐳 Docker

```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## 🔑 Security

- **Never commit** `r2_config.json`, `multi_server_config.json`, `.env`, or `*.keystore`
- All secrets must be stored in `.env` files (git-ignored)
- Use example templates (`*.example.json`) as references
- See [SECURITY.md](SECURITY.md) for the full security policy

---

## 📜 Legal & Content Policy

MER DONGHUA only distributes video content that the platform owner has legal rights
or explicit authorization to distribute.

**© 2024–2026 MER DONGHUA. All Rights Reserved.**
See [LICENSE](LICENSE) for terms. Unauthorized copying or redistribution is prohibited.
