import { Bell, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from './LanguageSwitcher';

export function MiniAppHeader() {
  return (
    <header className="mini-app-chrome sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 pt-[max(.25rem,env(safe-area-inset-top))] backdrop-blur-xl transition-colors shadow-xs">
      <div className="mx-auto flex min-h-14 max-w-3xl items-center justify-between gap-2 px-3 sm:px-5">
        <Link to="/" className="flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline-none shrink-0" aria-label="MerDonghua home">
          <img src="/logo.png" width="32" height="32" alt="" className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 shadow-xs" />
          <span className="font-display text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap sm:text-lg">
            Mer<span className="text-blue-600">Donghua</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link to="/vip" className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs" aria-label="VIP membership">
            <Crown aria-hidden="true" className="h-3.5 w-3.5 fill-slate-950" />
            <span>VIP</span>
          </Link>
          <Link to="/notifications" className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors" aria-label="Notifications">
            <Bell aria-hidden="true" className="h-5 w-5" />
          </Link>
          <LanguageSwitcher className="mini-language-switcher" />
        </div>
      </div>
    </header>
  );
}
