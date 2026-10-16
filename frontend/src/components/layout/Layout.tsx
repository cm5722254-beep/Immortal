import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';
import { SearchModal } from './SearchModal';
import { NotificationModal } from './NotificationModal';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

const realNotifications = [
  {
    id: '1',
    icon: 'bell',
    title: 'ភាគថ្មីទើបចេញ • Episode Released',
    subtitle: 'លេបផ្កាយ (Swallowed Star) ភាគថ្មីត្រូវបានបន្ថែមហើយ',
    time: '5m ago',
    link: '/watch/swallowed-star/1',
    category: 'episode',
    tag: 'HD 4K',
    isRead: false,
  },
  {
    id: '2',
    icon: 'bookmark',
    title: 'ពេញនិយមខ្លាំង • Trending Pick',
    subtitle: 'គុជអមតះធៀននី (Renegade Immortal) វគ្គសង្គ្រាមព្រះ',
    time: '30m ago',
    link: '/donghua/renegade-immortal',
    category: 'watchlist',
    tag: 'Xianxia',
    isRead: false,
  },
  {
    id: '3',
    icon: 'clock',
    title: 'បន្តការទស្សនា • Resume Watching',
    subtitle: 'ចូលទស្សនាភាគដែលអ្នកបានទុកចោលមុននេះ',
    time: '2h ago',
    link: '/history',
    category: 'system',
    isRead: true,
  },
  {
    id: '4',
    icon: 'check',
    title: 'សមាជិក VIP • Premium Benefits',
    subtitle: 'ទស្សនាដោយគ្មានការរំខាន ជាមួយកម្រិតច្បាស់ 4K Ultra HD',
    time: '1d ago',
    link: '/vip',
    category: 'system',
    tag: 'VIP',
    isRead: true,
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  // Modal states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState(realNotifications);

  const handleSearchToggle = () => setIsSearchOpen((prev) => !prev);
  const handleNotificationToggle = () => setIsNotificationOpen((prev) => !prev);

  const handleSearchClose = () => setIsSearchOpen(false);
  const handleNotificationClose = () => setIsNotificationOpen(false);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setIsNotificationOpen(false);
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Top Navigation */}
      <TopNav
        onSearchToggle={handleSearchToggle}
        onNotificationToggle={handleNotificationToggle}
      />

      {/* Main Content */}
      <main className="flex-1 w-full pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile & Telegram Mini App Bottom Navigation Bar */}
      <MobileNav />

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-bg-card/40 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-xs text-text-secondary/60">
          <p>© {new Date().getFullYear()} ANIMEKH • Huang Anime. All rights reserved.</p>
          <div className="mt-3 flex items-center justify-center space-x-6 text-text-secondary/70">
            <a href="/explore" className="hover:text-text-primary transition-colors">
              Explore
            </a>
            <a href="/vip" className="hover:text-text-primary transition-colors">
              VIP Plans
            </a>
            <a href="/help" className="hover:text-text-primary transition-colors">
              Help & Support
            </a>
          </div>
        </div>
      </footer>

      {/* Search Modal Portal */}
      {isSearchOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <SearchModal
            isOpen={isSearchOpen}
            onClose={handleSearchClose}
            onSearch={(query: string) => {
              handleSearchClose();
              navigate(`/search?q=${encodeURIComponent(query)}`);
            }}
          />,
          document.body
        )}

      {/* Notification Modal Portal */}
      {isNotificationOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <NotificationModal
            notifications={notifications}
            onClose={handleNotificationClose}
            onMarkAllAsRead={handleMarkAllAsRead}
            totalUnread={notifications.filter((n) => !n.isRead).length}
          />,
          document.body
        )}
    </div>
  );
}