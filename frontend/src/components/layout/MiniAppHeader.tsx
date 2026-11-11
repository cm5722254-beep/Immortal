import { Bell, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

export function MiniAppHeader() {
  return (
    <header className="mini-app-chrome sticky top-0 z-40 border-b border-border-subtle bg-bg-card/90 pt-[max(.25rem,env(safe-area-inset-top))] backdrop-blur-xl transition-colors shadow-xs">
      <div className="mx-auto flex min-h-14 max-w-3xl items-center justify-between gap-2 px-3 sm:px-5">
        <Link to="/" className="flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline-none shrink-0" aria-label="MerDonghua home">
          <img src="/logo.png" width="32" height="32" alt="" className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-border-subtle shadow-xs" />
          <span className="font-display text-base font-extrabold tracking-tight text-text-primary whitespace-nowrap sm:text-lg">
            Mer<span className="text-blue-600">Donghua</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link to="/search" className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-card-subtle transition-colors" aria-label="Search">
            <Search aria-hidden="true" className="h-4.5 w-4.5" />
          </Link>
          <ThemeToggle compact />
          <Link to="/notifications" className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-card-subtle transition-colors" aria-label="Notifications">
            <Bell aria-hidden="true" className="h-5 w-5" />
          </Link>
          <LanguageSwitcher className="mini-language-switcher" />
        </div>
      </div>
    </header>
  );
}
