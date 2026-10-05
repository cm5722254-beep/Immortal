import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import type { Anime } from '../../types';
import { triggerHaptic } from '../../utils/telegram';

interface TrendingRankCarouselProps {
  items: Anime[];
  isLoading?: boolean;
}

export function TrendingRankCarousel({ items, isLoading }: TrendingRankCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!isLoading && items.length === 0) return null;

  const topItems = items.slice(0, 10);

  return (
    <section className="mb-8 relative group/section px-1">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400">
            <Flame className="w-3.5 h-3.5 fill-current" />
          </span>
          <h2 className="font-display font-bold text-sm sm:text-base text-white tracking-wide">
            កំពូលរឿង Top 10 ប្រចាំថ្ងៃ
          </h2>
        </div>

        {/* Carousel Prev/Next Buttons (Desktop) */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition active:scale-90"
            aria-label="Previous"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition active:scale-90"
            aria-label="Next"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Horizontal Scrollable Cards with Sleek Rank Numbers ── */}
      <div
        ref={scrollRef}
        className="flex gap-2 sm:gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth snap-x select-none"
      >
        {topItems.map((anime, index) => {
          const rank = index + 1;
          const detailUrl = `/watch/${anime.slug}/1`;

          return (
            <Link
              key={anime.id}
              to={detailUrl}
              onClick={() => triggerHaptic('light')}
              className="group relative shrink-0 flex items-end snap-start cursor-pointer pl-3 sm:pl-4 active:scale-95 transition-transform"
            >
              {/* Proportional Rank Number */}
              <div className="netflix-rank-number text-5xl sm:text-6xl -mr-3 sm:-mr-4 z-0 translate-y-2 opacity-90 select-none">
                {rank}
              </div>

              {/* Poster Card */}
              <div className="relative z-10 w-24 sm:w-32 aspect-[2/3] rounded-xl overflow-hidden bg-[#161b2b] border border-white/10 group-hover:border-rose-400/60 shadow-sm transition-all duration-300 group-hover:-translate-y-1">
                <img
                  src={anime.poster_url || anime.banner_url || `/posters/${anime.slug}.jpg`}
                  alt={anime.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = `/posters/${anime.slug}.jpg`;
                  }}
                />

                {/* Scrim Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                {/* Bottom Title */}
                <div className="absolute inset-x-0 bottom-0 p-1.5 pointer-events-none">
                  <h3 className="text-[10px] sm:text-[11px] font-medium text-white line-clamp-1 group-hover:text-rose-300 leading-tight">
                    {anime.title}
                  </h3>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
