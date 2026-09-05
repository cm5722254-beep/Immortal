import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Bookmark, Clock, Play } from 'lucide-react';
import { AnimeCard } from '../components/home/AnimeCard';
import { SkeletonCard } from '../components/common/SkeletonLoader';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { getFavoritesSync, loadCatalog } from '../services/catalogService';
import type { Anime, WatchHistoryItem } from '../types';

export function FavoritesPage() {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history'>('bookmarks');

  const [favorites, setFavorites] = useState<Anime[]>(() => getFavoritesSync());
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('local_history');
      return raw ? JSON.parse(raw) : [];
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
    <main className="min-h-screen pb-24 md:pb-12 text-gray-100 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
          បណ្ណាល័យរបស់ខ្ញុំ
        </h1>
      </div>

      {/* ── Tab Selector ── */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'bookmarks'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm backdrop-blur-md font-bold'
              : 'bg-[#101522] text-gray-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          <Bookmark className="w-4 h-4 text-amber-400" /> បញ្ជីរក្សាទុក ({favorites.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm backdrop-blur-md font-bold'
              : 'bg-[#101522] text-gray-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" /> ប្រវត្តិទស្សនា ({history.length})
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
            <div className="w-20 h-20 rounded-full bg-[#111726] border border-white/10 flex items-center justify-center mx-auto text-gray-500">
              <Cloud className="w-10 h-10 text-gray-500 stroke-[1.5]" />
            </div>
            <p className="text-gray-300 text-base font-bold">មិនទាន់មានរឿងក្នុងបញ្ជីរក្សាទុកនៅឡើយទេ</p>
            <p className="text-gray-500 text-xs">ស្វែងរករឿងដែលអ្នកចូលចិត្ត ហើយចុចប៊ូតុងរក្សាទុក ដើម្បីងាយស្រួលបើកមើលពេលក្រោយ។</p>
            <div className="pt-2">
              <Link to="/donghua" className="btn-primary text-xs py-2.5 px-6">
                រុករករឿងទស្សនា
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
            <div className="w-20 h-20 rounded-full bg-[#111726] border border-white/10 flex items-center justify-center mx-auto text-gray-500">
              <Clock className="w-10 h-10 text-gray-500 stroke-[1.5]" />
            </div>
            <p className="text-gray-300 text-base font-bold">មិនទាន់មានប្រវត្តិទស្សនានៅឡើយទេ</p>
            <p className="text-gray-500 text-xs">រាល់ភាគរឿងដែលអ្នកបានចុចមើល នឹងបង្ហាញនៅទីនេះដោយស្វ័យប្រវត្តិ។</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {history.map((h) => (
              <Link
                key={h.id}
                to={`/watch/${h.anime_slug}/${h.episode_number}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#111726] border border-white/10 hover:border-amber-500/40 transition-colors group"
              >
                <div className="w-16 h-20 rounded-xl overflow-hidden bg-[#161F33] shrink-0 relative">
                  <img src={h.anime_poster} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                    {h.anime_title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">ភាគ {h.episode_number}</p>
                  <span className="pill-tag text-[9px] mt-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/30">បន្តទស្សនា</span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </main>
  );
}

