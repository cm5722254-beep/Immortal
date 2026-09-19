import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, Search, User as UserIcon, Shield, Crown,
  LogOut, Bookmark, Clock, Film,
  ChevronDown, ChevronRight, CheckCheck, X, Send, Flame
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { Logo } from './Logo';
import api from '../../services/api';

interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  link: string;
  avatarUrl?: string;
  tag?: string;
  category?: string;
}

const NAV_LINKS = [
  { to: '/', label: 'ទំព័រដើម' },
  { to: '/donghua', label: 'រឿងចិន' },
  { to: '/anime', label: 'រឿងជប៉ុន' },
  { to: '/movies', label: 'ភាពយន្តដុំ' },
  { to: '/drama', label: 'រឿងភាគ' },
  { to: '/explore', label: 'រុករក' },
];

export function Navbar() {
  const { user, isAuthenticated, isStaff, isOwner, isAdmin, canManageContent, logout } = useAuthStore();
  const isOwnerUser = isOwner || user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  const isAdminUser = isOwnerUser || isAdmin || user?.role === 'ADMIN';
  const isStaffUser = isStaff || user?.role === 'STAFF';
  const canManage = canManageContent || isAdminUser || isStaffUser;
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'episode' | 'vip' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mer_read_notifs') || '[]');
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getPageTitle = (pathname: string) => {
    if (pathname === '/') return 'ទំព័រដើម';
    if (pathname.startsWith('/donghua')) return 'រឿងចិន 3D';
    if (pathname.startsWith('/anime')) return 'រឿងជប៉ុន';
    if (pathname.startsWith('/drama')) return 'រឿងភាគ';
    if (pathname.startsWith('/movies')) return 'ភាពយន្តដុំ';
    if (pathname.startsWith('/explore')) return 'រុករក';
    if (pathname.startsWith('/search')) return 'ស្វែងរក';
    if (pathname.startsWith('/favorites')) return 'បញ្ជីរក្សាទុក';
    if (pathname.startsWith('/history')) return 'ប្រវត្តិទស្សនា';
    if (pathname.startsWith('/downloads')) return 'ទាញយក';
    if (pathname.startsWith('/vip')) return 'សមាជិក VIP';
    if (pathname.startsWith('/profile')) return 'គណនី';
    return 'ទំព័រដើម';
  };

  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    api.get('/notifications')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setNotifications(res.data);
        }
      })
      .catch(() => {});

    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !readNotifIds.includes(n.id)).length;
  const episodeCount = notifications.filter((n) => n.icon === 'episode' || n.category === 'episode').length;
  const systemCount = notifications.filter((n) => n.icon === 'vip' || n.icon === 'system' || n.category === 'vip' || n.category === 'system').length;

  const filteredNotifications = notifications.filter((n) => {
    const isUnread = !readNotifIds.includes(n.id);
    if (notifTab === 'unread') return isUnread;
    if (notifTab === 'episode') return n.icon === 'episode' || n.category === 'episode';
    if (notifTab === 'vip') return n.icon === 'vip' || n.icon === 'system' || n.category === 'vip' || n.category === 'system';
    return true;
  });

  const handleNotifClick = (n: NotificationItem) => {
    if (!readNotifIds.includes(n.id)) {
      const updated = [...readNotifIds, n.id];
      setReadNotifIds(updated);
      localStorage.setItem('mer_read_notifs', JSON.stringify(updated));
    }
    setIsNotifOpen(false);
    if (n.link.startsWith('http')) {
      window.open(n.link, '_blank');
    } else {
      navigate(n.link);
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem('mer_read_notifs', JSON.stringify(allIds));
    setIsNotifOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 🌐 NETFLIX CINEMA NAVBAR (Transparent at Top, Solid on Scroll)
  // ─────────────────────────────────────────────────────────────
  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-500 select-none ${
      isScrolled
        ? 'bg-[#141414]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-lg shadow-black/60'
        : 'bg-gradient-to-b from-[#141414]/95 via-[#141414]/60 to-transparent border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">

        {/* ── Left Brand / Logo & Navigation ── */}
        <div className="flex items-center gap-3 lg:gap-6 shrink-0 min-w-0">
          <div className="md:hidden shrink-0">
            <Logo size="sm" showWordmark={false} />
          </div>
          <div className="hidden md:block shrink-0">
            <Logo size="md" showWordmark={true} />
          </div>

          {/* Navigation Links (Visible from Tablet md: upwards) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-2.5 lg:px-3.5 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 select-none ${
                    isActive
                      ? 'text-white font-bold bg-white/[0.12] border border-white/[0.18] shadow-sm backdrop-blur-md'
                      : 'text-gray-300 hover:text-white hover:bg-white/[0.06]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ff4d6d]" />
                    )}
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* ── Center: Dynamic Page Title (Mobile View Only) ── */}
        <div className="flex-1 md:hidden text-center truncate px-2">
          <span className="font-display font-bold text-sm text-white tracking-wide">
            {pageTitle}
          </span>
        </div>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Search Pill Bar (Desktop & Tablet) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden sm:flex items-center relative w-36 md:w-44 lg:w-56"
          >
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរករឿងចិន, រឿងជប៉ុន..."
              className="w-full bg-[#101522]/90 border border-white/10 rounded-full pl-9 pr-3 py-1.5 text-sm sm:text-xs text-white placeholder-gray-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all backdrop-blur-md"
            />
          </form>

          {/* Search Icon (Mobile) */}
          <button
            onClick={() => navigate('/search')}
            className="sm:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            aria-label="ស្វែងរក"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* VIP Upgrade Button */}
          <Link
            to="/vip"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white shadow-md shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-105 active:scale-95 transition-all group shrink-0"
            title="គម្រោង VIP"
          >
            <Crown className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 shrink-0" />
            <span className="whitespace-nowrap font-extrabold text-[11px] sm:text-xs">VIP</span>
          </Link>

          {/* Telegram Channel Direct Link */}
          <a
            href="https://t.me/animekhnotocation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold bg-[#0088cc]/20 hover:bg-[#0088cc]/35 text-[#29b6f6] border border-[#0088cc]/40 hover:border-[#0088cc] shadow-sm hover:scale-105 active:scale-95 transition-all group shrink-0"
            title="ចូលរួម Telegram Channel ដើម្បីទទួលដំណឹងភាគថ្មីៗ"
          >
            <Send className="w-3.5 h-3.5 fill-[#29b6f6] shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap font-extrabold text-[11px] sm:text-xs">Telegram</span>
          </a>

            {/* Notification Bell */}
            <div className="relative shrink-0" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors active:scale-95 shrink-0"
                aria-label="សេចក្តីជូនដំណឹង"
              >
                <Bell className="w-5 h-5 text-gray-200" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#080d1a] shadow-[0_0_8px_#ff4d6d] animate-pulse" />
                )}
              </button>

              {/* Mobile Dimmed Backdrop Overlay */}
              {isNotifOpen && (
                <div
                  className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[99] sm:hidden animate-fade-in"
                  onClick={() => setIsNotifOpen(false)}
                />
              )}

              {/* Responsive Notification Modal / Popover */}
              {isNotifOpen && (
                <div
                  className="fixed inset-x-3 bottom-3 sm:bottom-auto sm:inset-x-auto sm:right-0 sm:top-12 w-[calc(100vw-24px)] sm:w-[420px] max-w-[430px] max-h-[85vh] sm:max-h-[600px] rounded-3xl sm:rounded-2xl bg-[#0b101e]/98 border border-rose-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(255,77,109,0.2)] backdrop-blur-2xl flex flex-col z-[100] animate-scale-in overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Mobile Pull Handle */}
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

                  {/* Header Bar */}
                  <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/30">
                        <Bell className="w-4 h-4 fill-white/20" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-sm sm:text-base text-white tracking-wide">
                            សេចក្តីជូនដំណឹង
                          </span>
                          {unreadCount > 0 && (
                            <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm shadow-rose-500/30 animate-pulse">
                              {unreadCount} ថ្មី
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">ដំណឹងចេញភាគថ្មីៗ និងប្រព័ន្ធ VIP</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all"
                          title="អានទាំងអស់"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span className="hidden xs:inline">អានទាំងអស់</span>
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotifOpen(false)}
                        className="w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                        aria-label="បិទ"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06] bg-black/25 overflow-x-auto no-scrollbar shrink-0">
                    <button
                      onClick={() => setNotifTab('all')}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                        notifTab === 'all'
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      ទាំងអស់ ({notifications.length})
                    </button>
                    <button
                      onClick={() => setNotifTab('episode')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                        notifTab === 'episode'
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Flame className="w-3 h-3 text-amber-400" />
                      ភាគថ្មី ({episodeCount})
                    </button>
                    <button
                      onClick={() => setNotifTab('vip')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                        notifTab === 'vip'
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Crown className="w-3 h-3 text-yellow-400" />
                      VIP / ប្រព័ន្ធ ({systemCount})
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => setNotifTab('unread')}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                          notifTab === 'unread'
                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
                            : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        មិនទាន់អាន ({unreadCount})
                      </button>
                    )}
                  </div>

                  {/* Notifications Scroll List */}
                  <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2 overscroll-contain">
                    {filteredNotifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500 mb-2">
                          <Bell className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-gray-300">មិនមានសេចក្តីជូនដំណឹងក្នុងផ្នែកនេះទេ</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">នៅពេលមានដំណឹងថ្មី នឹងបង្ហាញនៅទីនេះ</p>
                      </div>
                    ) : (
                      filteredNotifications.map((n) => {
                        const isUnread = !readNotifIds.includes(n.id);
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`group relative p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all duration-200 border ${
                              isUnread
                                ? 'bg-gradient-to-r from-rose-950/40 via-[#12182c] to-[#0f1424] border-rose-500/40 shadow-sm hover:border-rose-400/80 hover:scale-[1.01]'
                                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/15'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Poster / Avatar with Badge */}
                              <div className="relative shrink-0 mt-0.5">
                                {(() => {
                                  const slugMatch = n.link?.match(/\/watch\/([^/]+)/);
                                  const slug = slugMatch ? slugMatch[1] : '';
                                  const hasValidAvatar = n.avatarUrl && !n.avatarUrl.includes('onrender.com') && !n.avatarUrl.includes('unsplash.com');
                                  const posterSrc = hasValidAvatar ? n.avatarUrl : (slug ? `/posters/${slug}.jpg` : n.avatarUrl);

                                  if (posterSrc) {
                                    return (
                                      <div className="w-12 h-14 rounded-xl overflow-hidden border border-white/15 bg-black/60 shadow-md">
                                        <img
                                          src={posterSrc}
                                          alt=""
                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                          onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            if (slug && !target.src.includes(`/posters/${slug}.jpg`)) {
                                              target.src = `/posters/${slug}.jpg`;
                                            } else {
                                              target.style.display = 'none';
                                              const fallback = target.parentElement?.querySelector('.avatar-fallback');
                                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                            }
                                          }}
                                        />
                                        <div className="avatar-fallback hidden w-full h-full bg-rose-900/30 flex items-center justify-center text-rose-400">
                                          <Film className="w-5 h-5" />
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                      n.icon === 'vip'
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                        : n.icon === 'system'
                                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                    }`}>
                                      {n.icon === 'vip' ? (
                                        <Crown className="w-5 h-5 fill-current" />
                                      ) : n.icon === 'system' ? (
                                        <Send className="w-5 h-5" />
                                      ) : (
                                        <Film className="w-5 h-5" />
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Unread pulsing dot */}
                                {isUnread && (
                                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-[#0b101d] shadow-[0_0_8px_#ff4d6d] animate-pulse" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {n.tag && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                                      n.icon === 'vip'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : n.icon === 'system'
                                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    }`}>
                                      {n.tag}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-500" />
                                    {n.time}
                                  </span>
                                </div>

                                <h4 className={`text-xs sm:text-[13px] font-bold leading-snug line-clamp-2 transition-colors ${
                                  isUnread ? 'text-white group-hover:text-rose-300' : 'text-gray-300 group-hover:text-white'
                                }`}>
                                  {n.title}
                                </h4>

                                <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 leading-relaxed">
                                  {n.subtitle}
                                </p>
                              </div>

                              {/* Action arrow */}
                              <div className="shrink-0 self-center text-gray-500 group-hover:text-rose-400 transition-all p-1">
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Bar */}
                  <div className="p-3 border-t border-white/[0.08] bg-black/30 flex items-center justify-between text-xs shrink-0">
                    <span className="text-[11px] text-gray-400">
                      សរុប {notifications.length} ដំណឹង
                    </span>
                    <Link
                      to="/notifications"
                      onClick={() => setIsNotifOpen(false)}
                      className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors group"
                    >
                      <span>មើលដំណឹងទាំងអស់</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

          {/* User Account / Profile / Sign In Button */}
          <div className="relative shrink-0" ref={userMenuRef}>
            {isAuthenticated ? (
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-[#111726] border border-[#1E283C] hover:border-amber-500/60 transition-all text-xs font-semibold text-gray-200 shrink-0 whitespace-nowrap active:scale-95"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center text-black font-black shrink-0 shadow-sm">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline font-bold max-w-[100px] truncate text-white leading-none whitespace-nowrap">
                  {user?.username}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="sm:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                  aria-label="ចូលគណនី"
                >
                  <UserIcon className="w-5 h-5 text-amber-400" />
                </Link>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#111726] hover:bg-[#161F33] border border-[#1E283C] hover:border-amber-500 text-white transition-all whitespace-nowrap shrink-0 shadow-sm"
                >
                  <UserIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">ចូលគណនី</span>
                </Link>
              </>
            )}

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-2xl bg-[#111726] border border-[#1E283C] shadow-2xl p-2 z-50 animate-scale-in">
                <div className="px-3 py-2 border-b border-[#1E283C] mb-1">
                  <p className="font-display font-bold text-sm text-white truncate">{user?.username}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email || 'សមាជិក VIP'}</p>
                </div>

                <div className="space-y-0.5">
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span>គណនី & ការកំណត់</span>
                  </Link>

                  <Link
                    to="/favorites"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Bookmark className="w-4 h-4 text-gray-400" />
                    <span>បញ្ជីរក្សាទុក</span>
                  </Link>

                  <Link
                    to="/history"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>ប្រវត្តិទស្សនា</span>
                  </Link>

                  {canManage && (
                    <Link
                      to="/admin"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isOwnerUser
                          ? 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30'
                          : isStaffUser
                          ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                          : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                      }`}
                    >
                      <Shield className={`w-4 h-4 ${isOwnerUser ? 'text-amber-400 fill-amber-400/20' : isStaffUser ? 'text-cyan-400' : 'text-amber-400'}`} />
                      <span>{isOwnerUser ? '👑 ផ្ទាំងគ្រប់គ្រង Owner' : isStaffUser ? 'ផ្ទាំងគ្រប់គ្រង Staff' : 'ផ្ទាំងគ្រប់គ្រង Admin'}</span>
                    </Link>
                  )}

                  <div className="border-t border-[#1E283C] my-1" />

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ចាកចេញពីគណនី</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
