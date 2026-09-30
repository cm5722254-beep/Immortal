import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Tv, Sparkles, User, Crown, Download, Bookmark } from 'lucide-react';
import { triggerHaptic } from '../../utils/telegram';
import { useAuthStore } from '../../store/authStore';
import { usePlatform } from '../../utils/platform';

export function MobileNav() {
  const location = useLocation();
  const { user, isAuthenticated, isVip } = useAuthStore();
  const { isMobileApp } = usePlatform();
  const isVipUser = isVip || user?.is_vip_active || user?.is_vip;

  // Auto-hide bottom bar on watch page for full screen cinema immersion
  if (location.pathname.startsWith('/watch')) {
    return null;
  }

  // 📱 Tailored Tabs based on Platform (Android APK vs Telegram Mini App)
  const tabs = isMobileApp
    ? [
        { to: '/', icon: Home, label: 'ទំព័រដើម', activeMatches: ['/'] },
        { to: '/explore', icon: Sparkles, label: 'រុករក', activeMatches: ['/explore', '/donghua', '/anime', '/movies', '/drama'] },
        { to: '/downloads', icon: Download, label: 'ទាញយក', activeMatches: ['/downloads'] },
        { to: '/favorites', icon: Bookmark, label: 'បញ្ជីខ្ញុំ', activeMatches: ['/favorites', '/history'] },
        { to: '/profile', icon: User, label: 'គណនី', activeMatches: ['/profile', '/me', '/settings', '/vip'] },
      ]
    : [
        { to: '/', icon: Home, label: 'ទំព័រដើម', activeMatches: ['/'] },
        { to: '/donghua', icon: Sparkles, label: 'រឿងចិន 3D', activeMatches: ['/donghua'] },
        { to: '/anime', icon: Tv, label: 'រឿងជប៉ុន', activeMatches: ['/anime'] },
        { to: '/search', icon: Search, label: 'ស្វែងរក', activeMatches: ['/search'] },
        { to: '/profile', icon: User, label: 'គណនី', activeMatches: ['/profile', '/me', '/settings', '/favorites', '/history', '/vip', '/downloads'] },
      ];

  return (
    <nav
      aria-label="Mobile application navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#0A0E17]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.85)] select-none"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label, activeMatches }) => {
          const active = activeMatches.some(p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p)));
          const isProfile = to === '/profile';

          return (
            <Link
              key={to}
              to={to}
              onClick={() => triggerHaptic('light')}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 select-none relative group active:scale-95 ${
                active ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {isProfile && isAuthenticated && user ? (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                    active
                      ? 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-[0_0_12px_rgba(255,77,109,0.7)] scale-110'
                      : 'bg-white/10 text-gray-200 border border-white/20'
                  }`}>
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                ) : (
                  <div className={`p-1 rounded-xl transition-all duration-300 ${
                    active ? 'bg-rose-500/15 text-rose-400 shadow-[0_0_14px_rgba(255,77,109,0.35)]' : ''
                  }`}>
                    <Icon
                      strokeWidth={active ? 2.5 : 1.8}
                      className={`w-5 h-5 transition-transform duration-300 ${
                        active
                          ? 'text-rose-400 scale-110 drop-shadow-[0_0_10px_rgba(255,77,109,0.7)]'
                          : 'text-gray-400 group-hover:text-gray-200'
                      }`}
                    />
                  </div>
                )}

                {/* VIP golden crown badge indicator on profile tab */}
                {isProfile && isVipUser && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black flex items-center justify-center shadow-[0_0_6px_rgba(245,158,11,0.8)] ring-1 ring-[#0A0E17]">
                    <Crown className="w-2 h-2 fill-current" />
                  </span>
                )}

                {/* Active indicator dot */}
                {active && !isProfile && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-rose-500 shadow-[0_0_6px_#ff4d6d]" />
                )}
              </div>

              <span
                className={`text-[10px] mt-1 font-bold leading-none tracking-tight transition-colors truncate max-w-[68px] ${
                  active
                    ? 'text-rose-300 font-black'
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
  );
}

