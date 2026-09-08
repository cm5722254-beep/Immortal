import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Crown, Sparkles, User } from 'lucide-react';
import { triggerHaptic } from '../../utils/telegram';

export function MobileNav() {
  const location = useLocation();

  // Auto-hide bottom bar on watch page for full screen immersion
  if (location.pathname.startsWith('/watch')) {
    return null;
  }

  const tabs = [
    { to: '/', icon: Home, label: 'ទំព័រដើម', activeMatches: ['/'] },
    { to: '/donghua', icon: Sparkles, label: 'រឿងចិន 3D', activeMatches: ['/donghua'] },
    { to: '/vip', icon: Crown, label: 'VIP', activeMatches: ['/vip'] },
    { to: '/search', icon: Search, label: 'ស្វែងរក', activeMatches: ['/search'] },
    { to: '/profile', icon: User, label: 'គណនី', activeMatches: ['/profile', '/me', '/settings', '/favorites', '/history'] },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)]">
      <nav
        aria-label="Platform navigation"
        className="w-full backdrop-blur-2xl border-t px-2 py-2 shadow-[0_-10px_35px_rgba(0,0,0,0.85)] bg-[#080d1a]/92 border-white/10"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map(({ to, icon: Icon, label, activeMatches }) => {
            const active = activeMatches.some(p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p)));

            return (
              <Link
                key={to}
                to={to}
                onClick={() => triggerHaptic('light')}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="flex-1 flex flex-col items-center justify-center py-1 px-1 transition-all duration-200 active:scale-90 group select-none relative"
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    strokeWidth={active ? 2.5 : 1.8}
                    className={`w-5 h-5 transition-all duration-200 ${
                      active
                        ? 'text-rose-400 scale-110 drop-shadow-[0_0_12px_rgba(255,77,109,0.7)]'
                        : 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  />
                  {active && (
                    <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ff4d6d]" />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-bold leading-none tracking-tight transition-colors truncate max-w-[68px] ${
                    active
                      ? 'text-white'
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
