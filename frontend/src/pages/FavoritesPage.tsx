import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Bookmark, Clock, Play } from 'lucide-react';
import { AnimeCard } from '../components/home/AnimeCard';
import { SkeletonCard } from '../components/common/SkeletonLoader';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { getFavoritesSync, loadCatalog } from '../services/catalogService';
import type { Anime, WatchHistoryItem } from '../types';
import { translate, useLanguageStore } from '../store/languageStore';

export function FavoritesPage() {
  const appLanguage = useLanguageStore((state) => state.language);
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history'>('bookmarks');

  const [favorites, setFavorites] = useState<Anime[]>(() => getFavoritesSync());
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('local_watch_history') || localStorage.getItem('local_history');
      const list = raw ? JSON.parse(raw) : [];
      return list.map((item: any, idx: number) => ({
        id: Number(item.updated_at) || idx,
        user_id: 0,
        anime_id: 0,
        episode_id: 0,
        progress_seconds: Number(item.progress_seconds) || 0,
        duration_seconds: Number(item.duration_seconds) || 0,
        last_watched_at: new Date(Number(item.updated_at) || Date.now()).toISOString(),
        anime_title: String(item.anime_title || 'Watching title'),
        anime_slug: String(item.slug || ''),
        anime_poster: String(item.poster_url || ''),
        episode_number: Number(item.episode_number) || 1,
        episode_thumbnail: String(item.thumbnail_url || ''),
      }));
    } catch {
      return [];
    }
  });
  const isLoading = false;

  useEffect(() => {
    let isMounted = true;

    // 1. Instant local sync
    loadCatalog().then(() => {
      if (isMounted) {
        setFavorites(getFavoritesSync());
      }
    });

    // 2. Background live API sync
    if (isAuthenticated) {
      Promise.all([
        api.get('/favorites').catch(() => null),
        api.get('/history').catch(() => null),
      ]).then(([favRes, histRes]) => {
        if (!isMounted) return;
        if (favRes?.data && Array.isArray(favRes.data)) {
          setFavorites(favRes.data);
        }
        if (histRes?.data && Array.isArray(histRes.data)) {
          setHistory(histRes.data);
        }
      });
    }

    return () => { isMounted = false; };
  }, [isAuthenticated]);

  return (
    <main className="mini-library-page min-h-screen pb-24 md:pb-12 bg-bg-base text-text-primary px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-text-primary tracking-tight">
          {translate('My library', appLanguage)}
        </h1>
      </div>

      {/* ── Tab Selector ── */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'bookmarks'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-xs'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${activeTab === 'bookmarks' ? 'text-white' : 'text-blue-600'}`} /> {translate('Saved titles', appLanguage)} ({favorites.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-xs'
          }`}
        >
          <Clock className={`w-4 h-4 ${activeTab === 'history' ? 'text-white' : 'text-blue-600'}`} /> {translate('Watch history', appLanguage)} ({history.length})
        </button>
      </div>

      {/* ── Content / Empty States ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          <SkeletonCard count={12} />
        </div>
      ) : activeTab === 'bookmarks' ? (
        favorites.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-20 h-20 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center mx-auto text-text-secondary">
              <Cloud className="w-10 h-10 text-text-secondary stroke-[1.5]" />
            </div>
            <p className="text-text-primary text-base font-bold">{translate('No saved titles yet', appLanguage)}</p>
            <p className="text-text-secondary text-xs">{translate('Find a title and save it to watch later.', appLanguage)}</p>
            <div className="pt-2">
              <Link to="/donghua" className="btn-primary text-xs py-2.5 px-6">
                {translate('Browse titles', appLanguage)}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {favorites.map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-20 h-20 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center mx-auto text-text-secondary">
              <Clock className="w-10 h-10 text-text-secondary stroke-[1.5]" />
            </div>
            <p className="text-text-primary text-base font-bold">{translate('No watch history yet', appLanguage)}</p>
            <p className="text-text-secondary text-xs">{translate('Watched episodes appear here.', appLanguage)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {history.map((h) => (
              <Link
                key={h.id}
                to={`/watch/${h.anime_slug}/${h.episode_number}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="w-16 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative border border-slate-200/60 shadow-xs">
                  <img src={h.anime_poster} alt="" className="w-full h-full object-cover group-hover:scale-106 transition-transform" />
                  <div className="absolute inset-0 bg-slate-950/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {h.anime_title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{translate('Episode', appLanguage)} {h.episode_number}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] mt-1.5 font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                    <Play className="w-2.5 h-2.5 fill-blue-600" />
                    {translate('Continue watching', appLanguage)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </main>
  );
}
