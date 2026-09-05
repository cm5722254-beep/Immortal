import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, Search, User as UserIcon, Shield, Crown,
  LogOut, Bookmark, Clock, Film,
  ChevronDown
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
  const { user, isAuthenticated, isStaff, isOwner, canManageContent, logout } = useAuthStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
    if (pathname.startsWith('/donghua')) return 'រឿងចិន (Donghua)';
    if (pathname.startsWith('/anime')) return 'រឿងជប៉ុន (Anime)';
    if (pathname.startsWith('/drama')) return 'រឿងភាគ (Drama)';
    if (pathname.startsWith('/movies')) return 'ភាពយន្តដុំ (Movies)';
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

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 select-none ${
                    isActive
                      ? 'text-white font-bold bg-white/[0.12] border border-white/[0.18] shadow-sm backdrop-blur-md'
                      : 'text-gray-300 hover:text-white hover:bg-white/[0.06]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] shadow-[0_0_8px_#E50914]" />
                    )}
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* ── Center: Dynamic Page Title (Mobile View) ── */}
        <div className="flex-1 lg:hidden text-center truncate px-2">
          <span className="font-display font-bold text-sm sm:text-base text-white tracking-wide">
            {pageTitle}
          </span>
        </div>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Pill Bar (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden sm:flex items-center relative w-44 lg:w-56"
          >
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរករឿង, Anime, Donghua..."
              className="w-full bg-[#101522]/90 border border-white/10 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#e8452c] focus:ring-1 focus:ring-[#e8452c]/30 transition-all backdrop-blur-md"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all group shrink-0"
            title="គម្រោង VIP ($2.50)"
          >
            <Crown className="w-3.5 h-3.5 text-black fill-black shrink-0" />
            <span className="whitespace-nowrap font-extrabold">VIP</span>
          </Link>

          {/* Notification Bell */}
          <div className="relative shrink-0" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors active:scale-95 shrink-0"
              aria-label="សេចក្តីជូនដំណឹង"
            >
              <Bell className="w-5 h-5 text-gray-200" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#080306] animate-pulse" />
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl bg-[#15060A]/95 border border-amber-500/25 shadow-2xl backdrop-blur-2xl p-3 z-50 animate-scale-in">
                <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-white">សេចក្តីជូនដំណឹង</span>
                    {unreadCount > 0 && (
                      <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount} ថ្មី
                      </span>
                    )}
                  </div>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-amber-400 hover:underline font-bold"
                  >
                    អានទាំងអស់
                  </button>
                </div>

                <div className="divide-y divide-amber-500/15 max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      មិនទាន់មានសេចក្តីជូនដំណឹងថ្មីទេ
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUnread = !readNotifIds.includes(n.id);
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`py-2.5 px-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors ${
                            isUnread ? 'bg-amber-500/10' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {n.avatarUrl ? (
                              <img
                                src={n.avatarUrl}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/10"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                                <Film className="w-4 h-4" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold line-clamp-1 ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                                {n.title}
                              </p>
                              <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{n.subtitle}</p>
                              <span className="text-[9px] text-gray-500 font-mono mt-1 block">{n.time}</span>
                            </div>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 border-t border-amber-500/20 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs text-amber-400 font-bold hover:underline"
                  >
                    មើលដំណឹងទាំងអស់ →
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
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#111726] hover:bg-[#161F33] border border-[#1E283C] hover:border-amber-500 text-white transition-all whitespace-nowrap shrink-0 shadow-sm"
              >
                <UserIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">ចូលគណនី</span>
              </Link>
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

                  {canManageContent && (
                    <Link
                      to="/admin"
                      onClick={() => setIsUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isOwner
                          ? 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30'
                          : isStaff
                          ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                          : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                      }`}
                    >
                      <Shield className={`w-4 h-4 ${isOwner ? 'text-amber-400 fill-amber-400/20' : isStaff ? 'text-cyan-400' : 'text-amber-400'}`} />
                      <span>{isOwner ? '👑 ផ្ទាំងគ្រប់គ្រង Owner' : isStaff ? 'ផ្ទាំងគ្រប់គ្រង Staff' : 'ផ្ទាំងគ្រប់គ្រង Admin'}</span>
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
