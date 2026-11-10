import { useNavStore } from '../../store/navStore';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore, translate } from '../../store/languageStore';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Film,
  Play,
  Bookmark,
  Clock,
  Bell,
  User as UserIcon,
  Shield,
  Crown,
  X,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/telegram';

interface SidebarItem {
  label: string;
  to: string;
  icon: React.ElementType;
  visible: boolean;
  children?: { label: string; to: string; icon: React.ElementType }[];
}

export function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useNavStore();
  const { user, isAuthenticated, isStaff, isOwner, isAdmin } = useAuthStore();
  const location = useLocation();
  const language = useLanguageStore((state) => state.language);

  const isOwnerUser = Boolean(isOwner || user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com');
  const isAdminUser = Boolean(isOwnerUser || isAdmin || user?.role === 'ADMIN');
  const isStaffUser = Boolean(isStaff || user?.role === 'STAFF');

  const sidebarItems: SidebarItem[] = [
    {
      label: 'Home',
      to: '/',
      icon: Home,
      visible: true,
    },
    {
      label: 'Explore',
      to: '/explore',
      icon: Compass,
      visible: true,
    },
    {
      label: 'Movies',
      to: '/movies',
      icon: Film,
      visible: true,
    },
    {
      label: 'TV Shows & Drama',
      to: '/drama',
      icon: Play,
      visible: true,
    },
    {
      label: 'My List',
      to: '/favorites',
      icon: Bookmark,
      visible: isAuthenticated,
    },
    {
      label: 'History',
      to: '/history',
      icon: Clock,
      visible: isAuthenticated,
    },
    {
      label: 'Notifications',
      to: '/notifications',
      icon: Bell,
      visible: isAuthenticated,
    },
    // Admin section - only for authorized staff/admins
    {
      label: 'Admin Portal',
      to: '/admin',
      icon: Shield,
      visible: Boolean(isAdminUser || isOwnerUser || isStaffUser),
      children: [
        {
          label: 'Dashboard',
          to: '/admin',
          icon: Home,
        },
        {
          label: 'Content (Donghua & Anime)',
          to: '/admin/anime',
          icon: Film,
        },
        {
          label: 'Users & VIPs',
          to: '/admin/users',
          icon: UserIcon,
        },
      ],
    },
    // Owner section - strictly for owner
    {
      label: 'Owner Control',
      to: '/admin/owner',
      icon: Crown,
      visible: Boolean(isOwnerUser),
    },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-[990] md:hidden backdrop-blur-xs transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white/95 backdrop-blur-2xl border-r border-slate-200/90
                   px-5 py-6 overflow-y-auto transition-transform duration-300 shadow-2xl
                   ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                   z-[995] flex flex-col justify-between`}
      >
        <div>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-2 py-1 mb-6 border-b border-slate-100 pb-4">
            <Link
              to="/"
              onClick={() => {
                triggerHaptic('light');
                if (isSidebarOpen) toggleSidebar();
              }}
              className="flex items-center gap-2.5"
            >
              <img
                src="/logo.png"
                alt=""
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 shadow-xs"
              />
              <span className="font-display font-black text-lg text-slate-900 tracking-tight">
                Mer<span className="text-blue-600">Donghua</span>
              </span>
            </Link>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="space-y-1.5">
            {sidebarItems
              .filter((item) => item.visible)
              .map((item) => {
                const IconComp = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <div key={item.label} className="space-y-1">
                    <Link
                      to={item.to}
                      onClick={() => {
                        triggerHaptic('light');
                        toggleSidebar();
                      }}
                      className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <IconComp className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{translate(item.label, language)}</span>
                    </Link>

                    {item.children && (
                      <div className="pl-6 space-y-1 pt-1">
                        {item.children.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = location.pathname === sub.to;
                          return (
                            <Link
                              key={sub.to}
                              to={sub.to}
                              onClick={() => {
                                triggerHaptic('light');
                                toggleSidebar();
                              }}
                              className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                isSubActive
                                  ? 'text-blue-600 bg-blue-50 font-bold'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <SubIcon className="h-3.5 w-3.5 shrink-0" />
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 px-2 py-2 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                (user?.username || user?.email?.split('@')[0] || 'G').toUpperCase().charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.username || user?.email?.split('@')[0] || (isAuthenticated ? 'Member' : 'Guest Viewer')}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {isOwnerUser ? 'Platform Owner' : isAdminUser ? 'Administrator' : isStaffUser ? 'Staff' : user?.is_vip_active ? 'VIP Member' : 'Standard'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;