import { useState } from 'react';
import { useNavStore } from '../../store/navStore';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { Link, useLocation } from 'react-router-dom';
import {
  Dashboard,
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
  Login,
  LogOut,
  Plus,
} from 'lucide-react';

export function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useNavStore();
  const { user, isAuthenticated, isStaff, isOwner, isAdmin, canManageContent } = useAuthStore();
  const { language } = useLanguageStore((state) => state.language);
  const location = useLocation();

  // Calculate user role info
  const isOwnerUser = isOwner || user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  const isAdminUser = isOwnerUser || isAdmin || user?.role === 'ADMIN';
  const isStaffUser = isStaff || user?.role === 'STAFF';
  const canManage = canManageContent || isAdminUser || isStaffUser;

  // Sidebar items
  const sidebarItems = [
    {
      label: 'dashboard',
      to: '/',
      icon: Dashboard,
      visible: true,
    },
    {
      label: 'explore',
      to: '/explore',
      icon: Layout,
      visible: true,
    },
    {
      label: 'movies',
      to: '/movies',
      icon: Film,
      visible: true,
    },
    {
      label: 'tv_shows',
      to: '/drama',
      icon: Play,
      visible: true,
    },
    {
      label: 'my_list',
      to: '/favorites',
      icon: Bookmark,
      visible: isAuthenticated,
    },
    {
      label: 'history',
      to: '/history',
      icon: Clock,
      visible: isAuthenticated,
    },
    {
      label: 'notifications',
      to: '/notifications',
      icon: Bell,
      visible: isAuthenticated,
    },
    // Admin section
    {
      label: 'admin',
      to: '/admin',
      icon: Shield,
      visible: isAdminUser || isOwnerUser,
      children: [
        {
          label: 'dashboard',
          to: '/admin/dashboard',
          icon: Dashboard,
        },
        {
          label: 'content',
          to: '/admin/anime',
          icon: Film,
        },
        {
          label: 'users',
          to: '/admin/users',
          icon: User as UserIcon,
        },
        {
          label: 'settings',
          to: '/admin/theme',
          icon: Settings,
        },
      ]
    },
    // Owner section
    {
      label: 'owner',
      to: '/admin/owner',
      icon: Crown,
      visible: isOwnerUser,
      children: [
        {
          label: 'control_panel',
          to: '/admin/owner',
          icon: Dashboard,
        },
        {
          label: 'reports',
          to: '/admin/owner/reports',
          icon: Layout,
        },
      ]
    },
  ];

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    toggleSidebar();
  };

  // Handle item click
  const handleItemClick = (to: string) => {
    // Close sidebar on item click (except for headers)
    toggleSidebar();
    // Navigation would be handled by the Link component
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 bg-bg-card border-r border-border-subtle
                 px-4 py-8 overflow-y-auto transition-transform duration-300
                 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                 z-[[var(--animekh-z-index-fixed)]}`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-4 mb-6 border-b border-border-subtle">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-primary/20">
            <div className="text-text-xs font-medium">A</div>
          </div>
          <h3 className="font-display text-text-primary hidden md:block">
            ANIMEKH
          </h3>
        </div>
        <button
          onClick={handleSidebarToggle}
          className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4 text-text-secondary" />
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="space-y-2">
        {sidebarItems.map((item, index) => (
          <div key={index} className="mb-2">
            {/* Header items (sections with children) */}
            {item.children && (
              <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent-primary/5 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    {item.icon === Dashboard && <Dashboard className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Layout && <Layout className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Film && <Film className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Play && <Play className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Bookmark && <Bookmark className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Clock && <Clock className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Bell && <Bell className="h-4 w-4 text-text-secondary" />}
                    {item.icon === User as UserIcon && <User as UserIcon className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Settings && <Settings className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Shield && <Shield className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Crown && <Crown className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Login && <Login className="h-4 w-4 text-text-secondary" />}
                    {item.icon === LogOut && <LogOut className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Plus && <Plus className="h-4 w-4 text-text-secondary" />}
                  </div>
                  <span className="text-text-sm font-medium text-text-secondary">
                    {item.label}
                  </span>
                </div>
                {/* Chevron indicator for expandable sections */}
                <div className="w-4 h-4 flex items-center justify-center text-text-xs">
                  {/* Would use chevron-down/up icon */}
                </div>
              </div>

              {/* Children items (when expanded) */}
              {/* Would add expansion logic here */}
            )}

            {/* Regular items */}
            {!item.children && (
              <Link
                to={item.to}
                className={`${item.to === location.pathname ?
                           'sidebar-item-active' : 'sidebar-item'}
                           flex items-start space-x-3 px-3 py-2 text-left
                           rounded-lg hover:bg-accent-primary/5
                           transition-colors duration-200`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-4 h-4 flex items-center justify-center">
                    {item.icon === Dashboard && <Dashboard className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Layout && <Layout className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Film && <Film className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Play && <Play className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Bookmark && <Bookmark className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Clock && <Clock className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Bell && <Bell className="h-4 w-4 text-text-secondary" />}
                    {item.icon === User as UserIcon && <User as UserIcon className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Settings && <Settings className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Shield && <Shield className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Crown && <Crown className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Login && <Login className="h-4 w-4 text-text-secondary" />}
                    {item.icon === LogOut && <LogOut className="h-4 w-4 text-text-secondary" />}
                    {item.icon === Plus && <Plus className="h-4 w-4 text-text-secondary" />}
                  </div>
                  <span className="flex-1 text-text-sm font-medium text-text-secondary">
                    {item.label}
                  </span>
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="mt-6 pt-4 border-t border-border-subtle">
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="text-text-xs font-medium">
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-text-xs font-medium text-text-primary">
              {user?.username || user?.email?.split('@')[0] || 'Guest'}
            </p>
            {isAuthenticated && (
              <div className="flex items-center space-x-1 text-text-xs">
                {isOwnerUser && (
                  <span className="w-2 h-2 rounded-full bg-accent-primary" />
                )}
                {isAdminUser && !isOwnerUser && (
                  <span className="w-2 h-2 rounded-full bg-accent-primary/50" />
                )}
                {isStaffUser && !isAdminUser && !isOwnerUser && (
                  <span className="w-2 h-2 rounded-full bg-accent-primary/70" />
                )}
                {!isAuthenticated && (
                  <span className="w-2 h-2 rounded-full bg-text-secondary/50" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}