import { useEffect, useState } from 'react';
import {
  Shield, UserCheck, UserX, Trash2, X, Search, Crown, Check,
  Send, Mail, Globe, Smartphone, Film, Clock
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import { useAuthStore } from '../../store/authStore';
import { triggerConfirm } from '../../store/confirmStore';
import api from '../../services/api';
import type { User } from '../../types';

const INPUT_CLASS =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all';

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
  if (!source) return <span className="text-slate-400 text-[10px]">—</span>;
  if (source === 'phone') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
        <Smartphone className="w-2.5 h-2.5" /> Phone OTP
      </span>
    );
  }
  if (source === 'telegram') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-semibold">
        <Send className="w-2.5 h-2.5" /> Telegram
      </span>
    );
  }
  if (source === 'google') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
        <Globe className="w-2.5 h-2.5" /> Google
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
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

  const handleDeleteAppeal = (reqId: string) => {
    triggerConfirm({
      title: 'លុបសំណើស្នើសុំដោះសោរ',
      message: 'តើអ្នកពិតជាចង់លុបសំណើស្នើសុំដោះសោរមួយនេះមែនទេ?',
      confirmText: 'លុបចោល',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setSaving(true);
          await api.delete(`/admin/unban-requests/${reqId}`);
          setSuccessMsg('បានលុបសំណើស្នើសុំដោះសោររួចរាល់!');
          setTimeout(() => setSuccessMsg(''), 4000);
          fetchUnbanRequests();
        } catch (err: any) {
          setError(err?.response?.data?.detail || 'Failed to delete unban request');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleClearAppeals = (onlyResolved: boolean) => {
    const title = onlyResolved ? 'សម្អាតសំណើដែលបានដោះស្រាយរួច' : 'សម្អាតសំណើទាំងអស់';
    const message = onlyResolved
      ? 'តើអ្នកចង់លុបសំណើទាំងអស់ដែលបានដោះសោរ ឬបដិសេធរួចរាល់ (Resolved) មែនទេ?'
      : 'តើអ្នកចង់លុបសំណើទាំងអស់ចេញពីប្រព័ន្ធមែនទេ?';
    triggerConfirm({
      title,
      message,
      confirmText: 'យល់ព្រមសម្អាត',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setSaving(true);
          const url = onlyResolved ? '/admin/unban-requests?status_filter=resolved' : '/admin/unban-requests';
          const res = await api.delete(url);
          setSuccessMsg(res.data?.message || 'បានសម្អាតសំណើរួចរាល់!');
          setTimeout(() => setSuccessMsg(''), 4000);
          fetchUnbanRequests();
        } catch (err: any) {
          setError(err?.response?.data?.detail || 'Failed to clear unban requests');
        } finally {
          setSaving(false);
        }
      },
    });
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
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3 text-xs sm:text-sm">
            <Check className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Main Tab Switch: Users List vs Unban Appeals */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" /> គ្រប់គ្រងគណនី ({total})
          </button>
          <button
            onClick={() => setActiveTab('appeals')}
            className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all relative shrink-0 cursor-pointer ${
              activeTab === 'appeals'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Mail className="w-4 h-4" /> សំណើសុំដោះសោរ (Appeals)
            {unbanRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unbanRequests.filter(r => r.status === 'PENDING').length} ថ្មី
              </span>
            )}
          </button>
        </div>

        {activeTab === 'appeals' ? (
          /* ─── UNBAN APPEALS TABLE ─── */
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm space-y-4 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                  <Mail className="w-5 h-5 text-blue-600" /> សំណើស្នើសុំដោះសោរ (Appeals)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  User ដែលជាប់ Disabled / Banned អាចផ្ញើសំណើមកទីនេះ
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {unbanRequests.some((r) => r.status !== 'PENDING') && (
                  <button
                    onClick={() => handleClearAppeals(true)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="លុបសំណើដែលបានអនុម័ត ឬបដិសេធរួចរាល់"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> សម្អាតដែលដោះសោររួច
                  </button>
                )}
                {unbanRequests.length > 0 && (
                  <button
                    onClick={() => handleClearAppeals(false)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="សម្អាតសំណើស្នើសុំដោះសោរទាំងអស់"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> សម្អាតទាំងអស់
                  </button>
                )}
                <button
                  onClick={fetchUnbanRequests}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs py-1.5 px-3 cursor-pointer transition-colors"
                >
                  Refresh សំណើ
                </button>
              </div>
            </div>

            {unbanRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                គ្មានសំណើស្នើសុំដោះសោរដែលនៅសល់ឡើយ!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-slate-500 font-semibold text-xs">User / Identifier</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-semibold text-xs">មូលហេតុស្នើសុំ (Appeal Reason)</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-semibold text-xs">ទំនាក់ទំនង</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-semibold text-xs">កាលបរិច្ឆេទ</th>
                      <th className="px-4 py-3 text-left text-slate-500 font-semibold text-xs">ស្ថានភាព</th>
                      <th className="px-4 py-3 text-right text-slate-500 font-semibold text-xs">សកម្មភាព Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unbanRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {req.username_or_email}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 max-w-xs">
                          <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg inline-block">
                            "{req.reason}"
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-blue-600 font-mono">
                          {req.contact || '—'}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">
                          {timeAgo(req.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {req.status === 'APPROVED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              បានដោះសោរ
                            </span>
                          ) : req.status === 'REJECTED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                              បានបដិសេធ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                              <Clock className="w-3 h-3" /> រង់ចាំពិនិត្យ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {req.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApproveUnban(req.id)}
                                  disabled={saving}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                                  title="យល់ព្រមដោះសោរ"
                                >
                                  យល់ព្រម
                                </button>
                                <button
                                  onClick={() => handleRejectUnban(req.id)}
                                  disabled={saving}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-all cursor-pointer"
                                  title="បដិសេធសំណើ"
                                >
                                  បដិសេធ
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteAppeal(req.id)}
                              disabled={saving}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              title="លុបសំណើនេះចោល"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">លុប</span>
                            </button>
                          </div>
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
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shadow-sm">
              <div className="relative flex-1 max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ស្វែងរកឈ្មោះ ឬ Email..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                />
              </div>

              {/* Filter Tabs: Horizontally Scrollable on Mobile */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-200 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
                <button
                  onClick={() => { setFilterVip('all'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    filterVip === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  All ({total})
                </button>
                <button
                  onClick={() => { setFilterVip('vip'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                    filterVip === 'vip' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Crown className="w-3 h-3 fill-current" /> VIP
                </button>
                <button
                  onClick={() => { setFilterVip('regular'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    filterVip === 'regular' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  Regular
                </button>
                <button
                  onClick={() => { setFilterVip('telegram' as any); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                    filterVip === ('telegram' as any) ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Send className="w-3 h-3" /> Telegram
                </button>
                <button
                  onClick={() => { setFilterVip('phone' as any); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                    filterVip === ('phone' as any) ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Smartphone className="w-3 h-3" /> Phone
                </button>
              </div>
            </div>
          </>
        )}

        {/* Users Container */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          {/* ── MOBILE VIEW: Touch-Friendly User Cards (md:hidden) ── */}
          <div className="block md:hidden p-3 space-y-3">
            {isLoading ? (
              <div className="py-8"><SkeletonTable rows={4} /></div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-slate-500 py-12 text-xs">រកមិនឃើញសមាជិកឡើយ</p>
            ) : (
              filteredUsers.map((u) => {
                const isUserOwner = u.role === 'OWNER' || u.email === 'cm5722254@gmail.com';
                const isUserVip = isUserOwner || u.role === 'ADMIN' || u.is_vip_active || u.is_vip;
                const isCurrentOwner = currentUser?.role === 'OWNER' || currentUser?.email === 'cm5722254@gmail.com';

                return (
                  <div key={u.id} className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    {/* Top Row: User Avatar, Name, Badges, Role Selector */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden shadow-sm ${
                            isUserOwner
                              ? 'ring-2 ring-amber-400 bg-amber-600'
                              : isUserVip
                              ? 'ring-2 ring-amber-300 bg-amber-500'
                              : 'bg-blue-600'
                          }`}
                        >
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            u.username[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm truncate">{u.username}</span>
                            {isUserOwner ? (
                              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            ) : u.role === 'ADMIN' ? (
                              <Shield className="w-3 h-3 text-rose-600" />
                            ) : u.role === 'STAFF' ? (
                              <Shield className="w-3 h-3 text-blue-600" />
                            ) : isUserVip ? (
                              <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                            ) : null}
                            {u.id === currentUser?.id && (
                              <span className="inline-flex items-center px-1.5 py-0 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{u.email || 'No email'}</p>
                        </div>
                      </div>

                      {/* Role Badge on Top Right */}
                      <div className="shrink-0">
                        {isUserOwner ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                            OWNER
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
                              } catch {
                                alert('Error updating role');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            className={`rounded-xl px-2 py-1 text-[11px] font-semibold border transition cursor-pointer ${
                              u.role === 'ADMIN'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : u.role === 'STAFF'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="USER">USER</option>
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                            {isCurrentOwner && <option value="OWNER">OWNER</option>}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: VIP & Source Badges */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                      <div>
                        {isUserOwner ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            Super Owner Access
                          </span>
                        ) : isUserVip ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            VIP ({u.vip_plan ? u.vip_plan.toUpperCase() : 'ACTIVE'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                            Regular Member
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <LoginSourceBadge source={(u as any).login_source} />
                        <span className="text-[10px] text-slate-500 font-mono">
                          {timeAgo((u as any).last_login_at)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!isUserOwner ? (
                          <button
                            onClick={() => setVipModalUser(u)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" /> Set VIP
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                            <Shield className="w-3 h-3 text-amber-600" /> ការពារដាច់ខាត
                          </span>
                        )}

                        <button
                          onClick={() => setMovieModalUser(u)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="គ្រប់គ្រងសិទ្ធិទស្សនាភាពយន្ត (Movie Access)"
                        >
                          <Film className="w-3.5 h-3.5" /> Movie {u.unlocked_movies?.length ? `(${u.unlocked_movies.length})` : ''}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition cursor-pointer"
                          title="Edit"
                        >
                          <Shield className="w-4 h-4" />
                        </button>

                        {!isUserOwner && u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={!isCurrentOwner && (u.role === 'ADMIN' || u.role === 'STAFF')}
                            className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">User Profile</th>
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs hidden md:table-cell">Email</th>
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">Role</th>
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">VIP Status</th>
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs hidden lg:table-cell">Login Source</th>
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs hidden lg:table-cell">Telegram</th>
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs hidden sm:table-cell">Last Login</th>
                  <th className="px-4 py-3.5 text-right text-slate-500 font-semibold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8"><SkeletonTable rows={8} /></td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-slate-500 py-12">No users found.</td></tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isUserOwner = u.role === 'OWNER' || u.email === 'cm5722254@gmail.com';
                    const isUserVip = isUserOwner || u.role === 'ADMIN' || u.is_vip_active || u.is_vip;
                    const isCurrentOwner = currentUser?.role === 'OWNER' || currentUser?.email === 'cm5722254@gmail.com';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden shadow-sm ${
                                isUserOwner
                                  ? 'ring-2 ring-amber-400 bg-amber-600'
                                  : isUserVip
                                  ? 'ring-2 ring-amber-300 bg-amber-500'
                                  : 'bg-blue-600'
                              }`}
                            >
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                u.username[0]?.toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 text-sm">{u.username}</span>
                                {isUserOwner ? (
                                  <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                                ) : u.role === 'ADMIN' ? (
                                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                                ) : u.role === 'STAFF' ? (
                                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                                ) : isUserVip ? (
                                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                ) : null}
                                {u.id === currentUser?.id && (
                                  <span className="inline-flex items-center px-2 py-0 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 md:hidden">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs hidden md:table-cell">{u.email}</td>
                        <td className="px-4 py-3.5">
                          {isUserOwner ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                              OWNER (ម្ចាស់)
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
                              className={`rounded-xl px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer focus:outline-none ${
                                u.role === 'ADMIN'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : u.role === 'STAFF'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <option value="USER">USER (សមាជិក)</option>
                              <option value="STAFF">STAFF (រឿង & ភាគ)</option>
                              <option value="ADMIN">ADMIN (គ្រប់គ្រង)</option>
                              {isCurrentOwner && <option value="OWNER">OWNER (ម្ចាស់)</option>}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {isUserOwner ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                              <Crown className="w-3 h-3 fill-amber-500 text-amber-600" /> SUPER OWNER ACCESS
                            </span>
                          ) : u.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                              <Shield className="w-3 h-3" /> Admin Access
                            </span>
                          ) : u.role === 'STAFF' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                              <Shield className="w-3 h-3" /> Staff (រឿង/ភាគ)
                            </span>
                          ) : isUserVip ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                <Crown className="w-3 h-3 fill-amber-500 text-amber-600" /> VIP ({u.vip_plan ? u.vip_plan.toUpperCase() : 'ACTIVE'})
                              </span>
                              {u.vip_expires_at && (
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                                  Exp: {new Date(u.vip_expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
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
                                <Send className="w-3 h-3 text-sky-600" />
                                <span className="text-[10px] font-mono text-sky-700 font-medium">#{(u as any).telegram_id}</span>
                              </div>
                              {(u as any).telegram_username && (
                                <span className="text-[10px] text-slate-500">@{(u as any).telegram_username}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-700 font-mono font-medium">{timeAgo((u as any).last_login_at)}</span>
                            {(u as any).last_login_at && (
                              <span className="text-[9px] text-slate-500 block">{new Date((u as any).last_login_at).toLocaleString()}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Manage VIP Button */}
                            {!isUserOwner && (
                              <button
                                onClick={() => setVipModalUser(u)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                title="Set VIP Membership Plan"
                              >
                                <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" /> Set VIP
                              </button>
                            )}

                            {/* Manage Movie Access Button */}
                            <button
                              onClick={() => setMovieModalUser(u)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              title="គ្រប់គ្រងសិទ្ធិទស្សនា Movie (Movie Access)"
                            >
                              <Film className="w-3.5 h-3.5" /> Movie {u.unlocked_movies?.length ? `(${u.unlocked_movies.length})` : ''}
                            </button>

                            {/* Edit Role & Status */}
                            <button
                              onClick={() => openEdit(u)}
                              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Edit Role & Permissions"
                            >
                              <Shield className="w-4 h-4" />
                            </button>

                            {/* Delete User Action with Strict Immunity for OWNER */}
                            {isUserOwner ? (
                              <div
                                className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold flex items-center gap-1 cursor-not-allowed select-none"
                                title="គណនី OWNER (ម្ចាស់វេបសាយ) ត្រូវបានការពារដាច់ខាត ទោះបីជា Admin ក៏មិនអាចលុបបានឡើយ (Protected Super Owner)"
                              >
                                <Shield className="w-3 h-3 text-amber-600" />
                                <span>ការពារដាច់ខាត</span>
                              </div>
                            ) : (
                              u.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDelete(u)}
                                  disabled={!isCurrentOwner && (u.role === 'ADMIN' || u.role === 'STAFF')}
                                  className={`p-2 rounded-xl border transition-colors ${
                                    !isCurrentOwner && (u.role === 'ADMIN' || u.role === 'STAFF')
                                      ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                                      : 'bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 cursor-pointer'
                                  }`}
                                  title={
                                    !isCurrentOwner && (u.role === 'ADMIN' || u.role === 'STAFF')
                                      ? 'Admin ធម្មតាមិនអាចលុប Admin ផ្សេងទៀតបានឡើយ'
                                      : 'Delete User'
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
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
            <div className="p-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>Page {page}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl py-1.5 px-3 text-xs disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={users.length < 20}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl py-1.5 px-3 text-xs disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* VIP Management Modal */}
        {vipModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Crown className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-slate-900">Set VIP: {vipModalUser.username}</h2>
                    <p className="text-[11px] text-slate-500">{vipModalUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setVipModalUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600">
                  ជ្រើសរើសរយៈពេល VIP ដែលចង់ផ្ដល់ឱ្យអ្នកប្រើប្រាស់នេះ៖
                </p>

                {/* VIP tier buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleSetVip(vipModalUser, 'pro')}
                    disabled={saving}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Pro · $2/month</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-semibold">30 Days</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">ទស្សនាគ្រប់ភាគ · មិនអាចទាញយក</span>
                  </button>

                  <button
                    onClick={() => handleSetVip(vipModalUser, 'plus')}
                    disabled={saving}
                    className="p-3.5 rounded-2xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">Plus · $3/month</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-semibold">30 Days</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 block mt-1">ទាញយកក្រៅបណ្ដាញបាន ១០ ភាគ</span>
                  </button>

                  <button
                    onClick={() => handleSetVip(vipModalUser, 'premium')}
                    disabled={saving}
                    className="p-3.5 rounded-2xl bg-amber-50/60 hover:bg-amber-50 border border-amber-200 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">Premium · $5/month</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-semibold">30 Days</span>
                    </div>
                    <span className="text-[10px] text-amber-700 block mt-1">ទាញយកមិនកំណត់</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleSetVip(vipModalUser, 'lifetime')}
                    disabled={saving}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Crown className="w-4 h-4 fill-amber-500 text-amber-600" /> ផ្ដល់សិទ្ធិ VIP ពេញមួយជីវិត (Lifetime VIP)
                  </button>
                </div>

                {/* Revoke VIP Option */}
                {vipModalUser.is_vip && (
                  <div className="pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleSetVip(vipModalUser, 'revoke')}
                      disabled={saving}
                      className="w-full py-2 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <UserX className="w-4 h-4" /> ដកសិទ្ធិ VIP ចេញ (Revoke VIP)
                    </button>
                  </div>
                )}

                {error && <p className="text-rose-600 text-xs">{error}</p>}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setVipModalUser(null)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
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
        {editUser && (
          <EditRoleModal
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
          />
        )}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden cursor-default"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">សិទ្ធិទស្សនាភាពយន្ត (Movie Access)</h2>
              <p className="text-xs text-slate-500">
                សម្រាប់គណនី: <strong className="text-slate-900">{user.username}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Currently Unlocked Movies List */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
              ភាពយន្តដែលបានបើកសិទ្ធិរួច ({unlockedList.length})៖
            </label>
            {unlockedList.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
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
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{title}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{slug}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleAccess(user, slug, 'lock')}
                        disabled={saving}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition flex items-center gap-1 shrink-0 cursor-pointer"
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
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
              ជ្រើសរើស Movie ដើម្បីបើកសិទ្ធិ (Unlock New Movie)៖
            </label>

            <div className="space-y-2">
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className={`${INPUT_CLASS} font-medium`}
              >
                <option value="">-- សូមជ្រើសរើសភាពយន្ត (Select Movie) --</option>
                {movies.map((m) => (
                  <option key={m.id || m.slug} value={m.slug} disabled={unlockedList.includes(m.slug)}>
                    {m.title} {unlockedList.includes(m.slug) ? '(បានបើករួច)' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={handleUnlock}
                disabled={!selectedSlug || saving}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Check className="w-4 h-4" /> {saving ? 'កំពុងដំណើរការ...' : 'បើកសិទ្ធិទស្សនា (Unlock Movie)'}
              </button>
            </div>
          </div>

          {error && <p className="text-rose-600 text-xs">{error}</p>}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
          >
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden cursor-default"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            {isEditingOwner ? (
              <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
            ) : (
              <Shield className="w-5 h-5 text-blue-600" />
            )}
            <h2 className="font-display font-bold text-base text-slate-900">Edit User: {editUser.username}</h2>
          </div>
          <button
            onClick={() => setEditUser(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {isEditingOwner && !isCurrentOwner && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>គណនី OWNER ត្រូវបានការពារដាច់ខាត Admin ធម្មតាមិនអាចកែប្រែបានឡើយ។</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Role (តួនាទីគណនី)</label>
            <select
              value={editRole}
              disabled={!canModifyThisUser || (isEditingOwner && !isCurrentOwner)}
              onChange={(e) => setEditRole(e.target.value as any)}
              className={`${INPUT_CLASS} font-medium`}
            >
              {isCurrentOwner && (
                <option value="OWNER">Platform Owner (OWNER - ម្ចាស់វេបសាយ)</option>
              )}
              <option value="ADMIN">Platform Administrator (ADMIN - អ្នកគ្រប់គ្រង)</option>
              <option value="STAFF">Staff (STAFF - គ្រប់គ្រងរឿង និងភាគ)</option>
              <option value="USER">Standard User (USER - សមាជិកទូទៅ)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Status (ស្ថានភាពគណនី)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canModifyThisUser || isEditingOwner}
                onClick={() => setEditActive(true)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  editActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Active (ដំណើរការ)
              </button>
              <button
                type="button"
                disabled={!canModifyThisUser || isEditingOwner}
                onClick={() => setEditActive(false)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  !editActive
                    ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                } ${isEditingOwner ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <UserX className="w-4 h-4" /> Disabled (បិទ)
              </button>
            </div>
            {isEditingOwner && (
              <p className="text-[10px] text-amber-700 mt-1.5 flex items-center gap-1">
                <Shield className="w-3 h-3" /> គណនី OWNER មិនអាចបិទ (Disable) បានឡើយ
              </p>
            )}
          </div>
          {error && <p className="text-rose-600 text-xs">{error}</p>}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={saveEdit}
              disabled={saving || (!isCurrentOwner && isEditingOwner)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes (រក្សាទុក)'}
            </button>
            <button
              onClick={() => setEditUser(null)}
              className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancel (បោះបង់)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
