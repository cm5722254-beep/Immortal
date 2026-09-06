import { useEffect, useState } from 'react';
import { Shield, UserCheck, UserX, Trash2, X, Search, Crown, Check, Send, Mail, Globe, Smartphone, Film } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import { useAuthStore } from '../../store/authStore';
import { triggerConfirm } from '../../store/confirmStore';
import api from '../../services/api';
import type { User } from '../../types';

// Helper: format relative time
function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// Login source badge
function LoginSourceBadge({ source }: { source?: string | null }) {
  if (!source) return <span className="text-gray-600 text-[10px]">—</span>;
  if (source === 'phone') return (
    <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] flex items-center gap-1">
      <Smartphone className="w-2.5 h-2.5" /> Phone OTP
    </span>
  );
  if (source === 'telegram') return (
    <span className="badge bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] flex items-center gap-1">
      <Send className="w-2.5 h-2.5" /> Telegram
    </span>
  );
  if (source === 'google') return (
    <span className="badge bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] flex items-center gap-1">
      <Globe className="w-2.5 h-2.5" /> Google
    </span>
  );
  return (
    <span className="badge bg-white/10 text-gray-300 border border-white/10 text-[10px] flex items-center gap-1">
      <Mail className="w-2.5 h-2.5" /> Email
    </span>
  );
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVip, setFilterVip] = useState<'all' | 'vip' | 'regular'>('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Edit User & VIP State
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN' | 'STAFF' | 'OWNER'>('USER');
  const [editActive, setEditActive] = useState(true);
  const [vipModalUser, setVipModalUser] = useState<User | null>(null);
  const [movieModalUser, setMovieModalUser] = useState<User | null>(null);
  const [availableMovies, setAvailableMovies] = useState<any[]>([]);
  const [unbanRequests, setUnbanRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'appeals'>('users');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      let url = `/admin/users?page=${page}&per_page=50`;
      if (filterVip === 'vip') url += '&vip_only=true';
      else if (filterVip === 'regular') url += '&vip_only=false';

      const res = await api.get(url);
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      if (items.length > 0) {
        setUsers(items);
        setTotal(res.data?.total ?? items.length);
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('Backend users API not responding, falling back to local database snapshot:', err);
    }

    // Always fallback to seed/catalog snapshot so users list is never empty
    try {
      const catRes = await fetch('/data/catalog.json');
      if (catRes.ok) {
        const cat = await catRes.json();
        const rawUsers: any[] = cat?.users || [];
        let filtered = rawUsers;
        if (filterVip === 'vip') filtered = rawUsers.filter((u) => u.is_vip);
        else if (filterVip === 'regular') filtered = rawUsers.filter((u) => !u.is_vip);
        setUsers(filtered);
        setTotal(filtered.length);
      }
    } catch (catErr) {
      console.error('Failed to load local catalog users:', catErr);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnbanRequests = async () => {
    try {
      const res = await api.get('/admin/unban-requests');
      setUnbanRequests(res.data || []);
    } catch {}
  };

  const fetchMovies = async () => {
    try {
      const res = await api.get('/anime?type=MOVIE&per_page=100');
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setAvailableMovies(items);
    } catch (e) {
      console.error('Error fetching movies for admin:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUnbanRequests();
    fetchMovies();
  }, [page, filterVip]);

  const handleToggleMovieAccess = async (u: User, movieSlug: string, action: 'unlock' | 'lock') => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/admin/users/${u.id}/movies`, {
        movie_slug: movieSlug,
        action,
      });
      const updatedUser: User = res.data;
      setMovieModalUser(updatedUser);
      setUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
      const actionText = action === 'unlock' ? 'បានបើកសិទ្ធិទស្សនា' : 'បានដកសិទ្ធិទស្សនា';
      setSuccessMsg(`${actionText}រឿង "${movieSlug}" ជូន ${u.username} ដោយជោគជ័យ!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update movie access');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditActive(u.is_active);
    setError('');
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/admin/users/${editUser.id}`, {
        role: editRole,
        is_active: editActive,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, role: editRole, is_active: editActive } : u))
      );
      setSuccessMsg(`បានផ្លាស់ប្តូរតួនាទីរបស់ ${editUser.username} ទៅជា ${editRole} ដោយជោគជ័យ!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      const msg = typeof d === 'string'
        ? d
        : Array.isArray(d)
        ? d.map((x: any) => x.msg || JSON.stringify(x)).join('; ')
        : (d?.msg || err?.message || 'បរាជ័យក្នុងការកែប្រែ User');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSetVip = async (u: User, plan: string, customDays?: number) => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/admin/users/${u.id}/vip`, {
        plan,
        custom_days: customDays,
      });
      setVipModalUser(null);
      setSuccessMsg(`VIP status updated for ${u.username} (${plan})!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to set VIP status');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveUnban = async (reqId: string) => {
    try {
      setSaving(true);
      const res = await api.post(`/admin/unban-requests/${reqId}/approve`);
      setSuccessMsg(res.data?.message || 'បានដោះសោរគណនីជោគជ័យ!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchUnbanRequests();
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to approve unban');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectUnban = async (reqId: string) => {
    try {
      setSaving(true);
      await api.post(`/admin/unban-requests/${reqId}/reject`);
      setSuccessMsg('បានបដិសេធសំណើស្នើសុំដោះសោរ');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchUnbanRequests();
    } catch (err: any) {
      setError('Failed to reject unban');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (u: User) => {
    triggerConfirm({
      title: 'Delete User Account',
      message: `Permanently delete account "${u.username}" (${u.email})? This action cannot be undone.`,
      confirmText: 'Delete Account',
      variant: 'danger',
      onConfirm: async () => {
        await api.delete(`/admin/users/${u.id}`);
        fetchUsers();
      },
    });
  };

  const filteredUsers = (users || []).filter((u: any) => {
    if (!u) return false;
    const q = (search || '').toLowerCase().trim();
    const username = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const phone = String(u.phone_number || '');
    const telegramId = String(u.telegram_id || '');
    const telegramUser = (u.telegram_username || '').toLowerCase();

    const matchSearch =
      !q ||
      username.includes(q) ||
      email.includes(q) ||
      phone.includes(q) ||
      telegramId.includes(q) ||
      telegramUser.includes(q);

    const matchSource =
      filterVip === ('telegram' as any)
        ? u.login_source === 'telegram' || Boolean(u.telegram_id)
        : filterVip === ('phone' as any)
        ? u.login_source === 'phone' || Boolean(u.phone_number)
        : true;

    return matchSearch && matchSource;
  });

  return (
    <AdminLayout title="គ្រប់គ្រងសមាជិក (Users)">
      <div className="space-y-4 sm:space-y-6">
        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 animate-slide-down text-xs sm:text-sm">
            <Check className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Main Tab Switch: Users List vs Unban Appeals */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'users' ? 'bg-[#E50914] text-white shadow-lg shadow-red-600/30' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" /> គ្រប់គ្រងគណនី ({total})
          </button>
          <button
            onClick={() => setActiveTab('appeals')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all relative shrink-0 cursor-pointer ${
              activeTab === 'appeals' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' : 'bg-white/5 text-amber-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" /> សំណើសុំដោះសោរ (Appeals)
            {unbanRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-md">
                {unbanRequests.filter(r => r.status === 'PENDING').length} ថ្មី
              </span>
            )}
          </button>
        </div>

        {activeTab === 'appeals' ? (
          /* ─── UNBAN APPEALS TABLE ─── */
          <div className="card overflow-hidden shadow-2xl space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-dark-border">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 font-display">
                  <Mail className="w-5 h-5 text-amber-400" /> សំណើស្នើសុំដោះសោរ (Appeals)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  User ដែលជាប់ Disabled / Banned អាចផ្ញើសំណើមកទីនេះ
                </p>
              </div>
              <button
                onClick={fetchUnbanRequests}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Refresh សំណើ
              </button>
            </div>

            {unbanRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                🎉 គ្មានសំណើស្នើសុំដោះសោរដែលនៅសល់ឡើយ!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-border bg-dark-muted/40">
                      <th className="px-4 py-3 text-left text-gray-400 font-bold text-xs">User / Identifier</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-bold text-xs">មូលហេតុស្នើសុំ (Appeal Reason)</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-bold text-xs">ទំនាក់ទំនង</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-bold text-xs">កាលបរិច្ឆេទ</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-bold text-xs">ស្ថានភាព</th>
                      <th className="px-4 py-3 text-right text-gray-400 font-bold text-xs">សកម្មភាព Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unbanRequests.map((req) => (
                      <tr key={req.id} className="border-b border-dark-border/40 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-bold text-white">
                          {req.username_or_email}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-300 max-w-xs">
                          <span className="bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg inline-block">
                            "{req.reason}"
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-sky-400 font-mono">
                          {req.contact || '—'}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-400">
                          {timeAgo(req.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {req.status === 'APPROVED' ? (
                            <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                              ✅ បានដោះសោរ
                            </span>
                          ) : req.status === 'REJECTED' ? (
                            <span className="badge bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold">
                              ❌ បានបដិសេធ
                            </span>
                          ) : (
                            <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                              ⏳ រង់ចាំពិនិត្យ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {req.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApproveUnban(req.id)}
                                disabled={saving}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-md transition-all active:scale-95"
                              >
                                ✅ យល់ព្រម
                              </button>
                              <button
                                onClick={() => handleRejectUnban(req.id)}
                                disabled={saving}
                                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold transition-all"
                              >
                                ❌ បដិសេធ
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Search, Filter and Stats Bar */}
            <div className="card p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shadow-xl">
              <div className="relative flex-1 max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ស្វែងរកឈ្មោះ ឬ Email..."
                  className="input pl-10 py-2 text-xs md:text-sm w-full"
                />
              </div>

              {/* Filter Tabs: Horizontally Scrollable on Mobile */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-dark-bg border border-dark-border overflow-x-auto no-scrollbar scroll-smooth shrink-0">
                <button
                  onClick={() => { setFilterVip('all'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    filterVip === 'all' ? 'bg-[#E50914] text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All ({total})
                </button>
                <button
                  onClick={() => { setFilterVip('vip'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                    filterVip === 'vip' ? 'bg-amber-500 text-black font-bold' : 'text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  <Crown className="w-3 h-3 fill-current" /> VIP
                </button>
                <button
                  onClick={() => { setFilterVip('regular'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    filterVip === 'regular' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Regular
                </button>
                <button
                  onClick={() => { setFilterVip('telegram' as any); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                    filterVip === ('telegram' as any) ? 'bg-sky-500 text-white font-bold' : 'text-sky-400 hover:bg-sky-500/10'
                  }`}
                >
                  <Send className="w-3 h-3" /> Telegram
                </button>
                <button
                  onClick={() => { setFilterVip('phone' as any); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                    filterVip === ('phone' as any) ? 'bg-amber-500 text-black font-bold' : 'text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  <Smartphone className="w-3 h-3" /> Phone
                </button>
              </div>
            </div>
          </>
        )}

        {/* Users Container */}
        <div className="card overflow-hidden shadow-2xl bg-[#181818] border border-white/10 rounded-2xl">
          {/* ── MOBILE VIEW: Touch-Friendly User Cards (md:hidden) ── */}
          <div className="block md:hidden p-3 space-y-3 divide-y divide-white/5">
            {isLoading ? (
              <div className="py-8"><SkeletonTable rows={4} /></div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-xs">រកមិនឃើញសមាជិកឡើយ</p>
            ) : (
              filteredUsers.map((u) => {
                const isUserOwner = u.role === 'OWNER' || u.email === 'cm5722254@gmail.com';
                const isUserVip = isUserOwner || u.role === 'ADMIN' || u.is_vip_active || u.is_vip;
                const isCurrentOwner = currentUser?.role === 'OWNER' || currentUser?.email === 'cm5722254@gmail.com';

                return (
                  <div key={u.id} className="pt-3 first:pt-0 bg-[#151515] p-3.5 rounded-2xl border border-white/5 space-y-3 shadow-md">
                    {/* Top Row: User Avatar, Name, Badges, Role Selector */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden shadow-md ${
                          isUserOwner
                            ? 'ring-2 ring-yellow-400 bg-gradient-to-br from-yellow-400 via-amber-500 to-red-500 shadow-amber-500/40 shadow-lg'
                            : isUserVip
                            ? 'ring-2 ring-amber-400/60 bg-gradient-to-br from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-br from-brand-500 to-purple-600'
                        }`}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            u.username[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">{u.username}</span>
                            {isUserOwner ? (
                              <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            ) : u.role === 'ADMIN' ? (
                              <Shield className="w-3 h-3 text-red-400" />
                            ) : u.role === 'STAFF' ? (
                              <Shield className="w-3 h-3 text-cyan-400" />
                            ) : isUserVip ? (
                              <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                            ) : null}
                            {u.id === currentUser?.id && (
                              <span className="badge bg-[#E50914]/20 text-[#E50914] text-[9px] py-0 font-black">YOU</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 truncate">{u.email || 'No email'}</p>
                        </div>
                      </div>

                      {/* Role Badge on Top Right */}
                      <div className="shrink-0">
                        {isUserOwner ? (
                          <span className="badge bg-gradient-to-r from-amber-500/25 to-yellow-500/25 text-amber-300 border border-amber-400/50 font-black text-[10px]">
                            👑 OWNER
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={async (e) => {
                              const newRole = e.target.value;
                              setSaving(true);
                              try {
                                await api.put(`/admin/users/${u.id}`, {
                                  role: newRole,
                                  is_active: u.is_active ?? true,
                                });
                                setUsers((prev) =>
                                  prev.map((item) => (item.id === u.id ? { ...item, role: newRole as any } : item))
                                );
                                setSuccessMsg(`បានកំណត់ ${u.username} ទៅជា ${newRole}`);
                                setTimeout(() => setSuccessMsg(''), 4000);
                              } catch (err: any) {
                                alert('Error updating role');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            className={`rounded-xl px-2 py-1 text-[11px] font-bold border transition cursor-pointer ${
                              u.role === 'ADMIN'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : u.role === 'STAFF'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-white/5 text-gray-300 border-white/10'
                            }`}
                          >
                            <option value="USER" className="bg-dark-card text-white">👤 USER</option>
                            <option value="STAFF" className="bg-dark-card text-cyan-300">🎬 STAFF</option>
                            <option value="ADMIN" className="bg-dark-card text-red-300">🛡️ ADMIN</option>
                            {isCurrentOwner && (
                              <option value="OWNER" className="bg-dark-card text-amber-300">👑 OWNER</option>
                            )}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: VIP & Source Badges */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                      <div>
                        {isUserOwner ? (
                          <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            👑 Super Owner Access
                          </span>
                        ) : isUserVip ? (
                          <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            👑 VIP ({u.vip_plan ? u.vip_plan.toUpperCase() : 'ACTIVE'})
                          </span>
                        ) : (
                          <span className="badge bg-white/5 text-gray-400 text-[10px]">
                            Regular Member
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <LoginSourceBadge source={(u as any).login_source} />
                        <span className="text-[10px] text-gray-400 font-mono">
                          {timeAgo((u as any).last_login_at)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!isUserOwner ? (
                          <button
                            onClick={() => setVipModalUser(u)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                          >
                            <Crown className="w-3.5 h-3.5 fill-amber-400" /> Set VIP
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                            <Shield className="w-3 h-3 fill-amber-400/30" /> ការពារដាច់ខាត
                          </span>
                        )}

                        <button
                          onClick={() => setMovieModalUser(u)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                          title="គ្រប់គ្រងសិទ្ធិទស្សនាភាពយន្ត (Movie Access)"
                        >
                          <Film className="w-3.5 h-3.5" /> Movie {u.unlocked_movies?.length ? `(${u.unlocked_movies.length})` : ''}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 transition cursor-pointer"
                          title="Edit"
                        >
                          <Shield className="w-4 h-4" />
                        </button>

                        {!isUserOwner && u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={!isCurrentOwner && (u.role === 'ADMIN' || u.role === 'STAFF')}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 transition cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── DESKTOP & TABLET VIEW: Full Data Table (hidden on mobile md:block) ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-muted/40">
                  <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">User Profile</th>
                  <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs hidden md:table-cell">Email</th>
                  <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">Role</th>
                  <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">VIP Status</th>
                  <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs hidden lg:table-cell">Login Source</th>
                  <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs hidden lg:table-cell">Telegram</th>
                  <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs hidden sm:table-cell">Last Login</th>
                  <th className="px-4 py-3.5 text-right text-gray-400 font-bold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8"><SkeletonTable rows={8} /></td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-500 py-12">No users found.</td></tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isUserOwner = u.role === 'OWNER' || u.email === 'cm5722254@gmail.com';
                    const isUserVip = isUserOwner || u.role === 'ADMIN' || u.is_vip_active || u.is_vip;
                    const isCurrentOwner = currentUser?.role === 'OWNER' || currentUser?.email === 'cm5722254@gmail.com';
                    return (
                  <tr key={u.id} className="border-b border-dark-border/40 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden shadow-md ${
                              isUserOwner
                                ? 'ring-2 ring-yellow-400 bg-gradient-to-br from-yellow-400 via-amber-500 to-red-500 shadow-amber-500/40 shadow-lg'
                                : isUserVip
                                ? 'ring-2 ring-amber-400/60 bg-gradient-to-br from-amber-500 to-yellow-400'
                                : 'bg-gradient-to-br from-brand-500 to-purple-600'
                            }`}>
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                u.username[0]?.toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white text-sm">{u.username}</span>
                                {isUserOwner ? (
                                  <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                                ) : u.role === 'ADMIN' ? (
                                  <Shield className="w-3.5 h-3.5 text-red-400" />
                                ) : u.role === 'STAFF' ? (
                                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                                ) : isUserVip ? (
                                  <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                                ) : null}
                                {u.id === currentUser?.id && (
                                  <span className="badge bg-brand-500/20 text-brand-400 text-[10px] py-0">You</span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500 md:hidden">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 text-xs hidden md:table-cell">{u.email}</td>
                        <td className="px-4 py-3.5">
                          {isUserOwner ? (
                            <span className="badge bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-red-500/25 text-amber-300 border border-amber-400/50 font-black shadow-sm text-[10px]">
                              👑 OWNER (ម្ចាស់)
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={async (e) => {
                                const newRole = e.target.value;
                                setSaving(true);
                                try {
                                  await api.put(`/admin/users/${u.id}`, {
                                    role: newRole,
                                    is_active: u.is_active ?? true,
                                  });
                                  setUsers((prev) =>
                                    prev.map((item) => (item.id === u.id ? { ...item, role: newRole as any } : item))
                                  );
                                  setSuccessMsg(`បានកំណត់ ${u.username} ទៅជា ${newRole} ដោយជោគជ័យ!`);
                                  setTimeout(() => setSuccessMsg(''), 4000);
                                } catch (err: any) {
                                  const d = err?.response?.data?.detail;
                                  const msg = typeof d === 'string'
                                    ? d
                                    : Array.isArray(d)
                                    ? d.map((x: any) => x.msg || JSON.stringify(x)).join('; ')
                                    : (d?.msg || err?.message || 'បរាជ័យក្នុងការកំណត់ Role');
                                  alert(`កំហុស (Error): ${msg}`);
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              className={`rounded-xl px-2.5 py-1 text-xs font-bold border transition-all cursor-pointer focus:outline-none ${
                                u.role === 'ADMIN'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                                  : u.role === 'STAFF'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <option value="USER" className="bg-dark-card text-white">👤 USER (សមាជិក)</option>
                              <option value="STAFF" className="bg-dark-card text-cyan-300">🎬 STAFF (រឿង & ភាគ)</option>
                              <option value="ADMIN" className="bg-dark-card text-red-300">🛡️ ADMIN (គ្រប់គ្រង)</option>
                              {isCurrentOwner && (
                                <option value="OWNER" className="bg-dark-card text-amber-300">👑 OWNER (ម្ចាស់)</option>
                              )}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {isUserOwner ? (
                            <span className="badge bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-red-500/30 text-amber-300 border border-amber-400/50 text-[10px] flex items-center gap-1 font-black shadow-md">
                              <Crown className="w-3 h-3 fill-amber-400" /> SUPER OWNER ACCESS
                            </span>
                          ) : u.role === 'ADMIN' ? (
                            <span className="badge bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Admin Access
                            </span>
                          ) : u.role === 'STAFF' ? (
                            <span className="badge bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] flex items-center gap-1 font-bold">
                              <Shield className="w-3 h-3" /> Staff (រឿង/ភាគ)
                            </span>
                          ) : isUserVip ? (
                            <div>
                              <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] flex items-center gap-1 font-bold">
                                <Crown className="w-3 h-3 fill-amber-400" /> VIP ({u.vip_plan ? u.vip_plan.toUpperCase() : 'ACTIVE'})
                              </span>
                              {u.vip_expires_at && (
                                <span className="text-[10px] text-gray-400 block mt-0.5 font-mono">
                                  Exp: {new Date(u.vip_expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="badge bg-white/5 text-gray-500 text-[10px]">
                              Regular Member
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <LoginSourceBadge source={(u as any).login_source} />
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          {(u as any).telegram_id ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <Send className="w-3 h-3 text-sky-400" />
                                <span className="text-[10px] font-mono text-sky-300">#{(u as any).telegram_id}</span>
                              </div>
                              {(u as any).telegram_username && (
                                <span className="text-[10px] text-gray-400">@{(u as any).telegram_username}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-gray-300 font-mono">{timeAgo((u as any).last_login_at)}</span>
                            {(u as any).last_login_at && (
                              <span className="text-[9px] text-gray-500 block">{new Date((u as any).last_login_at).toLocaleString()}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Manage VIP Button */}
                            {!isUserOwner && (
                              <button
                                onClick={() => setVipModalUser(u)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                                title="Set VIP Membership Plan"
                              >
                                <Crown className="w-3.5 h-3.5 fill-amber-400" /> Set VIP
                              </button>
                            )}

                            {/* Manage Movie Access Button */}
                            <button
                              onClick={() => setMovieModalUser(u)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                              title="គ្រប់គ្រងសិទ្ធិទស្សនា Movie (Movie Access)"
                            >
                              <Film className="w-3.5 h-3.5" /> Movie {u.unlocked_movies?.length ? `(${u.unlocked_movies.length})` : ''}
                            </button>

                            {/* Edit Role & Status */}
                            <button onClick={() => openEdit(u)} className="btn-icon text-gray-400 hover:text-brand-400" title="Edit Role & Permissions">
                              <Shield className="w-4 h-4" />
                            </button>

                            {/* Delete User Action with Strict Immunity for OWNER */}
                            {isUserOwner ? (
                              <div
                                className="px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1 cursor-not-allowed select-none opacity-90 shadow-sm"
                                title="គណនី OWNER (ម្ចាស់វេបសាយ) ត្រូវបានការពារដាច់ខាត ទោះបីជា Admin ក៏មិនអាចលុបបានឡើយ (Protected Super Owner)"
                              >
                                <Shield className="w-3 h-3 text-amber-400 fill-amber-400/30" />
                                <span>ការពារដាច់ខាត</span>
                              </div>
                            ) : u.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDelete(u)}
                                disabled={!isCurrentOwner && (u.role === 'ADMIN' || u.role === 'STAFF')}
                                className={`btn-icon ${
                                  !isCurrentOwner && (u.role === 'ADMIN' || u.role === 'STAFF')
                                    ? 'opacity-40 cursor-not-allowed text-gray-600'
                                    : 'text-gray-400 hover:text-red-400'
                                }`}
                                title={
                                  !isCurrentOwner && (u.role === 'ADMIN' || u.role === 'STAFF')
                                    ? 'Admin ធម្មតាមិនអាចលុប Admin ផ្សេងទៀតបានឡើយ'
                                    : 'Delete User'
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="p-4 border-t border-dark-border flex justify-between items-center text-xs text-gray-400">
              <span>Page {page}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-3 text-xs">Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={users.length < 20} className="btn-secondary py-1 px-3 text-xs">Next</button>
              </div>
            </div>
          )}
        </div>

        {/* VIP Management Modal */}
        {vipModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-dark-card border-2 border-amber-500/40 rounded-3xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-dark-border bg-gradient-to-r from-amber-500/15 via-dark-muted to-dark-muted">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Crown className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-white">Set VIP: {vipModalUser.username}</h2>
                    <p className="text-[11px] text-gray-400">{vipModalUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setVipModalUser(null)} className="btn-icon"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-gray-300">
                  ជ្រើសរើសរយៈពេល VIP ដែលចង់ផ្ដល់ឱ្យអ្នកប្រើប្រាស់នេះ៖
                </p>

                {/* VIP Duration Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleSetVip(vipModalUser, '1month')}
                    disabled={saving}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-amber-300">1 Month Plan</span>
                      <span className="badge bg-amber-500/20 text-amber-300 text-[9px]">30 Days</span>
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-1">+30 ថ្ងៃ VIP Access</span>
                  </button>

                  <button
                    onClick={() => handleSetVip(vipModalUser, '3month')}
                    disabled={saving}
                    className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">3 Months Plan</span>
                      <span className="badge bg-amber-500/30 text-amber-300 text-[9px]">90 Days</span>
                    </div>
                    <span className="text-[10px] text-amber-200/80 block mt-1">+90 ថ្ងៃ (ពេញនិយម)</span>
                  </button>

                  <button
                    onClick={() => handleSetVip(vipModalUser, '6month')}
                    disabled={saving}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300">6 Months Plan</span>
                      <span className="badge bg-cyan-500/20 text-cyan-300 text-[9px]">180 Days</span>
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-1">+180 ថ្ងៃ VIP Access</span>
                  </button>

                  <button
                    onClick={() => handleSetVip(vipModalUser, '1year')}
                    disabled={saving}
                    className="p-3.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">1 Year Plan</span>
                      <span className="badge bg-purple-500/30 text-purple-300 text-[9px]">365 Days</span>
                    </div>
                    <span className="text-[10px] text-purple-200/80 block mt-1">+365 ថ្ងៃ VIP Access</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleSetVip(vipModalUser, 'lifetime')}
                    disabled={saving}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Crown className="w-4 h-4 fill-amber-400" /> ផ្ដល់សិទ្ធិ VIP ពេញមួយជីវិត (Lifetime VIP)
                  </button>
                </div>

                {/* Revoke VIP Option */}
                {vipModalUser.is_vip && (
                  <div className="pt-2 border-t border-dark-border">
                    <button
                      onClick={() => handleSetVip(vipModalUser, 'revoke')}
                      disabled={saving}
                      className="w-full py-2 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <UserX className="w-4 h-4" /> ដកសិទ្ធិ VIP ចេញ (Revoke VIP)
                    </button>
                  </div>
                )}

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <div className="flex justify-end pt-2">
                  <button onClick={() => setVipModalUser(null)} className="btn-ghost py-2 text-xs">
                    បិទ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Movie Access Modal */}
        {movieModalUser && (
          <MovieAccessModal
            user={movieModalUser}
            movies={availableMovies}
            saving={saving}
            error={error}
            onClose={() => setMovieModalUser(null)}
            onToggleAccess={handleToggleMovieAccess}
          />
        )}

        {/* Edit Role & Status Modal */}
        {editUser && <EditRoleModal
          editUser={editUser}
          editRole={editRole}
          editActive={editActive}
          saving={saving}
          error={error}
          currentUser={currentUser}
          setEditRole={setEditRole}
          setEditActive={setEditActive}
          setEditUser={setEditUser}
          saveEdit={saveEdit}
        />}
      </div>
    </AdminLayout>
  );
}

// ── Movie Access Modal Component ──────────────────────────────────
function MovieAccessModal({
  user,
  movies,
  saving,
  error,
  onClose,
  onToggleAccess,
}: {
  user: User;
  movies: any[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onToggleAccess: (u: User, movieSlug: string, action: 'unlock' | 'lock') => void;
}) {
  const [selectedSlug, setSelectedSlug] = useState('');
  const unlockedList = user.unlocked_movies || [];

  const handleUnlock = () => {
    if (!selectedSlug) return;
    onToggleAccess(user, selectedSlug, 'unlock');
    setSelectedSlug('');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden cursor-default"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-rose-950/40 via-red-900/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-base text-white">សិទ្ធិទស្សនាភាពយន្ត (Movie Access)</h2>
              <p className="text-xs text-gray-400">សម្រាប់គណនី: <strong className="text-amber-400">{user.username}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Currently Unlocked Movies List */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
              ភាពយន្តដែលបានបើកសិទ្ធិរួច ({unlockedList.length})៖
            </label>
            {unlockedList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-gray-500 text-xs">
                មិនទាន់មានភាពយន្តណាមួយត្រូវបាន Unlock ជូន User នេះនៅឡើយទេ។
              </div>
            ) : (
              <div className="space-y-2">
                {unlockedList.map((slug) => {
                  const matchedMovie = movies.find((m) => m.slug === slug);
                  const title = matchedMovie?.title || slug;

                  return (
                    <div
                      key={slug}
                      className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{title}</p>
                          <p className="text-[10px] text-gray-500 font-mono truncate">{slug}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleAccess(user, slug, 'lock')}
                        disabled={saving}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> ដកសិទ្ធិ
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unlock New Movie Selector */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
              ជ្រើសរើស Movie ដើម្បីបើកសិទ្ធិ (Unlock New Movie)៖
            </label>

            <div className="space-y-2">
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="input text-xs sm:text-sm font-semibold w-full"
              >
                <option value="">-- សូមជ្រើសរើសភាពយន្ត (Select Movie) --</option>
                {movies.map((m) => (
                  <option key={m.id || m.slug} value={m.slug} disabled={unlockedList.includes(m.slug)}>
                    {m.title} {unlockedList.includes(m.slug) ? '✓ (បានបើករួច)' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={handleUnlock}
                disabled={!selectedSlug || saving}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" /> {saving ? 'កំពុងដំណើរការ...' : '🔓 បើកសិទ្ធិទស្សនា (Unlock Movie)'}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button onClick={onClose} className="btn-ghost py-2 px-5 text-xs font-bold cursor-pointer">
            បិទ (Close)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Separate component to avoid IIFE crash bug ──────────────────────
function EditRoleModal({
  editUser, editRole, editActive, saving, error,
  currentUser, setEditRole, setEditActive, setEditUser, saveEdit
}: {
  editUser: any; editRole: any; editActive: boolean; saving: boolean;
  error: string; currentUser: any; setEditRole: any; setEditActive: any;
  setEditUser: any; saveEdit: () => void;
}) {
  const isEditingOwner = editUser.role === 'OWNER' || editUser.email === 'cm5722254@gmail.com';
  const isCurrentOwner = currentUser?.role === 'OWNER' || currentUser?.email === 'cm5722254@gmail.com';
  const canModifyThisUser = isCurrentOwner || !isEditingOwner;

  return (
    <div
      onClick={() => setEditUser(null)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden cursor-default"
      >
        <div className="flex items-center justify-between p-6 border-b border-dark-border bg-dark-muted/30">
          <div className="flex items-center gap-2">
            {isEditingOwner ? <Crown className="w-5 h-5 text-amber-400 fill-amber-400" /> : <Shield className="w-5 h-5 text-brand-400" />}
            <h2 className="font-display font-bold text-base text-white">Edit User: {editUser.username}</h2>
          </div>
          <button onClick={() => setEditUser(null)} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {isEditingOwner && !isCurrentOwner && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>គណនី OWNER ត្រូវបានការពារដាច់ខាត Admin ធម្មតាមិនអាចកែប្រែបានឡើយ។</span>
            </div>
          )}

          <div>
            <label className="label">Account Role (តួនាទីគណនី)</label>
            <select
              value={editRole}
              disabled={!canModifyThisUser || (isEditingOwner && !isCurrentOwner)}
              onChange={(e) => setEditRole(e.target.value as any)}
              className="input font-semibold text-xs sm:text-sm"
            >
              {isCurrentOwner && (
                <option value="OWNER">👑 Platform Owner (OWNER - ម្ចាស់វេបសាយ)</option>
              )}
              <option value="ADMIN">🛡️ Platform Administrator (ADMIN - អ្នកគ្រប់គ្រង)</option>
              <option value="STAFF">🎬 Staff (STAFF - គ្រប់គ្រងរឿង និងភាគ)</option>
              <option value="USER">👤 Standard User (USER - សមាជិកទូទៅ)</option>
            </select>
          </div>
          <div>
            <label className="label">Account Status (ស្ថានភាពគណនី)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canModifyThisUser || isEditingOwner}
                onClick={() => setEditActive(true)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  editActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'btn-ghost'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Active (ដំណើរការ)
              </button>
              <button
                type="button"
                disabled={!canModifyThisUser || isEditingOwner}
                onClick={() => setEditActive(false)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  !editActive ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm' : 'btn-ghost'
                } ${isEditingOwner ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <UserX className="w-4 h-4" /> Disabled (បិទ)
              </button>
            </div>
            {isEditingOwner && (
              <p className="text-[10px] text-amber-400/80 mt-1.5 flex items-center gap-1">
                <Shield className="w-3 h-3" /> គណនី OWNER មិនអាចបិទ (Disable) បានឡើយ
              </p>
            )}
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3 pt-4 border-t border-dark-border">
            <button
              onClick={saveEdit}
              disabled={saving || (!isCurrentOwner && isEditingOwner)}
              className="btn-primary flex-1 py-2.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes (រក្សាទុក)'}
            </button>
            <button onClick={() => setEditUser(null)} className="btn-ghost py-2.5 text-xs font-semibold">
              Cancel (បោះបង់)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
