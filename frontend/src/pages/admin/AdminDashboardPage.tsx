import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Film, Play, Eye, TrendingUp, UserCheck, Zap,
  ArrowUpRight, Flame, Clock, Lock, Unlock, RotateCcw,
  Globe, Smartphone, Bot, Tv,
  ShieldCheck, Layers, ChevronRight, CheckCircle2,
  Bell, Settings2, Save, UserX, Search, CheckSquare, Square, X, Shield, Check, Crown
} from 'lucide-react';

import { AdminLayout } from './AdminLayout';
import { SkeletonCard } from '../../components/common/SkeletonLoader';
import { useAuthStore } from '../../store/authStore';
import { usePromoStore } from '../../store/promoStore';
import { useSystemUpdateStore } from '../../store/systemUpdateStore';
import api from '../../services/api';
import type { AdminStats, Anime, User } from '../../types';

export function AdminDashboardPage() {
  const { isStaff, isAdmin, isOwner } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [topTitles, setTopTitles] = useState<Anime[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPromo, setIsUpdatingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState<number>(7);

  const { promoData, fetchPromoCountdown, updatePromoCountdown } = usePromoStore();
  const {
    config: updateConfig,
    fetchStatus: fetchUpdateStatus,
    updateStatus: updateSystemUpdate,
    previewModal: previewUpdateModal,
    isLoading: isUpdatingSystemStatus
  } = useSystemUpdateStore();

  const [showEditUpdateModal, setShowEditUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    title: '',
    version: '',
    message: '',
    eta: '',
    allow_dismiss: true,
    telegram_link: '',
  });
  const [updateNoticeMsg, setUpdateNoticeMsg] = useState<string | null>(null);

  // ── Block Specific Users Feature ──
  const [showBlockUsersModal, setShowBlockUsersModal] = useState(false);
  const [modalUsers, setModalUsers] = useState<User[]>([]);
  const [isModalUsersLoading, setIsModalUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [userFilterTab, setUserFilterTab] = useState<'all' | 'blocked' | 'active'>('all');
  const [blockActionMsg, setBlockActionMsg] = useState<string | null>(null);
  const [isBlockingAction, setIsBlockingAction] = useState(false);

  const fetchModalUsers = async () => {
    setIsModalUsersLoading(true);
    try {
      const res = await api.get('/admin/users?per_page=100');
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setModalUsers(items);
    } catch {
      // ignore
    } finally {
      setIsModalUsersLoading(false);
    }
  };

  const handleToggleBlockSingleUser = async (u: User) => {
    setIsBlockingAction(true);
    const newActiveState = !u.is_active;
    try {
      await api.put(`/admin/users/${u.id}`, { is_active: newActiveState });
      setModalUsers((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, is_active: newActiveState } : item))
      );
      setBlockActionMsg(
        newActiveState
          ? `✅ បានដោះសោរ (Unblock) ជូន ${u.username} ជោគជ័យ!`
          : `🔒 បានចាក់សោរបិទ (Block) ${u.username} ជោគជ័យ!`
      );
      setTimeout(() => setBlockActionMsg(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update user status');
    } finally {
      setIsBlockingAction(false);
    }
  };

  const handleBatchBlockSelected = async (block: boolean) => {
    if (selectedUserIds.size === 0) return;
    setIsBlockingAction(true);
    const ids = Array.from(selectedUserIds);
    try {
      for (const id of ids) {
        const u = modalUsers.find((x) => x.id === id);
        if (!u || u.role === 'OWNER') continue;
        await api.put(`/admin/users/${id}`, { is_active: !block });
      }
      setModalUsers((prev) =>
        prev.map((u) => (selectedUserIds.has(u.id) && u.role !== 'OWNER' ? { ...u, is_active: !block } : u))
      );
      const count = selectedUserIds.size;
      setSelectedUserIds(new Set());
      setBlockActionMsg(
        block
          ? `🔒 បានចាក់សោរបិទ User ចំនួន ${count} នាក់ជោគជ័យ!`
          : `✅ បានដោះសោរ User ចំនួន ${count} នាក់ជោគជ័យ!`
      );
      setTimeout(() => setBlockActionMsg(null), 3500);
    } catch {
      alert('Failed to perform batch action');
    } finally {
      setIsBlockingAction(false);
    }
  };

  const handleToggleSelectUser = (id: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetchUpdateStatus();
  }, []);

  useEffect(() => {
    if (updateConfig) {
      setUpdateForm({
        title: updateConfig.title || '🚀 Website កំពុង Update ជំនាន់ថ្មី',
        version: updateConfig.version || 'v2.5.0 Update',
        message: updateConfig.message || 'យើងខ្ញុំកំពុងធ្វើការអាប់ដេតប្រព័ន្ធ និងបន្ថែមមុខងារថ្មីៗ...',
        eta: updateConfig.eta || 'នឹងរួចរាល់ក្នុងពេលឆាប់ៗនេះ',
        allow_dismiss: updateConfig.allow_dismiss ?? true,
        telegram_link: updateConfig.telegram_link || 'https://t.me/namianime_channel',
      });
    }
  }, [updateConfig]);

  const handleToggleSystemMode = async (mode: 'open' | 'vip_only' | 'closed') => {
    try {
      if (mode === 'open') {
        await updateSystemUpdate({ enabled: false, allow_vip: false });
        setUpdateNoticeMsg('✅ បានបើក Website អោយមនុស្សគ្រប់គ្នាចូលទស្សនាធម្មតា');
      } else if (mode === 'vip_only') {
        await updateSystemUpdate({ enabled: true, allow_vip: true });
        setUpdateNoticeMsg('👑 បានកំណត់ Website អោយតែសមាជិក VIP ប៉ុណ្ណោះចូលទស្សនាបាន');
      } else {
        await updateSystemUpdate({ enabled: true, allow_vip: false });
        setUpdateNoticeMsg('🔒 បានបិទ Website ទាំងស្រុង (សម្រាប់តែ Admin/Owner កំពុង Update)');
      }
      setTimeout(() => setUpdateNoticeMsg(null), 3500);
    } catch {
      alert('Failed to update system mode');
    }
  };

  const handleSaveUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSystemUpdate(updateForm);
      setShowEditUpdateModal(false);
      setUpdateNoticeMsg('✅ បានរក្សាទុកការកែប្រែព័ត៌មាន Update ជោគជ័យ');
      setTimeout(() => setUpdateNoticeMsg(null), 3500);
    } catch {
      alert('Failed to save update details');
    }
  };

  const loadData = () => {
    if (isAdmin) {
      fetchPromoCountdown();
    }
    setIsLoading(true);
    const promises: Promise<any>[] = [
      api.get('/admin/stats').catch(() => ({ data: null })),
      api.get('/schedule/top-rank?limit=5').catch(() => ({ data: [] })),
    ];
    if (isAdmin) {
      promises.push(api.get('/admin/users?per_page=5').catch(() => ({ data: { items: [] } })));
    }
    Promise.all(promises).then(([statsRes, rankRes, usersRes]) => {
      if (statsRes?.data) setStats(statsRes.data);
      setTopTitles(Array.isArray(rankRes?.data) ? rankRes.data : rankRes?.data?.items || []);
      if (usersRes?.data) {
        setRecentUsers(Array.isArray(usersRes?.data) ? usersRes.data : usersRes?.data?.items || []);
      }
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const handleSetDays = async (days: number) => {
    if (days <= 0) return;
    try {
      setIsUpdatingPromo(true);
      await updatePromoCountdown({ custom_days: days });
      setPromoMessage(`បានកំណត់ Promo ${days} ថ្ងៃជោគជ័យ`);
      setTimeout(() => setPromoMessage(null), 3000);
    } catch {
      alert('Failed to set promo days');
    } finally {
      setIsUpdatingPromo(false);
    }
  };

  const handleToggleForceLock = async (forceLock: boolean) => {
    try {
      setIsUpdatingPromo(true);
      await updatePromoCountdown({ force_vip_lock: forceLock });
      setPromoMessage(forceLock ? 'បានចាក់សោរ VIP រាល់រឿងទាំងអស់' : 'បានដោះសោរឱ្យមើល Free វិញ');
      setTimeout(() => setPromoMessage(null), 3000);
    } catch {
      alert('Failed to update VIP lock status');
    } finally {
      setIsUpdatingPromo(false);
    }
  };

  return (
    <AdminLayout title="ផ្ទាំងគ្រប់គ្រងទូទៅ (Dashboard)">
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── 1. Top Header Bar (Calm & Informative) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  {isStaff ? 'Staff Content Management' : 'NAMI ANIME Control Center'}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                  Online
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                FastAPI Gateway · Cloud Stream Engine · SQLite Live DB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isOwner && (
              <Link
                to="/admin/owner"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-semibold transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Owner Portal</span>
              </Link>
            )}

            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── 2. Primary Metrics Row (Organized 6 Grid Cards) ── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              ទិន្នន័យសរុប (Overall Metrics)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {isLoading ? (
              <SkeletonCard count={6} />
            ) : (
              [
                {
                  label: 'Total Views',
                  val: stats?.total_views ?? 0,
                  icon: Eye,
                  color: 'text-amber-400',
                  bg: 'bg-amber-500/10',
                  trend: '+12%',
                },
                {
                  label: 'Donghua',
                  val: stats?.total_donghua ?? 0,
                  icon: Zap,
                  color: 'text-red-400',
                  bg: 'bg-red-500/10',
                },
                {
                  label: 'Anime',
                  val: stats?.total_anime ?? 0,
                  icon: Film,
                  color: 'text-cyan-400',
                  bg: 'bg-cyan-500/10',
                },
                {
                  label: 'Episodes',
                  val: stats?.total_episodes ?? 0,
                  icon: Play,
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-500/10',
                },
                {
                  label: 'Total Members',
                  val: stats?.total_users ?? 0,
                  icon: Users,
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                  trend: '+5%',
                },
                {
                  label: 'Active Users',
                  val: stats?.active_users ?? 0,
                  icon: UserCheck,
                  color: 'text-purple-400',
                  bg: 'bg-purple-500/10',
                },
              ].map((item, i) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.07] hover:border-white/15 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center ${item.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      {item.trend && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" /> {item.trend}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                      <p className="text-lg sm:text-xl font-bold text-white mt-0.5 tracking-tight font-display">
                        {item.val.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 3. The 3 Systems Hub (Neat & Clean Management Columns) ── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              ប្រព័ន្ធគ្រប់គ្រងទាំង ៣ (Management Ecosystem)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* System 1: Website & Content */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                    Option 1
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">គ្រប់គ្រងវេបសាយ (Website)</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  គ្រប់គ្រងរឿង Donghua, Anime, Drama, Movies និងការបង្ហោះភាគវីដេអូ។
                </p>

                {/* Quick Action Links */}
                <div className="grid grid-cols-2 gap-1.5 mt-4 pt-3 border-t border-white/[0.06]">
                  <Link
                    to="/admin/donghua"
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 text-red-400" /> Donghua
                  </Link>
                  <Link
                    to="/admin/anime"
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Film className="w-3 h-3 text-cyan-400" /> Anime
                  </Link>
                  <Link
                    to="/admin/drama"
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Tv className="w-3 h-3 text-pink-400" /> Drama
                  </Link>
                  <Link
                    to="/admin/episodes"
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Layers className="w-3 h-3 text-emerald-400" /> Episodes
                  </Link>
                </div>
              </div>

              <Link
                to="/admin/donghua"
                className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
              >
                <span>បើកមើលផ្ទាំងគ្រប់គ្រងរឿង</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* System 2: Mobile App (APK) */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                    Option 2
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">គ្រប់គ្រង APP ទូរសព្ទ (APK)</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  ពិនិត្យកំណែ Version v1.5, Push Notifications និងបង្កើត QR Download។
                </p>

                {/* Quick Action Links */}
                <div className="grid grid-cols-2 gap-1.5 mt-4 pt-3 border-t border-white/[0.06]">
                  <Link
                    to="/admin/mobile/push"
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Bell className="w-3 h-3 text-amber-400" /> Push Notify
                  </Link>
                  <Link
                    to="/admin/mobile/build"
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Smartphone className="w-3 h-3 text-amber-400" /> APK Build
                  </Link>
                </div>
              </div>

              <Link
                to="/admin/mobile"
                className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>បើកមើលផ្ទាំង Mobile App</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* System 3: Telegram Mini App */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                    Option 3
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">Telegram Mini App</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Bot Status, Broadcast Messages ទៅកាន់ Subscriber និងគ្រប់គ្រង Telegram Users។
                </p>

                {/* Quick Action Links */}
                <div className="grid grid-cols-2 gap-1.5 mt-4 pt-3 border-t border-white/[0.06]">
                  <Link
                    to="/admin/telegram/broadcast"
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Bot className="w-3 h-3 text-sky-400" /> Broadcast
                  </Link>
                  <Link
                    to="/admin/telegram/users"
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Users className="w-3 h-3 text-sky-400" /> TG Users
                  </Link>
                </div>
              </div>

              <Link
                to="/admin/telegram"
                className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
              >
                <span>បើកមើល Telegram Control</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>

        {/* ── 4. Website Maintenance & Lock Mode (🚧 បិទ Website ពេល Develop / Update ជំនាន់ថ្មី) ── */}
        {isAdmin && (
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-2xl relative overflow-hidden space-y-4 transition-all ${
            updateConfig.enabled
              ? 'bg-gradient-to-br from-[#1a0f12] via-[#120a0d] to-[#0a0d14] border-red-500/50 shadow-red-950/40'
              : 'bg-gradient-to-br from-[#121624] to-[#0a0d14] border-white/10'
          }`}>
            {/* Top decorative accent glow */}
            <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
              updateConfig.enabled ? 'bg-red-600/25' : 'bg-blue-600/10'
            }`} />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-lg ${
                    updateConfig.enabled
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {updateConfig.enabled ? (
                      <Lock className="w-6 h-6 animate-pulse" />
                    ) : (
                      <Unlock className="w-6 h-6" />
                    )}
                  </div>
                  {updateConfig.enabled && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-[#0a0d14] rounded-full animate-ping" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                      🚧 បិទ Website ពេលកំពុង Develop / Update
                    </h3>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                      !updateConfig.enabled
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : updateConfig.allow_vip
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm shadow-red-500/20 animate-pulse'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        !updateConfig.enabled
                          ? 'bg-emerald-400'
                          : updateConfig.allow_vip
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-red-400 animate-ping'
                      }`} />
                      {!updateConfig.enabled
                        ? '🌐 Website កំពុងបើកធម្មតា (Online)'
                        : updateConfig.allow_vip
                        ? '👑 បើកអោយតែសមាជិក VIP (VIP Only Mode)'
                        : '🔒 បានបិទ Website ទាំងស្រុង (Lock for Update)'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed max-w-2xl">
                    Admin អាចជ្រើសរើសបើក Website ទៅកាន់មនុស្សគ្រប់គ្នា, បើកអោយតែសមាជិក VIP, ឬបិទទាំងស្រុងពេលកំពុង Develop/Update បានតាមចិត្ត!
                  </p>
                </div>
              </div>

              {/* Action Buttons: 3 Modes, Preview & Edit */}
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
                {/* 3-Mode Access Controls */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
                  {/* Mode 1: Public Online */}
                  <button
                    onClick={() => handleToggleSystemMode('open')}
                    disabled={isUpdatingSystemStatus}
                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      !updateConfig.enabled
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>🌐 បើកទូទៅ (Public)</span>
                  </button>

                  {/* Mode 2: VIP Members Only */}
                  <button
                    onClick={() => handleToggleSystemMode('vip_only')}
                    disabled={isUpdatingSystemStatus}
                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      updateConfig.enabled && updateConfig.allow_vip
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/30 border border-amber-300'
                        : 'text-amber-400 hover:bg-amber-500/10'
                    }`}
                    title="បើកឱ្យតែសមាជិក VIP ចូលទស្សនាបានប៉ុណ្ណោះ"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>👑 បើកតែ VIP</span>
                  </button>

                  {/* Mode 3: Locked All */}
                  <button
                    onClick={() => handleToggleSystemMode('closed')}
                    disabled={isUpdatingSystemStatus}
                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      updateConfig.enabled && !updateConfig.allow_vip
                        ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="បិទ Website ទាំងស្រុង"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>🔒 បិទទាំងអស់</span>
                  </button>
                </div>

                {/* Live Preview Button */}
                <button
                  onClick={previewUpdateModal}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="មើលផ្ទាំងគំរូជាក់ស្ដែង"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>មើលគំរូផ្ទាំង (Preview)</span>
                </button>

                {/* Edit Settings Button */}
                <button
                  onClick={() => setShowEditUpdateModal(!showEditUpdateModal)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200 border border-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{showEditUpdateModal ? 'បិទការកែប្រែ' : 'កែប្រែអក្សរ'}</span>
                </button>

                {/* Select & Block Specific Users Button */}
                <button
                  onClick={() => {
                    setShowBlockUsersModal(true);
                    fetchModalUsers();
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-red-600/30 to-rose-700/30 hover:from-red-600/40 hover:to-rose-700/40 text-red-300 hover:text-red-200 border border-red-500/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg shadow-red-500/10"
                  title="ជ្រើសរើសបុគ្គលជាក់លាក់ដើម្បីបិទ ឬចាក់សោរ"
                >
                  <UserX className="w-4 h-4 text-red-400" />
                  <span>🚫 Select បិទទៅលើបុគ្គល</span>
                </button>
              </div>
            </div>

            {/* Quick Status / Details summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">ចំណងជើងផ្ទាំង (Title):</span>
                <p className="text-white font-bold mt-0.5 truncate">{updateConfig.title || '—'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">កំណែអាប់ដេត (Version / ETA):</span>
                <p className="text-amber-300 font-bold mt-0.5 truncate">
                  {updateConfig.version} {updateConfig.eta ? `(${updateConfig.eta})` : ''}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">សិទ្ធិចូលទស្សនា (Status):</span>
                <p className={`font-bold mt-0.5 ${
                  !updateConfig.enabled ? 'text-emerald-400' : updateConfig.allow_vip ? 'text-amber-300' : 'text-red-400'
                }`}>
                  {!updateConfig.enabled
                    ? '🌐 បើកអោយមនុស្សគ្រប់គ្នាចូលទស្សនាធម្មតា'
                    : updateConfig.allow_vip
                    ? '👑 បើកអោយតែសមាជិក VIP ចូលទស្សនា'
                    : '🔒 កំពុងចាក់សោរបិទ Website ទាំងស្រុង'}
                </p>
              </div>
            </div>

            {/* Notification alert toast */}
            {updateNoticeMsg && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 rounded-xl animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{updateNoticeMsg}</span>
              </div>
            )}

            {/* Inline Customizer Drawer Form */}
            {showEditUpdateModal && (
              <form onSubmit={handleSaveUpdateDetails} className="mt-4 pt-4 border-t border-white/[0.08] space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" /> កំណត់ពាក្យពេចន៍ និងព័ត៌មានលើផ្ទាំង Announcement
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                      ចំណងជើងធំ (Modal Title)
                    </label>
                    <input
                      type="text"
                      value={updateForm.title}
                      onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                      placeholder="🚀 Website កំពុង Update ជំនាន់ថ្មី"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                      កំណែ Version (Version Tag)
                    </label>
                    <input
                      type="text"
                      value={updateForm.version}
                      onChange={(e) => setUpdateForm({ ...updateForm, version: e.target.value })}
                      placeholder="v2.5.0 Update"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                      ខ្លឹមសាររៀបរាប់ (Message Details)
                    </label>
                    <textarea
                      rows={2}
                      value={updateForm.message}
                      onChange={(e) => setUpdateForm({ ...updateForm, message: e.target.value })}
                      placeholder="យើងខ្ញុំកំពុងធ្វើការអាប់ដេតប្រព័ន្ធ និងបន្ថែមមុខងារថ្មីៗ..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                      ពេលវេលារំពឹងទុក (Estimated Time / ETA)
                    </label>
                    <input
                      type="text"
                      value={updateForm.eta}
                      onChange={(e) => setUpdateForm({ ...updateForm, eta: e.target.value })}
                      placeholder="នឹងរួចរាល់ក្នុងពេលឆាប់ៗនេះ"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                      Link ឆានែល Telegram
                    </label>
                    <input
                      type="url"
                      value={updateForm.telegram_link}
                      onChange={(e) => setUpdateForm({ ...updateForm, telegram_link: e.target.value })}
                      placeholder="https://t.me/namianime_channel"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-200">
                    <input
                      type="checkbox"
                      checked={updateForm.allow_dismiss}
                      onChange={(e) => setUpdateForm({ ...updateForm, allow_dismiss: e.target.checked })}
                      className="w-4 h-4 rounded text-red-600 bg-black/40 border-white/20 focus:ring-0 cursor-pointer"
                    />
                    <span>អនុញ្ញាតឱ្យអ្នកទស្សនាចុច "យល់ព្រម" ដើម្បីបន្តចូលទស្សនា</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEditUpdateModal(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white bg-white/5 transition-all cursor-pointer"
                    >
                      បោះបង់
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingSystemStatus}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 text-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isUpdatingSystemStatus ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកែប្រែ'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── 5. Promo & Auto VIP Lockdown (Clean & Restrained Control Card) ── */}
        {isAdmin && (
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-amber-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    ⏱️ Promo Countdown & VIP Lock
                  </h3>
                  <p className="text-xs text-gray-400">
                    កំណត់ថ្ងៃទស្សនាឥតគិតថ្លៃ — ពេលផុតកំណត់ រឿងទាំងអស់នឹងជាប់ VIP ដោយស្វ័យប្រវត្តិ។
                  </p>
                </div>
              </div>

              {/* Status Badge & Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                {promoData && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                    promoData.is_vip_locked || promoData.is_expired
                      ? 'bg-red-500/15 text-red-300 border-red-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-mono'
                  }`}>
                    {promoData.is_vip_locked || promoData.is_expired ? (
                      <>
                        <Lock className="w-3.5 h-3.5" /> VIP LOCKED
                      </>
                    ) : (
                      <>
                        ⏳ {promoData.days}d {promoData.hours}h {promoData.minutes}m
                      </>
                    )}
                  </span>
                )}

                {promoData?.force_vip_lock || promoData?.is_expired ? (
                  <button
                    onClick={() => handleToggleForceLock(false)}
                    disabled={isUpdatingPromo}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" /> ដោះសោរ Free
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleForceLock(true)}
                    disabled={isUpdatingPromo}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" /> ចាក់សោរ VIP
                  </button>
                )}
              </div>
            </div>

            {/* Presets & Input */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-400 mr-1">កំណត់ថ្ងៃរហ័ស៖</span>
                {[
                  { label: '3 ថ្ងៃ', days: 3 },
                  { label: '7 ថ្ងៃ', days: 7 },
                  { label: '15 ថ្ងៃ', days: 15 },
                  { label: '30 ថ្ងៃ', days: 30 },
                  { label: '1 ឆ្នាំ', days: 365 },
                ].map((p) => (
                  <button
                    key={p.days}
                    onClick={() => handleSetDays(p.days)}
                    disabled={isUpdatingPromo}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-gray-300 hover:text-white font-medium transition-all active:scale-95 cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSetDays(Number(customDays));
                }}
                className="flex items-center gap-2"
              >
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1">
                  <span className="text-xs text-gray-400">ថ្ងៃ៖</span>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-transparent text-amber-300 font-bold text-xs focus:outline-none text-center"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingPromo}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  {isUpdatingPromo ? '...' : 'កំណត់'}
                </button>
              </form>
            </div>

            {promoMessage && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{promoMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* ── 5. Activity Tables (Top Ranked & Recent Members) ── */}
        <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-4`}>
          
          {/* Top Titles */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" /> Top Ranked Donghua & Anime
              </h3>
              <Link to="/admin/donghua" className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {(Array.isArray(topTitles) ? topTitles : []).map((title, i) => (
                <div
                  key={title.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      i === 0 ? 'bg-amber-500 text-black' :
                      i === 1 ? 'bg-gray-300 text-black' :
                      i === 2 ? 'bg-amber-700 text-white' :
                      'bg-white/10 text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                    <img
                      src={title.poster_url || '/placeholder.png'}
                      alt=""
                      className="w-7 h-9 object-cover rounded-md shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{title.title}</p>
                      <p className="text-[10px] text-gray-400">{((title as any).views ?? title.view_count ?? 0).toLocaleString()} views</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-400 shrink-0 ml-2">
                    {title.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Users */}
          {isAdmin && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" /> Recent Members
                </h3>
                <Link to="/admin/users" className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                  Manage users <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {(Array.isArray(recentUsers) ? recentUsers : []).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-500/15 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{u.username}</p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {u.phone_number || u.email || 'Member'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-300">
                        {u.role}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        u.is_vip ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                      }`}>
                        {u.is_vip ? 'VIP' : 'FREE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ── 🚫 SELECT & BLOCK SPECIFIC USERS MODAL ── */}
      {showBlockUsersModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="max-w-2xl w-full bg-[#11070c] border border-red-500/30 rounded-3xl shadow-[0_0_60px_rgba(239,68,68,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-950/40 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    🚫 Select បុគ្គលដែលចង់បិទ / ចាក់សោរ
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Select ជ្រើសរើសបុគ្គលជាក់លាក់ដើម្បីបិទមិនឱ្យចូល Website (User ដទៃចូលមើលបានធម្មតា)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBlockUsersModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Toast in Modal */}
            {blockActionMsg && (
              <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{blockActionMsg}</span>
              </div>
            )}

            {/* Search and Filter Tabs */}
            <div className="p-4 border-b border-white/10 space-y-3 bg-white/[0.01]">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="ស្វែងរកតាម Username, Email, Phone, Telegram..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-black/40 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                  <button
                    onClick={() => setUserFilterTab('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilterTab === 'all' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    ទាំងអស់ ({modalUsers.length})
                  </button>
                  <button
                    onClick={() => setUserFilterTab('blocked')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      userFilterTab === 'blocked' ? 'bg-red-500/25 text-red-300 border border-red-500/40' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🔴 បានបិទ ({modalUsers.filter((u) => !u.is_active).length})
                  </button>
                  <button
                    onClick={() => setUserFilterTab('active')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      userFilterTab === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🟢 ធម្មតា ({modalUsers.filter((u) => u.is_active).length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const filtered = modalUsers.filter((u) => {
                        const q = userSearchTerm.toLowerCase().trim();
                        const matchQ = !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                        if (!matchQ) return false;
                        if (userFilterTab === 'blocked') return !u.is_active;
                        if (userFilterTab === 'active') return u.is_active;
                        return true;
                      });
                      setSelectedUserIds(new Set(filtered.filter((u) => u.role !== 'OWNER').map((u) => u.id)));
                    }}
                    className="text-[11px] text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-gray-600">·</span>
                  <button
                    onClick={() => setSelectedUserIds(new Set())}
                    className="text-[11px] text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    Clear Select
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Action Bar when users are selected */}
            {selectedUserIds.size > 0 && (
              <div className="px-4 py-2.5 bg-red-950/50 border-b border-red-500/30 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
                <span className="font-bold text-red-200 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-red-400" />
                  បាន Select {selectedUserIds.size} នាក់
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBatchBlockSelected(true)}
                    disabled={isBlockingAction}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1 shadow-md cursor-pointer active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>🔒 បិទអ្នកដែលបាន Select</span>
                  </button>
                  <button
                    onClick={() => handleBatchBlockSelected(false)}
                    disabled={isBlockingAction}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-md cursor-pointer active:scale-95"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>🔓 បើកវិញ</span>
                  </button>
                </div>
              </div>
            )}

            {/* Users List Body */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-white/5">
              {isModalUsersLoading ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  កំពុងទាញយកបញ្ជី User...
                </div>
              ) : (() => {
                const filtered = modalUsers.filter((u) => {
                  const q = userSearchTerm.toLowerCase().trim();
                  const matchQ = !q ||
                    u.username.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    (u.phone_number && u.phone_number.includes(q)) ||
                    (u.telegram_username && u.telegram_username.toLowerCase().includes(q)) ||
                    String(u.id) === q;
                  if (!matchQ) return false;
                  if (userFilterTab === 'blocked') return !u.is_active;
                  if (userFilterTab === 'active') return u.is_active;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-gray-500 text-xs">
                      រកមិនឃើញ User តាមការស្វែងរកនេះឡើយ
                    </div>
                  );
                }

                return filtered.map((u) => {
                  const isSelected = selectedUserIds.has(u.id);
                  const isOwnerAccount = u.role === 'OWNER';
                  const isBlocked = !u.is_active;

                  return (
                    <div
                      key={u.id}
                      className={`pt-2 flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                        isBlocked
                          ? 'bg-red-950/20 border border-red-500/25'
                          : isSelected
                          ? 'bg-white/10 border border-white/20'
                          : 'hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      {/* Checkbox and User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {!isOwnerAccount ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSelectUser(u.id)}
                            className="text-gray-400 hover:text-white cursor-pointer shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-red-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        ) : (
                          <span title="Owner account protected">
                            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                          </span>
                        )}

                        <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                          isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
                        }`}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{u.username}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                              {u.role}
                            </span>
                            {isBlocked ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                🔒 បានបិទ
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                                🟢 ធម្មតា
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">
                            {u.email || u.phone_number || (u.telegram_username ? `@${u.telegram_username}` : 'No contact')}
                          </p>
                        </div>
                      </div>

                      {/* Action Toggle Button */}
                      <div className="shrink-0 ml-2">
                        {isOwnerAccount ? (
                          <span className="text-[10px] text-amber-400 font-bold px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            🛡️ ម្ចាស់វេបសាយ
                          </span>
                        ) : isBlocked ? (
                          <button
                            onClick={() => handleToggleBlockSingleUser(u)}
                            disabled={isBlockingAction}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>🔓 បើកវិញ</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleBlockSingleUser(u)}
                            disabled={isBlockingAction}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>🔒 ចុចបិទ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-gray-400">
              <span>
                🔒 ពេលចុចបិទ User៖ គណនី និងឧបករណ៍របស់បុគ្គលនោះ នឹងត្រូវចាក់សោរមិនអាចចូល Website បានឡើយ។
              </span>
              <button
                onClick={() => setShowBlockUsersModal(false)}
                className="btn-secondary text-xs py-1.5 px-4 cursor-pointer"
              >
                រួចរាល់
              </button>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
}
