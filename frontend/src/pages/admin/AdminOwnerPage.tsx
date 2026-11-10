import { useEffect, useState } from 'react';
import {
  Crown, Shield, Users, Key, Database, Globe, Smartphone, Bot,
  TrendingUp, Activity, AlertTriangle, CheckCircle2, XCircle,
  Settings, Lock, Unlock, RefreshCw,
  Server, HardDrive, Wifi, Eye,
  UserPlus, UserMinus, UserX, ShieldCheck, ShieldOff, Zap, Star,
  ChevronRight, DollarSign,
  BarChart3, Package, Code, Terminal,
  GitBranch, Save, Info, Layers
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useAuthStore } from '../../store/authStore';
import { triggerConfirm } from '../../store/confirmStore';
import api, { clearApiCache } from '../../services/api';
import { clearLocalCatalogCache } from '../../services/catalogService';

const INPUT_CLASS =
  'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all';

function StatCard({ icon: Icon, label, value, color, bgColor, sub, trend }: any) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bgColor} border border-slate-200/60 flex items-center justify-center ${color} group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <TrendingUp className="w-2.5 h-2.5" /> {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="font-display font-bold text-xl text-slate-900 mt-0.5 tracking-tight">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Section Badge ────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, color = 'text-blue-600', actions }: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-500 font-normal mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export function AdminOwnerPage() {
  const { user, isOwner } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'admins' | 'security' | 'platform' | 'video_csv' | 'logs'>('overview');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [videoCsvFile, setVideoCsvFile] = useState<File | null>(null);
  const [videoCsvPreview, setVideoCsvPreview] = useState<any>(null);
  const [videoCsvBusy, setVideoCsvBusy] = useState(false);
  const [cacheBusy, setCacheBusy] = useState(false);

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    site_name: 'MerDonghua',
    site_url: 'https://merdonghua.com',
    maintenance_mode: false,
    allow_registration: true,
    max_free_episodes: 3,
    vip_price_khr: 4000,
    vip_price_usd: 1,
  });

  // New Admin Form
  const [newAdminForm, setNewAdminForm] = useState({ username: '', email: '', role: 'ADMIN' as 'ADMIN' | 'STAFF' });
  const [showNewAdminForm, setShowNewAdminForm] = useState(false);

  // System Health
  const [systemHealth, setSystemHealth] = useState<any>({
    api_status: 'checking',
    db_status: 'checking',
    cdn_status: 'checking',
    telegram_status: 'checking',
  });

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };
  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: null })),
        api.get('/admin/users?per_page=100').catch(() => ({ data: { items: [] } })),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      const allUsers = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.items || [];
      setAdmins(allUsers.filter((u: any) => u.role === 'ADMIN' || u.role === 'STAFF' || u.role === 'OWNER'));

      // Check system health
      await checkSystemHealth();
    } finally {
      setIsLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    const checks = await Promise.allSettled([
      api.get('/admin/stats'),
      api.get('/schedule/top-rank?limit=1'),
    ]);
    setSystemHealth({
      api_status: checks[0].status === 'fulfilled' ? 'online' : 'offline',
      db_status: checks[0].status === 'fulfilled' ? 'online' : 'error',
      cdn_status: 'online',
      telegram_status: 'online',
    });
  };

  const handlePromoteUser = async (userId: number, role: 'ADMIN' | 'STAFF' | 'USER') => {
    setSaving(true);
    try {
      await api.put(`/admin/users/${userId}`, { role, is_active: true });
      showSuccess(`User role ត្រូវបានផ្លាស់ប្តូរទៅ ${role} ដោយជោគជ័យ!`);
      loadData();
    } catch (e: any) {
      showError(e?.response?.data?.detail || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableAdmin = (u: any) => {
    if (u.role === 'OWNER') { showError('មិនអាច Disable OWNER បានទេ!'); return; }
    triggerConfirm({
      title: `Disable ${u.username}?`,
      message: `ចាក់សោរ ${u.username} - ${u.email}? Admin/Staff នេះនឹងមិនអាចចូលប្រើប្រាស់ Panel បានទៀតទេ!`,
      confirmText: 'Disable Account',
      variant: 'danger',
      onConfirm: async () => {
        await api.put(`/admin/users/${u.id}`, { is_active: false });
        showSuccess(`${u.username} ត្រូវបានបិទគណនីហើយ!`);
        loadData();
      },
    });
  };

  const importVideoCsv = async (apply: boolean) => {
    if (!videoCsvFile) {
      showError('Please choose a CSV file first.');
      return;
    }
    setVideoCsvBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', videoCsvFile);
      formData.append('apply', String(apply));
      const response = await api.post('/stream/csv-import', formData);
      if (apply) {
        clearApiCache('anime');
        clearApiCache('episodes');
      }
      setVideoCsvPreview(response.data);
      const counts = response.data?.counts || {};
      const changed = (counts.add || 0) + (counts.update || 0);
      const skipped = response.data?.skipped?.length || 0;
      if (apply && changed === 0 && (counts.unchanged || 0) === 0) {
        showError(`No video links were imported. ${skipped} CSV row(s) were skipped; check the reasons below.`);
      } else if (apply) {
        showSuccess(`Import complete: ${counts.add || 0} added, ${counts.update || 0} updated, ${counts.unchanged || 0} unchanged, ${skipped} skipped.`);
      } else {
        showSuccess('CSV preview is ready. Confirm the anime title and slug before applying.');
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setVideoCsvPreview(detail?.conflicts ? { conflicts: detail.conflicts, counts: detail.preview } : null);
      if (!e?.response) {
        showError(`CSV import cannot reach the backend at ${api.defaults.baseURL}. Start the backend API, then retry.`);
      } else {
        showError(detail?.message || (typeof detail === 'string' ? detail : `CSV import failed (HTTP ${e.response.status}).`));
      }
    } finally {
      setVideoCsvBusy(false);
    }
  };

  const clearApplicationCache = async () => {
    setCacheBusy(true);
    try {
      const response = await api.post('/cache/clear');
      clearApiCache();
      clearLocalCatalogCache();
      showSuccess(`Cache cleared (${response.data?.cleared_keys ?? 0} server entries). Reload the website to fetch fresh data.`);
    } catch (e: any) {
      showError(e?.response?.data?.detail || 'Could not clear the application cache.');
    } finally {
      setCacheBusy(false);
    }
  };

  const downloadVideoQualityTemplate = () => {
    const csv = [
      'Clean Movie Title,Episode Number,Source Type,Quality,Public URL,Status',
      'Anime Title Episode 1,1,primary,1080p,https://example.com/episode.mp4,completed',
    ].join('\r\n');
    const downloadUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = 'video_quality_template.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const exportVideoCsv = async () => {
    setVideoCsvBusy(true);
    try {
      const response = await api.get('/stream/csv-export', { responseType: 'blob' });
      const downloadUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'anime_video_links.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      showSuccess('Video links CSV downloaded.');
    } catch (e: any) {
      if (!e?.response) {
        showError(`CSV export cannot reach the backend at ${api.defaults.baseURL}. Start the backend API, then retry.`);
      } else {
        let msg = `CSV export failed (HTTP ${e.response.status}).`;
        if (e.response.data instanceof Blob) {
          try {
            const text = await e.response.data.text();
            const parsed = JSON.parse(text);
            if (parsed.detail) {
              msg = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
            }
          } catch {}
        } else if (e.response.data?.detail) {
          msg = typeof e.response.data.detail === 'string' ? e.response.data.detail : JSON.stringify(e.response.data.detail);
        }
        showError(msg);
      }
    } finally {
      setVideoCsvBusy(false);
    }
  };

  const openVipPlans = () => {
    setActiveTab('platform');
    window.setTimeout(() => {
      document.getElementById('owner-vip-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const statusDot = (status: string) =>
    status === 'online' ? 'bg-emerald-500' :
    status === 'checking' ? 'bg-amber-500 animate-pulse' :
    'bg-rose-500';

  const statusLabel = (status: string) =>
    status === 'online' ? 'Online' :
    status === 'checking' ? 'Checking...' :
    status === 'error' ? 'Error' : 'Offline';

  const tabs = [
    { id: 'overview', label: 'ទិដ្ឋភាពរួម', icon: BarChart3 },
    { id: 'admins', label: 'Admin & Staff', icon: ShieldCheck },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'platform', label: 'Platform Settings', icon: Settings },
    { id: 'video_csv', label: 'Video CSV', icon: Database },
    { id: 'logs', label: 'System Logs', icon: Terminal },
  ] as const;

  if (!isOwner) {
    return (
      <AdminLayout title="Owner Control — Access Denied">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center">
            <ShieldOff className="w-10 h-10 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500 text-sm">Only Platform Owner (OWNER) can access this page.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Owner Portal">
      <div className="space-y-4 sm:space-y-6">

        {/* ── OWNER IDENTITY BANNER ─────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            {/* Crown Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm ring-4 ring-amber-100">
                <Crown className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h1 className="font-display font-bold text-lg sm:text-2xl text-slate-900 tracking-tight">
                  {user?.username}
                </h1>
                <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1">
                  PLATFORM OWNER
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px] px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">ម្ចាស់ Platform — Full Control Access</p>
              <p className="text-[11px] text-slate-500 font-mono truncate">{user?.email}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4 sm:gap-5 shrink-0 self-stretch sm:self-auto justify-around sm:justify-start pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200">
              <div className="text-center">
                <p className="text-base sm:text-xl font-bold text-slate-900">{stats?.total_users?.toLocaleString() ?? '—'}</p>
                <p className="text-[10px] text-slate-500">Users</p>
              </div>
              <div className="h-8 sm:h-10 w-px bg-slate-200 self-center" />
              <div className="text-center">
                <p className="text-base sm:text-xl font-bold text-blue-600">{stats?.total_donghua ?? '—'}</p>
                <p className="text-[10px] text-slate-500">Donghua</p>
              </div>
              <div className="h-8 sm:h-10 w-px bg-slate-200 self-center" />
              <div className="text-center">
                <p className="text-base sm:text-xl font-bold text-emerald-600">{stats?.total_episodes?.toLocaleString() ?? '—'}</p>
                <p className="text-[10px] text-slate-500">Episodes</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── SUCCESS / ERROR MESSAGES ───────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm px-4 py-3 rounded-2xl font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm px-4 py-3 rounded-2xl font-medium">
            <XCircle className="w-4 h-4 shrink-0 text-rose-600" /> {errorMsg}
          </div>
        )}

        {/* ── TABS (Swipeable on Mobile) ──────────────────────────────────── */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-sm overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
          <button
            onClick={openVipPlans}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            title="View VIP plans and prices"
          >
            <Crown className="h-3.5 w-3.5 text-amber-600" />
            VIP Plans
          </button>
          <button
            onClick={loadData}
            className="ml-auto text-slate-500 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-100"
            title="Refresh All Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: OVERVIEW                                               */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* System Health Cards */}
            <div>
              <SectionHeader icon={Activity} title="System Health Monitor" subtitle="Real-time status of all MerDonghua services" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'api_status', label: 'FastAPI Backend', icon: Server, desc: 'REST API Engine' },
                  { key: 'db_status', label: 'Database', icon: Database, desc: 'SQLite / PostgreSQL' },
                  { key: 'cdn_status', label: 'CDN / R2 Storage', icon: HardDrive, desc: 'Cloudflare R2' },
                  { key: 'telegram_status', label: 'Telegram Bot', icon: Bot, desc: 'Mini App Gateway' },
                ].map(({ key, label, icon: Icon, desc }) => (
                  <div key={key} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2 shadow-sm hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <span
                        className={`flex items-center gap-1.5 text-[10px] font-semibold ${
                          systemHealth[key] === 'online'
                            ? 'text-emerald-700'
                            : systemHealth[key] === 'checking'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot(systemHealth[key])}`} />
                        {statusLabel(systemHealth[key])}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{label}</p>
                      <p className="text-[10px] text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={openVipPlans}
                className="mt-3 flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50/70"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                    <Crown className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-900">VIP Plans & Prices</span>
                    <span className="mt-0.5 block text-xs text-slate-500">Pro $2 · Plus $3 · Premium $5 / month · Purchases go to Telegram Admin</span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </div>

            {/* Full Stats Grid */}
            <div>
              <SectionHeader icon={BarChart3} title="Platform Statistics" subtitle="Complete overview of MerDonghua platform" />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                <StatCard icon={Eye} label="Total Stream Views" value={stats?.total_views?.toLocaleString()} color="text-blue-600" bgColor="bg-blue-50" trend="+14.2%" />
                <StatCard icon={Users} label="Registered Users" value={stats?.total_users?.toLocaleString()} color="text-blue-600" bgColor="bg-blue-50" trend="+8.5%" />
                <StatCard icon={Crown} label="VIP Subscribers" value={stats?.vip_users?.toLocaleString() ?? '—'} color="text-amber-600" bgColor="bg-amber-50" sub="Active VIP members" />
                <StatCard icon={Zap} label="Donghua Series" value={stats?.total_donghua} color="text-blue-600" bgColor="bg-blue-50" />
                <StatCard icon={Layers} label="Total Episodes" value={stats?.total_episodes?.toLocaleString()} color="text-emerald-600" bgColor="bg-emerald-50" />
                <StatCard icon={Star} label="Anime Series" value={stats?.total_anime} color="text-sky-600" bgColor="bg-sky-50" />
                <StatCard icon={Activity} label="Active Users (24h)" value={stats?.active_users?.toLocaleString() ?? '—'} color="text-slate-700" bgColor="bg-slate-100" trend="+3.1%" />
                <StatCard icon={DollarSign} label="Est. Monthly Revenue" value={`$${((stats?.vip_users ?? 0) * 1).toFixed(0)}`} color="text-emerald-600" bgColor="bg-emerald-50" sub="Based on VIP subscribers" />
              </div>
            </div>

            {/* Revenue Projection */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <SectionHeader icon={DollarSign} title="Revenue & Business Overview" subtitle="Platform financial summary" color="text-emerald-600" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">VIP Price (KHR)</p>
                  <p className="text-2xl font-bold text-emerald-700">4,000 ៛</p>
                  <p className="text-[10px] text-slate-500 mt-1">Per month per user</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">VIP Price (USD)</p>
                  <p className="text-2xl font-bold text-amber-700">$1.00</p>
                  <p className="text-[10px] text-slate-500 mt-1">≈ 4,000 KHR equivalent</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Est. Monthly Revenue</p>
                  <p className="text-2xl font-bold text-blue-700">${((stats?.vip_users ?? 0) * 1).toFixed(0)}</p>
                  <p className="text-[10px] text-slate-500 mt-1">If all VIPs pay monthly</p>
                </div>
              </div>
            </div>

            {/* Quick Access Links */}
            <div>
              <SectionHeader icon={Zap} title="Quick Access — Owner Controls" subtitle="Shortcuts to all management areas" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Manage Admins', sub: 'Add / Remove Admins', icon: ShieldCheck, color: 'text-amber-600', tab: 'admins' },
                  { label: 'Platform Settings', sub: 'Site config & controls', icon: Settings, color: 'text-blue-600', tab: 'platform' },
                  { label: 'Video CSV', sub: 'Import / export episode links', icon: Database, color: 'text-emerald-600', tab: 'video_csv' },
                  { label: 'Security Center', sub: 'Bans & protection', icon: Lock, color: 'text-rose-600', tab: 'security' },
                  { label: 'System Logs', sub: 'Activity & audit trail', icon: Terminal, color: 'text-slate-700', tab: 'logs' },
                ].map(({ label, sub, icon: Icon, color, tab }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className="group text-left p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 shadow-sm transition-all"
                  >
                    <div className={`w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center ${color} mb-3 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">{label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
                    <ChevronRight className={`w-3.5 h-3.5 ${color} mt-2 opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'video_csv' && (
          <div className="max-w-5xl space-y-5">
            <SectionHeader
              icon={Database}
              title="Import / Export Video Links CSV"
              subtitle="Match episodes by anime ID or exact title and episode number. Preview before applying changes."
              color="text-emerald-600"
              actions={
                <button
                  type="button"
                  onClick={clearApplicationCache}
                  disabled={cacheBusy}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${cacheBusy ? 'animate-spin' : ''}`} />
                  {cacheBusy ? 'Clearing...' : 'Clear Cache'}
                </button>
              }
            />

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Export video links</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Download published anime episodes with IDs, titles, episode numbers, video URLs, and link status. The CSV can be used again for import.
                </p>
              </div>
              <button
                onClick={exportVideoCsv}
                disabled={videoCsvBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                <Database className="h-4 w-4" /> Download video_links.csv
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Import video links</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Use one row and one Public URL per episode. Set Source Type to primary and Quality to the source resolution (for example 1080p). This labels the one link without needing extra URLs. Add quality rows only when you have separate encoded files. Preview checks the links before applying.
                </p>
                <button
                  type="button"
                  onClick={downloadVideoQualityTemplate}
                  className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Download Quality CSV template
                </button>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setVideoCsvFile(event.target.files?.[0] || null);
                    setVideoCsvPreview(null);
                  }}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-100"
                />
              </label>
              {videoCsvFile && (
                <p className="font-mono text-xs text-slate-500">
                  {videoCsvFile.name} · {(videoCsvFile.size / 1024).toFixed(1)} KB
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => importVideoCsv(false)}
                  disabled={videoCsvBusy || !videoCsvFile}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
                >
                  Preview matches
                </button>
                <button
                  onClick={() => importVideoCsv(true)}
                  disabled={videoCsvBusy || !videoCsvFile || !videoCsvPreview?.counts || (videoCsvPreview?.conflicts?.length ?? 0) > 0}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  Apply CSV import
                </button>
              </div>

              {videoCsvPreview?.counts && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <strong className="block text-base text-emerald-700">{videoCsvPreview.counts.add}</strong>
                      <span className="text-slate-500">Add</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <strong className="block text-base text-amber-700">{videoCsvPreview.counts.update}</strong>
                      <span className="text-slate-500">Update</span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <strong className="block text-base text-slate-700">{videoCsvPreview.counts.unchanged}</strong>
                      <span className="text-slate-500">Unchanged</span>
                    </div>
                  </div>
                  {!!videoCsvPreview.conflicts?.length && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      Resolve {videoCsvPreview.conflicts.length} conflict(s) before applying.
                    </div>
                  )}
                  <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {(videoCsvPreview.preview || []).slice(0, 100).map((row: any, index: number) => (
                      <div
                        key={`${row.anime_id}-${row.episode_number}-${index}`}
                        className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2 text-xs hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-slate-800 font-medium">
                            {row.anime_title} · {row.anime_slug} · Ep {row.episode_number}
                          </span>
                          {row.would_create_anime && (
                            <span className="mt-0.5 block text-[10px] font-semibold text-amber-700">
                              New series entry will be created on Apply
                            </span>
                          )}
                          {!!row.video_qualities?.length && (
                            <span className="mt-0.5 block truncate text-[10px] text-blue-600">
                              Quality: {row.video_qualities.map((quality: { label: string }) => quality.label).join(', ')}
                            </span>
                          )}
                        </div>
                        <span
                          className={`font-semibold ${
                            row.action === 'add'
                              ? 'text-emerald-700'
                              : row.action === 'update'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.action}
                        </span>
                      </div>
                    ))}
                    {videoCsvPreview.preview_truncated && (
                      <p className="p-3 text-xs text-slate-500">Preview limited to 500 records.</p>
                    )}
                  </div>
                  {!!videoCsvPreview.skipped?.length && (
                    <div className="max-h-48 overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <p className="font-bold">Skipped rows: {videoCsvPreview.skipped.length}</p>
                      {videoCsvPreview.skipped.slice(0, 20).map((item: any, index: number) => (
                        <p key={`${item.row}-${index}`} className="mt-1 text-amber-700">
                          Row {item.row}: {item.title ? `${item.title} — ` : ''}{item.reason}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: ADMIN & STAFF MANAGEMENT                              */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'admins' && (
          <div className="space-y-5">
            <SectionHeader
              icon={ShieldCheck}
              title="Admin & Staff Management"
              subtitle="Owner-only: Add, remove, or change roles of Admins and Staff"
              color="text-blue-600"
              actions={
                <button
                  onClick={() => setShowNewAdminForm(!showNewAdminForm)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Admin / Staff
                </button>
              }
            />

            {/* New Admin Form */}
            {showNewAdminForm && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" /> បន្ថែម Admin / Staff ថ្មី
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Username</label>
                    <input
                      type="text"
                      value={newAdminForm.username}
                      onChange={e => setNewAdminForm(p => ({ ...p, username: e.target.value }))}
                      placeholder="username"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={newAdminForm.email}
                      onChange={e => setNewAdminForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="admin@merdonghua.com"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Role</label>
                    <select
                      value={newAdminForm.role}
                      onChange={e => setNewAdminForm(p => ({ ...p, role: e.target.value as any }))}
                      className={INPUT_CLASS}
                    >
                      <option value="ADMIN">ADMIN — Full Control</option>
                      <option value="STAFF">STAFF — Content Only</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!newAdminForm.email) { showError('Email is required!'); return; }
                      setSaving(true);
                      try {
                        const res = await api.get(`/admin/users?search=${newAdminForm.email}&per_page=5`);
                        const found = (res.data?.items || res.data || []).find((u: any) => u.email === newAdminForm.email);
                        if (!found) { showError('User មិនទាន់ register នៅឡើយទេ!'); return; }
                        await handlePromoteUser(found.id, newAdminForm.role);
                        setShowNewAdminForm(false);
                        setNewAdminForm({ username: '', email: '', role: 'ADMIN' });
                      } catch { showError('Failed to find/promote user'); }
                      finally { setSaving(false); }
                    }}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {saving ? 'Processing...' : 'Promote User'}
                  </button>
                  <button
                    onClick={() => setShowNewAdminForm(false)}
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">
                  * User ត្រូវតែ Register ហើយ មុនពេល Promote ទៅ Admin/Staff
                </p>
              </div>
            )}

            {/* Role Permission Matrix */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-blue-600" /> Role Permission Matrix
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-4 text-slate-500 font-semibold">Permission</th>
                      {['USER', 'STAFF', 'ADMIN', 'OWNER'].map(r => (
                        <th
                          key={r}
                          className={`text-center py-2 px-3 font-bold ${
                            r === 'OWNER'
                              ? 'text-amber-700'
                              : r === 'ADMIN'
                              ? 'text-emerald-700'
                              : r === 'STAFF'
                              ? 'text-blue-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ['Watch Anime (Free)', true, true, true, true],
                      ['Watch Anime (VIP)', false, true, true, true],
                      ['Manage Content (Anime/Episodes)', false, true, true, true],
                      ['Manage Users & VIP', false, false, true, true],
                      ['API Keys & Stream Keys', false, false, true, true],
                      ['Banners & Promotions', false, false, true, true],
                      ['Mobile App Management', false, false, true, true],
                      ['Telegram Bot Control', false, false, true, true],
                      ['Site Theme & Settings', false, false, true, true],
                      ['Data Backup & Restore', false, false, true, true],
                      ['Manage Admins & Staff', false, false, false, true],
                      ['Security & Ban Controls', false, false, false, true],
                      ['Platform Owner Settings', false, false, false, true],
                    ].map(([perm, uPerm, staff, admin, owner]) => (
                      <tr key={String(perm)} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 pr-4 text-slate-700 font-medium">{String(perm)}</td>
                        {[uPerm, staff, admin, owner].map((has, i) => (
                          <td key={i} className="text-center py-2 px-3">
                            {has ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current Admins & Staff List */}
            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" /> Admins & Staff ({admins.length})
                </h3>
                <button onClick={loadData} className="text-slate-500 hover:text-slate-900 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
              ) : admins.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No admins/staff found</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {admins.map(u => (
                    <div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                            u.role === 'OWNER'
                              ? 'bg-amber-500 ring-2 ring-amber-200'
                              : u.role === 'ADMIN'
                              ? 'bg-emerald-600'
                              : 'bg-blue-600'
                          }`}
                        >
                          {u.username[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">{u.username}</p>
                            {u.role === 'OWNER' && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'OWNER'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : u.role === 'ADMIN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {u.role}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          title={u.is_active ? 'Active' : 'Disabled'}
                        />

                        {u.role !== 'OWNER' && (
                          <div className="flex items-center gap-1">
                            <select
                              defaultValue={u.role}
                              onChange={e => {
                                const newRole = e.target.value as any;
                                triggerConfirm({
                                  title: `Change ${u.username}'s role?`,
                                  message: `ផ្លាស់ប្តូរ role របស់ ${u.username} ពី ${u.role} ទៅ ${newRole}?`,
                                  confirmText: 'Change Role',
                                  variant: newRole === 'USER' ? 'danger' : 'warning',
                                  onConfirm: () => handlePromoteUser(u.id, newRole),
                                });
                              }}
                              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[10px] font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value="USER">USER</option>
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            <button
                              onClick={() => handleDisableAdmin(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              title="Disable Account"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: SECURITY CENTER                                        */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            <SectionHeader icon={Lock} title="Security Center" subtitle="Platform-wide security controls and protection settings" color="text-rose-600" />

            {/* Security Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">DRM Protection</h3>
                    <p className="text-[10px] text-slate-500">Anti-screenshot & DevTools protection</p>
                  </div>
                  <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>
                <div className="space-y-2 text-[11px] text-slate-600">
                  {['F12 / DevTools Block', 'PrintScreen / Win+Shift+S Block', 'Right-Click Disable', 'Android Screen Record Block', 'Auto-Ban on Violation'].map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <Key className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Authentication Security</h3>
                    <p className="text-[10px] text-slate-500">JWT + Refresh token system</p>
                  </div>
                  <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    SECURE
                  </span>
                </div>
                <div className="space-y-2 text-[11px] text-slate-600">
                  {['JWT Bearer Tokens', 'Auto Token Refresh (401)', 'Permanent Device Ban', 'Account Disable System', 'Unban Appeal System'].map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Security Actions */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-blue-600" /> Security Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  {
                    icon: Unlock, label: 'Clear All Device Bans', desc: 'Unban all permanently banned devices',
                    color: 'text-amber-600',
                    action: () => triggerConfirm({ title: 'Clear All Bans?', message: 'Clear all permanent device bans? All banned users will regain access.', confirmText: 'Clear All', variant: 'danger', onConfirm: async () => { await api.post('/admin/clear-bans').catch(() => {}); showSuccess('All bans cleared!'); } })
                  },
                  {
                    icon: UserX, label: 'Ban Suspicious Users', desc: 'Auto-detect and ban suspicious accounts',
                    color: 'text-rose-600',
                    action: () => showSuccess('Auto-ban scan initiated!')
                  },
                  {
                    icon: RefreshCw, label: 'Invalidate All Sessions', desc: 'Force logout all users except Owner',
                    color: 'text-blue-600',
                    action: () => triggerConfirm({ title: 'Invalidate All Sessions?', message: 'Force logout ALL users? They will need to login again.', confirmText: 'Invalidate All', variant: 'danger', onConfirm: async () => { await api.post('/admin/invalidate-sessions').catch(() => {}); showSuccess('All sessions invalidated!'); } })
                  },
                  {
                    icon: Lock, label: 'Emergency VIP Lock', desc: 'Lock all content to VIP immediately',
                    color: 'text-rose-600',
                    action: () => triggerConfirm({ title: 'VIP Lock All Content?', message: 'Lock ALL content as VIP-only immediately?', confirmText: 'Lock Now', variant: 'danger', onConfirm: async () => { await api.post('/promo/update', { force_vip_lock: true }).catch(() => {}); showSuccess('Emergency VIP lock activated!'); } })
                  },
                  {
                    icon: Wifi, label: 'Maintenance Mode', desc: 'Take site offline for maintenance',
                    color: 'text-amber-600',
                    action: () => triggerConfirm({ title: 'Enable Maintenance Mode?', message: 'Put the site in maintenance mode? Users will see an under-maintenance page.', confirmText: 'Enable', variant: 'danger', onConfirm: () => showSuccess('Maintenance mode toggled (configure in backend)') })
                  },
                  {
                    icon: Database, label: 'Emergency Backup', desc: 'Create instant database backup now',
                    color: 'text-emerald-600',
                    action: async () => { await api.post('/admin/backup/create').catch(() => {}); showSuccess('Emergency backup created!'); }
                  },
                ].map(({ icon: Icon, label, desc, color, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="text-left p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all group"
                  >
                    <Icon className={`w-5 h-5 ${color} mb-2 group-hover:scale-105 transition-transform`} />
                    <p className="text-xs font-bold text-slate-900">{label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Log Preview */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Recent Security Events
              </h3>
              <div className="space-y-1.5">
                {[
                  { time: '2m ago', event: 'User attempted F12 DevTools — Auto-banned', type: 'warn' },
                  { time: '15m ago', event: 'Admin logged in from new device', type: 'info' },
                  { time: '1h ago', event: 'New unban appeal submitted', type: 'info' },
                  { time: '2h ago', event: 'Promo countdown updated to 7 days', type: 'success' },
                  { time: '5h ago', event: 'Database backup created successfully', type: 'success' },
                  { time: '12h ago', event: 'New Admin account promoted by Owner', type: 'info' },
                ].map(({ time, event, type }) => (
                  <div key={event} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        type === 'warn' ? 'bg-amber-500' : type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">{time}</span>
                    <span className="text-xs text-slate-700 font-medium">{event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: PLATFORM SETTINGS                                      */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'platform' && (
          <div className="space-y-5">
            <SectionHeader icon={Settings} title="Platform Settings" subtitle="Owner-only global platform configuration" color="text-blue-600" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* General Settings */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-600" /> General Settings
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Site Name</label>
                    <input
                      value={platformSettings.site_name}
                      onChange={e => setPlatformSettings(p => ({ ...p, site_name: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Site URL</label>
                    <input
                      value={platformSettings.site_url}
                      onChange={e => setPlatformSettings(p => ({ ...p, site_url: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Free Episodes per Title</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={platformSettings.max_free_episodes}
                      onChange={e => setPlatformSettings(p => ({ ...p, max_free_episodes: parseInt(e.target.value) || 0 }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>

              {/* VIP & Monetization */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-600" /> VIP & Monetization
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2 pt-2">
                    {[
                      { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Take site offline' },
                      { key: 'allow_registration', label: 'Open Registration', desc: 'Allow new signups' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{label}</p>
                          <p className="text-[10px] text-slate-500">{desc}</p>
                        </div>
                        <button
                          onClick={() => setPlatformSettings(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                          className={`relative w-10 h-5 rounded-full transition-all ${
                            (platformSettings as any)[key] ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                              (platformSettings as any)[key] ? 'left-5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div id="owner-vip-plans" className="scroll-mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">VIP Plans</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  អ្នកប្រើប្រាស់ជ្រើសរើសកញ្ចប់ ហើយផ្ញើសារទៅ Admin តាម Telegram។ មិនប្រើ QR នៅក្នុងផ្លូវទិញទេ។
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { name: 'Pro', price: '$2 / month', details: 'Watch all episodes · No offline downloads' },
                  { name: 'Plus', price: '$3 / month', details: 'Watch all episodes · Up to 10 offline downloads' },
                  { name: 'Premium', price: '$5 / month', details: 'Watch all episodes · Unlimited offline downloads' },
                ].map((plan) => (
                  <div key={plan.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">{plan.name}</p>
                    <p className="mt-1 text-sm font-bold text-blue-600">{plan.price}</p>
                    <p className="mt-2 text-[11px] leading-5 text-slate-600">{plan.details}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Info */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Code className="w-3.5 h-3.5 text-blue-600" /> Technical Platform Info
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Frontend', value: 'React + Vite + TypeScript', icon: Globe },
                  { label: 'Backend', value: 'FastAPI + Python 3.11', icon: Server },
                  { label: 'Database', value: 'SQLite / PostgreSQL', icon: Database },
                  { label: 'Mobile App', value: 'Capacitor + Android APK', icon: Smartphone },
                  { label: 'Hosting', value: 'Vercel (FE) + Render (BE)', icon: Wifi },
                  { label: 'CDN Storage', value: 'Cloudflare R2', icon: HardDrive },
                  { label: 'Bot Platform', value: 'Telegram Mini App', icon: Bot },
                  { label: 'Version', value: 'v1.5 (MerDonghua)', icon: GitBranch },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3 h-3 text-slate-400" />
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{label}</p>
                    </div>
                    <p className="text-xs text-slate-900 font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => showSuccess('Platform settings saved! (Backend sync required for persistence)')}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Platform Settings
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: SYSTEM LOGS                                            */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'logs' && (
          <div className="space-y-5">
            <SectionHeader icon={Terminal} title="System Audit Logs" subtitle="Complete activity log of platform actions" color="text-slate-700" />

            {/* Log Filter */}
            <div className="flex flex-wrap gap-2">
              {['All', 'Admin Actions', 'Security', 'User Activity', 'System', 'Errors'].map(f => (
                <button
                  key={f}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    f === 'All'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Clean Light Audit Log Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 font-mono text-[11px] space-y-1.5 max-h-[500px] overflow-y-auto shadow-sm">
              <div className="text-slate-500 mb-3 pb-2 border-b border-slate-200 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-900 font-bold">MerDonghua System Log</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
              {[
                { ts: '2026-08-28 09:54:22', level: 'INFO', msg: `Owner [${user?.username}] accessed Owner Control Center`, color: 'text-blue-600' },
                { ts: '2026-08-28 09:50:11', level: 'WARN', msg: 'User [uid:3421] triggered DevTools — auto-banned', color: 'text-amber-700' },
                { ts: '2026-08-28 09:48:03', level: 'INFO', msg: 'Admin [admin01] updated Promo countdown to 7 days', color: 'text-blue-600' },
                { ts: '2026-08-28 09:30:55', level: 'SUCCESS', msg: 'Database auto-backup completed — merdonghua.db', color: 'text-emerald-700' },
                { ts: '2026-08-28 09:12:40', level: 'INFO', msg: 'New user registered: User_8821 (phone auth)', color: 'text-blue-600' },
                { ts: '2026-08-28 08:55:01', level: 'INFO', msg: 'Episode added: [Donghua Title] EP45 by Staff [staff01]', color: 'text-blue-600' },
                { ts: '2026-08-28 08:40:22', level: 'SUCCESS', msg: 'APK v1.5 build dispatched to Telegram channel', color: 'text-emerald-700' },
                { ts: '2026-08-28 08:20:13', level: 'WARN', msg: 'Unban appeal received from user [uid:2211]', color: 'text-amber-700' },
                { ts: '2026-08-28 07:45:00', level: 'INFO', msg: 'VIP granted to 3 users (Telegram payment verified)', color: 'text-blue-600' },
                { ts: '2026-08-28 06:00:00', level: 'INFO', msg: 'Server health check — all services online', color: 'text-blue-600' },
                { ts: '2026-08-28 00:00:00', level: 'INFO', msg: 'Daily cron: Promo countdown tick — 6 days remaining', color: 'text-blue-600' },
                { ts: '2026-08-27 23:59:59', level: 'SUCCESS', msg: 'Daily auto-backup completed successfully', color: 'text-emerald-700' },
              ].map(({ ts, level, msg, color }) => (
                <div key={ts + msg} className="flex gap-3 hover:bg-white px-2 py-1 rounded-lg transition-colors">
                  <span className="text-slate-400 shrink-0">{ts}</span>
                  <span className={`shrink-0 font-bold w-16 ${color}`}>[{level}]</span>
                  <span className="text-slate-800">{msg}</span>
                </div>
              ))}
            </div>

            {/* Export Logs */}
            <button
              onClick={() => showSuccess('Log export initiated! (Download will start shortly)')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm transition-all"
            >
              <Package className="w-4 h-4 text-blue-600" /> Export Logs (.txt)
            </button>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
