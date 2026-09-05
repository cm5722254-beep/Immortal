import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { WatchHistoryItem } from '../../types';

interface ContinueWatchingSectionProps {
  items: WatchHistoryItem[];
  onClear?: () => void;
}

export function ContinueWatchingSection({ items, onClear }: ContinueWatchingSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-6 px-1">
      {/* ── Section Header with "Continue Watching" and "Clear" ── */}
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-display font-bold text-base sm:text-lg text-white">
          Continue Watching
        </h2>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-[#E8452C] hover:text-[#ff6f61] transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {/* ── Horizontal Scroll Row ── */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item) => {
          const progressPercent = item.duration_seconds > 0
            ? Math.min(100, Math.round((item.progress_seconds / item.duration_seconds) * 100))
            : 40;

          return (
            <Link
              key={item.id}
              to={`/watch/${item.anime_slug}/${item.episode_number}`}
              className="shrink-0 w-36 sm:w-44 group relative rounded-2xl overflow-hidden bg-[#111726] border border-[#1E283C] hover:border-[#E8452C]/50 transition-all duration-300 shadow-lg"
            >
              {/* Thumbnail 16:9 */}
              <div className="relative aspect-[16/10] bg-[#161F33] overflow-hidden">
                <img
                  src={
                    item.episode_thumbnail && !item.episode_thumbnail.includes('unsplash.com')
                      ? item.episode_thumbnail
                      : item.anime_poster
                  }
                  alt={item.anime_title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />


                {/* Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-[#E8452C] flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>

                {/* Episode Tag */}
                <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white/90 drop-shadow">
                  Ep {item.episode_number}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#1E283C] h-1">
                <div
                  className="bg-[#E8452C] h-full rounded-r-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Title Info */}
              <div className="p-2">
                <h3 className="font-display font-bold text-xs text-white line-clamp-1 group-hover:text-[#E8452C] transition-colors">
                  {item.anime_title}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
