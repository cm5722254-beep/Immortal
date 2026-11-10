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
import { translate, useLanguageStore } from '../../store/languageStore';

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
  const language = useLanguageStore((state) => state.language);
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
    <nav className={`top-nav sticky top-0 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-2.5 sm:px-6 py-2 sm:py-2.5 z-40 transition-colors shadow-xs ${className}`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-2">
        {/* Left Side: Toggle Sidebar & Brand & Desktop Nav Links */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex min-h-10 items-center gap-2 rounded-xl focus-visible:outline-none shrink-0 select-none" aria-label="MerDonghua home">
            <img src="/logo.png" alt="" width="32" height="32" className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl object-cover ring-1 ring-slate-200 shadow-xs shrink-0" />
            <span className="font-display text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              Mer<span className="text-blue-600">Donghua</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1 pl-3">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                    ${isActive
                      ? 'text-blue-600 bg-blue-50 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    {translate(link.label, language)}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Right Side: Search, Notifications, Language, User */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <button
            id="search-button"
            onClick={handleSearchClick}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
            aria-label={translate('Search', language)}
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <NotificationBadge
            onClick={onNotificationToggle}
            className="text-slate-600 shrink-0"
          />

          <Link
            to="/vip"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-xs transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Crown className="w-3.5 h-3.5 fill-slate-950" />
            <span>VIP</span>
          </Link>

          <LanguageSwitcher className="hidden sm:block shrink-0" />

          {isAuthenticated ? (
            <UserMenu
              user={user}
              isAuthenticated={isAuthenticated}
              onLogout={logout}
            />
          ) : (
            <div className="flex items-center shrink-0">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs hover:scale-105 active:scale-95"
              >
                <span>{translate('Login', language)}</span>
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
