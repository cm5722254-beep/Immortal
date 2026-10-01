import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Tv, Sparkles, User, Crown, Download } from 'lucide-react';
import { triggerHaptic } from '../../utils/telegram';
import { useAuthStore } from '../../store/authStore';
import { usePlatform } from '../../utils/platform';

export function MobileNav() {
  const location = useLocation();
  const { user, isAuthenticated, isVip } = useAuthStore();
  const { isMobileApp, isTelegram } = usePlatform();
  const isVipUser = isVip || user?.is_vip_active;

  if (location.pathname.startsWith('/watch') || ['/vip', '/settings', '/account', '/help', '/scan', '/referrals', '/notifications'].includes(location.pathname)) return null;

  const miniApp = isMobileApp || isTelegram;
  const tabs = miniApp
    ? [
        { to: '/', icon: Home, label: 'Home', activeMatches: ['/'] },
        { to: '/explore', icon: Sparkles, label: 'Explore', activeMatches: ['/explore', '/donghua', '/anime', '/movies', '/drama'] },
        { to: '/shorts', icon: Tv, label: 'Short', activeMatches: ['/shorts'] },
        { to: '/downloads', icon: Download, label: 'Download', activeMatches: ['/downloads'] },
        { to: '/profile', icon: User, label: 'Me', activeMatches: ['/profile', '/me', '/settings', '/favorites', '/history', '/vip'] },
      ]
    : [
        { to: '/', icon: Home, label: 'Home', activeMatches: ['/'] },
        { to: '/donghua', icon: Sparkles, label: 'Donghua', activeMatches: ['/donghua'] },
        { to: '/anime', icon: Tv, label: 'Anime', activeMatches: ['/anime'] },
        { to: '/search', icon: Search, label: 'Search', activeMatches: ['/search'] },
        { to: '/profile', icon: User, label: 'Me', activeMatches: ['/profile', '/me', '/settings', '/favorites', '/history', '/vip', '/downloads'] },
      ];

  return (
    <nav aria-label="Mobile application navigation" className={`fixed bottom-0 inset-x-0 z-40 md:hidden backdrop-blur-3xl px-2 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] select-none ${miniApp ? 'mini-bottom-nav' : 'bg-black/80 border-t border-white/[0.04]'}`}>
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label, activeMatches }) => {
          const active = activeMatches.some((path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path)));
          const isProfile = to === '/profile';
          return (
            <Link key={to} to={to} onClick={() => triggerHaptic('light')} aria-label={label} aria-current={active ? 'page' : undefined} className={`flex-1 flex flex-col items-center justify-center py-1 px-1 transition-all duration-200 select-none relative group active:scale-95 ${active ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              <div className="relative flex items-center justify-center">
                {isProfile && isAuthenticated && user ? (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${active ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-200 border border-white/20'}`}>
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                ) : (
                  <div className={`p-1 rounded-xl transition-all ${active && miniApp ? 'bg-emerald-500/15' : ''}`}>
                    <Icon strokeWidth={active ? 2.2 : 1.8} className={`w-[20px] h-[20px] ${active && miniApp ? 'text-emerald-400' : active ? 'text-rose-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
                  </div>
                )}
                {isProfile && isVipUser && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black flex items-center justify-center ring-1 ring-[#0A0E17]"><Crown className="w-2 h-2 fill-current" /></span>}
              </div>
              <span className={`text-[10px] mt-1 leading-none tracking-tight truncate max-w-[68px] ${active ? 'text-white font-semibold' : 'text-gray-400'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
