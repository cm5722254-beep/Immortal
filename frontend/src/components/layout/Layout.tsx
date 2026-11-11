import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';
import { SearchModal } from './SearchModal';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { MiniAppHeader } from './MiniAppHeader';
import { usePlatform } from '../../utils/platform';

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isMobileApp, isTelegram } = usePlatform();
  const isMiniApp = isMobileApp || isTelegram;
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className={`app-shell min-h-[100dvh] bg-bg-base text-text-primary flex flex-col ${isMiniApp ? 'mini-app-layout telegram-app-layout' : 'website-app-layout'}`}>
      {isMiniApp ? (
        <MiniAppHeader />
      ) : (
        <>
          <Sidebar />
          <TopNav
            onSearchToggle={() => setIsSearchOpen(true)}
            onNotificationToggle={() => navigate('/notifications')}
          />
        </>
      )}

      <main className={`app-main flex-1 w-full pb-20 md:pb-0 ${isMiniApp ? 'mini-app-main' : ''}`}>
        {children}
      </main>

      <MobileNav />

      {!isMiniApp && (
        <footer className="app-footer border-t border-border-subtle bg-bg-card/70 backdrop-blur-sm mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-7 text-center text-xs text-text-secondary">
            <p className="font-semibold text-text-primary">© {new Date().getFullYear()} MerDonghua</p>
            <nav aria-label="Footer" className="mt-2.5 flex items-center justify-center gap-6">
              <a href="/explore" className="hover:text-text-primary transition-colors">Explore</a>
              <a href="/favorites" className="hover:text-text-primary transition-colors">Library</a>
              <a href="/history" className="hover:text-text-primary transition-colors">History</a>
              <a href="/help" className="hover:text-text-primary transition-colors">Help &amp; Support</a>
            </nav>
          </div>
        </footer>
      )}

      {isSearchOpen && typeof document !== 'undefined' && createPortal(
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSearch={(query: string) => {
            setIsSearchOpen(false);
            navigate(`/search?q=${encodeURIComponent(query)}`);
          }}
        />,
        document.body,
      )}
    </div>
  );
}
