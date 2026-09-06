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
    sublabel: 'គ្រប់គ្រងវេបសាយ',
    color: 'text-brand-400',
    border: 'border-brand-500/40',
    bg: 'bg-brand-500/10',
    activeBg: 'bg-brand-500/20',
    dot: 'bg-brand-400',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'ផ្ទាំងគ្រប់គ្រងទូទៅ' },
      { to: '/admin/donghua', icon: Play, label: 'រឿងចិន 3D (Donghua)' },
      { to: '/admin/drama', icon: Tv, label: 'រឿងភាគ (Drama)' },
      { to: '/admin/movies', icon: Clapperboard, label: 'ភាពយន្តដុំ (Movies)' },
      { to: '/admin/anime', icon: Film, label: 'រឿងជប៉ុន (Anime)' },
      { to: '/admin/episodes', icon: Layers, label: 'គ្រប់គ្រងភាគរឿង' },
      { to: '/admin/api-keys', icon: Key, label: 'កូដសម្ងាត់ API & Stream' },
      { to: '/admin/users', icon: Users, label: 'សមាជិក & VIP' },
      { to: '/admin/comments', icon: MessageSquare, label: 'មតិយោបល់' },
      { to: '/admin/banners', icon: Image, label: 'ផ្ទាំងផ្សាយពាណិជ្ជកម្ម' },
      { to: '/admin/theme', icon: Palette, label: 'ពណ៌ & រូបរាង Theme' },
      { to: '/admin/backup', icon: Database, label: 'រក្សាទុកទិន្នន័យ (Backup)' },
    ],
  },
  {
    id: 'mobile',
    icon: Smartphone,
    label: 'គ្រប់គ្រងកម្មវិធី APP',
    sublabel: 'គ្រប់គ្រង APP',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    activeBg: 'bg-emerald-500/20',
    dot: 'bg-emerald-400',
    items: [
      { to: '/admin/mobile', icon: Smartphone, label: 'ព័ត៌មានទូទៅនៃ App' },
      { to: '/admin/mobile/push', icon: Bell, label: 'ផ្ញើដំណឹង Push Notification' },
      { to: '/admin/mobile/build', icon: Package, label: 'កំណែ APK Build' },
      { to: '/admin/mobile/qr', icon: QrCode, label: 'QR Code ទាញយក App' },
    ],
  },
  {
    id: 'telegram',
    icon: Bot,
    label: 'គ្រប់គ្រង Mini App',
    sublabel: 'គ្រប់គ្រង Telegram',
    color: 'text-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
    activeBg: 'bg-sky-500/20',
    dot: 'bg-sky-400',
    items: [
      { to: '/admin/telegram', icon: Bot, label: 'ស្ថានភាព Bot & ការគ្រប់គ្រង' },
      { to: '/admin/telegram/users', icon: Users, label: 'អ្នកប្រើប្រាស់ Telegram' },
      { to: '/admin/telegram/broadcast', icon: Send, label: 'ផ្ញើសាររួម (Broadcast)' },
      { to: '/admin/telegram/miniapp', icon: Zap, label: 'ការកំណត់ Mini App' },
    ],
  },
];

// Owner-only exclusive section
const ownerSection = {
  id: 'owner',
  icon: Crown,
  label: '👑 ម្ចាស់ Platform',
  sublabel: '👑 ម្ចាស់ប្រព័ន្ធ',
  color: 'text-amber-300',
  border: 'border-amber-400/50',
  bg: 'bg-amber-500/15',
  activeBg: 'bg-amber-500/25',
  dot: 'bg-amber-300',
  items: [
    { to: '/admin/owner', icon: Crown, label: '👑 ផ្ទាំងគ្រប់គ្រងម្ចាស់' },
    { to: '/admin/owner#admins', icon: ShieldCheck, label: 'គ្រប់គ្រង Admin & Staff' },
    { to: '/admin/owner#security', icon: Lock, label: 'មជ្ឈមណ្ឌលសុវត្ថិភាព' },
    { to: '/admin/owner#platform', icon: Settings, label: 'ការកំណត់ប្រព័ន្ធ' },
    { to: '/admin/owner#logs', icon: Terminal, label: 'កំណត់ហេតុប្រព័ន្ធ (Audit Logs)' },
  ],
};

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  section?: 'website' | 'mobile' | 'telegram';
}

export function AdminLayout({ children, title, section }: AdminLayoutProps) {
  const { user, logout, isStaff, isOwner, isAdmin } = useAuthStore();
  const isEffectiveOwner = isOwner || user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  const isEffectiveAdmin = isEffectiveOwner || isAdmin || user?.role === 'ADMIN';
  const isEffectiveStaff = isStaff || user?.role === 'STAFF';
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
          const allowedItems = isEffectiveStaff && !isEffectiveAdmin
            ? sec.items.filter((item) =>
                ['/admin', '/admin/donghua', '/admin/drama', '/admin/movies', '/admin/anime', '/admin/episodes'].includes(item.to)
              )
            : sec.items;
          return {
            ...sec,
            label: isEffectiveStaff && !isEffectiveAdmin ? 'គ្រប់គ្រងរឿង & ភាគ' : sec.label,
            sublabel: isEffectiveStaff && !isEffectiveAdmin ? 'Anime & Episodes' : sec.sublabel,
            items: allowedItems,
          };
        }
        // Mobile and Telegram management sections are ADMIN/OWNER-only
        if (isEffectiveStaff && !isEffectiveAdmin && (sec.id === 'mobile' || sec.id === 'telegram')) {
          return null;
        }
        return sec;
      })
      .filter(Boolean),
    // OWNER-only section — pinned at top of nav
    ...(isEffectiveOwner ? [ownerSection] : []),
  ] as typeof sections;

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
              <Shield className="w-3 h-3 text-amber-400" /> ផ្ទាំងគ្រប់គ្រង (Admin)
            </p>
          </div>
        </Link>

        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition cursor-pointer"
          title="បិទ Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

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
              {isOwner ? '👑 ម្ចាស់ប្រព័ន្ធ (Owner)' : isStaff ? 'បុគ្គលិក (Staff)' : 'អ្នកគ្រប់គ្រង (Admin)'}
            </p>
          </div>
        </div>
      </div>

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
              <button
                onClick={() => setOpenSection(isOpen ? '' : sec.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isOpen || hasActive
                    ? `${sec.bg} ${sec.color} shadow-sm`
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isOpen || hasActive ? sec.bg : 'bg-white/5'} shrink-0`}>
                  <SecIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-bold truncate text-[11px]">{sec.label}</p>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 opacity-50 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="mt-1 ml-3 pl-2.5 border-l border-white/[0.08] space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                  {sec.items.map((item) => {
                    const active = item.to === '/admin'
                      ? location.pathname === '/admin'
                      : location.pathname.startsWith(item.to);
                    const SubIcon = item.icon;

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 group ${
                          active
                            ? 'bg-brand-600 text-white font-bold shadow-md shadow-brand-600/25'
                            : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        <SubIcon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                        <span className="truncate">{item.label}</span>
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
          <LogOut className="w-3.5 h-3.5" /> ចាកចេញពីគណនី
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
