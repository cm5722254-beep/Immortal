import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Logo,
  Search,
  Bell,
  User as UserIcon,
  Shield,
  Crown,
  LogOut,
  Bookmark,
  ChevronDown,
  Send,
  Menu,
  X,
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { usePlatform } from '../../utils/platform';
import { useLanguageStore } from '../../store/languageStore';
import { getVipContactUrl } from '../../utils/vip';
import { useThemeStore } from '../../store/themeStore';
import { SearchModal } from './SearchModal';
import { UserMenu } from './UserMenu';
import { NotificationBadge } from './NotificationBadge';
import { LanguageSwitcher } from './LanguageSwitcher';

interface TopNavProps {
  className?: string;
}

export function TopNav({ className }: TopNavProps = {}) {
  const { isWeb } = usePlatform();
  const { user, isAuthenticated, isStaff, isOwner, isAdmin, canManageContent, logout } = useAuthStore();
  const { fetchSiteTheme } = useThemeStore();
  const { language } = useLanguageStore((state) => state.language);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; count: number }>>([]);

  const isOwnerUser = isOwner || user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  const isAdminUser = isOwnerUser || isAdmin || user?.role === 'ADMIN';
  const isStaffUser = isStaff || user?.role === 'STAFF';
  const canManage = canManageContent || isAdminUser || isStaffUser;

  // Navigation links based on user authentication and role
  const navLinks = [
    { to: '/', label: 'home', key: 'home' },
    { to: '/donghua', label: 'donghua', key: 'donghua' },
    { to: '/anime', label: 'anime', key: 'anime' },
    { to: '/movies', label: 'movies', key: 'movies' },
    { to: '/drama', label: 'drama', key: 'drama' },
    { to: '/explore', label: 'explore', key: 'explore' },
  ];

  // User menu items
  const userMenuItems = [
    {
      label: 'profile',
      to: '/profile',
      icon: UserIcon,
      visible: isAuthenticated,
    },
    {
      label: 'watchlist',
      to: '/favorites',
      icon: Bookmark,
      visible: isAuthenticated,
    },
    {
      label: 'history',
      to: '/history',
      icon: 'clock', // We'll use a custom clock icon or from lucide
      visible: isAuthenticated,
    },
    {
      label: 'notifications',
      to: '/notifications',
      icon: Bell,
      visible: isAuthenticated,
    },
    {
      label: 'settings',
      to: '/settings',
      icon: 'settings', // We'll use settings icon
      visible: isAuthenticated,
    },
    {
      label: 'logout',
      to: '#',
      icon: LogOut,
      visible: isAuthenticated,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        logout();
      },
    },
    // Admin-only items
    {
      label: 'admin_dashboard',
      to: '/admin',
      icon: Shield,
      visible: isAdminUser || isOwnerUser,
    },
    {
      label: 'content_management',
      to: '/admin/anime',
      icon: 'book-open', // We'll use book icon
      visible: canManage,
    },
    {
      label: 'users_management',
      to: '/admin/users',
      icon: 'users', // We'll use users icon
      visible: isAdminUser || isOwnerUser,
    },
    // Owner-only items
    {
      label: 'owner_control',
      to: '/admin/owner',
      icon: Crown,
      visible: isOwnerUser,
    },
  ];

  // Handle search toggle
  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: string) => {
    // Language change logic would go here
    console.log(`Language changed to: ${newLanguage}`);
  };

  // Fetch notifications (placeholder - would be replaced with actual API call)
  useEffect(() => {
    // Simulate fetching notifications
    const fetchNotifications = async () => {
      try {
        // In a real app, this would call an API endpoint
        // const response = await api.get('/notifications');
        // setNotifications(response.data);

        // For now, simulate some data
        setNotifications([
          { id: '1', count: 3 },
          { id: '2', count: 1 },
        ]);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSearchOpen && event.target instanceof HTMLElement) {
        // Check if click is outside search modal and search button
        const searchModal = document.getElementById('search-modal');
        const searchButton = document.getElementById('search-button');

        if (!searchModal?.contains(event.target as Node) &&
            !searchButton?.contains(event.target as Node)) {
          setIsSearchOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  return (
    <nav className={`top-nav bg-bg-card/80 backdrop-blur-sm border-b border-border-subtle px-4 sm:px-6 py-4 z-50 ${className}`}>
      <div className="flex flex-wrap items-center justify-between px-4">
        {/* Left Side - Logo and Navigation */}
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Logo className="h-8 w-auto" />
            <span className="font-display text-text-primary hidden md:block">
              ANIMEKH
            </span>
          </Link>

          {/* Navigation Links - Hidden on mobile */}
          <div className="hidden md:flex md:space-x-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.key}
                to={link.to}
                className={`${link.to === location.pathname ? 'nav-link-active' : 'nav-link'}
                           text-text-secondary font-medium hover:text-text-primary
                           px-3 py-2 rounded-md transition-colors duration-200
                           hover:bg-accent-primary/5`}
                aria-current={link.to === location.pathname ? 'page' : undefined}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Center - Search Button */}
        <div className="flex items-center space-x-3">
          {/* Search Button */}
          <button
            id="search-button"
            onClick={handleSearchToggle}
            className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-text-secondary" />
          </button>

          {/* Notification Badge */}
          <NotificationBadge
            notifications={notifications}
            className="relative"
          />

          {/* Language Switcher */}
          <LanguageSwitcher
            onLanguageChange={handleLanguageChange}
            className="hidden md:block"
          />

          {/* User Menu or Login/Register */}
          {isAuthenticated ? (
            <UserMenu
              user={user}
              isAuthenticated={isAuthenticated}
              onLogout={logout}
            />
          ) : (
            <>
              <Link
                to="/login"
                className="btn btn-outline px-4 py-2 text-sm"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn btn-primary px-4 py-2 text-sm ml-2"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <SearchModal
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </nav>
  );
}