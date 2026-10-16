import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Search,
  Menu,
  Crown,
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { useNavStore } from '../../store/navStore';
import { SearchModal } from './SearchModal';
import { UserMenu } from './UserMenu';
import { NotificationBadge } from './NotificationBadge';
import { LanguageSwitcher } from './LanguageSwitcher';

export interface TopNavProps {
  className?: string;
  onSearchToggle?: () => void;
  onNotificationToggle?: () => void;
  onUserMenuToggle?: () => void;
}

export function TopNav({
  className = '',
  onSearchToggle,
  onNotificationToggle,
}: TopNavProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { toggleSidebar } = useNavStore();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/donghua', label: 'Donghua' },
    { to: '/anime', label: 'Anime' },
    { to: '/movies', label: 'Movies' },
    { to: '/drama', label: 'Drama' },
    { to: '/explore', label: 'Explore' },
  ];

  const handleSearchClick = () => {
    if (onSearchToggle) {
      onSearchToggle();
    } else {
      setIsSearchOpen(true);
    }
  };

  return (
    <nav className={`top-nav sticky top-0 bg-bg-card/90 backdrop-blur-md border-b border-border-subtle px-4 sm:px-6 py-3 z-40 ${className}`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left Side: Toggle Sidebar & Brand & Desktop Nav Links */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors duration-200"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center space-x-2">
            <span className="font-display font-extrabold text-xl tracking-wider bg-gradient-to-r from-accent-primary to-rose-400 bg-clip-text text-transparent">
              ANIMEKH
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1 pl-4">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200
                    ${isActive
                      ? 'text-accent-primary bg-accent-primary/10 font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Right Side: Search, Notifications, Language, User */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            id="search-button"
            onClick={handleSearchClick}
            className="p-2 rounded-full hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors duration-200"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <NotificationBadge
            onClick={onNotificationToggle}
            className="text-text-secondary"
          />

          <Link
            to="/vip"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Crown className="w-3.5 h-3.5 fill-black" />
            <span>VIP</span>
          </Link>

          <LanguageSwitcher className="hidden sm:block" />

          {isAuthenticated ? (
            <UserMenu
              user={user}
              isAuthenticated={isAuthenticated}
              onLogout={logout}
            />
          ) : (
            <div className="flex items-center">
              <Link
                to="/login"
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all shadow-sm hover:scale-105 active:scale-95"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>ចូលគណនី</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {isSearchOpen && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSearch={(q) => {
            setIsSearchOpen(false);
            window.location.href = `/search?q=${encodeURIComponent(q)}`;
          }}
        />
      )}
    </nav>
  );
}