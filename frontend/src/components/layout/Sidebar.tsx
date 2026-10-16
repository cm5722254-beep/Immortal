import { useNavStore } from '../../store/navStore';
import { useAuthStore } from '../../store/authStore';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layout,
  Film,
  Play,
  Bookmark,
  Clock,
  Bell,
  User as UserIcon,
  Settings,
  Shield,
  Crown,
  X,
} from 'lucide-react';

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

  const isOwnerUser = isOwner || user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  const isAdminUser = isOwnerUser || isAdmin || user?.role === 'ADMIN';
  const isStaffUser = isStaff || user?.role === 'STAFF';

  const sidebarItems: SidebarItem[] = [
    {
      label: 'Home',
      to: '/',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      label: 'Explore',
      to: '/explore',
      icon: Layout,
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
    // Admin section
    {
      label: 'Admin',
      to: '/admin',
      icon: Shield,
      visible: Boolean(isAdminUser || isOwnerUser),
      children: [
        {
          label: 'Dashboard',
          to: '/admin',
          icon: LayoutDashboard,
        },
        {
          label: 'Content',
          to: '/admin/anime',
          icon: Film,
        },
        {
          label: 'Users',
          to: '/admin/users',
          icon: UserIcon,
        },
        {
          label: 'Theme & Settings',
          to: '/admin/theme',
          icon: Settings,
        },
      ],
    },
    // Owner section
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
          className="fixed inset-0 bg-black/60 z-[990] md:hidden backdrop-blur-xs transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-bg-card border-r border-border-subtle
                   px-4 py-6 overflow-y-auto transition-transform duration-300
                   ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                   z-[995] flex flex-col justify-between`}
      >
        <div>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-3 py-2 mb-6 border-b border-border-subtle">
            <Link to="/" onClick={() => isSidebarOpen && toggleSidebar()} className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent-primary text-white font-black text-sm">
                A
              </div>
              <h3 className="font-display font-bold text-text-primary text-lg tracking-wider">
                ANIMEKH
              </h3>
            </Link>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors duration-200"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="space-y-1">
            {sidebarItems
              .filter((item) => item.visible)
              .map((item) => {
                const IconComp = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <div key={item.label} className="space-y-1">
                    <Link
                      to={item.to}
                      onClick={() => toggleSidebar()}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200
                                ${isActive
                                  ? 'bg-accent-primary text-white shadow-md'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                    >
                      <IconComp className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
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
                              onClick={() => toggleSidebar()}
                              className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                                        ${isSubActive
                                          ? 'text-accent-primary bg-accent-primary/10'
                                          : 'text-text-secondary/80 hover:text-text-primary hover:bg-white/5'}`}
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

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-border-subtle">
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs">
              {(user?.username || user?.email?.split('@')[0] || 'G').toUpperCase().charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">
                {user?.username || user?.email?.split('@')[0] || 'Guest'}
              </p>
              <p className="text-[10px] text-text-secondary/70 truncate">
                {isOwnerUser ? 'Owner' : isAdminUser ? 'Admin' : isStaffUser ? 'Staff' : isAuthenticated ? 'Member' : 'Visitor'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}