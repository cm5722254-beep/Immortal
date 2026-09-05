import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Film, Play, Users, MessageSquare,
  Image, Settings, LogOut, Shield, Menu, ChevronRight, Send,
  Tv, Clapperboard, Palette, Database, Key,
  Globe, Smartphone, Bot, ChevronDown, ChevronUp,
  Layers, Zap, Bell, Package, QrCode, Crown, ShieldCheck, Lock, Terminal, X, Rocket
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSystemUpdateStore } from '../../store/systemUpdateStore';

// ─── 3 Admin Sections ────────────────────────────────────────────────
const sections = [
  {
    id: 'website',
    icon: Globe,
    label: 'គ្រប់គ្រងវេបសាយ',
    sublabel: 'Website Management',
    color: 'text-brand-400',
    border: 'border-brand-500/40',
    bg: 'bg-brand-500/10',
    activeBg: 'bg-brand-500/20',
    dot: 'bg-brand-400',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Overview & Dashboard' },
      { to: '/admin/donghua', icon: Play, label: 'Donghua Series' },
      { to: '/admin/drama', icon: Tv, label: 'Drama & Series' },
      { to: '/admin/movies', icon: Clapperboard, label: 'Movie (រឿងដុំ)' },
      { to: '/admin/anime', icon: Film, label: 'Anime' },
      { to: '/admin/episodes', icon: Layers, label: 'Episodes' },
      { to: '/admin/api-keys', icon: Key, label: 'API & Stream Keys' },
      { to: '/admin/users', icon: Users, label: 'Users & VIP' },
      { to: '/admin/comments', icon: MessageSquare, label: 'Comments' },
      { to: '/admin/banners', icon: Image, label: 'Banners & Promo' },
      { to: '/admin/theme', icon: Palette, label: 'Theme & Colors' },
      { to: '/admin/backup', icon: Database, label: 'Data & Backup' },
    ],
  },
  {
    id: 'mobile',
    icon: Smartphone,
    label: 'គ្រប់គ្រង APP',
    sublabel: 'Mobile App Management',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    activeBg: 'bg-emerald-500/20',
    dot: 'bg-emerald-400',
    items: [
      { to: '/admin/mobile', icon: Smartphone, label: 'Mobile App Overview' },
      { to: '/admin/mobile/push', icon: Bell, label: 'Push Notifications' },
      { to: '/admin/mobile/build', icon: Package, label: 'APK Build & Version' },
      { to: '/admin/mobile/qr', icon: QrCode, label: 'QR Download Link' },
    ],
  },
  {
    id: 'telegram',
    icon: Bot,
    label: 'គ្រប់គ្រង Mini App',
    sublabel: 'Telegram Management',
    color: 'text-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
    activeBg: 'bg-sky-500/20',
    dot: 'bg-sky-400',
    items: [
      { to: '/admin/telegram', icon: Bot, label: 'Bot Status & Control' },
      { to: '/admin/telegram/users', icon: Users, label: 'Telegram Users' },
      { to: '/admin/telegram/broadcast', icon: Send, label: 'Broadcast Message' },
      { to: '/admin/telegram/miniapp', icon: Zap, label: 'Mini App Settings' },
    ],
  },
];

// Owner-only exclusive section
const ownerSection = {
  id: 'owner',
  icon: Crown,
  label: '👑 ម្ចាស់ Platform',
  sublabel: 'Owner Exclusive Control',
  color: 'text-amber-300',
  border: 'border-amber-400/50',
  bg: 'bg-amber-500/15',
  activeBg: 'bg-amber-500/25',
  dot: 'bg-amber-300',
  items: [
    { to: '/admin/owner', icon: Crown, label: '👑 Owner Dashboard' },
    { to: '/admin/owner#admins', icon: ShieldCheck, label: 'Manage Admins & Staff' },
    { to: '/admin/owner#security', icon: Lock, label: 'Security Center' },
    { to: '/admin/owner#platform', icon: Settings, label: 'Platform Settings' },
    { to: '/admin/owner#logs', icon: Terminal, label: 'System Audit Logs' },
  ],
};

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  section?: 'website' | 'mobile' | 'telegram';
}

export function AdminLayout({ children, title, section }: AdminLayoutProps) {
  const { user, logout, isStaff, isOwner } = useAuthStore();
  const { config: updateConfig, previewModal: previewUpdateModal } = useSystemUpdateStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter sections and navigation items based on User Role
  // STAFF role only has permission to manage Anime & Episodes
  const availableSections = [
    ...sections
      .map((sec) => {
        if (sec.id === 'website') {
          const allowedItems = isStaff
            ? sec.items.filter((item) =>
                ['/admin', '/admin/donghua', '/admin/drama', '/admin/movies', '/admin/anime', '/admin/episodes'].includes(item.to)
              )
            : sec.items;
          return {
            ...sec,
            label: isStaff ? 'គ្រប់គ្រងរឿង & ភាគ' : sec.label,
            sublabel: isStaff ? 'Anime & Episodes' : sec.sublabel,
            items: allowedItems,
          };
        }
        // Mobile and Telegram management sections are ADMIN/OWNER-only
        if (isStaff && (sec.id === 'mobile' || sec.id === 'telegram')) {
          return null;
        }
        return sec;
      })
      .filter(Boolean),
    // OWNER-only section — pinned at top of nav
    ...(isOwner ? [ownerSection] : []),
  ] as typeof sections;

  // Auto-detect active section based on current path
  const getActiveSection = () => {
    if (section) return section;
    if (location.pathname.startsWith('/admin/owner')) return 'owner';
    if (location.pathname.startsWith('/admin/mobile')) return 'mobile';
    if (location.pathname.startsWith('/admin/telegram')) return 'telegram';
    return 'website';
  };

  const [openSection, setOpenSection] = useState<string>(getActiveSection());

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-[#0d1017] border-r border-white/[0.08] overflow-hidden select-none">
      {/* Logo & Mobile Close */}
      <div className="p-4 border-b border-white/[0.08] shrink-0 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="ទស្សនារឿង"
            className="w-8 h-8 object-cover rounded-full border border-amber-500/30 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
          />
          <div>
            <p className="font-display font-black text-sm text-white">ទស្សនារឿង</p>
            <p className="text-[11px] flex items-center gap-1 font-semibold text-amber-400/90">
              <Shield className="w-3 h-3 text-amber-400" /> Control Panel
            </p>
          </div>
        </Link>

        {/* Close Drawer Button on Mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition cursor-pointer"
          title="បិទ Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User profile */}
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0 bg-white/[0.01]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-white/10 text-white border border-white/10 shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate flex items-center gap-1">
              {user?.username}
            </p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {isOwner ? '👑 Platform Owner' : isStaff ? 'Staff' : 'Administrator'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-1.5 overflow-y-auto">
        {availableSections.map((sec) => {
          const SecIcon = sec.icon;
          const isOpen = openSection === sec.id;
          const hasActive = sec.items.some(item =>
            item.to === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.to)
          );

          return (
            <div key={sec.id} className="rounded-xl overflow-hidden">
              {/* Section Header Button */}
              <button
                onClick={() => setOpenSection(isOpen ? '' : sec.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isOpen || hasActive
                    ? 'text-white bg-white/[0.06] border border-white/[0.08]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                  <SecIcon className="w-3.5 h-3.5 text-gray-300" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold text-gray-200 truncate">{sec.label}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hasActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {isOpen
                    ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  }
                </div>
              </button>

              {/* Section Items */}
              {isOpen && (
                <div className="mt-1 ml-2 pl-2 border-l border-white/[0.08] space-y-0.5 pb-1">
                  {sec.items.map(({ to, icon: Icon, label }) => {
                    const active = to === '/admin'
                      ? location.pathname === '/admin'
                      : location.pathname.startsWith(to) && to !== '/admin';
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 group ${
                          active
                            ? 'bg-[#E50914] text-white font-bold shadow-md'
                            : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{label}</span>
                        {active && <ChevronRight className="w-3 h-3 ml-auto shrink-0 text-white" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2.5 border-t border-white/[0.08] shrink-0 space-y-1">
        <Link
          to="/"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Globe className="w-3.5 h-3.5" /> មើល Website
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> ចាកចេញ (Sign Out)
        </button>
      </div>
    </aside>
  );

  // Determine section color for topbar accent
  const activeSec = availableSections.find(s => s.id === getActiveSection());

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-60 xl:w-64 shrink-0 flex-col fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay & drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-50 animate-in slide-in-from-left duration-250 shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-60 xl:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#07090e]/95 backdrop-blur-md border-b border-white/[0.08] px-3 sm:px-6 h-14 flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white transition cursor-pointer"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Section badge */}
          {activeSec && (
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${activeSec.bg} border ${activeSec.border} shrink-0`}>
              <activeSec.icon className={`w-3.5 h-3.5 ${activeSec.color}`} />
              <span className={`text-[10px] font-bold ${activeSec.color}`}>{activeSec.sublabel}</span>
            </div>
          )}

          <h1 className="font-display font-bold text-sm sm:text-base text-white truncate flex-1 min-w-0">
            {title}
          </h1>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            {updateConfig.enabled && (
              <button
                onClick={previewUpdateModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/20 text-red-300 border border-red-500/40 text-[11px] font-bold shadow-sm shadow-red-500/20 animate-pulse hover:bg-red-600/30 transition shrink-0 cursor-pointer"
                title="ផ្ទាំង Website Update កំពុងបើកដំណើរការលើ Website (ចុចដើម្បីមើល Preview)"
              >
                <Rocket className="w-3.5 h-3.5 text-amber-400" />
                <span>Update Mode: ON</span>
              </button>
            )}

            <Link
              to="/"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1 transition shrink-0"
              title="មើល Website"
            >
              <Globe className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Website</span>
            </Link>

            {isOwner ? (
              <span className="badge bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-400/40 font-black text-[10px] sm:text-xs shrink-0">
                <Crown className="w-3 h-3 mr-1 text-amber-400" /> Owner
              </span>
            ) : isStaff ? (
              <span className="badge bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-[10px] sm:text-xs">
                Staff
              </span>
            ) : (
              <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[10px] sm:text-xs">
                Admin
              </span>
            )}
          </div>
        </header>

        {/* Page content with bottom space for mobile navigation */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 pb-24 lg:pb-6 max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* ── MOBILE PHONE BOTTOM QUICK BAR (លេចឡើងលើទូរស័ព្ទដៃ) ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0d1017]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
        <Link
          to="/admin"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
            location.pathname === '/admin'
              ? 'text-[#E50914] font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px]">Dashboard</span>
        </Link>

        <Link
          to="/admin/donghua"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
            location.pathname.startsWith('/admin/donghua')
              ? 'text-[#E50914] font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Play className="w-4 h-4" />
          <span className="text-[10px]">Donghua</span>
        </Link>

        <Link
          to="/admin/episodes"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
            location.pathname.startsWith('/admin/episodes')
              ? 'text-[#E50914] font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[10px]">Episodes</span>
        </Link>

        <Link
          to="/admin/users"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
            location.pathname.startsWith('/admin/users')
              ? 'text-[#E50914] font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[10px]">សមាជិក</span>
        </Link>

        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-gray-400 hover:text-white transition cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px]">Menu</span>
        </button>
      </div>
    </div>
  );
}
