#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║   🎬  MER DONGHUA — Professional Video Downloader & Website Scanner v3.2     ║
║   Scan & Download All Anime / Episodes Directly From Website With Khmer Names║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
import os, sys, re, json, time, math, threading, queue
import urllib.request, urllib.error, urllib.parse
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from typing import List, Dict, Any, Optional
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# ── Paths & Configurations ───────────────────────────────────────────────────
def _find_seed() -> str:
    """Search upward from EXE/script location for seed_export.json."""
    if getattr(sys, 'frozen', False):
        start = os.path.dirname(sys.executable)
    else:
        start = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    candidate = start
    for _ in range(5):
        p = os.path.join(candidate, "backend", "app", "services", "seed_export.json")
        if os.path.exists(p):
            return p
        parent = os.path.dirname(candidate)
        if parent == candidate:
            break
        candidate = parent

    return os.path.join("D:\\", "Huang-anime", "backend", "app", "services", "seed_export.json")

SEED_FILE   = _find_seed()
DEFAULT_OUT = os.path.join(os.path.expanduser("~"), "Desktop", "MerDonghua_Videos")
DEFAULT_API = "https://merdonghua-com.onrender.com/api"
UA          = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0"
VERSION     = "3.2 (Website Scanner)"

# ══════════════════════════════════════════════════════════════════════════════
def sanitize(name: str, mx: int = 100) -> str:
    if not name: return "unnamed"
    return re.sub(r'\s+', ' ', re.sub(r'[\\/*?:"<>|]', '_', name.strip()))[:mx]

def fmt_bytes(b: float) -> str:
    if b <= 0: return "0 B"
    if b >= 1<<30: return f"{b/(1<<30):.2f} GB"
    if b >= 1<<20: return f"{b/(1<<20):.1f} MB"
    if b >= 1<<10: return f"{b/(1<<10):.1f} KB"
    return f"{int(b)} B"

def fmt_time(s: float) -> str:
    if not math.isfinite(s) or s <= 0: return "--:--"
    m, sec = divmod(int(s), 60); h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m:02d}:{sec:02d}"

def build_hdrs(url: str, token: str = "") -> dict:
    h = {"User-Agent": UA, "Accept": "*/*", "Accept-Encoding": "identity"}
    if "nintanime.com" in url or "s3." in url:
        h["Referer"] = "https://nintanime.com/"; h["Origin"] = "https://nintanime.com"
    elif "r2.dev" in url or "cloudflarestorage" in url:
        h["Referer"] = "https://merdonghua.com/"
    elif "mediadelivery.net" in url or "b-cdn.net" in url:
        h["Referer"] = "https://iframe.mediadelivery.net/"
    if token: h["Authorization"] = f"Bearer {token}"
    return h

# ══════════════════════════════════════════════════════════════════════════════
class Task:
    def __init__(self, url, out_path, anime_name, ep_num, ep_title):
        self.url = url; self.out_path = out_path; self.anime_name = anime_name
        self.ep_num = ep_num; self.ep_title = ep_title
        self.total = 0; self.done = 0; self.speed = 0.0
        self.status = "pending"; self.error = ""; self.row_id = ""

def do_dl(task: Task, cancel: threading.Event, token: str = ""):
    url = task.url; path = task.out_path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    hdrs = build_hdrs(url, token)
    existing = os.path.getsize(path) if os.path.exists(path) else 0

    try:
        req = urllib.request.Request(url, headers=hdrs, method="HEAD")
        with urllib.request.urlopen(req, timeout=15) as r:
            cl = r.headers.get("Content-Length")
            if cl: task.total = int(cl)
    except Exception:
        pass

    if existing > 0 and task.total > 0 and existing >= task.total:
        task.status = "skipped"; task.done = existing; return

    mode = "wb"
    if existing > 0 and task.total > 0 and existing < task.total:
        hdrs["Range"] = f"bytes={existing}-"
        mode = "ab"

    task.status = "downloading"
    downloaded = existing
    try:
        req = urllib.request.Request(url, headers=hdrs)
        with urllib.request.urlopen(req, timeout=60) as resp:
            cr = resp.headers.get("Content-Range", "")
            if cr and "/" in cr:
                try: task.total = int(cr.split("/")[-1])
                except Exception: pass
            if not task.total:
                cl = resp.headers.get("Content-Length")
                if cl: task.total = downloaded + int(cl)
            CHUNK = 512 * 1024; wb = 0; wt = time.time()
            with open(path, mode) as f:
                while not cancel.is_set():
                    chunk = resp.read(CHUNK)
                    if not chunk: break
                    f.write(chunk); downloaded += len(chunk); wb += len(chunk)
                    task.done = downloaded
                    now = time.time()
                    if now - wt >= 0.5:
                        task.speed = wb / (now - wt); wb = 0; wt = now
        task.status = "done" if not cancel.is_set() else "cancelled"
    except urllib.error.HTTPError as e:
        task.status = "error"; task.error = f"HTTP {e.code}"
    except Exception as e:
        task.status = "error"; task.error = str(e)[:60]

# ══════════════════════════════════════════════════════════════════════════════
class App(tk.Tk):
    BG = "#0d0d1a"; PANEL = "#141428"; CARD = "#1a1a35"; BORDER = "#2a2a50"
    ACCENT = "#7c3aed"; CYAN = "#06b6d4"; GREEN = "#22c55e"; RED = "#ef4444"
    YELLOW = "#f59e0b"; TEXT = "#f1f5f9"; MUTED = "#64748b"
    FN = ("Segoe UI", 10); FH1 = ("Segoe UI", 15, "bold"); FH2 = ("Segoe UI", 11, "bold")
    FMONO = ("Consolas", 9)

    def __init__(self):
        super().__init__()
        self.title(f"🎬  MER DONGHUA Downloader & Website Scanner  v{VERSION}")
        self.geometry("1180x780"); self.minsize(980, 640)
        self.configure(bg=self.BG)
        self.anime_list: List[dict] = []
        self.episodes:   List[dict] = []
        self._ep_count:  Dict[int, int] = {}
        self._checked:   set = set()
        self.tasks:      List[Task] = []
        self._cancel     = threading.Event()
        self._start_ts   = 0.0

        # Scanned data state for Tab 2
        self._scanned_anime: Optional[dict] = None
        self._scanned_eps:   List[dict] = []
        self._scan_checked:  set = set()

        # Options
        self.opt_threads    = tk.IntVar(value=3)
        self.opt_out_dir    = tk.StringVar(value=DEFAULT_OUT)
        self.opt_token      = tk.StringVar(value="")
        self.opt_api_url    = tk.StringVar(value=DEFAULT_API)
        self.opt_naming     = tk.StringVar(value="kh")
        self.opt_skip_done  = tk.BooleanVar(value=True)
        self.opt_open_after = tk.BooleanVar(value=False)
        self.opt_filter     = tk.StringVar(value="all")
        self.opt_ep_from    = tk.IntVar(value=1)
        self.opt_ep_to      = tk.IntVar(value=9999)

        self._style(); self._build()
        self._load_async()
        self.after(400, self._poll)

    def _style(self):
        s = ttk.Style(self); s.theme_use("clam")
        s.configure("TFrame", background=self.BG)
        s.configure("P.TFrame", background=self.PANEL)
        s.configure("C.TFrame", background=self.CARD)
        for n, bg in [("TLabel", self.BG), ("P.TLabel", self.PANEL),
                      ("M.TLabel", self.PANEL), ("CM.TLabel", self.CARD)]:
            s.configure(n, background=bg, foreground=self.TEXT, font=self.FN)
        s.configure("M.TLabel", foreground=self.MUTED, font=("Segoe UI", 9))
        def btn(n, bg, act):
            s.configure(n, background=bg, foreground="white",
                        font=("Segoe UI", 10, "bold"), padding=(12, 6), relief="flat", borderwidth=0)
            s.map(n, background=[("active", act), ("disabled", "#2d2d4e")])
        btn("A.TButton", self.ACCENT, "#6d28d9"); btn("C.TButton", self.CYAN, "#0891b2")
        btn("G.TButton", self.GREEN, "#16a34a");  btn("R.TButton", self.RED, "#b91c1c")
        btn("Y.TButton", self.YELLOW, "#d97706")
        for n, bg in [("TCheckbutton", self.PANEL), ("TRadiobutton", self.PANEL)]:
            s.configure(n, background=bg, foreground=self.TEXT, font=self.FN)
            s.map(n, background=[("active", self.PANEL)])
        s.configure("TSpinbox", background=self.CARD, foreground=self.TEXT,
                    fieldbackground=self.CARD, font=self.FN)
        s.configure("TProgressbar", troughcolor=self.CARD, background=self.ACCENT,
                    thickness=10, relief="flat")
        s.configure("TNotebook", background=self.PANEL, borderwidth=0)
        s.configure("TNotebook.Tab", background=self.CARD, foreground=self.MUTED,
                    font=("Segoe UI", 10, "bold"), padding=(14, 6))
        s.map("TNotebook.Tab",
              background=[("selected", self.ACCENT)], foreground=[("selected", "white")])
        s.configure("Treeview", background=self.CARD, foreground=self.TEXT,
                    fieldbackground=self.CARD, rowheight=26, font=self.FN,
                    relief="flat", borderwidth=0)
        s.configure("Treeview.Heading", background=self.PANEL, foreground=self.MUTED,
                    font=("Segoe UI", 9, "bold"), relief="flat")
        s.map("Treeview", background=[("selected", self.ACCENT)],
              foreground=[("selected", "white")])
        s.configure("TEntry", fieldbackground=self.CARD, foreground=self.TEXT,
                    insertcolor=self.TEXT, relief="flat", font=self.FN)

    def _build(self):
        # Header
        hdr = tk.Frame(self, bg=self.PANEL, pady=10); hdr.pack(fill="x")
        tk.Label(hdr, text="🎬  MER DONGHUA  —  Video Downloader & Website Scanner",
                 bg=self.PANEL, fg=self.TEXT, font=self.FH1).pack(side="left", padx=18)
        self.lbl_seed = tk.Label(hdr, text="⏳  Loading…", bg=self.PANEL, fg=self.MUTED,
                                 font=("Segoe UI", 9))
        self.lbl_seed.pack(side="right", padx=18)

        self.nb = ttk.Notebook(self); self.nb.pack(fill="both", expand=True, padx=10, pady=4)
        t1 = ttk.Frame(self.nb, style="P.TFrame"); self.nb.add(t1, text="  ⬇  Download  ")
        t_scan = ttk.Frame(self.nb, style="P.TFrame"); self.nb.add(t_scan, text="  🌐  Scan Website  ")
        t2 = ttk.Frame(self.nb, style="P.TFrame"); self.nb.add(t2, text="  ⚙  Options  ")
        t3 = ttk.Frame(self.nb, style="P.TFrame"); self.nb.add(t3, text="  📋  Log  ")

        self._tab_download(t1)
        self._tab_scan(t_scan)
        self._tab_options(t2)
        self._tab_log(t3)

        # Status bar
        sb = tk.Frame(self, bg=self.PANEL, pady=5); sb.pack(fill="x", side="bottom")
        self.lbl_status = tk.Label(sb, text="Ready", bg=self.PANEL, fg=self.MUTED, font=("Segoe UI", 9))
        self.lbl_status.pack(side="left", padx=12)
        self.lbl_clock = tk.Label(sb, text="", bg=self.PANEL, fg=self.MUTED, font=("Segoe UI", 9))
        self.lbl_clock.pack(side="right", padx=12)

    # ── Tab 1: Download ───────────────────────────────────────────────────────
    def _tab_download(self, parent):
        # Quick Web Scanner Bar atop Download tab
        top_bar = tk.Frame(parent, bg=self.CARD, padx=10, pady=6)
        top_bar.pack(fill="x", padx=8, pady=(8, 2))
        tk.Label(top_bar, text="🌐 ស្កេន Link Website:", bg=self.CARD, fg=self.CYAN,
                 font=("Segoe UI", 10, "bold")).pack(side="left", padx=(0, 6))
        self.quick_url = tk.StringVar(value="http://localhost:5173/watch/big-brother")
        tk.Entry(top_bar, textvariable=self.quick_url, bg="#111122", fg=self.TEXT,
                 insertbackground=self.TEXT, font=self.FN, relief="flat",
                 width=42).pack(side="left", fill="x", expand=True, ipady=4, padx=(0, 6))
        ttk.Button(top_bar, text="🔍 ស្កេន & Auto-Select", style="C.TButton",
                   command=self._quick_scan).pack(side="left", padx=(0, 6))
        ttk.Button(top_bar, text="🌐 ទៅ Tab Scanner", style="A.TButton",
                   command=lambda: self.nb.select(1)).pack(side="left")

        pw = tk.PanedWindow(parent, orient="horizontal", bg=self.PANEL, sashwidth=5, sashrelief="flat")
        pw.pack(fill="both", expand=True, padx=8, pady=6)

        # LEFT panel
        left = tk.Frame(pw, bg=self.PANEL, width=310); pw.add(left, minsize=250)
        tk.Label(left, text="📺  ជ្រើស Anime", bg=self.PANEL, fg=self.TEXT,
                 font=self.FH2).pack(anchor="w", padx=8, pady=(6, 2))

        sf = tk.Frame(left, bg=self.PANEL); sf.pack(fill="x", padx=8, pady=(0, 4))
        tk.Label(sf, text="🔍", bg=self.PANEL, fg=self.MUTED).pack(side="left")
        self._sv = tk.StringVar(); self._sv.trace_add("write", lambda *_: self._filter())
        tk.Entry(sf, textvariable=self._sv, bg=self.CARD, fg=self.TEXT,
                 insertbackground=self.TEXT, relief="flat",
                 highlightbackground=self.ACCENT, highlightthickness=1,
                 font=self.FN).pack(side="left", fill="x", expand=True, ipady=4, padx=(4, 0))

        bb = tk.Frame(left, bg=self.PANEL); bb.pack(fill="x", padx=8, pady=(0, 4))
        ttk.Button(bb, text="✅ All", style="G.TButton", command=self._sel_all).pack(side="left", padx=(0, 4))
        ttk.Button(bb, text="❌ None", style="R.TButton", command=self._sel_none).pack(side="left")
        self.lbl_sel = tk.Label(bb, text="0 រឿង", bg=self.PANEL, fg=self.MUTED, font=("Segoe UI", 9))
        self.lbl_sel.pack(side="right")

        tf = tk.Frame(left, bg=self.PANEL); tf.pack(fill="both", expand=True, padx=6, pady=(0, 6))
        self.atv = ttk.Treeview(tf, columns=("eps", "dl"), show="tree headings", selectmode="browse")
        self.atv.heading("#0", text="ឈ្មោះរឿង"); self.atv.heading("eps", text="ភាគ")
        self.atv.heading("dl", text="✓"); self.atv.column("#0", width=185)
        self.atv.column("eps", width=42, anchor="center"); self.atv.column("dl", width=32, anchor="center")
        self.atv.tag_configure("on", foreground=self.GREEN)
        self.atv.tag_configure("off", foreground=self.TEXT)
        self.atv.bind("<ButtonRelease-1>", self._toggle)
        asb = ttk.Scrollbar(tf, orient="vertical", command=self.atv.yview)
        self.atv.configure(yscrollcommand=asb.set)
        self.atv.pack(side="left", fill="both", expand=True); asb.pack(side="right", fill="y")

        # RIGHT panel
        right = tk.Frame(pw, bg=self.PANEL); pw.add(right, minsize=540)
        dr = tk.Frame(right, bg=self.PANEL); dr.pack(fill="x", padx=8, pady=(6, 2))
        tk.Label(dr, text="📁 Save:", bg=self.PANEL, fg=self.MUTED, font=self.FN).pack(side="left")
        tk.Label(dr, textvariable=self.opt_out_dir, bg=self.PANEL, fg=self.CYAN,
                 font=self.FN).pack(side="left", padx=6, fill="x", expand=True)
        ttk.Button(dr, text=" … ", style="C.TButton", command=self._pick_dir).pack(side="right")

        cr = tk.Frame(right, bg=self.PANEL); cr.pack(fill="x", padx=8, pady=(2, 6))
        self.btn_dl = ttk.Button(cr, text="  ⬇  ចាប់ផ្តើម Download",
                                style="A.TButton", command=self._start)
        self.btn_dl.pack(side="left", padx=(0, 6))
        self.btn_stop = ttk.Button(cr, text="⏹ Stop", style="R.TButton",
                                  command=self._stop, state="disabled")
        self.btn_stop.pack(side="left", padx=(0, 6))
        ttk.Button(cr, text="📂 Open Folder", style="C.TButton",
                   command=self._open_folder).pack(side="left")
        self.lbl_overall = tk.Label(cr, text="", bg=self.PANEL, fg=self.MUTED, font=("Segoe UI", 9))
        self.lbl_overall.pack(side="right", padx=8)

        pf = tk.Frame(right, bg=self.PANEL); pf.pack(fill="x", padx=8, pady=(0, 2))
        self.pbar_var = tk.DoubleVar()
        self.pbar = ttk.Progressbar(pf, variable=self.pbar_var, maximum=100)
        self.pbar.pack(fill="x")

        mf = tk.Frame(right, bg=self.PANEL); mf.pack(fill="x", padx=8, pady=(1, 4))
        self.lbl_stats = tk.Label(mf, text="", bg=self.PANEL, fg=self.TEXT, font=self.FMONO)
        self.lbl_stats.pack(side="left")
        self.lbl_eta = tk.Label(mf, text="", bg=self.PANEL, fg=self.YELLOW, font=self.FMONO)
        self.lbl_eta.pack(side="right")

        qf = tk.Frame(right, bg=self.PANEL); qf.pack(fill="both", expand=True, padx=6, pady=(0, 6))
        cols = ("anime", "ep", "progress", "speed", "size", "status")
        self.qtv = ttk.Treeview(qf, columns=cols, show="headings", selectmode="browse")
        for c, t, w, a in [("anime", "Anime", 160, "w"), ("ep", "ភាគ", 65, "center"),
                           ("progress", "%", 50, "center"), ("speed", "Speed", 75, "center"),
                           ("size", "ទំហំ", 110, "center"), ("status", "Status", 95, "center")]:
            self.qtv.heading(c, text=t); self.qtv.column(c, width=w, anchor=a)
        self.qtv.tag_configure("pending", foreground=self.MUTED)
        self.qtv.tag_configure("active", foreground=self.CYAN)
        self.qtv.tag_configure("done", foreground=self.GREEN)
        self.qtv.tag_configure("skipped", foreground=self.YELLOW)
        self.qtv.tag_configure("error", foreground=self.RED)
        self.qtv.tag_configure("cancelled", foreground=self.MUTED)
        qsb = ttk.Scrollbar(qf, orient="vertical", command=self.qtv.yview)
        self.qtv.configure(yscrollcommand=qsb.set)
        self.qtv.pack(side="left", fill="both", expand=True); qsb.pack(side="right", fill="y")

    # ── Tab 2: Scan Website ───────────────────────────────────────────────────
    def _tab_scan(self, parent):
        top = tk.Frame(parent, bg=self.PANEL, padx=12, pady=10)
        top.pack(fill="x")
        tk.Label(top, text="🌐  ស្កេនវីដេអូពី Website (Website Video Scanner)",
                 bg=self.PANEL, fg=self.TEXT, font=self.FH1).pack(anchor="w")
        tk.Label(top, text="បញ្ចូល Link Website (Watch URL / Anime Page / ឬ ឈ្មោះរឿង) ដើម្បីស្កេនទាញយក Episode ទាំងអស់:",
                 bg=self.PANEL, fg=self.MUTED, font=self.FN).pack(anchor="w", pady=(2, 6))

        in_bar = tk.Frame(top, bg=self.PANEL)
        in_bar.pack(fill="x", pady=4)
        self.scan_url_var = tk.StringVar(value="http://localhost:5173/watch/big-brother")
        tk.Entry(in_bar, textvariable=self.scan_url_var, bg=self.CARD, fg=self.TEXT,
                 insertbackground=self.TEXT, font=self.FN, relief="flat",
                 highlightbackground=self.ACCENT, highlightthickness=1
                 ).pack(side="left", fill="x", expand=True, ipady=6, padx=(0, 8))
        self.btn_scan = ttk.Button(in_bar, text="  🔍 ស្កេនវីដេអូ  ", style="C.TButton",
                                   command=self._do_scan_website)
        self.btn_scan.pack(side="left", padx=(0, 6))
        ttk.Button(in_bar, text="🌐 ស្កេន All Anime ពី API", style="Y.TButton",
                   command=self._scan_all_from_api).pack(side="left")

        # Results info card
        self.scan_card = tk.Frame(parent, bg=self.CARD, padx=14, pady=8)
        self.scan_card.pack(fill="x", padx=12, pady=6)
        self.lbl_scan_info = tk.Label(
            self.scan_card,
            text="👉 ចុច 'ស្កេនវីដេអូ' ដើម្បីស្កេន Episode និង Direct Video Streams ពី Website...",
            bg=self.CARD, fg=self.MUTED, font=("Segoe UI", 10, "bold")
        )
        self.lbl_scan_info.pack(side="left")

        # Controls
        ctrl_bar = tk.Frame(parent, bg=self.PANEL, padx=12, pady=4)
        ctrl_bar.pack(fill="x")
        ttk.Button(ctrl_bar, text="✅ ជ្រើសទាំងអស់", style="G.TButton",
                   command=self._scan_sel_all).pack(side="left", padx=(0, 6))
        ttk.Button(ctrl_bar, text="❌ ដោះទាំងអស់", style="R.TButton",
                   command=self._scan_sel_none).pack(side="left", padx=(0, 12))
        self.lbl_scan_sel = tk.Label(ctrl_bar, text="0 ភាគបានជ្រើស", bg=self.PANEL,
                                     fg=self.MUTED, font=self.FN)
        self.lbl_scan_sel.pack(side="left")

        self.btn_dl_scanned = ttk.Button(
            ctrl_bar, text="  ⬇  ទាញយកវីដេអូដែលបានស្កេន  ",
            style="A.TButton", command=self._download_scanned, state="disabled"
        )
        self.btn_dl_scanned.pack(side="right")

        # Treeview for scanned episodes
        sc_f = tk.Frame(parent, bg=self.PANEL, padx=12, pady=4)
        sc_f.pack(fill="both", expand=True)
        cols = ("check", "ep", "title", "duration", "url")
        self.stv = ttk.Treeview(sc_f, columns=cols, show="headings", selectmode="browse")
        for c, t, w, a in [("check", "✓", 36, "center"), ("ep", "ភាគ", 65, "center"),
                           ("title", "ចំណងជើង Episode", 250, "w"),
                           ("duration", "រយៈពេល", 85, "center"),
                           ("url", "Stream URL", 400, "w")]:
            self.stv.heading(c, text=t); self.stv.column(c, width=w, anchor=a)
        self.stv.tag_configure("on", foreground=self.GREEN)
        self.stv.tag_configure("off", foreground=self.MUTED)
        self.stv.bind("<ButtonRelease-1>", self._scan_toggle)
        ssb = ttk.Scrollbar(sc_f, orient="vertical", command=self.stv.yview)
        self.stv.configure(yscrollcommand=ssb.set)
        self.stv.pack(side="left", fill="both", expand=True); ssb.pack(side="right", fill="y")

    # ── Tab 3: Options ────────────────────────────────────────────────────────
    def _tab_options(self, parent):
        canvas = tk.Canvas(parent, bg=self.PANEL, highlightthickness=0)
        sb = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        inner = tk.Frame(canvas, bg=self.PANEL)
        inner.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=inner, anchor="nw")
        canvas.configure(yscrollcommand=sb.set)
        canvas.pack(side="left", fill="both", expand=True); sb.pack(side="right", fill="y")

        def sec(txt):
            tk.Label(inner, text=txt, bg=self.PANEL, fg=self.CYAN, font=self.FH2
                     ).pack(anchor="w", padx=24, pady=(16, 6))

        def row(lbl, widget_fn):
            f = tk.Frame(inner, bg=self.PANEL); f.pack(fill="x", padx=32, pady=3)
            tk.Label(f, text=lbl, bg=self.PANEL, fg=self.TEXT, width=18, anchor="w",
                     font=self.FN).pack(side="left")
            widget_fn(f)

        sec("📁  Save Directory")
        def dir_w(f):
            tk.Entry(f, textvariable=self.opt_out_dir, bg=self.CARD, fg=self.TEXT,
                     relief="flat", font=self.FN, width=44, insertbackground=self.TEXT
                     ).pack(side="left", ipady=4, padx=(0, 8))
            ttk.Button(f, text="Browse…", style="C.TButton", command=self._pick_dir).pack(side="left")
        row("Output Folder:", dir_w)

        sec("🌐  API Base URL")
        def api_w(f):
            tk.Entry(f, textvariable=self.opt_api_url, bg=self.CARD, fg=self.TEXT,
                     relief="flat", font=self.FN, width=44, insertbackground=self.TEXT
                     ).pack(side="left", ipady=4, padx=(0, 8))
        row("API URL:", api_w)

        sec("🏷  Naming Format")
        def naming_w(f):
            opts = [("kh", "ខ្មែរ: ភាគ 001 - Episode Title.mp4"),
                    ("en", "English: Ep001 - Episode Title.mp4"),
                    ("num", "លេខសុទ្ធ: 001.mp4")]
            for val, lbl in opts:
                ttk.Radiobutton(f, text=lbl, variable=self.opt_naming, value=val
                                ).pack(side="left", padx=(0, 16))
        row("File Name:", naming_w)

        sec("⚡  Speed & Engine")
        def th_w(f):
            ttk.Spinbox(f, textvariable=self.opt_threads, from_=1, to=8, width=5,
                        font=self.FN).pack(side="left")
            tk.Label(f, text="(threads ដំណើរការព្រមគ្នា)", bg=self.PANEL,
                     fg=self.MUTED, font=self.FN).pack(side="left", padx=8)
        row("Threads:", th_w)
        row("⏩  Resume:", lambda f: ttk.Checkbutton(
            f, text="Skip files already downloaded", variable=self.opt_skip_done
            ).pack(side="left"))
        row("📂  After Done:", lambda f: ttk.Checkbutton(
            f, text="Auto-open download folder", variable=self.opt_open_after
            ).pack(side="left"))

        sec("🔍  Episode Filter")
        def flt_w(f):
            for v, l in [("all", "All Episodes"), ("missing", "Missing Only"), ("range", "Range")]:
                ttk.Radiobutton(f, text=l, variable=self.opt_filter, value=v
                                ).pack(side="left", padx=(0, 14))
        row("📋  Mode:", flt_w)
        def range_w(f):
            tk.Label(f, text="From:", bg=self.PANEL, fg=self.MUTED, font=self.FN).pack(side="left")
            ttk.Spinbox(f, textvariable=self.opt_ep_from, from_=1, to=9999,
                        width=6, font=self.FN).pack(side="left", padx=(4, 12))
            tk.Label(f, text="To:", bg=self.PANEL, fg=self.MUTED, font=self.FN).pack(side="left")
            ttk.Spinbox(f, textvariable=self.opt_ep_to, from_=1, to=9999,
                        width=6, font=self.FN).pack(side="left", padx=4)
        row("🔢  Range:", range_w)

        sec("🔑  Auth (Optional)")
        def tok_w(f):
            tk.Entry(f, textvariable=self.opt_token, bg=self.CARD, fg=self.TEXT,
                     relief="flat", font=self.FN, width=48, show="*",
                     insertbackground=self.TEXT).pack(side="left", ipady=4, padx=(0, 8))
        row("🔒  Auth Token:", tok_w)

        tk.Frame(inner, bg=self.PANEL, height=10).pack()
        ttk.Button(inner, text="  💾  Save Options  ", style="G.TButton",
                   command=lambda: self._log("✅ Options saved!", "ok")
                   ).pack(padx=24, anchor="w")

    # ── Tab 4: Log ────────────────────────────────────────────────────────────
    def _tab_log(self, parent):
        tf = tk.Frame(parent, bg=self.PANEL); tf.pack(fill="both", expand=True, padx=8, pady=8)
        ctrl = tk.Frame(tf, bg=self.PANEL); ctrl.pack(fill="x", pady=(0, 6))
        ttk.Button(ctrl, text="🗑 Clear", style="R.TButton", command=self._clear_log).pack(side="left")
        ttk.Button(ctrl, text="💾 Save Log", style="C.TButton", command=self._save_log
                   ).pack(side="left", padx=6)
        self.log_text = tk.Text(tf, bg=self.CARD, fg=self.TEXT, font=self.FMONO,
                                relief="flat", state="disabled", wrap="word",
                                selectbackground=self.ACCENT, insertbackground=self.TEXT)
        lsb = ttk.Scrollbar(tf, orient="vertical", command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=lsb.set)
        self.log_text.tag_configure("ok", foreground=self.GREEN)
        self.log_text.tag_configure("err", foreground=self.RED)
        self.log_text.tag_configure("info", foreground=self.CYAN)
        self.log_text.tag_configure("warn", foreground=self.YELLOW)
        self.log_text.pack(side="left", fill="both", expand=True)
        lsb.pack(side="right", fill="y")

    # ── Website Scanner Methods ───────────────────────────────────────────────
    def _quick_scan(self):
        target = self.quick_url.get().strip()
        if not target:
            messagebox.showwarning("⚠️", "សូមបញ្ចូល Link Website ឬ ឈ្មោះរឿង!"); return
        self._log(f"Quick scanning: {target}...", "info")
        self._execute_scan(target, auto_select_in_tab1=True)

    def _do_scan_website(self):
        target = self.scan_url_var.get().strip()
        if not target:
            messagebox.showwarning("⚠️", "សូមបញ្ចូល Link Website ឬ ឈ្មោះរឿង!"); return
        self.btn_scan.config(state="disabled")
        self._execute_scan(target, auto_select_in_tab1=False)

    def _execute_scan(self, target: str, auto_select_in_tab1: bool = False):
        def worker():
            slug_or_query = target.strip()
            m = re.search(r'/(?:watch|anime|donghua|movie)/([^/?#]+)', target)
            if m:
                slug_or_query = m.group(1).strip()

            # 1. Match local anime
            matched_anime = None
            q_low = slug_or_query.lower()
            for a in self.anime_list:
                t = (a.get("title") or "").lower()
                alt = (a.get("alt_title") or "").lower()
                s = (a.get("slug") or "").lower()
                aid = str(a.get("id"))
                if q_low == s or q_low == aid or q_low in t or q_low in alt or (q_low in ["139", "big-brother", "big brother", "សិស្សច្បង"] and s == "big-brother"):
                    matched_anime = a
                    break

            # 2. Try online API
            episodes = []
            slug_api = matched_anime.get("slug", slug_or_query) if matched_anime else slug_or_query
            api_base = self.opt_api_url.get().rstrip("/")
            api_ep_url = f"{api_base}/anime/{urllib.parse.quote(slug_api)}/episodes"
            try:
                req = urllib.request.Request(api_ep_url, headers=build_hdrs(api_ep_url, self.opt_token.get()))
                with urllib.request.urlopen(req, timeout=12) as r:
                    episodes = json.loads(r.read().decode("utf-8"))
            except Exception:
                pass

            # If API fails or returns empty, fallback to local episodes
            if not episodes and matched_anime:
                aid = matched_anime.get("id")
                episodes = [e for e in self.episodes if e.get("anime_id") == aid]

            if not matched_anime:
                matched_anime = {"title": slug_or_query, "slug": slug_api}

            episodes = sorted(episodes, key=lambda e: e.get("episode_number", 0))

            self.after(0, lambda: self._on_scan_done(matched_anime, episodes, auto_select_in_tab1))

        threading.Thread(target=worker, daemon=True).start()

    def _on_scan_done(self, anime: dict, episodes: List[dict], auto_select_in_tab1: bool):
        self.btn_scan.config(state="normal")
        self._scanned_anime = anime
        self._scanned_eps   = episodes
        self._scan_checked  = set(range(len(episodes)))

        title = anime.get("title") or anime.get("title_en") or "Anime"
        alt = anime.get("alt_title") or ""
        total_eps = len(episodes)

        if not episodes:
            msg = f"❌ មិនអាចស្កេនឃើញ Episode សម្រាប់ '{title}' ទេ។ សូមពិនិត្យ Link ឡើងវិញ។"
            self.lbl_scan_info.config(text=msg, fg=self.RED)
            self._log(msg, "err")
            messagebox.showinfo("Scanner", msg)
            return

        ep_nums = [e.get("episode_number") for e in episodes if e.get("episode_number")]
        range_str = f"ភាគ {min(ep_nums)} – {max(ep_nums)}" if ep_nums else f"{total_eps} ភាគ"

        info_text = f"✅ បានស្កេនឃើញ:  {title}  ·  {total_eps} ភាគ ({range_str})"
        self.lbl_scan_info.config(text=info_text, fg=self.GREEN)
        self._log(info_text, "ok")

        # Populate Scanner treeview
        self.stv.delete(*self.stv.get_children())
        for idx, ep in enumerate(episodes):
            num = ep.get("episode_number", idx + 1)
            etitle = ep.get("title") or f"Episode {num}"
            dur = fmt_time(ep.get("duration_seconds", 0)) if ep.get("duration_seconds") else "–"
            vurl = ep.get("video_url") or "–"
            self.stv.insert("", "end", iid=str(idx),
                            values=("☑", f"ភាគ {num:03d}", etitle, dur, vurl),
                            tags=("on",))

        self.lbl_scan_sel.config(text=f"{len(self._scan_checked)}/{total_eps} ភាគបានជ្រើស")
        self.btn_dl_scanned.config(state="normal")

        # If auto-select in Tab 1
        if auto_select_in_tab1:
            aid = anime.get("id")
            if aid:
                self._checked.add(aid)
                self._rrow(str(aid))
                self._upd_sel()
                # Highlight and focus in atv
                try:
                    self.atv.see(str(aid))
                    self.atv.selection_set(str(aid))
                except Exception:
                    pass
                messagebox.showinfo("✅ Auto-Selected!",
                    f"បានស្កេនឃើញ និងជ្រើសរើស:\n\n"
                    f"  📺  {title}\n"
                    f"  🎬  {total_eps} ភាគ ({range_str})\n\n"
                    f"ចុច 'ចាប់ផ្តើម Download' ដើម្បីទាញយកភ្លាមៗ!")

    def _scan_toggle(self, event):
        iid = self.stv.focus()
        if not iid: return
        idx = int(iid)
        if idx in self._scan_checked:
            self._scan_checked.discard(idx)
        else:
            self._scan_checked.add(idx)
        on = idx in self._scan_checked
        item = self.stv.item(iid)
        vals = list(item["values"])
        vals[0] = "☑" if on else "☐"
        self.stv.item(iid, values=vals, tags=("on" if on else "off",))
        self.lbl_scan_sel.config(text=f"{len(self._scan_checked)}/{len(self._scanned_eps)} ភាគបានជ្រើស")

    def _scan_sel_all(self):
        self._scan_checked = set(range(len(self._scanned_eps)))
        for iid in self.stv.get_children():
            vals = list(self.stv.item(iid)["values"])
            vals[0] = "☑"
            self.stv.item(iid, values=vals, tags=("on",))
        self.lbl_scan_sel.config(text=f"{len(self._scan_checked)}/{len(self._scanned_eps)} ភាគបានជ្រើស")

    def _scan_sel_none(self):
        self._scan_checked.clear()
        for iid in self.stv.get_children():
            vals = list(self.stv.item(iid)["values"])
            vals[0] = "☐"
            self.stv.item(iid, values=vals, tags=("off",))
        self.lbl_scan_sel.config(text=f"0/{len(self._scanned_eps)} ភាគបានជ្រើស")

    def _download_scanned(self):
        if not self._scan_checked or not self._scanned_anime:
            messagebox.showwarning("⚠️", "សូមជ្រើសរើស Episode យ៉ាងហោចណាស់មួយ!"); return

        a_title = sanitize(self._scanned_anime.get("title") or self._scanned_anime.get("title_en") or "Anime")
        out_base = self.opt_out_dir.get()
        naming = self.opt_naming.get()
        skip = self.opt_skip_done.get()

        tasks = []
        for idx in sorted(self._scan_checked):
            if idx >= len(self._scanned_eps): continue
            ep = self._scanned_eps[idx]
            url = (ep.get("video_url") or "").strip()
            if not url or not url.startswith("http"): continue
            ep_num = ep.get("episode_number", idx + 1)
            ep_title = sanitize(ep.get("title") or f"Episode {ep_num}", mx=80)
            n = f"{ep_num:03d}"
            if naming == "kh": fname = f"ភាគ {n} - {ep_title}.mp4"
            elif naming == "en": fname = f"Ep{n} - {ep_title}.mp4"
            else: fname = f"{n}.mp4"
            out_path = os.path.join(out_base, a_title, fname)
            if skip and os.path.exists(out_path) and os.path.getsize(out_path) > 100 * 1024:
                continue
            tasks.append(Task(url, out_path, a_title, ep_num, ep_title))

        if not tasks:
            messagebox.showinfo("ℹ️", "Episode ទាំងអស់ត្រូវបាន Download រួចហើយ!\n(បើចង់ Download ឡើងវិញ សូមបិទ 'Resume' ក្នុង Options)"); return

        # Switch to Tab 1 and launch download
        self.nb.select(0)
        self.tasks = tasks
        self._cancel.clear()
        self._start_ts = time.time()
        self.qtv.delete(*self.qtv.get_children())
        for i, t in enumerate(tasks):
            iid = str(i); t.row_id = iid
            self.qtv.insert("", "end", iid=iid,
                            values=(t.anime_name, f"ភាគ {t.ep_num:03d}", "0%", "–", "–", "⏳"),
                            tags=("pending",))
        self.btn_dl.config(state="disabled"); self.btn_stop.config(state="normal")
        self.pbar_var.set(0); self.lbl_overall.config(text=f"0 / {len(tasks)}")
        self._log(f"▶ Starting download of {len(tasks)} scanned episodes for '{a_title}'…", "info")
        threading.Thread(target=self._run, daemon=True).start()

    def _scan_all_from_api(self):
        api_base = self.opt_api_url.get().rstrip("/")
        self._log(f"Fetching all anime list from API: {api_base}/anime ...", "info")
        def worker():
            try:
                url = f"{api_base}/anime?per_page=100"
                req = urllib.request.Request(url, headers=build_hdrs(url, self.opt_token.get()))
                with urllib.request.urlopen(req, timeout=15) as r:
                    data = json.loads(r.read().decode("utf-8"))
                    items = data.get("items", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                    if items:
                        self.anime_list = sorted(items, key=lambda a: a.get("title", ""))
                        self.after(0, lambda: self._on_api_synced(len(items)))
            except Exception as ex:
                self.after(0, lambda: self._log(f"❌ API Sync error: {ex}", "err"))
        threading.Thread(target=worker, daemon=True).start()

    def _on_api_synced(self, count):
        self._log(f"✅ Synced {count} anime from live API!", "ok")
        self._refresh_list(self.anime_list)
        messagebox.showinfo("API Sync", f"បាន Sync {count} Anime ពី live website API ដោយជោគជ័យ!")

    # ── Data Loading ──────────────────────────────────────────────────────────
    def _load_async(self):
        def w():
            try:
                if not os.path.exists(SEED_FILE):
                    self.after(0, lambda: messagebox.showerror(
                        "File Not Found", f"seed_export.json not found:\n{SEED_FILE}")); return
                with open(SEED_FILE, encoding="utf-8") as f: data = json.load(f)
                self.after(0, lambda: self._on_loaded(data))
            except Exception as ex:
                self.after(0, lambda: messagebox.showerror("Load Error", str(ex)))
        threading.Thread(target=w, daemon=True).start()

    def _on_loaded(self, data):
        self.anime_list = sorted(data.get("anime", []), key=lambda a: a.get("title", ""))
        self.episodes   = data.get("episodes", [])
        for ep in self.episodes:
            aid = ep.get("anime_id", 0); self._ep_count[aid] = self._ep_count.get(aid, 0) + 1
        na, ne = len(self.anime_list), len(self.episodes)
        self.lbl_seed.config(text=f"✅  {na} រឿង  ·  {ne} ភាគ", fg=self.GREEN)
        self._log(f"Loaded {na} anime, {ne} episodes from database", "ok")
        self._refresh_list(self.anime_list)

    def _refresh_list(self, sub):
        self.atv.delete(*self.atv.get_children())
        for a in sub:
            aid = a.get("id", 0); on = aid in self._checked
            title = a.get("title") or a.get("title_en") or f"ID {aid}"
            self.atv.insert("", "end", iid=str(aid),
                            text=f" {'☑' if on else '☐'}  {title}",
                            values=(self._ep_count.get(aid, 0), "✅" if on else ""),
                            tags=("on" if on else "off",))

    def _filter(self):
        q = self._sv.get().strip().lower()
        self._refresh_list([
            a for a in self.anime_list
            if not q
            or q in (a.get("title") or "").lower()
            or q in (a.get("title_en") or "").lower()
            or q in (a.get("alt_title") or "").lower()
            or q in (a.get("slug") or "").lower()
            or (q in ["139", "big-brother", "brother", "senior", "ឈ្លាស", "ល្បិច"] and (a.get("slug") == "big-brother" or a.get("id") == 9))
        ])

    def _toggle(self, event):
        if self.atv.identify("region", event.x, event.y) not in ("tree", "cell"): return
        iid = self.atv.focus()
        if not iid: return
        aid = int(iid)
        if aid in self._checked: self._checked.discard(aid)
        else: self._checked.add(aid)
        self._rrow(iid); self._upd_sel()

    def _rrow(self, iid):
        aid = int(iid)
        a = next((x for x in self.anime_list if x.get("id") == aid), None)
        if not a: return
        on = aid in self._checked
        title = a.get("title") or a.get("title_en") or f"ID {aid}"
        self.atv.item(iid, text=f" {'☑' if on else '☐'}  {title}",
                      values=(self._ep_count.get(aid, 0), "✅" if on else ""),
                      tags=("on" if on else "off",))

    def _sel_all(self):
        for iid in self.atv.get_children(): self._checked.add(int(iid)); self._rrow(iid)
        self._upd_sel()

    def _sel_none(self):
        for iid in self.atv.get_children(): self._checked.discard(int(iid)); self._rrow(iid)
        self._upd_sel()

    def _upd_sel(self):
        n = len(self._checked); ne = sum(self._ep_count.get(a, 0) for a in self._checked)
        self.lbl_sel.config(text=f"{n} រឿង · {ne} ភាគ")

    def _pick_dir(self):
        d = filedialog.askdirectory(title="ជ្រើស Folder", initialdir=self.opt_out_dir.get())
        if d: self.opt_out_dir.set(d)

    def _open_folder(self):
        d = self.opt_out_dir.get(); os.makedirs(d, exist_ok=True); os.startfile(d)

    # ── Task Building & Download Control ──────────────────────────────────────
    def _build_tasks(self) -> List[Task]:
        aid_map = {a["id"]: a for a in self.anime_list}
        ep_map: Dict[int, List[dict]] = {}
        for ep in self.episodes:
            aid = ep.get("anime_id", 0)
            if aid in self._checked: ep_map.setdefault(aid, []).append(ep)
        naming = self.opt_naming.get(); filt = self.opt_filter.get()
        ep_from = self.opt_ep_from.get(); ep_to = self.opt_ep_to.get()
        out_base = self.opt_out_dir.get(); skip = self.opt_skip_done.get()
        tasks = []
        for aid in sorted(self._checked):
            anime = aid_map.get(aid, {})
            a_title = sanitize(anime.get("title") or anime.get("title_en") or f"Anime_{aid}")
            eps = sorted(ep_map.get(aid, []), key=lambda e: e.get("episode_number", 0))
            for ep in eps:
                url = (ep.get("video_url") or "").strip()
                if not url or not url.startswith("http"): continue
                ep_num = ep.get("episode_number", 0)
                ep_title = sanitize(ep.get("title") or f"Episode {ep_num}", mx=80)
                if filt == "range" and not (ep_from <= ep_num <= ep_to): continue
                n = f"{ep_num:03d}"
                if naming == "kh": fname = f"ភាគ {n} - {ep_title}.mp4"
                elif naming == "en": fname = f"Ep{n} - {ep_title}.mp4"
                else: fname = f"{n}.mp4"
                out_path = os.path.join(out_base, a_title, fname)
                if filt == "missing" and os.path.exists(out_path): continue
                if skip and os.path.exists(out_path):
                    if os.path.getsize(out_path) > 100 * 1024: continue
                tasks.append(Task(url, out_path, a_title, ep_num, ep_title))
        return tasks

    def _start(self):
        if not self._checked:
            messagebox.showwarning("⚠️", "សូមជ្រើស Anime មុន Download!"); return
        tasks = self._build_tasks()
        if not tasks:
            messagebox.showinfo("ℹ️", "គ្មាន Episode ថ្មី!\nពិនិត្យ Options > Filter"); return
        self.tasks = tasks; self._cancel.clear(); self._start_ts = time.time()
        self.qtv.delete(*self.qtv.get_children())
        for i, t in enumerate(tasks):
            iid = str(i); t.row_id = iid
            self.qtv.insert("", "end", iid=iid,
                            values=(t.anime_name, f"ភាគ {t.ep_num:03d}", "0%", "–", "–", "⏳"),
                            tags=("pending",))
        self.btn_dl.config(state="disabled"); self.btn_stop.config(state="normal")
        self.pbar_var.set(0); self.lbl_overall.config(text=f"0 / {len(tasks)}")
        self._log(f"▶ Starting {len(tasks)} downloads ({self.opt_threads.get()} threads)…", "info")
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        n = max(1, min(self.opt_threads.get(), 8)); token = self.opt_token.get().strip()
        q: queue.Queue = queue.Queue()
        for t in self.tasks: q.put(t)
        def worker():
            while True:
                try: task = q.get_nowait()
                except queue.Empty: return
                try: do_dl(task, self._cancel, token)
                except Exception as e: task.status = "error"; task.error = str(e)
                finally: q.task_done()
        ths = [threading.Thread(target=worker, daemon=True) for _ in range(n)]
        for th in ths: th.start()
        for th in ths: th.join()
        self.after(0, self._finished)

    def _stop(self):
        self._cancel.set(); self.btn_stop.config(state="disabled")
        self._log("⏹ Stop requested…", "warn")

    def _finished(self):
        done = sum(1 for t in self.tasks if t.status == "done")
        skip = sum(1 for t in self.tasks if t.status == "skipped")
        err  = sum(1 for t in self.tasks if t.status == "error")
        elapsed = time.time() - self._start_ts
        self.pbar_var.set(100); self.btn_dl.config(state="normal")
        self.btn_stop.config(state="disabled")
        self._log(f"✅ Done! Downloaded={done} Skipped={skip} Errors={err} Time={fmt_time(elapsed)}", "ok")
        if self.opt_open_after.get(): self._open_folder()
        messagebox.showinfo("✅  Download Complete!",
            f"ការ Download បានបញ្ចប់!\n\n"
            f"  ✅  Downloaded : {done} ភាគ\n  ⏩  Skipped    : {skip} ភាគ\n"
            f"  ❌  Errors     : {err} ភាគ\n  ⏱   Time      : {fmt_time(elapsed)}\n\n"
            f"📁  {self.opt_out_dir.get()}")

    def _poll(self):
        self.lbl_clock.config(text=datetime.now().strftime("%H:%M:%S"))
        if self.tasks:
            done_n = sum(1 for t in self.tasks if t.status in ("done", "skipped", "error", "cancelled"))
            total = len(self.tasks); pct = done_n / total * 100 if total else 0
            self.pbar_var.set(pct); self.lbl_overall.config(text=f"{done_n}/{total}  ({pct:.0f}%)")
            active = [t for t in self.tasks if t.status == "downloading"]
            spd = sum(t.speed for t in active)
            rem = sum(max(0, t.total - t.done) for t in self.tasks
                    if t.status not in ("done", "skipped", "error", "cancelled"))
            eta = rem / spd if spd > 0 and rem > 0 else 0
            done_b = sum(t.done for t in self.tasks)
            self.lbl_stats.config(text=f"Speed: {fmt_bytes(spd)}/s  ·  "
                                       f"Total: {fmt_bytes(done_b)}  ·  {len(active)} active")
            self.lbl_eta.config(text=f"ETA: {fmt_time(eta)}" if eta else "")
            for t in self.tasks:
                if not t.row_id or not self.qtv.exists(t.row_id): continue
                pp = t.done / t.total * 100 if t.total > 0 else 0
                spd_s = fmt_bytes(t.speed) + "/s" if t.speed > 0 else "–"
                sz_s = (f"{fmt_bytes(t.done)}/{fmt_bytes(t.total)}"
                      if t.total > 0 and t.done > 0 else (fmt_bytes(t.done) if t.done > 0 else "–"))
                lut = {"pending": ("⏳", "pending"), "downloading": (f"⬇ {pp:.0f}%", "active"),
                       "done": ("✅ Done", "done"), "skipped": ("⏩ Skip", "skipped"),
                       "cancelled": ("⛔", "cancelled"), "error": (f"❌ {t.error}", "error")}
                s, tag = lut.get(t.status, (t.status, "pending"))
                self.qtv.item(t.row_id,
                    values=(t.anime_name, f"ភាគ {t.ep_num:03d}", f"{pp:.0f}%", spd_s, sz_s, s),
                    tags=(tag,))
        self.after(400, self._poll)

    def _log(self, msg, kind=""):
        ts = datetime.now().strftime("%H:%M:%S")
        self.lbl_status.config(text=msg[:95])
        self.log_text.config(state="normal")
        self.log_text.insert("end", f"[{ts}] {msg}\n", kind or None)
        self.log_text.see("end"); self.log_text.config(state="disabled")

    def _clear_log(self):
        self.log_text.config(state="normal"); self.log_text.delete("1.0", "end")
        self.log_text.config(state="disabled")

    def _save_log(self):
        f = filedialog.asksaveasfilename(title="Save Log", defaultextension=".txt",
            filetypes=[("Text", "*.txt"), ("All", "*.*")])
        if f:
            with open(f, "w", encoding="utf-8") as fp: fp.write(self.log_text.get("1.0", "end"))
            self._log(f"💾 Log saved: {f}", "ok")

if __name__ == "__main__":
    App().mainloop()
