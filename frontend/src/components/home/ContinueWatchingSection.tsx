import { Link } from 'react-router-dom';
import { Play, Clock, X } from 'lucide-react';
import type { WatchHistoryItem } from '../../types';
import { translate, useLanguageStore } from '../../store/languageStore';

interface ContinueWatchingSectionProps {
  items: WatchHistoryItem[];
  onClear?: () => void;
  onRemoveItem?: (id: number | string) => void;
}

function formatMinutes(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ContinueWatchingSection({ items, onClear, onRemoveItem }: ContinueWatchingSectionProps) {
  const language = useLanguageStore((state) => state.language);
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-8 px-1 animate-fade-in select-none">
      {/* ── Section Header with "Continue Watching" and "Clear" ── */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-xs">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-display font-black text-lg sm:text-xl text-slate-900 tracking-tight">
              {translate('Continue from where you left off', language)}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {language === 'km' ? 'បន្តទស្សនាភាគដែលអ្នកបានផ្អាក' : 'Resume where you paused'}
            </p>
          </div>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50"
          >
            {translate('Clear all history', language)}
          </button>
        )}
      </div>

      {/* ── Horizontal Scroll Row ── */}
      <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-3 no-scrollbar select-none">
        {items.map((item) => {
          const progressPercent = item.duration_seconds > 0
            ? Math.min(100, Math.round((item.progress_seconds / item.duration_seconds) * 100))
            : 35;

          const timeText = item.progress_seconds > 0 ? formatMinutes(item.progress_seconds) : null;

          return (
            <div
              key={item.id}
              className="shrink-0 w-44 sm:w-52 group relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 hover:border-blue-500/50 transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5"
            >
              {/* Thumbnail 16:10 */}
              <Link
                to={`/watch/${item.anime_slug}/${item.episode_number}`}
                className="relative block aspect-[16/10] bg-slate-100 overflow-hidden"
              >
                <img
                  src={
                    item.episode_thumbnail && !item.episode_thumbnail.includes('unsplash.com')
                      ? item.episode_thumbnail
                      : item.anime_poster || `/posters/${item.anime_slug}.jpg`
                  }
                  alt={item.anime_title}
                  className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = `/posters/${item.anime_slug}.jpg`;
                  }}
                />

                {/* Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Episode Tag */}
                <span className="absolute bottom-2 left-2 text-[10px] font-black text-slate-900 bg-white/95 px-2 py-0.5 rounded-full border border-slate-200/80 shadow-xs backdrop-blur-md">
                  {translate('Episode', language)} {item.episode_number}
                </span>

                {timeText && (
                  <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-full border border-white/20 backdrop-blur-md">
                    {timeText}
                  </span>
                )}
              </Link>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-r-full shadow-xs transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Title & Quick Actions */}
              <div className="p-3 flex items-center justify-between gap-2">
                <Link
                  to={`/watch/${item.anime_slug}/${item.episode_number}`}
                  className="font-display font-bold text-xs sm:text-sm text-slate-800 line-clamp-1 hover:text-blue-600 transition-colors flex-1"
                  title={item.anime_title}
                >
                  {item.anime_title}
                </Link>
                {onRemoveItem && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title={translate('Remove item', language)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
