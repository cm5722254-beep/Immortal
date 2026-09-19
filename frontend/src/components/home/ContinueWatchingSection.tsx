import { Link } from 'react-router-dom';
import { Play, Clock, X } from 'lucide-react';
import type { WatchHistoryItem } from '../../types';

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
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-10 px-1 animate-fade-in">
      {/* ── Section Header with "Continue Watching" and "Clear" ── */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-sm">
            <Clock className="w-3.5 h-3.5" />
          </span>
          <h2 className="font-display font-black text-lg sm:text-xl text-white tracking-wide">
            បន្តការទស្សនាពីកន្លែងចាស់
          </h2>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            លុបប្រវត្តិទាំងអស់
          </button>
        )}
      </div>

      {/* ── Horizontal Scroll Row ── */}
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide select-none">
        {items.map((item) => {
          const progressPercent = item.duration_seconds > 0
            ? Math.min(100, Math.round((item.progress_seconds / item.duration_seconds) * 100))
            : 35;

          const timeText = item.progress_seconds > 0 ? formatMinutes(item.progress_seconds) : null;

          return (
            <div
              key={item.id}
              className="shrink-0 w-44 sm:w-52 group relative rounded-2xl overflow-hidden bg-[#0d1322] border border-white/10 hover:border-rose-500/60 transition-all duration-300 shadow-xl hover:-translate-y-1"
            >
              {/* Thumbnail 16:9 */}
              <Link
                to={`/watch/${item.anime_slug}/${item.episode_number}`}
                className="relative block aspect-[16/10] bg-[#161F33] overflow-hidden"
              >
                <img
                  src={
                    item.episode_thumbnail && !item.episode_thumbnail.includes('unsplash.com')
                      ? item.episode_thumbnail
                      : item.anime_poster || `/posters/${item.anime_slug}.jpg`
                  }
                  alt={item.anime_title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = `/posters/${item.anime_slug}.jpg`;
                  }}
                />

                {/* Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/50 scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>

                {/* Episode Tag */}
                <span className="absolute bottom-1.5 left-2 text-[10px] font-black text-white/95 drop-shadow bg-black/60 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
                  ភាគ {item.episode_number}
                </span>

                {timeText && (
                  <span className="absolute bottom-1.5 right-2 text-[9.5px] font-bold text-amber-300 drop-shadow">
                    {timeText}
                  </span>
                )}
              </Link>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-r-full shadow-[0_0_8px_#ff4d6d]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Title & Quick Actions */}
              <div className="p-2.5 flex items-center justify-between gap-1">
                <Link
                  to={`/watch/${item.anime_slug}/${item.episode_number}`}
                  className="font-display font-bold text-xs text-white line-clamp-1 hover:text-rose-400 transition-colors flex-1"
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
                    className="p-1 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition"
                    title="លុបចេញ"
                  >
                    <X className="w-3 h-3" />
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
