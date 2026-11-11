import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Film, Play, Users, MessageSquare,
  Image, LogOut, Shield, Menu, ChevronRight,
  Tv, Clapperboard, Palette, Database, Key,
  Globe, Smartphone, Bot, ChevronDown, ChevronUp,
  Layers, Package, Crown, ShieldCheck, X, Rocket, FolderDown, Activity
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSystemUpdateStore } from '../../store/systemUpdateStore';
import { LanguageSwitcher } from '../../components/layout/LanguageSwitcher';
import { ThemeToggle } from '../../components/layout/ThemeToggle';

// ─── Clean Organized Admin Navigation Groups (Zero Clutter) ──────────
const sections = [
  {
    id: 'website',
    icon: Film,
    label: 'មាតិកា & រឿង',
    sublabel: 'Content & Media',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'ផ្ទាំងគ្រប់គ្រងទូទៅ' },
      { to: '/admin/donghua', icon: Play, label: 'រឿងចិន 3D (Donghua)' },
      { to: '/admin/anime', icon: Film, label: 'រឿងជប៉ុន (Anime)' },
      { to: '/admin/drama', icon: Tv, label: 'រឿងភាគ (Drama)' },
      { to: '/admin/movies', icon: Clapperboard, label: 'ភាពយន្តដុំ (Movies)' },
      { to: '/admin/episodes', icon: Layers, label: 'គ្រប់គ្រងភាគរឿង' },
      { to: '/admin/banners', icon: Image, label: 'ស្លាយបែនណ័រ (Banners)' },
    ],
  },
  {
    id: 'community',
    icon: Users,
    label: 'សមាជិក & រូបរាង',
    sublabel: 'Users & Theme',
    items: [
      { to: '/admin/users', icon: Users, label: 'គ្រប់គ្រងសមាជិក' },
      { to: '/admin/comments', icon: MessageSquare, label: 'មតិយោបល់' },
      { to: '/admin/theme', icon: Palette, label: 'ពណ៌ផ្ទៃ (ស ⇄ ប្រផេះ)' },
      { to: '/admin/api-keys', icon: Key, label: 'កូដ API & Stream' },
      { to: '/admin/backup', icon: Database, label: 'រក្សាទុកទិន្នន័យ (Backup)' },
    ],
  },
  {
    id: 'telegram',
    icon: Bot,
    label: 'ប្រព័ន្ធ & Sync',
    sublabel: 'System & Sync',
    items: [
      { to: '/admin/telegram', icon: FolderDown, label: 'Telegram Auto-Sync (24/7)' },
      { to: '/admin/mobile', icon: Smartphone, label: 'កម្មវិធីទូរស័ព្ទ (App/APK)' },
      { to: '/admin/downloads', icon: Package, label: 'គ្រប់គ្រងការទាញយក' },
      { to: '/admin/stream-health', icon: Activity, label: 'ពិនិត្យស្ថានភាព Stream' },
    ],
  },
];

const ownerSection = {
  id: 'owner',
  icon: Crown,
  label: 'ម្ចាស់ Platform',
  sublabel: 'Owner Portal',
  items: [
    { to: '/admin/owner', icon: ShieldCheck, label: 'មជ្ឈមណ្ឌលម្ចាស់ប្រព័ន្ធ' },
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
        // Community, Design, and System sections are ADMIN/OWNER-only
        if (isEffectiveStaff && !isEffectiveAdmin && (sec.id === 'community' || sec.id === 'telegram')) {
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
    if (
      location.pathname.startsWith('/admin/telegram') ||
      location.pathname.startsWith('/admin/mobile') ||
      location.pathname.startsWith('/admin/downloads') ||
      location.pathname.startsWith('/admin/stream-health')
    ) {
      return 'telegram';
    }
    if (
      location.pathname.startsWith('/admin/users') ||
      location.pathname.startsWith('/admin/comments') ||
      location.pathname.startsWith('/admin/theme') ||
      location.pathname.startsWith('/admin/api-keys') ||
      location.pathname.startsWith('/admin/backup')
    ) {
      return 'community';
    }
    return 'website';
  };

  const [openSection, setOpenSection] = useState<string>(getActiveSection());

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 overflow-hidden select-none shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="px-4 py-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="ទស្សនារឿង"
            className="w-8 h-8 object-cover rounded-full border border-blue-500/20 shadow-xs"
          />
          <div>
            <p className="font-display font-black text-sm text-slate-900">MerDonghua</p>
            <p className="text-[11px] flex items-center gap-1 font-semibold text-blue-600">
              <Shield className="w-3 h-3 text-blue-600" /> ផ្ទាំងគ្រប់គ្រង (Admin)
            </p>
          </div>
        </Link>

        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          title="បិទ Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3.5 border-b border-slate-100 shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold bg-blue-600 text-white shadow-xs shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
              {user?.username}
            </p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {isOwner ? 'ម្ចាស់ប្រព័ន្ធ (Owner)' : isStaff ? 'បុគ្គលិក (Staff)' : 'អ្នកគ្រប់គ្រង (Admin)'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isOpen || hasActive
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isOpen || hasActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'} shrink-0`}>
                  <SecIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-bold truncate text-xs">{sec.label}</p>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 opacity-50 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="mt-1.5 ml-3 pl-2.5 border-l border-slate-200 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
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
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-150 group ${
                          active
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`}
                      >
                        <SubIcon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
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
      <div className="p-2.5 border-t border-slate-100 shrink-0 space-y-1">
        <Link
          to="/"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" /> មើល Website
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-600" /> ចាកចេញពីគណនី
        </button>
      </div>
    </aside>
  );

  // Determine section color for topbar accent
  const activeSec = availableSections.find(s => s.id === getActiveSection());

  return (
    <div className="admin-dashboard-shell relative min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay & drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-50 animate-in slide-in-from-left duration-250 shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 xl:ml-72 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-3 sm:px-6 xl:px-8 h-16 flex items-center gap-3 sm:gap-4 shadow-xs">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Section badge */}
          {activeSec && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/60 shrink-0">
              <activeSec.icon className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-bold text-blue-700">{activeSec.sublabel}</span>
            </div>
          )}

          <h1 className="font-display font-bold text-sm sm:text-lg text-slate-900 truncate flex-1 min-w-0 tracking-tight">
            {title}
          </h1>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            {updateConfig.enabled && (
              <button
                onClick={previewUpdateModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold shadow-xs hover:bg-rose-100 transition shrink-0 cursor-pointer"
                title="ផ្ទាំង Website Update កំពុងបើកដំណើរការលើ Website (ចុចដើម្បីមើល Preview)"
              >
                <Rocket className="w-3.5 h-3.5 text-rose-600" />
                <span>Update Mode: ON</span>
              </button>
            )}

            <ThemeToggle compact />
            <LanguageSwitcher className="admin-language-switcher" />

            <Link
              to="/"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold flex items-center gap-1 transition shrink-0"
              title="មើល Website"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" /> <span className="hidden sm:inline">Website</span>
            </Link>

            {isOwner ? (
              <span className="badge bg-blue-50 text-blue-700 border border-blue-200/80 font-bold text-[10px] sm:text-xs shrink-0 hidden sm:inline-flex items-center">
                <Crown className="w-3 h-3 mr-1 text-blue-600" /> Owner
              </span>
            ) : isStaff ? (
              <span className="badge bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] sm:text-xs hidden sm:inline-flex">
                Staff
              </span>
            ) : (
              <span className="badge bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] sm:text-xs hidden sm:inline-flex">
                Admin
              </span>
            )}
          </div>
        </header>

        {/* Page content with bottom space for mobile navigation */}
        <div className="admin-content relative flex-1 p-4 sm:p-6 xl:p-8 pb-24 lg:pb-8 max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* ── MOBILE PHONE BOTTOM QUICK BAR (លេចឡើងលើទូរស័ព្ទដៃ) ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg safe-area-pb">
        <Link
          to="/admin"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
            location.pathname === '/admin'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px]">Dashboard</span>
        </Link>

        <Link
          to="/admin/donghua"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
            location.pathname.startsWith('/admin/donghua')
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Play className="w-4 h-4" />
          <span className="text-[10px]">Donghua</span>
        </Link>

        <Link
          to="/admin/episodes"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
            location.pathname.startsWith('/admin/episodes')
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[10px]">Episodes</span>
        </Link>

        <Link
          to="/admin/users"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
            location.pathname.startsWith('/admin/users')
              ? 'text-blue-600 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[10px]">សមាជិក</span>
        </Link>

        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px]">Menu</span>
        </button>
      </div>
    </div>
  );
}
