import { Link, useLocation } from 'react-router-dom';
import { Bookmark, Compass, Home, Search, User } from 'lucide-react';
import { triggerHaptic } from '../../utils/telegram';
import { useLanguageStore, translate } from '../../store/languageStore';
import { usePlatform } from '../../utils/platform';

const tabs = [
  { to: '/', icon: Home, label: 'Home', matches: ['/'] },
  { to: '/explore', icon: Compass, label: 'Explore', matches: ['/explore', '/donghua', '/anime', '/movies', '/movie', '/drama', '/free'] },
  { to: '/search', icon: Search, label: 'Search', matches: ['/search'] },
  { to: '/library', icon: Bookmark, label: 'Library', matches: ['/library', '/favorites', '/history', '/downloads'] },
  { to: '/profile', icon: User, label: 'Profile', matches: ['/profile', '/me', '/account', '/settings', '/vip', '/notifications', '/help', '/referrals'] },
];

export function MobileNav() {
  const location = useLocation();
  const language = useLanguageStore((state) => state.language);
  const { isMobileApp, isTelegram } = usePlatform();
  const miniApp = isMobileApp || isTelegram;
  const isTitleDetail = ['/anime/', '/donghua/', '/drama/', '/movie/'].some((prefix) => location.pathname.startsWith(prefix));

  if (location.pathname.startsWith('/watch') || ['/login', '/register'].includes(location.pathname)) return null;
  if (isTelegram && isTitleDetail) return null;

  return (
    <nav aria-label={translate('Primary navigation', language)} className={`mini-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 px-2 pt-1.5 pb-[max(.4rem,env(safe-area-inset-bottom))] backdrop-blur-2xl shadow-md ${miniApp ? '' : 'md:hidden'}`}>
      <div className="mx-auto flex min-h-14 max-w-xl items-stretch justify-around">
        {tabs.map(({ to, icon: Icon, label, matches }) => {
          const active = matches.some((path) => path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`));
          return (
            <Link
              key={to}
              to={to}
              onClick={() => triggerHaptic('light')}
              aria-label={translate(label, language)}
              aria-current={active ? 'page' : undefined}
              className={`mini-nav-item group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center transition-all duration-200 focus-visible:outline-none ${active ? 'is-active text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 1.75} />
              <span className="max-w-full truncate text-[10px] font-semibold tracking-tight leading-tight">{translate(label, language)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
