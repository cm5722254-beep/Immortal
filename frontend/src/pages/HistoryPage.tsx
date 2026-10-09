import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2, Play } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { triggerConfirm } from '../store/confirmStore';
import api from '../services/api';
import type { WatchHistoryItem } from '../types';
import { translate, useLanguageStore } from '../store/languageStore';

export function HistoryPage() {
  const appLanguage = useLanguageStore((state) => state.language);
  const { isAuthenticated } = useAuthStore();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(() => {
    if (!isAuthenticated) { return; }
    api.get('/history')
      .then((res) => setHistory(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    fetchHistory();
  }, [fetchHistory, isAuthenticated]);

  const deleteItem = async (id: number) => {
    await api.delete(`/history/${id}`);
    setHistory((h) => h.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    triggerConfirm({
      title: translate('Delete watch history', appLanguage),
      message: translate('Are you sure you want to clear all viewing history?', appLanguage),
      confirmText: translate('Delete all', appLanguage),
      variant: 'danger',
      onConfirm: async () => {
        await api.delete('/history');
        setHistory([]);
      },
    });
  };

  if (!isAuthenticated) {
    return (
      <main className="mini-history-page min-h-screen pt-24 flex flex-col items-center justify-center text-center px-4">
        <Clock className="w-16 h-16 text-gray-700 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">{translate('Watch history', appLanguage)}</h1>
        <p className="text-gray-400 mb-4">{translate('Please sign in to view your history.', appLanguage)}</p>
        <Link to="/login" className="btn-primary">{translate('Sign in', appLanguage)}</Link>
      </main>
    );
  }

  return (
    <main className="mini-history-page min-h-screen pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-400" /> {translate('Watch history', appLanguage)}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{history.length} {translate('episodes watched', appLanguage)}</p>
        </div>
        {history.length > 0 && (
          <button onClick={clearAll} className="btn-danger text-sm">
            <Trash2 className="w-4 h-4" /> {translate('Delete all', appLanguage)}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-xl font-semibold">{translate('No watch history yet', appLanguage)}</p>
          <p className="text-gray-600 text-sm mt-1 mb-4">{translate('Start watching to track your episodes.', appLanguage)}</p>
          <Link to="/explore" className="btn-primary">{translate('Watch now', appLanguage)}</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const pct = item.duration_seconds > 0
              ? Math.round((item.progress_seconds / item.duration_seconds) * 100)
              : 0;
            return (
              <div key={item.id} className="card flex items-center gap-4 p-4 group">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-dark-muted shrink-0">
                  {item.anime_poster ? (
                    <img src={item.anime_poster} alt={item.anime_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{item.anime_title}</p>
                  <p className="text-sm text-gray-500">{translate('Episode', appLanguage)} {item.episode_number}</p>
                  <div className="progress-bar mt-2 max-w-xs">
                    <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{translate('Watched', appLanguage)} {pct}%</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/watch/${item.anime_slug}/${item.episode_number}`}
                    className="btn-primary text-sm py-2 px-3"
                  >
                    <Play className="w-4 h-4 fill-white" /> {translate('Continue watching', appLanguage)}
                  </Link>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="btn-icon text-gray-500 hover:text-red-400"
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
