#!/usr/bin/env bash
# One-command AWS Ubuntu 24/7 installer for MerDonghua Telegram Channel Auto-Sync Worker.
# Safe for AWS Free Tier (1 GB RAM + auto 4 GB Swap + FFMPEG_THREADS=1) as well as 2-4 GB instances.
#
# Usage on AWS Ubuntu:
#   curl -fsSL https://raw.githubusercontent.com/cm5722254-beep/Immortal/main/tools/telegram_sync/setup_aws_ubuntu.sh -o setup_aws_ubuntu.sh
#   bash setup_aws_ubuntu.sh "YOUR_EXCLUSIVE_TELEGRAM_USER_SESSION"

set -euo pipefail

SESSION_ARG="${1:-}"
REPO_URL="https://github.com/cm5722254-beep/Immortal.git"
APP_DIR="${APP_DIR:-$HOME/Immortal}"
DATA_DIR="${SYNC_DATA_DIR:-$HOME/tg_sync_data}"
SERVICE_NAME="merdonghua-tg-worker"

echo "=== [1/6] Checking System RAM & Creating Swap (for AWS Free Tier 1GB Safety) ==="
RAM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
SWAP_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
echo "Detected RAM: ${RAM_MB} MB | Current Swap: ${SWAP_MB} MB"

if [ "$SWAP_MB" -lt 2048 ]; then
  echo "Creating 4G /swapfile so 1.3GB FFmpeg compression never runs out of memory..."
  if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
  fi
  sudo swapon /swapfile || true
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
fi

echo "=== [2/6] Installing System Packages (ffmpeg, python3-venv, git) ==="
sudo apt-get update -y
sudo apt-get install -y ffmpeg git python3 python3-venv python3-pip

echo "=== [3/6] Cloning / Updating Repository in ${APP_DIR} ==="
if [ -d "${APP_DIR}/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "=== [4/6] Setting up Python Virtualenv & Dependencies ==="
python3 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/pip" install --upgrade pip
"$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt"

echo "=== [5/6] Configuring Exclusive Cloud Environment (.env.cloud) ==="
mkdir -p "$DATA_DIR/temp_videos_cloud"

if [ -z "$SESSION_ARG" ]; then
  echo ""
  echo "Enter your EXCLUSIVE Cloud TELEGRAM_USER_SESSION string"
  echo "(Generate on PC via: python tools/telegram_sync/generate_cloud_session.py)"
  read -r -p "TELEGRAM_USER_SESSION: " SESSION_ARG
fi

if [ -z "$SESSION_ARG" ]; then
  echo "ERROR: TELEGRAM_USER_SESSION cannot be empty." >&2
  exit 1
fi

DEFAULT_THREADS=2
if [ "$RAM_MB" -lt 1800 ]; then
  DEFAULT_THREADS=1
fi

cat > "$APP_DIR/.env.cloud" <<EOF
TELEGRAM_USER_SESSION=${SESSION_ARG}
ENABLE_24_7_SYNC=1
FORCE_24_7_SYNC=1
COMPRESSION_PRESET=720p_low_mb
FFMPEG_PRESET=superfast
FFMPEG_THREADS=${DEFAULT_THREADS}
UPLOAD_DELAY_SECONDS=3
SYNC_DATA_DIR=${DATA_DIR}
DATABASE_URL=sqlite+aiosqlite:///:memory:
PORT=8080
ENABLE_BOT_COMMANDS=0
EOF
chmod 600 "$APP_DIR/.env.cloud"

echo "=== [6/6] Installing & Starting 24/7 systemd Service (${SERVICE_NAME}) ==="
CURRENT_USER="$(whoami)"
sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<EOF
[Unit]
Description=MerDonghua 24/7 Telegram Channel Auto-Sync Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env.cloud
ExecStart=${APP_DIR}/.venv/bin/python -u ${APP_DIR}/tools/telegram_sync/cloud_sync_worker.py
Restart=always
RestartSec=15

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

echo ""
echo "✅ MerDonghua 24/7 Worker is now LIVE on AWS Ubuntu!"
echo "   Check live logs   : sudo journalctl -u ${SERVICE_NAME} -f"
echo "   Check HTTP health : curl http://127.0.0.1:8080/health"
echo "   Keep local PC Studio OFF while AWS uses this TELEGRAM_USER_SESSION."

