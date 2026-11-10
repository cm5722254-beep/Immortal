import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2, Play, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { triggerConfirm } from '../store/confirmStore';
import api from '../services/api';
import type { WatchHistoryItem } from '../types';
import { translate, useLanguageStore } from '../store/languageStore';

function getLocalHistory(): WatchHistoryItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem('local_watch_history') || '[]') as Array<Record<string, any>>;
    return raw.map((item, index) => ({
      id: Number(item.updated_at) || index,
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
}

export function HistoryPage() {
  const appLanguage = useLanguageStore((state) => state.language);
  const { isAuthenticated } = useAuthStore();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(() => {
    setIsLoading(true);
    const local = getLocalHistory();
    if (!isAuthenticated) {
      setHistory(local);
      setIsLoading(false);
      return;
    }

    api.get('/history')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setHistory(res.data);
        } else {
          setHistory(local);
        }
      })
      .catch(() => {
        setHistory(local);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const deleteItem = async (id: number, slug?: string, epNum?: number) => {
    if (isAuthenticated) {
      try {
        await api.delete(`/history/${id}`);
      } catch {}
    }
    // Also remove from localStorage
    try {
      const histKey = 'local_watch_history';
      const raw = localStorage.getItem(histKey);
      if (raw) {
        let list: any[] = JSON.parse(raw);
        list = list.filter((item) => {
          if (slug && item.slug === slug) {
            if (epNum && item.episode_number === epNum) return false;
            if (!epNum) return false;
          }
          return Number(item.updated_at) !== id;
        });
        localStorage.setItem(histKey, JSON.stringify(list));
      }
    } catch {}

    setHistory((h) => h.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    triggerConfirm({
      title: translate('Delete watch history', appLanguage),
      message: translate('Are you sure you want to clear all viewing history?', appLanguage),
      confirmText: translate('Delete all', appLanguage),
      variant: 'danger',
      onConfirm: async () => {
        if (isAuthenticated) {
          try {
            await api.delete('/history');
          } catch {}
        }
        try {
          localStorage.removeItem('local_watch_history');
        } catch {}
        setHistory([]);
      },
    });
  };

  return (
    <main className="min-h-screen bg-slate-50/70 text-slate-900 pt-20 pb-28 md:pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto transition-colors">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
              {translate('Watch history', appLanguage)}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-11">
            {history.length} {translate('episodes watched', appLanguage)}
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>{translate('Delete all', appLanguage)}</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-10 sm:p-14 text-center max-w-md mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 mb-1">
            {translate('No watch history yet', appLanguage)}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
            {translate('Start watching to track your episodes.', appLanguage)}
          </p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{translate('Watch now', appLanguage)}</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const pct = item.duration_seconds > 0
              ? Math.min(100, Math.round((item.progress_seconds / item.duration_seconds) * 100))
              : 25;
            const watchUrl = `/watch/${item.anime_slug}/${item.episode_number}`;

            return (
              <div
                key={item.id}
                className="group relative bg-white/90 backdrop-blur-xl border border-slate-200/80 hover:border-blue-300 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5 sm:gap-4"
              >
                {/* Thumbnail */}
                <Link
                  to={watchUrl}
                  className="relative w-20 sm:w-28 aspect-video rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60 shadow-xs"
                >
                  <img
                    src={item.episode_thumbnail || item.anime_poster || `/posters/${item.anime_slug}.jpg`}
                    alt={item.anime_title}
                    className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `/posters/${item.anime_slug}.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    </div>
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={watchUrl}
                    className="font-display font-bold text-sm sm:text-base text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                  >
                    {item.anime_title}
                  </Link>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {translate('Episode', appLanguage)} {item.episode_number}
                  </p>

                  {/* Progress track */}
                  <div className="mt-2.5 max-w-xs flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <Link
                    to={watchUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span className="hidden sm:inline">{translate('Continue watching', appLanguage)}</span>
                    <span className="sm:hidden">{translate('Watch', appLanguage)}</span>
                  </Link>

                  <button
                    onClick={() => deleteItem(item.id, item.anime_slug, item.episode_number)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title={translate('Remove from history', appLanguage)}
                    aria-label={translate('Remove from history', appLanguage)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default HistoryPage;
