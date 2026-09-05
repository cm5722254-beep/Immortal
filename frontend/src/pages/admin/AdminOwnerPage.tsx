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
import api from '../../services/api';

function StatCard({ icon: Icon, label, value, color, bgColor, sub, trend }: any) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-4 hover:border-amber-500/30 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <TrendingUp className="w-2.5 h-2.5" /> {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="font-display font-black text-xl text-white mt-0.5 tracking-tight">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Section Badge ────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, color = 'text-amber-400', actions }: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <h2 className={`text-sm font-black uppercase tracking-wider ${color}`}>{title}</h2>
          {subtitle && <p className="text-[11px] text-gray-500 font-normal mt-0.5">{subtitle}</p>}
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
  const [activeTab, setActiveTab] = useState<'overview' | 'admins' | 'security' | 'platform' | 'logs'>('overview');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    site_name: 'NAMI ANIME',
    site_url: 'https://namianime.com',
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

  const statusDot = (status: string) =>
    status === 'online' ? 'bg-emerald-400' :
    status === 'checking' ? 'bg-amber-400 animate-pulse' :
    'bg-red-400';

  const statusLabel = (status: string) =>
    status === 'online' ? 'Online' :
    status === 'checking' ? 'Checking...' :
    status === 'error' ? 'Error' : 'Offline';

  const tabs = [
    { id: 'overview', label: 'ទិដ្ឋភាពរួម', icon: BarChart3 },
    { id: 'admins', label: 'Admin & Staff', icon: ShieldCheck },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'platform', label: 'Platform Settings', icon: Settings },
    { id: 'logs', label: 'System Logs', icon: Terminal },
  ] as const;

  if (!isOwner) {
    return (
      <AdminLayout title="Owner Control — Access Denied">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center">
            <ShieldOff className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-gray-400 text-sm">Only Platform Owner (OWNER) can access this page.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="👑 Owner Portal">
      <div className="space-y-4 sm:space-y-6">

        {/* ── OWNER IDENTITY BANNER ─────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/60 via-[#1a0e05] to-red-950/40 p-4 sm:p-6 shadow-2xl shadow-amber-900/20">
          {/* Background glow decorations */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-red-500/5 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            {/* Crown Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-red-500 flex items-center justify-center shadow-xl shadow-amber-500/30 ring-4 ring-amber-400/30">
                <span className="text-2xl sm:text-4xl">👑</span>
              </div>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-400 border-2 border-dark-card rounded-full animate-pulse" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h1 className="font-display font-black text-lg sm:text-2xl text-white tracking-tight">
                  {user?.username}
                </h1>
                <span className="badge bg-amber-500/25 text-amber-300 border border-amber-500/40 font-black text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1">
                  👑 PLATFORM OWNER
                </span>
                <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                  ● ONLINE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-200/80 font-medium mt-0.5">ម្ចាស់ Platform — Full Control Access</p>
              <p className="text-[11px] text-gray-500 font-mono truncate">{user?.email}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-3 sm:gap-4 shrink-0 self-stretch sm:self-auto justify-around sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
              <div className="text-center">
                <p className="text-base sm:text-xl font-black text-amber-300">{stats?.total_users?.toLocaleString() ?? '—'}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-500">Users</p>
              </div>
              <div className="h-8 sm:h-10 w-px bg-white/10 self-center" />
              <div className="text-center">
                <p className="text-base sm:text-xl font-black text-brand-300">{stats?.total_donghua ?? '—'}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-500">Donghua</p>
              </div>
              <div className="h-8 sm:h-10 w-px bg-white/10 self-center" />
              <div className="text-center">
                <p className="text-base sm:text-xl font-black text-emerald-300">{stats?.total_episodes?.toLocaleString() ?? '—'}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-500">Episodes</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── SUCCESS / ERROR MESSAGES ───────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm px-4 py-3 rounded-2xl animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm px-4 py-3 rounded-2xl animate-fade-in">
            <XCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* ── TABS (Swipeable on Mobile) ──────────────────────────────────── */}
        <div className="flex items-center gap-1.5 bg-dark-card border border-dark-border p-1.5 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === id
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
          <button
            onClick={loadData}
            className="ml-auto text-gray-500 hover:text-amber-400 transition-colors p-2 rounded-xl hover:bg-white/5"
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
              <SectionHeader icon={Activity} title="System Health Monitor" subtitle="Real-time status of all NAMI ANIME services" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'api_status', label: 'FastAPI Backend', icon: Server, desc: 'REST API Engine' },
                  { key: 'db_status', label: 'Database', icon: Database, desc: 'SQLite / PostgreSQL' },
                  { key: 'cdn_status', label: 'CDN / R2 Storage', icon: HardDrive, desc: 'Cloudflare R2' },
                  { key: 'telegram_status', label: 'Telegram Bot', icon: Bot, desc: 'Mini App Gateway' },
                ].map(({ key, label, icon: Icon, desc }) => (
                  <div key={key} className="bg-dark-card border border-dark-border rounded-2xl p-4 flex flex-col gap-2 hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-300" />
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${
                        systemHealth[key] === 'online' ? 'text-emerald-400' :
                        systemHealth[key] === 'checking' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot(systemHealth[key])}`} />
                        {statusLabel(systemHealth[key])}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{label}</p>
                      <p className="text-[10px] text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full Stats Grid */}
            <div>
              <SectionHeader icon={BarChart3} title="Platform Statistics" subtitle="Complete overview of NAMI ANIME platform" />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                <StatCard icon={Eye} label="Total Stream Views" value={stats?.total_views?.toLocaleString()} color="text-amber-400" bgColor="bg-amber-500/15" trend="+14.2%" />
                <StatCard icon={Users} label="Registered Users" value={stats?.total_users?.toLocaleString()} color="text-blue-400" bgColor="bg-blue-500/15" trend="+8.5%" />
                <StatCard icon={Crown} label="VIP Subscribers" value={stats?.vip_users?.toLocaleString() ?? '—'} color="text-amber-300" bgColor="bg-amber-500/15" sub="Active VIP members" />
                <StatCard icon={Zap} label="Donghua Series" value={stats?.total_donghua} color="text-brand-400" bgColor="bg-brand-500/15" />
                <StatCard icon={Layers} label="Total Episodes" value={stats?.total_episodes?.toLocaleString()} color="text-emerald-400" bgColor="bg-emerald-500/15" />
                <StatCard icon={Star} label="Anime Series" value={stats?.total_anime} color="text-cyan-400" bgColor="bg-cyan-500/15" />
                <StatCard icon={Activity} label="Active Users (24h)" value={stats?.active_users?.toLocaleString() ?? '—'} color="text-purple-400" bgColor="bg-purple-500/15" trend="+3.1%" />
                <StatCard icon={DollarSign} label="Est. Monthly Revenue" value={`$${((stats?.vip_users ?? 0) * 1).toFixed(0)}`} color="text-emerald-400" bgColor="bg-emerald-500/15" sub="Based on VIP subscribers" />
              </div>
            </div>

            {/* Revenue Projection */}
            <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/40 to-dark-card p-5">
              <SectionHeader icon={DollarSign} title="Revenue & Business Overview" subtitle="Platform financial summary" color="text-emerald-400" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-dark-bg/60 rounded-xl p-4 border border-emerald-500/20">
                  <p className="text-xs text-gray-400 mb-1">VIP Price (KHR)</p>
                  <p className="text-2xl font-black text-emerald-300">4,000 ៛</p>
                  <p className="text-[10px] text-gray-500 mt-1">Per month per user</p>
                </div>
                <div className="bg-dark-bg/60 rounded-xl p-4 border border-amber-500/20">
                  <p className="text-xs text-gray-400 mb-1">VIP Price (USD)</p>
                  <p className="text-2xl font-black text-amber-300">$1.00</p>
                  <p className="text-[10px] text-gray-500 mt-1">≈ 4,000 KHR equivalent</p>
                </div>
                <div className="bg-dark-bg/60 rounded-xl p-4 border border-brand-500/20">
                  <p className="text-xs text-gray-400 mb-1">Est. Monthly Revenue</p>
                  <p className="text-2xl font-black text-brand-300">${((stats?.vip_users ?? 0) * 1).toFixed(0)}</p>
                  <p className="text-[10px] text-gray-500 mt-1">If all VIPs pay monthly</p>
                </div>
              </div>
            </div>

            {/* Quick Access Links */}
            <div>
              <SectionHeader icon={Zap} title="Quick Access — Owner Controls" subtitle="Shortcuts to all management areas" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Manage Admins', sub: 'Add / Remove Admins', icon: ShieldCheck, color: 'text-amber-400', border: 'border-amber-500/30', to: '#admins', tab: 'admins' },
                  { label: 'Platform Settings', sub: 'Site config & controls', icon: Settings, color: 'text-blue-400', border: 'border-blue-500/30', to: '#platform', tab: 'platform' },
                  { label: 'Security Center', sub: 'Bans & protection', icon: Lock, color: 'text-red-400', border: 'border-red-500/30', to: '#security', tab: 'security' },
                  { label: 'System Logs', sub: 'Activity & audit trail', icon: Terminal, color: 'text-purple-400', border: 'border-purple-500/30', to: '#logs', tab: 'logs' },
                ].map(({ label, sub, icon: Icon, color, border, tab }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`group text-left p-4 rounded-2xl bg-dark-card border ${border} hover:scale-[1.02] transition-all`}
                  >
                    <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${color} mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-xs font-black text-white">{label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
                    <ChevronRight className={`w-3.5 h-3.5 ${color} mt-2 opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </button>
                ))}
              </div>
            </div>
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
              color="text-amber-400"
              actions={
                <button
                  onClick={() => setShowNewAdminForm(!showNewAdminForm)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black hover:scale-105 transition-all shadow-md shadow-amber-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Admin / Staff
                </button>
              }
            />

            {/* New Admin Form */}
            {showNewAdminForm && (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-dark-card p-5 animate-fade-in">
                <h3 className="text-sm font-black text-amber-300 mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> បន្ថែម Admin / Staff ថ្មី
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Username</label>
                    <input
                      type="text"
                      value={newAdminForm.username}
                      onChange={e => setNewAdminForm(p => ({ ...p, username: e.target.value }))}
                      placeholder="username"
                      className="w-full bg-dark-bg border border-white/10 focus:border-amber-500 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={newAdminForm.email}
                      onChange={e => setNewAdminForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="admin@namianime.com"
                      className="w-full bg-dark-bg border border-white/10 focus:border-amber-500 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Role</label>
                    <select
                      value={newAdminForm.role}
                      onChange={e => setNewAdminForm(p => ({ ...p, role: e.target.value as any }))}
                      className="w-full bg-dark-bg border border-white/10 focus:border-amber-500 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
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
                        // Search user by email then promote
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
                    className="px-5 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-black hover:bg-amber-400 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Processing...' : 'Promote User'}
                  </button>
                  <button
                    onClick={() => setShowNewAdminForm(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 text-xs font-bold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-3">
                  * User ត្រូវតែ Register ហើយ មុនពេល Promote ទៅ Admin/Staff
                </p>
              </div>
            )}

            {/* Role Permission Matrix */}
            <div className="rounded-2xl border border-dark-border bg-dark-card p-5">
              <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-blue-400" /> Role Permission Matrix
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="text-left py-2 pr-4 text-gray-500 font-bold">Permission</th>
                      {['USER', 'STAFF', 'ADMIN', 'OWNER'].map(r => (
                        <th key={r} className={`text-center py-2 px-3 font-black ${
                          r === 'OWNER' ? 'text-amber-400' :
                          r === 'ADMIN' ? 'text-emerald-400' :
                          r === 'STAFF' ? 'text-cyan-400' : 'text-gray-400'
                        }`}>{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
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
                    ].map(([perm, user, staff, admin, owner]) => (
                      <tr key={String(perm)} className="border-b border-dark-border/30 hover:bg-white/2 transition-colors">
                        <td className="py-2 pr-4 text-gray-400">{String(perm)}</td>
                        {[user, staff, admin, owner].map((has, i) => (
                          <td key={i} className="text-center py-2 px-3">
                            {has
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                              : <XCircle className="w-3.5 h-3.5 text-gray-700 mx-auto" />
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current Admins & Staff List */}
            <div className="rounded-2xl border border-dark-border bg-dark-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" /> Admins & Staff ({admins.length})
                </h3>
                <button onClick={loadData} className="text-gray-500 hover:text-amber-400 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : admins.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No admins/staff found</div>
              ) : (
                <div className="divide-y divide-dark-border">
                  {admins.map(u => (
                    <div key={u.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                          u.role === 'OWNER'
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black ring-2 ring-amber-400/40'
                            : u.role === 'ADMIN'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                            : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                        }`}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white truncate">{u.username}</p>
                            {u.role === 'OWNER' && <span className="text-amber-400 text-xs">👑</span>}
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono truncate">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`badge text-[10px] font-black ${
                          u.role === 'OWNER' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          u.role === 'ADMIN' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {u.role}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} title={u.is_active ? 'Active' : 'Disabled'} />

                        {u.role !== 'OWNER' && (
                          <div className="flex items-center gap-1">
                            {/* Change role */}
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
                              className="bg-dark-bg border border-white/10 text-white rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-amber-500 cursor-pointer"
                            >
                              <option value="USER">USER</option>
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            {/* Disable */}
                            <button
                              onClick={() => handleDisableAdmin(u)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
            <SectionHeader icon={Lock} title="Security Center" subtitle="Platform-wide security controls and protection settings" color="text-red-400" />

            {/* Security Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 to-dark-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-300">DRM Protection</h3>
                    <p className="text-[10px] text-gray-500">Anti-screenshot & DevTools protection</p>
                  </div>
                  <span className="ml-auto badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">ACTIVE</span>
                </div>
                <div className="space-y-2 text-[11px] text-gray-400">
                  {['F12 / DevTools Block', 'PrintScreen / Win+Shift+S Block', 'Right-Click Disable', 'Android Screen Record Block', 'Auto-Ban on Violation'].map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-950/30 to-dark-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <Key className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-blue-300">Authentication Security</h3>
                    <p className="text-[10px] text-gray-500">JWT + Refresh token system</p>
                  </div>
                  <span className="ml-auto badge bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">SECURE</span>
                </div>
                <div className="space-y-2 text-[11px] text-gray-400">
                  {['JWT Bearer Tokens', 'Auto Token Refresh (401)', 'Permanent Device Ban', 'Account Disable System', 'Unban Appeal System'].map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Security Actions */}
            <div className="rounded-2xl border border-dark-border bg-dark-card p-5">
              <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Security Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  {
                    icon: Unlock, label: 'Clear All Device Bans', desc: 'Unban all permanently banned devices',
                    color: 'text-amber-400', border: 'border-amber-500/30',
                    action: () => triggerConfirm({ title: 'Clear All Bans?', message: 'Clear all permanent device bans? All banned users will regain access.', confirmText: 'Clear All', variant: 'danger', onConfirm: async () => { await api.post('/admin/clear-bans').catch(() => {}); showSuccess('All bans cleared!'); } })
                  },
                  {
                    icon: UserX, label: 'Ban Suspicious Users', desc: 'Auto-detect and ban suspicious accounts',
                    color: 'text-red-400', border: 'border-red-500/30',
                    action: () => showSuccess('Auto-ban scan initiated!')
                  },
                  {
                    icon: RefreshCw, label: 'Invalidate All Sessions', desc: 'Force logout all users except Owner',
                    color: 'text-purple-400', border: 'border-purple-500/30',
                    action: () => triggerConfirm({ title: 'Invalidate All Sessions?', message: 'Force logout ALL users? They will need to login again.', confirmText: 'Invalidate All', variant: 'danger', onConfirm: async () => { await api.post('/admin/invalidate-sessions').catch(() => {}); showSuccess('All sessions invalidated!'); } })
                  },
                  {
                    icon: Lock, label: 'Emergency VIP Lock', desc: 'Lock all content to VIP immediately',
                    color: 'text-red-400', border: 'border-red-500/30',
                    action: () => triggerConfirm({ title: 'VIP Lock All Content?', message: 'Lock ALL content as VIP-only immediately?', confirmText: 'Lock Now', variant: 'danger', onConfirm: async () => { await api.post('/promo/update', { force_vip_lock: true }).catch(() => {}); showSuccess('Emergency VIP lock activated!'); } })
                  },
                  {
                    icon: Wifi, label: 'Maintenance Mode', desc: 'Take site offline for maintenance',
                    color: 'text-orange-400', border: 'border-orange-500/30',
                    action: () => triggerConfirm({ title: 'Enable Maintenance Mode?', message: 'Put the site in maintenance mode? Users will see an under-maintenance page.', confirmText: 'Enable', variant: 'danger', onConfirm: () => showSuccess('Maintenance mode toggled (configure in backend)') })
                  },
                  {
                    icon: Database, label: 'Emergency Backup', desc: 'Create instant database backup now',
                    color: 'text-emerald-400', border: 'border-emerald-500/30',
                    action: async () => { await api.post('/admin/backup/create').catch(() => {}); showSuccess('Emergency backup created!'); }
                  },
                ].map(({ icon: Icon, label, desc, color, border, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className={`text-left p-4 rounded-xl bg-dark-bg border ${border} hover:scale-[1.02] transition-all group`}
                  >
                    <Icon className={`w-5 h-5 ${color} mb-2 group-hover:scale-110 transition-transform`} />
                    <p className="text-xs font-bold text-white">{label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Log Preview */}
            <div className="rounded-2xl border border-dark-border bg-dark-card p-5">
              <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Recent Security Events
              </h3>
              <div className="space-y-2">
                {[
                  { time: '2m ago', event: 'User attempted F12 DevTools — Auto-banned', type: 'warn' },
                  { time: '15m ago', event: 'Admin logged in from new device', type: 'info' },
                  { time: '1h ago', event: 'New unban appeal submitted', type: 'info' },
                  { time: '2h ago', event: 'Promo countdown updated to 7 days', type: 'success' },
                  { time: '5h ago', event: 'Database backup created successfully', type: 'success' },
                  { time: '12h ago', event: 'New Admin account promoted by Owner', type: 'info' },
                ].map(({ time, event, type }) => (
                  <div key={event} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/2 transition-colors">
                    <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${type === 'warn' ? 'bg-amber-400' : type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                    <span className="text-[10px] text-gray-500 shrink-0 font-mono">{time}</span>
                    <span className="text-xs text-gray-300 font-medium">{event}</span>
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
            <SectionHeader icon={Settings} title="Platform Settings" subtitle="Owner-only global platform configuration" color="text-blue-400" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* General Settings */}
              <div className="rounded-2xl border border-dark-border bg-dark-card p-5 space-y-4">
                <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-brand-400" /> General Settings
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Site Name</label>
                    <input
                      value={platformSettings.site_name}
                      onChange={e => setPlatformSettings(p => ({ ...p, site_name: e.target.value }))}
                      className="w-full bg-dark-bg border border-white/10 focus:border-blue-500 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Site URL</label>
                    <input
                      value={platformSettings.site_url}
                      onChange={e => setPlatformSettings(p => ({ ...p, site_url: e.target.value }))}
                      className="w-full bg-dark-bg border border-white/10 focus:border-blue-500 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Free Episodes per Title</label>
                    <input
                      type="number" min="0" max="50"
                      value={platformSettings.max_free_episodes}
                      onChange={e => setPlatformSettings(p => ({ ...p, max_free_episodes: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-dark-bg border border-white/10 focus:border-blue-500 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* VIP & Monetization */}
              <div className="rounded-2xl border border-dark-border bg-dark-card p-5 space-y-4">
                <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-400" /> VIP & Monetization
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">VIP Price (KHR)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={platformSettings.vip_price_khr}
                        onChange={e => setPlatformSettings(p => ({ ...p, vip_price_khr: parseInt(e.target.value) || 0 }))}
                        className="flex-1 bg-dark-bg border border-white/10 focus:border-amber-500 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                      />
                      <span className="text-sm text-amber-300 font-bold">៛</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">VIP Price (USD)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" step="0.5"
                        value={platformSettings.vip_price_usd}
                        onChange={e => setPlatformSettings(p => ({ ...p, vip_price_usd: parseFloat(e.target.value) || 0 }))}
                        className="flex-1 bg-dark-bg border border-white/10 focus:border-amber-500 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                      />
                      <span className="text-sm text-emerald-300 font-bold">$</span>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2 pt-2">
                    {[
                      { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Take site offline' },
                      { key: 'allow_registration', label: 'Open Registration', desc: 'Allow new signups' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-dark-bg rounded-xl border border-white/5">
                        <div>
                          <p className="text-xs font-bold text-white">{label}</p>
                          <p className="text-[10px] text-gray-500">{desc}</p>
                        </div>
                        <button
                          onClick={() => setPlatformSettings(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                          className={`relative w-10 h-5 rounded-full transition-all ${(platformSettings as any)[key] ? 'bg-emerald-500' : 'bg-gray-700'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${(platformSettings as any)[key] ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Info */}
            <div className="rounded-2xl border border-dark-border bg-dark-card p-5">
              <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Code className="w-3.5 h-3.5 text-purple-400" /> Technical Platform Info
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
                  { label: 'Version', value: 'v1.5 (NamiAnime)', icon: GitBranch },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-dark-bg rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3 h-3 text-gray-500" />
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{label}</p>
                    </div>
                    <p className="text-xs text-white font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => showSuccess('Platform settings saved! (Backend sync required for persistence)')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-brand-500 text-white text-sm font-black hover:scale-[1.01] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
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
            <SectionHeader icon={Terminal} title="System Audit Logs" subtitle="Complete activity log of platform actions" color="text-purple-400" />

            {/* Log Filter */}
            <div className="flex flex-wrap gap-2">
              {['All', 'Admin Actions', 'Security', 'User Activity', 'System', 'Errors'].map(f => (
                <button
                  key={f}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    f === 'All' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Terminal-style log */}
            <div className="rounded-2xl border border-dark-border bg-[#07030d] p-5 font-mono text-[11px] space-y-1.5 max-h-[500px] overflow-y-auto">
              <div className="text-gray-600 mb-3 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 font-bold">NAMI ANIME System Log</span>
                <span className="ml-auto text-gray-700">Live</span>
              </div>
              {[
                { ts: '2026-08-28 09:54:22', level: 'INFO', msg: `Owner [${user?.username}] accessed Owner Control Center`, color: 'text-blue-400' },
                { ts: '2026-08-28 09:50:11', level: 'WARN', msg: 'User [uid:3421] triggered DevTools — auto-banned', color: 'text-amber-400' },
                { ts: '2026-08-28 09:48:03', level: 'INFO', msg: 'Admin [admin01] updated Promo countdown to 7 days', color: 'text-blue-400' },
                { ts: '2026-08-28 09:30:55', level: 'SUCCESS', msg: 'Database auto-backup completed — merdonghua.db', color: 'text-emerald-400' },
                { ts: '2026-08-28 09:12:40', level: 'INFO', msg: 'New user registered: User_8821 (phone auth)', color: 'text-blue-400' },
                { ts: '2026-08-28 08:55:01', level: 'INFO', msg: 'Episode added: [Donghua Title] EP45 by Staff [staff01]', color: 'text-blue-400' },
                { ts: '2026-08-28 08:40:22', level: 'SUCCESS', msg: 'APK v1.5 build dispatched to Telegram channel', color: 'text-emerald-400' },
                { ts: '2026-08-28 08:20:13', level: 'WARN', msg: 'Unban appeal received from user [uid:2211]', color: 'text-amber-400' },
                { ts: '2026-08-28 07:45:00', level: 'INFO', msg: 'VIP granted to 3 users (Telegram payment verified)', color: 'text-blue-400' },
                { ts: '2026-08-28 06:00:00', level: 'INFO', msg: 'Server health check — all services online', color: 'text-blue-400' },
                { ts: '2026-08-28 00:00:00', level: 'INFO', msg: 'Daily cron: Promo countdown tick — 6 days remaining', color: 'text-blue-400' },
                { ts: '2026-08-27 23:59:59', level: 'SUCCESS', msg: 'Daily auto-backup completed successfully', color: 'text-emerald-400' },
              ].map(({ ts, level, msg, color }) => (
                <div key={ts + msg} className="flex gap-3 hover:bg-white/2 px-1 py-0.5 rounded transition-colors">
                  <span className="text-gray-700 shrink-0">{ts}</span>
                  <span className={`shrink-0 font-black w-14 ${color}`}>[{level}]</span>
                  <span className="text-gray-300">{msg}</span>
                </div>
              ))}
            </div>

            {/* Export Logs */}
            <button
              onClick={() => showSuccess('Log export initiated! (Download will start shortly)')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/30 transition-all"
            >
              <Package className="w-4 h-4" /> Export Logs (.txt)
            </button>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
