import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const CATEGORIES = [
  { label: 'For You', to: '/' },
  { label: 'Donghua', to: '/donghua' },
  { label: 'Anime', to: '/anime' },
  { label: 'Drama', to: '/drama' },
  { label: 'Movies', to: '/movies' },
  { label: 'Explore', to: '/explore' },
];

export function MiniAppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (value) navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <header className="mini-app-chrome">
      <div className="mini-app-toolbar">
        <Link to="/" className="mini-brand" aria-label="Huang Anime home">Huang<span>+</span></Link>
        <form className="mini-search-form" onSubmit={submitSearch} role="search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anime and drama" aria-label="Search anime and drama" />
          <button type="submit" aria-label="Search"><Search className="w-5 h-5" /></button>
        </form>
        <Link to="/vip" className="mini-vip">VIP</Link>
      </div>
      <nav className="mini-categories" aria-label="Browse categories">
        {CATEGORIES.map(({ label, to }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname === to || location.pathname.startsWith(`${to}/`);
          return <Link key={to} to={to} aria-current={active ? 'page' : undefined}>{label}</Link>;
        })}
      </nav>
    </header>
  );
}
