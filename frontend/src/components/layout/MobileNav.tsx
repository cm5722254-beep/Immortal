import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bookmark, Menu } from 'lucide-react';
import { triggerHaptic } from '../../utils/telegram';

export function MobileNav() {
  const location = useLocation();

  // Auto-hide bottom bar on watch page for full screen immersion
  if (location.pathname.startsWith('/watch')) {
    return null;
  }

  const tabs = [
    { to: '/', icon: Home, label: 'ទំព័រដើម', activeMatches: ['/'] },
    { to: '/search', icon: Search, label: 'ស្វែងរក', activeMatches: ['/search'] },
    { to: '/favorites', icon: Bookmark, label: 'បណ្ណាល័យ', activeMatches: ['/favorites', '/library', '/history'] },
    { to: '/profile', icon: Menu, label: 'គណនី', activeMatches: ['/profile', '/me', '/settings'] },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)]">
      <nav
        aria-label="Platform navigation"
        className="w-full backdrop-blur-2xl border-t px-2 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.9)] bg-[#141414]/95 border-white/[0.08]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {tabs.map(({ to, icon: Icon, label, activeMatches }) => {
            const active = activeMatches.includes(location.pathname);

            return (
              <Link
                key={to}
                to={to}
                onClick={() => triggerHaptic('light')}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="flex-1 flex flex-col items-center justify-center py-1 px-1.5 transition-all duration-200 active:scale-90 group select-none relative"
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    strokeWidth={active ? 2.5 : 1.8}
                    className={`w-5 h-5 transition-all duration-200 ${
                      active
                        ? 'text-[#e8452c] scale-110 drop-shadow-[0_0_10px_rgba(232,69,44,0.6)]'
                        : 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  />
                  {active && (
                    <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#e8452c] shadow-[0_0_8px_#e8452c]" />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-semibold leading-none tracking-tight transition-colors truncate max-w-[64px] ${
                    active
                      ? 'text-white font-bold'
                      : 'text-gray-400 group-hover:text-gray-300'
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
