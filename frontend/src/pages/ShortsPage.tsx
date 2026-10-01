import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Search } from 'lucide-react';
import { loadCatalog } from '../services/catalogService';
import type { Anime } from '../types';

const moods = ['Must-see', 'New', 'Romance', 'Fantasy', 'Action', 'Comedy'];

export function ShortsPage() {
  const [items, setItems] = useState<Anime[]>([]);
  const [activeMood, setActiveMood] = useState(moods[0]);
  useEffect(() => { let mounted = true; loadCatalog().then((catalog) => { if (mounted) setItems((catalog.anime || []).filter((item) => item.type === 'DRAMA' && (item.episode_count || 0) <= 100)); }); return () => { mounted = false; }; }, []);
  const visibleItems = [...items].filter((item) => {
    if (activeMood === 'Must-see') return true;
    if (activeMood === 'New') return true;
    return item.genres?.some((genre) => genre.name.toLowerCase().includes(activeMood.toLowerCase()) || genre.slug.toLowerCase().includes(activeMood.toLowerCase()));
  }).sort((a, b) => activeMood === 'New' ? (b.year || 0) - (a.year || 0) : (b.average_rating || 0) - (a.average_rating || 0));
  return <main className="mini-shorts-page">
    <header><div><h1>All Shorts</h1><Link to="/">For you</Link></div><Link to="/search" aria-label="Search"><Search /></Link></header>
    <nav>{moods.map((mood) => <button key={mood} onClick={() => setActiveMood(mood)} className={activeMood === mood ? 'active' : ''}>{mood}</button>)}</nav>
    {visibleItems.length ? <div className="mini-shorts-grid">{visibleItems.slice(0, 30).map((item) => <Link key={item.id} to={`/drama/${item.slug}`} className="mini-short-card"><div><img src={item.poster_url || item.banner_url || ''} alt={item.title} loading="lazy" /><span>Short</span><small>{item.episode_count || 'New'} Episodes</small></div><strong>{item.title}</strong><p>{item.description || `${item.year || 'New'} · Drama`}</p><span className="mini-short-play"><Play /></span></Link>)}</div> : <p className="mini-shorts-empty">{items.length ? 'No recommendations in this category yet.' : 'Loading recommendations…'}</p>}
  </main>;
}
