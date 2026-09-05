#!/usr/bin/env python3
"""
🎬 MER DONGHUA — 3-Server Multi-Cloud Uploader Studio (Web UI)
============================================================
Visual Dashboard to manage and upload local folders to Server 1, Server 2, Server 3:
- Folder 1 ➔ Server 1
- Folder 2 ➔ Server 2
- Folder 3 ➔ Server 3
- Or 1 Local Folder ➔ All 3 Servers in parallel
- Real-time progress, multi-threaded S3 multipart upload, 1-click Link Copy
"""

import os
import sys
import json
import time
import socket
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from typing import Dict, Any, List

# Force UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

try:
    import boto3
    from boto3.s3.transfer import TransferConfig
    from botocore.config import Config
except ImportError:
    os.system("pip install boto3")
    import boto3
    from boto3.s3.transfer import TransferConfig
    from botocore.config import Config

PORT = 5055
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(ROOT_DIR, "multi_server_config.json")
LOG_PATH = os.path.join(ROOT_DIR, "multi_server_links.json")

# Global upload state
upload_state = {
    "is_uploading": False,
    "total_files": 0,
    "current_file_index": 0,
    "current_file_name": "",
    "current_file_size": 0,
    "bytes_uploaded": 0,
    "speed_mbps": 0.0,
    "percent": 0,
    "logs": [],
    "completed_links": []
}

def load_config() -> Dict[str, Any]:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "server_1": {
            "name": "Cloudflare R2 (Server 1)",
            "enabled": True,
            "endpoint": "https://1d54b0dc7bdad89412ac36527c758b10.r2.cloudflarestorage.com",
            "access_key": "ac74d336cebfe08b6cc8f9eb4efb8093",
            "secret_key": "f7f318794694573404f8aa9ba9c1ed61dec57732a19b9f79bf2f99de1a928bda",
            "bucket_name": "rit-anime-videos",
            "public_domain": "https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev"
        },
        "server_2": {
            "name": "Server 2 (Backup Mirror 1)",
            "enabled": False,
            "endpoint": "",
            "access_key": "",
            "secret_key": "",
            "bucket_name": "",
            "public_domain": ""
        },
        "server_3": {
            "name": "Server 3 (Backup Mirror 2)",
            "enabled": False,
            "endpoint": "",
            "access_key": "",
            "secret_key": "",
            "bucket_name": "",
            "public_domain": ""
        }
    }

def save_config(cfg: Dict[str, Any]):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def open_windows_folder_dialog() -> str:
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        folder = filedialog.askdirectory(title="ជ្រើសរើស Folder វីដេអូ")
        root.destroy()
        return folder or ""
    except Exception as e:
        print(f"Folder dialog error: {e}")
        return ""


def scan_local_folder(folder_path: str) -> List[Dict[str, Any]]:
    if not folder_path:
        return []
    folder_path = folder_path.strip('\"\' ')
    if not os.path.exists(folder_path):
        return []

    items = []
    # If user selected a single file
    if os.path.isfile(folder_path):
        if folder_path.lower().endswith(('.mp4', '.mkv', '.ts', '.m3u8', '.webm', '.avi')):
            size = os.path.getsize(folder_path)
            items.append({
                "name": os.path.basename(folder_path),
                "rel_path": os.path.basename(folder_path),
                "full_path": folder_path,
                "size_mb": round(size / (1024 * 1024), 2),
                "size_bytes": size
            })
        return items

    # If folder
    for root, _, files in os.walk(folder_path):
        for file in sorted(files):
            if file.lower().endswith(('.mp4', '.mkv', '.ts', '.m3u8', '.webm', '.avi')):
                full_path = os.path.join(root, file)
                size = os.path.getsize(full_path)
                rel_path = os.path.relpath(full_path, folder_path)
                items.append({
                    "name": file,
                    "rel_path": rel_path.replace('\\', '/'),
                    "full_path": full_path,
                    "size_mb": round(size / (1024 * 1024), 2),
                    "size_bytes": size
                })
    return items


def perform_upload_task(tasks: List[Dict[str, Any]]):
    global upload_state
    upload_state["is_uploading"] = True
    upload_state["total_files"] = len(tasks)
    upload_state["current_file_index"] = 0
    upload_state["completed_links"] = []
    upload_state["logs"] = []

    config = load_config()

    for idx, task in enumerate(tasks):
        local_path = task["local_path"]
        server_key = task["server_key"]
        r2_folder = task.get("r2_folder", "episodes")
        file_name = os.path.basename(local_path)
        file_size = os.path.getsize(local_path)

        upload_state["current_file_index"] = idx + 1
        upload_state["current_file_name"] = file_name
        upload_state["current_file_size"] = file_size
        upload_state["bytes_uploaded"] = 0
        upload_state["percent"] = 0

        srv_cfg = config.get(server_key, {})
        srv_name = srv_cfg.get("name", server_key)

        r2_key = f"{r2_folder}/{file_name}"

        # Setup S3 Client
        try:
            client = boto3.client(
                "s3",
                endpoint_url=srv_cfg["endpoint"],
                aws_access_key_id=srv_cfg["access_key"],
                aws_secret_access_key=srv_cfg["secret_key"],
                config=Config(signature_version="s3v4"),
                region_name="auto"
            )

            start_time = time.time()
            bytes_seen = 0

            def progress_callback(bytes_amount):
                nonlocal bytes_seen
                bytes_seen += bytes_amount
                upload_state["bytes_uploaded"] = bytes_seen
                upload_state["percent"] = int((bytes_seen / file_size) * 100) if file_size > 0 else 0
                elapsed = time.time() - start_time
                upload_state["speed_mbps"] = round((bytes_seen / (1024 * 1024)) / elapsed, 1) if elapsed > 0 else 0

            transfer_config = TransferConfig(
                multipart_threshold=15 * 1024 * 1024,
                max_concurrency=8,
                multipart_chunksize=15 * 1024 * 1024,
                use_threads=True
            )

            content_type = "video/mp4"
            if local_path.endswith(".mkv"):
                content_type = "video/x-matroska"
            elif local_path.endswith(".ts"):
                content_type = "video/mp2t"

            client.upload_file(
                Filename=local_path,
                Bucket=srv_cfg["bucket_name"],
                Key=r2_key,
                ExtraArgs={'ContentType': content_type},
                Config=transfer_config,
                Callback=progress_callback
            )

            public_domain = srv_cfg.get("public_domain", "").rstrip('/')
            final_url = f"{public_domain}/{r2_key}" if public_domain else f"{srv_cfg['endpoint']}/{srv_cfg['bucket_name']}/{r2_key}"

            upload_state["completed_links"].append({
                "file_name": file_name,
                "server": srv_name,
                "server_key": server_key,
                "url": final_url,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "timestamp": time.strftime("%H:%M:%S")
            })

            upload_state["logs"].append(f"✅ [{srv_name}] {file_name} ➔ {final_url}")
        except Exception as e:
            upload_state["logs"].append(f"❌ [{srv_name}] {file_name} Failed: {str(e)}")

    upload_state["is_uploading"] = False


# HTML Template for Dashboard
HTML_PAGE = """<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multi-Server Video Uploader Studio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700;800&family=Outfit:wght@400;600;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Kantumruy Pro', 'Outfit', sans-serif; background-color: #07090e; }
    .font-display { font-family: 'Outfit', sans-serif; }
    .glass-card { background: rgba(15, 20, 32, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glass-card:hover { border-color: rgba(255, 255, 255, 0.15); }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #07090e; }
    ::-webkit-scrollbar-thumb { background: #222938; border-radius: 4px; }
  </style>
</head>
<body class="text-gray-100 min-h-screen flex flex-col justify-between">

  <!-- Background decorative glows -->
  <div class="fixed top-0 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-[140px] pointer-events-none"></div>
  <div class="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none"></div>

  <!-- Header -->
  <header class="relative z-10 border-b border-white/10 bg-[#07090e]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-600/30">
        🚀
      </div>
      <div>
        <h1 class="font-display font-black text-lg text-white tracking-wide">MULTI-SERVER UPLOADER STUDIO</h1>
        <p class="text-[11px] text-gray-400">គ្រប់គ្រង និង Upload វីដេអូទៅកាន់ 3 Servers ដំណាលគ្នា (Folder ទី ១ ➔ Server 1, Folder ទី ២ ➔ Server 2)</p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button onclick="openConfigModal()" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-amber-300 hover:text-white flex items-center gap-2 transition cursor-pointer">
        ⚙️ កំណត់ API Keys ទាំង ៣ Server
      </button>
      <button onclick="refreshData()" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs transition cursor-pointer" title="Refresh">
        🔄
      </button>
    </div>
  </header>

  <!-- Main Grid -->
  <main class="relative z-10 max-w-7xl w-full mx-auto px-4 py-6 space-y-6 flex-1">

    <!-- 3 Server Mapping Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

      <!-- Server 1 Card -->
      <div class="glass-card rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-xs">
                S1
              </div>
              <div>
                <h2 class="text-sm font-black text-white" id="s1_name">Cloudflare R2 (Server 1)</h2>
                <span class="text-[10px] text-emerald-400 font-semibold" id="s1_status">● Primary Server</span>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Folder ទី ១</span>
          </div>

          <label class="block text-[11px] font-bold text-gray-300 mb-1">📁 ជ្រើសរើស Folder វីដេអូ ទី ១ (Local Folder):</label>
          <div class="flex items-center gap-1.5">
            <input type="text" id="folder_1" placeholder="ឧ. D:\video telegram\Alian..." class="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-400 font-mono">
            <button onclick="browseFolder(1)" class="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 cursor-pointer shrink-0" title="ចុចដើម្បីរើស Folder លើកុំព្យូទ័រ">📁 រើស Folder</button>
            <button onclick="scanFolder(1)" class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 cursor-pointer shrink-0">ស្កេន</button>
          </div>

          <div class="mt-3 p-3 rounded-2xl bg-black/30 border border-white/5 text-xs text-gray-400 space-y-1">
            <div class="flex justify-between"><span>ចំនួន Files:</span> <span id="s1_count" class="font-bold text-white">0</span></div>
            <div class="flex justify-between"><span>ទំហំសរុប:</span> <span id="s1_size" class="font-bold text-amber-300">0 MB</span></div>
          </div>
        </div>

        <button onclick="startSingleUpload(1)" id="btn_upload_1" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition cursor-pointer">
          <span>🚀 Upload Folder ទី ១ ➔ Server 1</span>
        </button>
      </div>

      <!-- Server 2 Card -->
      <div class="glass-card rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs">
                S2
              </div>
              <div>
                <h2 class="text-sm font-black text-white" id="s2_name">Server 2 (Backup Mirror 1)</h2>
                <span class="text-[10px] text-gray-400 font-semibold" id="s2_status">● Backup Server</span>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Folder ទី ២</span>
          </div>

          <label class="block text-[11px] font-bold text-gray-300 mb-1">📁 ជ្រើសរើស Folder វីដេអូ ទី ២ (Local Folder):</label>
          <div class="flex items-center gap-1.5">
            <input type="text" id="folder_2" placeholder="ឧ. D:\video telegram\Donghua 2..." class="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono">
            <button onclick="browseFolder(2)" class="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 cursor-pointer shrink-0" title="ចុចដើម្បីរើស Folder លើកុំព្យូទ័រ">📁 រើស Folder</button>
            <button onclick="scanFolder(2)" class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 cursor-pointer shrink-0">ស្កេន</button>
          </div>

          <div class="mt-3 p-3 rounded-2xl bg-black/30 border border-white/5 text-xs text-gray-400 space-y-1">
            <div class="flex justify-between"><span>ចំនួន Files:</span> <span id="s2_count" class="font-bold text-white">0</span></div>
            <div class="flex justify-between"><span>ទំហំសរុប:</span> <span id="s2_size" class="font-bold text-cyan-300">0 MB</span></div>
          </div>
        </div>

        <button onclick="startSingleUpload(2)" id="btn_upload_2" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition cursor-pointer">
          <span>🚀 Upload Folder ទី ២ ➔ Server 2</span>
        </button>
      </div>

      <!-- Server 3 Card -->
      <div class="glass-card rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xs">
                S3
              </div>
              <div>
                <h2 class="text-sm font-black text-white" id="s3_name">Server 3 (Backup Mirror 2)</h2>
                <span class="text-[10px] text-gray-400 font-semibold" id="s3_status">● Backup Server</span>
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Folder ទី ៣</span>
          </div>

          <label class="block text-[11px] font-bold text-gray-300 mb-1">📁 ជ្រើសរើស Folder វីដេអូ ទី ៣ (Local Folder):</label>
          <div class="flex items-center gap-1.5">
            <input type="text" id="folder_3" placeholder="ឧ. D:\video telegram\Donghua 3..." class="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-400 font-mono">
            <button onclick="browseFolder(3)" class="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 cursor-pointer shrink-0" title="ចុចដើម្បីរើស Folder លើកុំព្យូទ័រ">📁 រើស Folder</button>
            <button onclick="scanFolder(3)" class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 cursor-pointer shrink-0">ស្កេន</button>
          </div>

          <div class="mt-3 p-3 rounded-2xl bg-black/30 border border-white/5 text-xs text-gray-400 space-y-1">
            <div class="flex justify-between"><span>ចំនួន Files:</span> <span id="s3_count" class="font-bold text-white">0</span></div>
            <div class="flex justify-between"><span>ទំហំសរុប:</span> <span id="s3_size" class="font-bold text-amber-300">0 MB</span></div>
          </div>
        </div>

        <button onclick="startSingleUpload(3)" id="btn_upload_3" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-extrabold text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition cursor-pointer">
          <span>🚀 Upload Folder ទី ៣ ➔ Server 3</span>
        </button>
      </div>

    </div>

    <!-- Master Action Bar: 1-Click Upload All -->
    <div class="glass-card rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-red-500/20 bg-gradient-to-r from-red-950/20 via-black to-blue-950/20">
      <div>
        <h3 class="font-bold text-base text-white flex items-center gap-2">
          ⚡ 1-Click Upload All Folders to All Respective Servers
        </h3>
        <p class="text-xs text-gray-400 mt-0.5">
          ដំណើរការ Upload Folder ទី ១ ➔ Server 1, Folder ទី ២ ➔ Server 2, Folder ទី ៣ ➔ Server 3 ដោយស្វ័យប្រវត្តិ។
        </p>
      </div>
      <button onclick="startAllUploads()" id="btn_upload_all" class="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95 cursor-pointer shrink-0">
        🔥 ចាប់ផ្ដើម UPLOAD ទាំងអស់ (START ALL)
      </button>
    </div>

    <!-- Live Upload Progress Card (Shown when uploading) -->
    <div id="progress_card" class="glass-card rounded-3xl p-5 space-y-3 hidden border-amber-500/30 animate-in fade-in">
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-amber-300 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
          កំពុង Upload៖ <span id="prog_filename" class="text-white font-mono">—</span>
        </span>
        <span class="text-gray-400 font-mono" id="prog_stats">0% | 0 MB/s</span>
      </div>

      <div class="w-full h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
        <div id="prog_bar" class="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300" style="width: 0%"></div>
      </div>

      <div class="flex items-center justify-between text-[11px] text-gray-500 font-mono">
        <span id="prog_file_count">File 0 of 0</span>
        <span id="prog_speed">Speed: 0.0 MB/s</span>
      </div>
    </div>

    <!-- Results Table: Completed Links -->
    <div class="glass-card rounded-3xl p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-sm text-white flex items-center gap-2">
          🎉 បញ្ជី LINK វីដេអូដែលបាន UPLOAD រួច (Completed Links)
        </h3>
        <button onclick="copyAllLinks()" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white border border-white/10 transition cursor-pointer">
          📋 Copy ទាំងអស់ (Copy All)
        </button>
      </div>

      <div class="overflow-x-auto max-h-80 overflow-y-auto">
        <table class="w-full text-left text-xs text-gray-300">
          <thead class="text-[11px] uppercase font-bold text-gray-400 border-b border-white/10 bg-black/20">
            <tr>
              <th class="p-2.5">File Name</th>
              <th class="p-2.5">Target Server</th>
              <th class="p-2.5">Size</th>
              <th class="p-2.5">Direct URL</th>
              <th class="p-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody id="links_tbody" class="divide-y divide-white/5 font-mono">
            <tr>
              <td colspan="5" class="p-4 text-center text-gray-500">មិនទាន់មាន Link នៅឡើយទេ។ សូមចាប់ផ្ដើម Upload វីដេអូ។</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </main>

  <!-- Config Modal -->
  <div id="config_modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
    <div class="glass-card max-w-2xl w-full rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-white/20">
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 class="font-bold text-base text-white">⚙️ កំណត់ API Keys Server ទាំង ៣</h3>
        <button onclick="closeConfigModal()" class="text-gray-400 hover:text-white text-lg">✕</button>
      </div>

      <div class="space-y-4 text-xs" id="config_form_container">
        <!-- Form injected by JS -->
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-white/10">
        <button onclick="closeConfigModal()" class="px-4 py-2 rounded-xl bg-white/5 text-gray-300 text-xs">បិទ</button>
        <button onclick="saveApiConfig()" class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs">💾 រក្សាទុក (Save)</button>
      </div>
    </div>
  </div>

  <script>
    let scannedFiles = { 1: [], 2: [], 3: [] };
    let currentConfig = {};

    async function loadInitial() {
      const res = await fetch('/api/config');
      currentConfig = await res.json();
      updateServerLabels();
      pollStatus();
      setInterval(pollStatus, 1500);
    }

    function updateServerLabels() {
      if (currentConfig.server_1) {
        document.getElementById('s1_name').innerText = currentConfig.server_1.name || 'Server 1';
      }
      if (currentConfig.server_2) {
        document.getElementById('s2_name').innerText = currentConfig.server_2.name || 'Server 2';
      }
      if (currentConfig.server_3) {
        document.getElementById('s3_name').innerText = currentConfig.server_3.name || 'Server 3';
      }
    }

    async function browseFolder(num) {
      try {
        const res = await fetch('/api/browse', { method: 'POST' });
        const data = await res.json();
        if (data.folder) {
          document.getElementById('folder_' + num).value = data.folder;
          scannedFiles[num] = data.files || [];
          document.getElementById(`s${num}_count`).innerText = scannedFiles[num].length;
          const totalMb = scannedFiles[num].reduce((a, b) => a + b.size_mb, 0);
          document.getElementById(`s${num}_size`).innerText = totalMb.toFixed(1) + ' MB';
        }
      } catch (err) {
        console.warn('Folder browse notice:', err);
      }
    }

    async function scanFolder(num) {
      const path = document.getElementById('folder_' + num).value.trim();
      if (!path) {
        alert('សូមបញ្ចូល Path Folder ឬចុចប៊ូតុង "📁 រើស Folder"!');
        return;
      }
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      scannedFiles[num] = data.files || [];
      document.getElementById(`s${num}_count`).innerText = scannedFiles[num].length;
      const totalMb = scannedFiles[num].reduce((a, b) => a + b.size_mb, 0);
      document.getElementById(`s${num}_size`).innerText = totalMb.toFixed(1) + ' MB';
    }

    async function startSingleUpload(num) {
      if (!scannedFiles[num] || scannedFiles[num].length === 0) {
        await scanFolder(num);
      }
      if (!scannedFiles[num] || scannedFiles[num].length === 0) {
        alert('រកមិនឃើញ File វីដេអូក្នុង Folder នេះឡើយ!');
        return;
      }
      const tasks = scannedFiles[num].map(f => ({
        local_path: f.full_path,
        server_key: 'server_' + num,
        r2_folder: 'episodes'
      }));

      await fetch('/api/start-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks })
      });
    }

    async function startAllUploads() {
      const tasks = [];
      for (let num of [1, 2, 3]) {
        if (!scannedFiles[num] || scannedFiles[num].length === 0) {
          const path = document.getElementById('folder_' + num).value.trim();
          if (path) await scanFolder(num);
        }
        if (scannedFiles[num] && scannedFiles[num].length > 0) {
          scannedFiles[num].forEach(f => {
            tasks.push({
              local_path: f.full_path,
              server_key: 'server_' + num,
              r2_folder: 'episodes'
            });
          });
        }
      }

      if (tasks.length === 0) {
        alert('សូមជ្រើសរើស Folder យ៉ាងហោចណាស់មួយ!');
        return;
      }

      await fetch('/api/start-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks })
      });
    }

    async function pollStatus() {
      try {
        const res = await fetch('/api/status');
        const state = await res.json();

        const progCard = document.getElementById('progress_card');
        if (state.is_uploading) {
          progCard.classList.remove('hidden');
          document.getElementById('prog_filename').innerText = state.current_file_name;
          document.getElementById('prog_stats').innerText = `${state.percent}% | ${state.speed_mbps} MB/s`;
          document.getElementById('prog_bar').style.width = `${state.percent}%`;
          document.getElementById('prog_file_count').innerText = `File ${state.current_file_index} of ${state.total_files}`;
          document.getElementById('prog_speed').innerText = `Speed: ${state.speed_mbps} MB/s`;
        } else {
          progCard.classList.add('hidden');
        }

        renderLinks(state.completed_links || []);
      } catch (err) {}
    }

    function renderLinks(links) {
      const tbody = document.getElementById('links_tbody');
      if (!links || links.length === 0) return;

      tbody.innerHTML = links.map(l => `
        <tr class="hover:bg-white/[0.02]">
          <td class="p-2.5 font-bold text-white truncate max-w-xs">${l.file_name}</td>
          <td class="p-2.5 text-amber-300 font-semibold">${l.server}</td>
          <td class="p-2.5 text-gray-400">${l.size_mb} MB</td>
          <td class="p-2.5 text-cyan-400 underline truncate max-w-md"><a href="${l.url}" target="_blank">${l.url}</a></td>
          <td class="p-2.5 text-right">
            <button onclick="copyToClipboard('${l.url}')" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] cursor-pointer">📋 Copy</button>
          </td>
        </tr>
      `).join('');
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      alert('✅ បាន Copy Link ជោគជ័យ!');
    }

    function copyAllLinks() {
      const tbody = document.getElementById('links_tbody');
      const anchors = tbody.querySelectorAll('a');
      if (anchors.length === 0) {
        alert('គ្មាន Link សម្រាប់ Copy ឡើយ!');
        return;
      }
      const links = Array.from(anchors).map(a => a.href).join('\\n');
      navigator.clipboard.writeText(links);
      alert(`✅ បាន Copy Link ចំនួន ${anchors.length} រួចរាល់!`);
    }

    function openConfigModal() {
      const container = document.getElementById('config_form_container');
      let html = '';
      for (let i = 1; i <= 3; i++) {
        const s = currentConfig['server_' + i] || {};
        html += `
          <div class="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <h4 class="font-bold text-sm text-amber-300">📡 Server ${i} Configuration</h4>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] text-gray-400">Server Name:</label>
                <input id="cfg_${i}_name" value="${s.name || ''}" class="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-white">
              </div>
              <div>
                <label class="block text-[10px] text-gray-400">Bucket Name:</label>
                <input id="cfg_${i}_bucket" value="${s.bucket_name || ''}" class="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-white">
              </div>
              <div class="col-span-2">
                <label class="block text-[10px] text-gray-400">Endpoint URL:</label>
                <input id="cfg_${i}_endpoint" value="${s.endpoint || ''}" placeholder="https://<ACCOUNT_ID>.r2.cloudflarestorage.com" class="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-white font-mono">
              </div>
              <div>
                <label class="block text-[10px] text-gray-400">Access Key:</label>
                <input id="cfg_${i}_access" value="${s.access_key || ''}" class="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-white font-mono">
              </div>
              <div>
                <label class="block text-[10px] text-gray-400">Secret Key:</label>
                <input id="cfg_${i}_secret" type="password" value="${s.secret_key || ''}" class="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-white font-mono">
              </div>
              <div class="col-span-2">
                <label class="block text-[10px] text-gray-400">Public Domain / URL Prefix:</label>
                <input id="cfg_${i}_domain" value="${s.public_domain || ''}" placeholder="https://pub-xxx.r2.dev" class="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-white font-mono">
              </div>
            </div>
          </div>
        `;
      }
      container.innerHTML = html;
      document.getElementById('config_modal').classList.remove('hidden');
    }

    function closeConfigModal() {
      document.getElementById('config_modal').classList.add('hidden');
    }

    async function saveApiConfig() {
      for (let i = 1; i <= 3; i++) {
        currentConfig['server_' + i] = {
          name: document.getElementById(`cfg_${i}_name`).value.trim(),
          bucket_name: document.getElementById(`cfg_${i}_bucket`).value.trim(),
          endpoint: document.getElementById(`cfg_${i}_endpoint`).value.trim(),
          access_key: document.getElementById(`cfg_${i}_access`).value.trim(),
          secret_key: document.getElementById(`cfg_${i}_secret`).value.trim(),
          public_domain: document.getElementById(`cfg_${i}_domain`).value.trim(),
          enabled: true
        };
      }
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentConfig)
      });
      alert('✅ បានរក្សាទុក API Keys ជោគជ័យ!');
      closeConfigModal();
      updateServerLabels();
    }

    function refreshData() {
      loadInitial();
    }

    window.onload = loadInitial;
  </script>
</body>
</html>
"""


class MultiServerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/" or parsed.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))
        elif parsed.path == "/api/config":
            cfg = load_config()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(cfg).encode("utf-8"))
        elif parsed.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(upload_state).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        body = json.loads(post_data) if post_data else {}

        if parsed.path == "/api/config":
            save_config(body)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
        elif parsed.path == "/api/browse":
            folder = open_windows_folder_dialog()
            files = scan_local_folder(folder) if folder else []
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"folder": folder, "files": files}).encode("utf-8"))
        elif parsed.path == "/api/scan":
            path = body.get("path", "")
            files = scan_local_folder(path)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"files": files}).encode("utf-8"))
        elif parsed.path == "/api/start-upload":
            tasks = body.get("tasks", [])
            if tasks and not upload_state["is_uploading"]:
                threading.Thread(target=perform_upload_task, args=(tasks,), daemon=True).start()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "started", "task_count": len(tasks)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Mute normal HTTP logs to keep console clean
        return


def run_server():
    server_address = ('127.0.0.1', PORT)
    try:
        httpd = HTTPServer(server_address, MultiServerHandler)
        print("=" * 70)
        print(f"🚀 MULTI-SERVER UPLOADER STUDIO IS RUNNING!")
        print(f"👉 Open in browser: http://127.0.0.1:{PORT}")
        print("=" * 70)
        
        # Auto open browser
        threading.Timer(1.0, lambda: webbrowser.open(f"http://127.0.0.1:{PORT}")).start()
        httpd.serve_forever()
    except Exception as e:
        print(f"Error starting server on port {PORT}: {e}")


if __name__ == "__main__":
    run_server()
