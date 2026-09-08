#!/usr/bin/env python3
"""
🎬 MER DONGHUA — Bulk Video Downloader (GUI)
=============================================
Download all videos from the website with correct
anime name + episode naming. Uses seed_export.json
for offline fast discovery. Supports resume, multi-thread,
and rich progress display.

Author  : Merdonghua Team
Version : 2.0
"""

import os
import sys
import re
import json
import time
import math
import threading
import urllib.request
import urllib.error
import urllib.parse
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import datetime as dt_module

# ── Force UTF-8 on Windows ──────────────────────────────────────────────────
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# ── Resolve project root ─────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
SEED_FILE    = os.path.join(PROJECT_ROOT, "backend", "app", "services", "seed_export.json")
DEFAULT_OUT  = r"D:\MerDonghua_Videos" if os.path.exists("D:\\") else os.path.join(os.path.expanduser("~"), "Desktop", "MerDonghua_Videos")
USER_AGENT   = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36")


# ── Helpers ───────────────────────────────────────────────────────────────────
def sanitize(name: str, max_len: int = 100) -> str:
    """Strip characters illegal on Windows filesystem."""
    if not name:
        return "unnamed"
    name = name.strip()
    name = re.sub(r'[\\/*?:"<>|]', '_', name)
    name = re.sub(r'\s+', ' ', name)
    return name[:max_len]


def fmt_bytes(b: float) -> str:
    if b <= 0:
        return "0 B"
    if b >= 1 << 30:
        return f"{b/(1<<30):.2f} GB"
    if b >= 1 << 20:
        return f"{b/(1<<20):.1f} MB"
    if b >= 1 << 10:
        return f"{b/(1<<10):.1f} KB"
    return f"{int(b)} B"


def fmt_time(sec: float) -> str:
    if not math.isfinite(sec) or sec <= 0:
        return "--:--"
    m, s = divmod(int(sec), 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def build_headers(url: str) -> dict:
    h = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Accept-Encoding": "identity",
    }
    if "nintanime.com" in url or "s3." in url:
        h["Referer"] = "https://nintanime.com/"
        h["Origin"]  = "https://nintanime.com"
    elif "mediadelivery.net" in url or "b-cdn.net" in url:
        h["Referer"] = "https://iframe.mediadelivery.net/"
        h["Origin"]  = "https://iframe.mediadelivery.net"
    elif "r2.dev" in url or "cloudflarestorage" in url:
        h["Referer"] = "https://merdonghua.com/"
    return h


# ── Data loader ───────────────────────────────────────────────────────────────
def load_seed() -> Tuple[List[dict], List[dict]]:
    """Load anime + episodes from seed_export.json."""
    if not os.path.exists(SEED_FILE):
        raise FileNotFoundError(f"seed_export.json not found at:\n{SEED_FILE}")
    with open(SEED_FILE, encoding="utf-8") as f:
        data = json.load(f)
    anime   = data.get("anime", [])
    episodes = data.get("episodes", [])
    return anime, episodes


# ── Downloader core ───────────────────────────────────────────────────────────
class DownloadTask:
    def __init__(self, url: str, out_path: str, label: str):
        self.url      = url
        self.out_path = out_path
        self.label    = label
        self.total    = 0
        self.done     = 0
        self.speed    = 0.0
        self.status   = "pending"   # pending | downloading | done | skipped | error
        self.error    = ""


def download_one(task: DownloadTask, cancel_flag: threading.Event):
    """Download a single episode file with resume support."""
    url  = task.url
    path = task.out_path

    os.makedirs(os.path.dirname(path), exist_ok=True)
    headers = build_headers(url)

    # ── Check existing file size (resume) ────────────────────────────────────
    existing = os.path.getsize(path) if os.path.exists(path) else 0

    # ── HEAD request to get total size ───────────────────────────────────────
    try:
        head = urllib.request.Request(url, headers=headers, method="HEAD")
        with urllib.request.urlopen(head, timeout=15) as r:
            cl = r.headers.get("Content-Length")
            if cl:
                task.total = int(cl)
    except Exception:
        pass

    if task.total > 0 and existing >= task.total:
        task.status = "skipped"
        task.done   = existing
        return

    mode       = "wb"
    downloaded = 0
    if existing > 0 and task.total > 0:
        headers["Range"] = f"bytes={existing}-"
        mode       = "ab"
        downloaded = existing

    req = urllib.request.Request(url, headers=headers)
    try:
        task.status = "downloading"
        with urllib.request.urlopen(req, timeout=30) as resp:
            # Resolve total from Content-Range or Content-Length
            cr = resp.headers.get("Content-Range", "")
            if cr and "/" in cr:
                try:
                    task.total = int(cr.split("/")[-1])
                except Exception:
                    pass
            if not task.total:
                cl = resp.headers.get("Content-Length")
                if cl:
                    task.total = downloaded + int(cl)

            chunk_size = 512 * 1024   # 512 KB
            t0 = time.time()
            window_bytes = 0
            window_start = t0

            with open(path, mode) as f:
                while not cancel_flag.is_set():
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded  += len(chunk)
                    window_bytes += len(chunk)
                    task.done    = downloaded

                    now = time.time()
                    elapsed_win = now - window_start
                    if elapsed_win >= 0.5:
                        task.speed   = window_bytes / elapsed_win
                        window_bytes = 0
                        window_start = now

        task.status = "done" if not cancel_flag.is_set() else "error"
        task.error  = "" if task.status == "done" else "Cancelled"
    except urllib.error.HTTPError as e:
        task.status = "error"
        task.error  = f"HTTP {e.code}"
    except Exception as e:
        task.status = "error"
        task.error  = str(e)[:80]


# ═══════════════════════════════════════════════════════════════════════════════
# ── GUI ────────────────────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════
class App(tk.Tk):
    DARK_BG   = "#0f0f1a"
    PANEL_BG  = "#1a1a2e"
    CARD_BG   = "#16213e"
    ACCENT    = "#7c3aed"
    ACCENT2   = "#06b6d4"
    TEXT      = "#e2e8f0"
    MUTED     = "#64748b"
    SUCCESS   = "#22c55e"
    ERROR     = "#ef4444"
    WARN      = "#f59e0b"
    FONT_BODY = ("Segoe UI", 10)
    FONT_H1   = ("Segoe UI", 16, "bold")
    FONT_H2   = ("Segoe UI", 12, "bold")
    FONT_MONO = ("Consolas", 9)

    def __init__(self):
        super().__init__()
        self.title("🎬 MER DONGHUA — Bulk Video Downloader")
        self.geometry("1060x720")
        self.minsize(900, 600)
        self.configure(bg=self.DARK_BG)

        # State
        self.anime_list: List[dict]   = []
        self.episodes:   List[dict]   = []
        self.tasks:      List[DownloadTask] = []
        self.cancel_flag = threading.Event()
        self.download_thread: Optional[threading.Thread] = None
        self.output_dir  = DEFAULT_OUT

        self._style()
        self._build_ui()
        self._load_data()

    # ── Style ─────────────────────────────────────────────────────────────────
    def _style(self):
        s = ttk.Style(self)
        s.theme_use("clam")
        s.configure("TFrame",       background=self.DARK_BG)
        s.configure("Panel.TFrame", background=self.PANEL_BG)
        s.configure("Card.TFrame",  background=self.CARD_BG)
        s.configure("TLabel",       background=self.DARK_BG, foreground=self.TEXT,
                    font=self.FONT_BODY)
        s.configure("H1.TLabel",    background=self.DARK_BG, foreground=self.TEXT,
                    font=self.FONT_H1)
        s.configure("H2.TLabel",    background=self.PANEL_BG, foreground=self.TEXT,
                    font=self.FONT_H2)
        s.configure("Muted.TLabel", background=self.DARK_BG, foreground=self.MUTED,
                    font=("Segoe UI", 9))
        s.configure("TCheckbutton", background=self.PANEL_BG, foreground=self.TEXT,
                    font=self.FONT_BODY)
        s.map("TCheckbutton", background=[("active", self.PANEL_BG)])
        s.configure("Accent.TButton",
                    background=self.ACCENT, foreground="white",
                    font=("Segoe UI", 10, "bold"), padding=(12, 6), relief="flat")
        s.map("Accent.TButton",
              background=[("active", "#6d28d9"), ("disabled", "#374151")])
        s.configure("Cyan.TButton",
                    background=self.ACCENT2, foreground="white",
                    font=("Segoe UI", 10, "bold"), padding=(12, 6), relief="flat")
        s.map("Cyan.TButton",
              background=[("active", "#0891b2"), ("disabled", "#374151")])
        s.configure("Stop.TButton",
                    background=self.ERROR, foreground="white",
                    font=("Segoe UI", 10, "bold"), padding=(12, 6), relief="flat")
        s.map("Stop.TButton",
              background=[("active", "#b91c1c"), ("disabled", "#374151")])
        # Progressbar
        s.configure("TProgressbar",
                    troughcolor=self.CARD_BG, background=self.SUCCESS,
                    thickness=10, relief="flat")
        # Treeview
        s.configure("Treeview",
                    background=self.CARD_BG, foreground=self.TEXT,
                    fieldbackground=self.CARD_BG, rowheight=24,
                    font=self.FONT_BODY, relief="flat", borderwidth=0)
        s.configure("Treeview.Heading",
                    background=self.PANEL_BG, foreground=self.MUTED,
                    font=("Segoe UI", 9, "bold"), relief="flat")
        s.map("Treeview",
              background=[("selected", self.ACCENT)],
              foreground=[("selected", "white")])
        s.configure("Scrollbar.TScrollbar",
                    background=self.PANEL_BG, troughcolor=self.DARK_BG,
                    arrowcolor=self.MUTED, relief="flat")

    # ── UI Build ──────────────────────────────────────────────────────────────
    def _build_ui(self):
        # ── Header ────────────────────────────────────────────────────────────
        hdr = tk.Frame(self, bg=self.PANEL_BG, pady=12)
        hdr.pack(fill="x")
        tk.Label(hdr, text="🎬  MER DONGHUA — Bulk Video Downloader",
                 bg=self.PANEL_BG, fg=self.TEXT,
                 font=self.FONT_H1).pack(side="left", padx=20)
        self.lbl_seed = tk.Label(hdr, text="⏳ Loading...",
                                  bg=self.PANEL_BG, fg=self.MUTED,
                                  font=("Segoe UI", 9))
        self.lbl_seed.pack(side="right", padx=20)

        # ── Main content (left panel + right panel) ───────────────────────────
        main = ttk.Frame(self)
        main.pack(fill="both", expand=True, padx=12, pady=(6, 0))

        # ─── Left: Anime selector ────────────────────────────────────────────
        left = ttk.Frame(main, style="Panel.TFrame", width=320)
        left.pack(side="left", fill="y", padx=(0, 8))
        left.pack_propagate(False)

        tk.Label(left, text="📺  ជ្រើសរើស រឿង (Anime)",
                 bg=self.PANEL_BG, fg=self.TEXT,
                 font=self.FONT_H2).pack(anchor="w", padx=10, pady=(10, 4))

        # Search box
        sf = tk.Frame(left, bg=self.PANEL_BG)
        sf.pack(fill="x", padx=10, pady=(0, 6))
        tk.Label(sf, text="🔍", bg=self.PANEL_BG, fg=self.MUTED).pack(side="left")
        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", lambda *_: self._filter_anime())
        tk.Entry(sf, textvariable=self.search_var,
                 bg=self.CARD_BG, fg=self.TEXT, insertbackground=self.TEXT,
                 relief="flat", font=self.FONT_BODY,
                 highlightbackground=self.ACCENT, highlightthickness=1
                 ).pack(side="left", fill="x", expand=True, ipady=4, padx=(4, 0))

        # Buttons: Select All / None
        bb = tk.Frame(left, bg=self.PANEL_BG)
        bb.pack(fill="x", padx=10, pady=(0, 4))
        ttk.Button(bb, text="✅ All",  style="Cyan.TButton",
                   command=self._select_all).pack(side="left", padx=(0, 4))
        ttk.Button(bb, text="❌ None", style="Stop.TButton",
                   command=self._select_none).pack(side="left")
        self.lbl_sel = tk.Label(bb, text="0 រឿង",
                                bg=self.PANEL_BG, fg=self.MUTED,
                                font=("Segoe UI", 9))
        self.lbl_sel.pack(side="right")

        # Anime listbox with checkboxes (use Treeview)
        tv_frame = tk.Frame(left, bg=self.PANEL_BG)
        tv_frame.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        self.anime_tv = ttk.Treeview(tv_frame, columns=("eps",),
                                      show="tree headings",
                                      selectmode="browse")
        self.anime_tv.heading("#0",   text="ឈ្មោះរឿង")
        self.anime_tv.heading("eps",  text="ភាគ")
        self.anime_tv.column("#0",  width=200)
        self.anime_tv.column("eps", width=55, anchor="center")
        self.anime_tv.bind("<ButtonRelease-1>", self._toggle_anime_check)

        sb = ttk.Scrollbar(tv_frame, orient="vertical",
                           command=self.anime_tv.yview)
        self.anime_tv.configure(yscrollcommand=sb.set)
        self.anime_tv.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        self.anime_tv.tag_configure("checked",   foreground=self.SUCCESS)
        self.anime_tv.tag_configure("unchecked", foreground=self.TEXT)

        self._checked_ids: set = set()   # set of anime IDs checked

        # ─── Right: Queue + progress ──────────────────────────────────────────
        right = ttk.Frame(main)
        right.pack(side="left", fill="both", expand=True)

        # ── Output dir row ────────────────────────────────────────────────────
        dir_row = tk.Frame(right, bg=self.DARK_BG)
        dir_row.pack(fill="x", pady=(2, 6))
        tk.Label(dir_row, text="📁 Save ទៅ:",
                 bg=self.DARK_BG, fg=self.MUTED,
                 font=self.FONT_BODY).pack(side="left")
        self.lbl_dir = tk.Label(dir_row, text=self.output_dir,
                                bg=self.DARK_BG, fg=self.ACCENT2,
                                font=self.FONT_BODY)
        self.lbl_dir.pack(side="left", padx=6, fill="x", expand=True)
        ttk.Button(dir_row, text="…", style="Cyan.TButton",
                   command=self._choose_dir).pack(side="right")

        # ── Control buttons ───────────────────────────────────────────────────
        ctrl = tk.Frame(right, bg=self.DARK_BG)
        ctrl.pack(fill="x", pady=(0, 8))
        self.btn_start = ttk.Button(ctrl, text="⬇  ចាប់ផ្តើម Download",
                                    style="Accent.TButton",
                                    command=self._start_download)
        self.btn_start.pack(side="left", padx=(0, 8))
        self.btn_stop  = ttk.Button(ctrl, text="⏹  Stop",
                                    style="Stop.TButton",
                                    command=self._stop_download,
                                    state="disabled")
        self.btn_stop.pack(side="left")
        self.lbl_overall = tk.Label(ctrl, text="",
                                    bg=self.DARK_BG, fg=self.MUTED,
                                    font=("Segoe UI", 9))
        self.lbl_overall.pack(side="right", padx=8)

        # ── Overall progress bar ──────────────────────────────────────────────
        self.overall_var = tk.DoubleVar()
        ttk.Progressbar(right, variable=self.overall_var,
                        maximum=100
                        ).pack(fill="x", pady=(0, 8))

        # ── Task table ────────────────────────────────────────────────────────
        tk.Label(right, text="📋  รายการ Download",
                 bg=self.DARK_BG, fg=self.TEXT,
                 font=self.FONT_H2).pack(anchor="w")

        tbl_frame = tk.Frame(right, bg=self.DARK_BG)
        tbl_frame.pack(fill="both", expand=True)

        cols = ("anime", "ep", "size", "speed", "status")
        self.task_tv = ttk.Treeview(tbl_frame, columns=cols, show="headings",
                                     selectmode="none")
        self.task_tv.heading("anime",  text="ឈ្មោះរឿង")
        self.task_tv.heading("ep",     text="ភាគ")
        self.task_tv.heading("size",   text="ទំហំ")
        self.task_tv.heading("speed",  text="ល្បឿន")
        self.task_tv.heading("status", text="ស្ថានភាព")
        self.task_tv.column("anime",  width=280)
        self.task_tv.column("ep",     width=65,  anchor="center")
        self.task_tv.column("size",   width=90,  anchor="center")
        self.task_tv.column("speed",  width=90,  anchor="center")
        self.task_tv.column("status", width=130, anchor="center")

        self.task_tv.tag_configure("done",     foreground=self.SUCCESS)
        self.task_tv.tag_configure("error",    foreground=self.ERROR)
        self.task_tv.tag_configure("skipped",  foreground=self.MUTED)
        self.task_tv.tag_configure("active",   foreground=self.ACCENT2)
        self.task_tv.tag_configure("pending",  foreground=self.TEXT)

        ts = ttk.Scrollbar(tbl_frame, orient="vertical",
                           command=self.task_tv.yview)
        self.task_tv.configure(yscrollcommand=ts.set)
        self.task_tv.pack(side="left", fill="both", expand=True)
        ts.pack(side="right", fill="y")

        # ── Status bar ────────────────────────────────────────────────────────
        sb2 = tk.Frame(self, bg=self.PANEL_BG, pady=5)
        sb2.pack(fill="x", side="bottom")
        self.lbl_status = tk.Label(sb2, text="Ready",
                                   bg=self.PANEL_BG, fg=self.MUTED,
                                   font=("Segoe UI", 9))
        self.lbl_status.pack(side="left", padx=12)
        self.lbl_time = tk.Label(sb2, text="",
                                 bg=self.PANEL_BG, fg=self.MUTED,
                                 font=("Segoe UI", 9))
        self.lbl_time.pack(side="right", padx=12)

        # Poll updates every 500 ms
        self.after(500, self._poll_progress)

    # ── Data loading ──────────────────────────────────────────────────────────
    def _load_data(self):
        def _worker():
            try:
                a, e = load_seed()
                self.after(0, lambda: self._populate_anime(a, e))
            except Exception as ex:
                self.after(0, lambda: messagebox.showerror(
                    "Error loading data", str(ex)))
        threading.Thread(target=_worker, daemon=True).start()

    def _populate_anime(self, anime: List[dict], episodes: List[dict]):
        self.anime_list = sorted(anime, key=lambda a: a.get("title", ""))
        self.episodes   = episodes

        # Build ep count per anime
        ep_count: Dict[int, int] = {}
        for ep in episodes:
            aid = ep.get("anime_id", 0)
            ep_count[aid] = ep_count.get(aid, 0) + 1

        self._ep_count = ep_count
        self._refresh_anime_list(self.anime_list)
        total = len(anime)
        total_eps = len(episodes)
        self.lbl_seed.config(
            text=f"✅ Loaded {total} រឿង · {total_eps} ភាគ ពី seed_export.json",
            fg=self.SUCCESS
        )
        self._log(f"Loaded {total} anime, {total_eps} episodes from seed.")

    def _refresh_anime_list(self, anime_subset: List[dict]):
        self.anime_tv.delete(*self.anime_tv.get_children())
        for a in anime_subset:
            aid   = a.get("id", 0)
            title = a.get("title") or a.get("title_en") or f"ID {aid}"
            cnt   = self._ep_count.get(aid, 0)
            tag   = "checked" if aid in self._checked_ids else "unchecked"
            chk   = "☑" if aid in self._checked_ids else "☐"
            self.anime_tv.insert("", "end",
                                  iid=str(aid),
                                  text=f" {chk} {title}",
                                  values=(cnt,),
                                  tags=(tag,))

    def _filter_anime(self):
        q = self.search_var.get().strip().lower()
        if not q:
            self._refresh_anime_list(self.anime_list)
        else:
            subset = [a for a in self.anime_list
                      if q in (a.get("title") or "").lower()
                      or q in (a.get("title_en") or "").lower()]
            self._refresh_anime_list(subset)

    def _toggle_anime_check(self, event):
        region = self.anime_tv.identify("region", event.x, event.y)
        if region not in ("tree", "cell"):
            return
        iid = self.anime_tv.focus()
        if not iid:
            return
        aid = int(iid)
        if aid in self._checked_ids:
            self._checked_ids.discard(aid)
        else:
            self._checked_ids.add(aid)
        self._refresh_row(iid)
        self._update_sel_count()

    def _refresh_row(self, iid: str):
        aid = int(iid)
        a   = next((x for x in self.anime_list if x.get("id") == aid), None)
        if not a:
            return
        title = a.get("title") or a.get("title_en") or f"ID {aid}"
        tag   = "checked" if aid in self._checked_ids else "unchecked"
        chk   = "☑" if aid in self._checked_ids else "☐"
        cnt   = self._ep_count.get(aid, 0)
        self.anime_tv.item(iid, text=f" {chk} {title}", values=(cnt,), tags=(tag,))

    def _select_all(self):
        visible = [self.anime_tv.item(c)["text"] for c in self.anime_tv.get_children()]
        for iid in self.anime_tv.get_children():
            self._checked_ids.add(int(iid))
            self._refresh_row(iid)
        self._update_sel_count()

    def _select_none(self):
        for iid in self.anime_tv.get_children():
            self._checked_ids.discard(int(iid))
            self._refresh_row(iid)
        self._update_sel_count()

    def _update_sel_count(self):
        n = len(self._checked_ids)
        total_ep = sum(self._ep_count.get(aid, 0) for aid in self._checked_ids)
        self.lbl_sel.config(text=f"{n} រឿង · {total_ep} ភាគ")

    def _choose_dir(self):
        d = filedialog.askdirectory(title="ជ្រើស Folder ដើម្បី Save Videos",
                                    initialdir=self.output_dir)
        if d:
            self.output_dir = d
            self.lbl_dir.config(text=d)

    # ── Download logic ────────────────────────────────────────────────────────
    def _start_download(self):
        if not self._checked_ids:
            messagebox.showwarning("មិនទាន់ជ្រើស",
                                   "សូមជ្រើសរើស រឿង (Anime) មួយ ឬច្រើន ជាមុនសិន!")
            return

        # Build task list
        aid_to_anime = {a["id"]: a for a in self.anime_list}
        ep_map: Dict[int, List[dict]] = {}
        for ep in self.episodes:
            aid = ep.get("anime_id", 0)
            if aid in self._checked_ids:
                ep_map.setdefault(aid, []).append(ep)

        tasks: List[DownloadTask] = []
        for aid in sorted(self._checked_ids):
            anime  = aid_to_anime.get(aid, {})
            a_title = sanitize(anime.get("title") or anime.get("title_en") or f"Anime_{aid}")
            eps    = sorted(ep_map.get(aid, []),
                            key=lambda e: e.get("episode_number", 0))
            for ep in eps:
                url = (ep.get("video_url") or "").strip()
                if not url or not url.startswith("http"):
                    continue
                ep_num = ep.get("episode_number", 0)
                ep_title = sanitize(ep.get("title") or f"Episode {ep_num}", max_len=80)
                # Filename: "ភាគ 001 - ចំណងជើង.mp4"
                ep_num_str = f"{ep_num:03d}"
                filename   = f"ភាគ {ep_num_str} - {ep_title}.mp4"
                out_path   = os.path.join(self.output_dir, a_title, filename)
                label      = f"{a_title} · ភាគ {ep_num_str}"
                tasks.append(DownloadTask(url, out_path, label))

        if not tasks:
            messagebox.showinfo("គ្មាន Episode",
                                "រឿងដែលជ្រើស មិនមាន Episode ឬ Video URL ត្រឹមត្រូវ!")
            return

        self.tasks = tasks
        self.cancel_flag.clear()

        # Populate task table
        self.task_tv.delete(*self.task_tv.get_children())
        for i, t in enumerate(tasks):
            parts = t.label.rsplit("· ភាគ ", 1)
            anime_name = parts[0].strip()
            ep_label   = "ភាគ " + parts[1] if len(parts) > 1 else t.label
            self.task_tv.insert("", "end", iid=str(i),
                                 values=(anime_name, ep_label, "–", "–", "⏳ Pending"),
                                 tags=("pending",))

        self.btn_start.config(state="disabled")
        self.btn_stop.config(state="normal")
        self.overall_var.set(0)
        self.lbl_overall.config(text=f"0 / {len(tasks)} ភាគ")

        self._start_time = time.time()
        self.download_thread = threading.Thread(
            target=self._run_downloads, daemon=True)
        self.download_thread.start()
        self._log(f"Started downloading {len(tasks)} episodes...")

    def _run_downloads(self):
        for i, task in enumerate(self.tasks):
            if self.cancel_flag.is_set():
                task.status = "error"
                task.error  = "Cancelled"
                continue
            download_one(task, self.cancel_flag)

        self.after(0, self._download_finished)

    def _stop_download(self):
        self.cancel_flag.set()
        self._log("⏹ Stop requested — finishing current file...")
        self.btn_stop.config(state="disabled")

    def _download_finished(self):
        done    = sum(1 for t in self.tasks if t.status == "done")
        skipped = sum(1 for t in self.tasks if t.status == "skipped")
        errors  = sum(1 for t in self.tasks if t.status == "error")
        elapsed = time.time() - self._start_time
        self._log(f"✅ Finished! Done={done} Skipped={skipped} Errors={errors} "
                  f"Time={fmt_time(elapsed)}")
        self.btn_start.config(state="normal")
        self.btn_stop.config(state="disabled")
        self.overall_var.set(100)
        messagebox.showinfo(
            "✅ Download Complete!",
            f"ការ Download បានបញ្ចប់!\n\n"
            f"• ✅ Downloaded : {done} ភាគ\n"
            f"• ⏩ Skipped    : {skipped} ភាគ (មានរួចហើយ)\n"
            f"• ❌ Errors     : {errors} ភាគ\n"
            f"• ⏱  Time      : {fmt_time(elapsed)}\n\n"
            f"📁 Files saved to:\n{self.output_dir}"
        )

    # ── Polling / UI refresh ──────────────────────────────────────────────────
    def _poll_progress(self):
        now = datetime.now().strftime("%H:%M:%S")  # noqa
        self.lbl_time.config(text=now)

        if self.tasks:
            done_count = sum(1 for t in self.tasks
                             if t.status in ("done", "skipped", "error"))
            total      = len(self.tasks)
            pct        = done_count / total * 100 if total else 0
            self.overall_var.set(pct)
            self.lbl_overall.config(text=f"{done_count} / {total} ភាគ  ({pct:.0f}%)")

            for i, task in enumerate(self.tasks):
                iid = str(i)
                if not self.task_tv.exists(iid):
                    continue
                parts = task.label.rsplit("· ភាគ ", 1)
                anime_name = parts[0].strip()
                ep_label   = "ភាគ " + parts[1] if len(parts) > 1 else task.label

                size_str  = fmt_bytes(task.done) if task.done else "–"
                if task.total > 0 and task.done > 0:
                    size_str = f"{fmt_bytes(task.done)} / {fmt_bytes(task.total)}"

                speed_str = fmt_bytes(task.speed) + "/s" if task.speed > 0 else "–"

                if task.status == "pending":
                    status_str, tag = "⏳ Pending",  "pending"
                elif task.status == "downloading":
                    pct_ep = task.done / task.total * 100 if task.total else 0
                    status_str = f"⬇ {pct_ep:.0f}%"
                    tag        = "active"
                elif task.status == "done":
                    status_str, tag = "✅ Done",     "done"
                elif task.status == "skipped":
                    status_str, tag = "⏩ Skipped",  "skipped"
                else:
                    status_str = f"❌ {task.error or 'Error'}"
                    tag        = "error"

                self.task_tv.item(iid,
                                   values=(anime_name, ep_label,
                                           size_str, speed_str, status_str),
                                   tags=(tag,))

        self.after(500, self._poll_progress)

    # ── Logging ───────────────────────────────────────────────────────────────
    def _log(self, msg: str):
        self.lbl_status.config(text=msg)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    app = App()
    app.mainloop()
