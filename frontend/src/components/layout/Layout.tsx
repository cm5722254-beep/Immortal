import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { useNavStore } from '../../store/navStore';
import { Link, useLocation } from 'react-router-dom';
import {
  TopNav
} from './TopNav';
import {
  SearchModal
} from './SearchModal';
import {
  NotificationBadge
} from './NotificationBadge';
import {
  NotificationModal
} from './NotificationModal';
import {
  UserMenu
} from './UserMenu';
import {
  LanguageSwitcher
} from './LanguageSwitcher';
import {
  Sidebar
} from './Sidebar';

// Mock notifications data - in a real app, this would come from API
const mockNotifications = [
  {
    id: '1',
    icon: 'bell',
    title: 'New Episode Available',
    subtitle: 'Attack on Titan Final Season Episode 12 is now available',
    time: '2m ago',
    link: '/anime/attack-on-titan-final-season',
    category: 'episode',
    isRead: false,
  },
  {
    id: '2',
    icon: 'bookmark',
    title: 'Added to Your Watchlist',
    subtitle: 'You added Demon Slayer to your watchlist',
    time: '15m ago',
    link: '/favorites',
    category: 'watchlist',
    isRead: false,
  },
  {
    id: '3',
    icon: 'clock',
    title: 'Continue Watching',
    subtitle: 'You stopped watching Jujutsu Kaisen at 12:34',
    time: '1h ago',
    link: '/history',
    category: 'system',
    isRead: true,
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, onLogout } = useAuthStore();
  const { language } = useLanguageStore((state) => state.language);
  const { isSidebarOpen, toggleSidebar } = useNavStore();
  const location = useLocation();

  // Modal states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Handle modal toggles
  const handleSearchToggle = () => setIsSearchOpen(!isSearchOpen);
  const handleNotificationToggle = () => setIsNotificationOpen(!isNotificationOpen);
  const handleUserMenuToggle = () => setIsUserMenuOpen(!isUserMenuOpen);

  // Handle modal closes
  const handleSearchClose = () => setIsSearchOpen(false);
  const handleNotificationClose = () => setIsNotificationOpen(false);
  const handleUserMenuClose = () => setIsUserMenuOpen(false);

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    // In a real app, this would call an API
    setIsNotificationOpen(false);
  };

  return (
    <>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className={`min-h-screen bg-bg-base transition-all duration-300
                   ${isSidebarOpen ? 'ml-[256px]' : 'ml-0'}
                   z-[[var(--animekh-z-index-default)]]`}
      >
        {/* Top Navigation */}
        <TopNav
          onSearchToggle={handleSearchToggle}
          onNotificationToggle={handleNotificationToggle}
          onUserMenuToggle={handleUserMenuToggle}
        />

        {/* Main Content */}
        <main className="flex-1 p-6 sm:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border-subtle bg-bg-card/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center">
            <p className="text-text-xs text-text-secondary/50">
              © {new Date().getFullYear()} ANIMEKH. All rights reserved.
            </p>
            <div className="mt-4 space-x-4 justify-center">
              <a href="#" className="text-text-xs text-text-secondary/50 hover:text-text-secondary">
                Terms of Service
              </a>
              <a href="#" className="text-text-xs text-text-secondary/50 hover:text-text-secondary">
                Privacy Policy
              </a>
              <a href="#" className="text-text-xs text-text-secondary/50 hover:text-text-secondary">
                Contact Us
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Search Modal Portal */}
      {createPortal(
        <SearchModal
          isOpen={isSearchOpen}
          onClose={handleSearchClose}
          onSearch={(query: string) => {
            console.log('Searching for:', query);
            // In a real app, this would navigate to search results
            handleSearchClose();
          }}
        />,
        document.body
      )}

      {/* Notification Modal Portal */}
      {createPortal(
        <NotificationModal
          notifications={mockNotifications}
          onClose={handleNotificationClose}
          onMarkAllAsRead={handleMarkAllAsRead}
          totalUnread={mockNotifications.filter(n => !n.isRead).length}
        />,
        document.body
      )}

      {/* User Menu Portal */}
      {createPortal(
        <UserMenu
          user={user || {}}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
        />,
        document.body
      )}
    </>
  );
}