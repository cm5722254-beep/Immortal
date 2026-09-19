import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, Sparkles, Play, Flame } from 'lucide-react';
import type { Anime } from '../../types';

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
    <section className="mb-12 relative group/section px-1">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
            <Flame className="w-4 h-4 fill-white" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-xl sm:text-2xl md:text-3xl text-white tracking-wide">
                កំពូលរឿងពេញនិយមទាំង ១០
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                TOP 10
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              រឿងដែលទស្សនិកជននិយមទស្សនា និងគាំទ្រច្រើនជាងគេបំផុតប្រចាំថ្ងៃ
            </p>
          </div>
        </div>

        {/* Carousel Prev/Next Buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition active:scale-90"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition active:scale-90"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Horizontal Scrollable Cards with Giant Rank Numbers ── */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-2 scrollbar-hide scroll-smooth snap-x select-none"
      >
        {topItems.map((anime, index) => {
          const rank = index + 1;
          const detailUrl = anime.type === 'DONGHUA' ? `/donghua/${anime.slug}` : `/anime/${anime.slug}`;
          const rating = (anime.average_rating || 9.8).toFixed(1);

          return (
            <Link
              key={anime.id}
              to={detailUrl}
              className="group relative shrink-0 flex items-end snap-start cursor-pointer pl-4 sm:pl-6"
            >
              {/* Giant Stylized Rank Number (Netflix Style Behind Poster) */}
              <div className="netflix-rank-number text-7xl sm:text-8xl md:text-9xl -mr-6 sm:-mr-8 z-0 translate-y-3 sm:translate-y-4">
                {rank}
              </div>

              {/* Poster Card */}
              <div className="relative z-10 w-32 sm:w-40 md:w-44 aspect-[2/3] rounded-2xl overflow-hidden bg-[#161b2b] border border-white/15 group-hover:border-rose-400 group-hover:shadow-[0_15px_40px_rgba(255,77,109,0.35)] transition-all duration-300 group-hover:-translate-y-2">
                <img
                  src={anime.poster_url || anime.banner_url || `/posters/${anime.slug}.jpg`}
                  alt={anime.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = `/posters/${anime.slug}.jpg`;
                  }}
                />

                {/* Scrim Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-300 border border-amber-500/40 shadow">
                    <Star className="w-2.5 h-2.5 fill-amber-300" /> {rating}
                  </span>
                  {anime.type === 'DONGHUA' && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-600/90 text-white shadow">
                      3D
                    </span>
                  )}
                </div>

                {/* Quality / Dub Badge */}
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                  <span className="badge-4k text-[8px] py-0 px-1.5">4K</span>
                  <span className="bg-amber-500 text-black text-[7.5px] font-black px-1.5 py-0.5 rounded shadow">
                    {anime.country === 'Japan' || anime.type === 'ANIME' ? 'SUB KH' : 'KH DUB'}
                  </span>
                </div>

                {/* Hover Play Icon Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="w-11 h-11 rounded-full bg-rose-600 flex items-center justify-center shadow-xl shadow-rose-600/50 scale-75 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>

                {/* Bottom Title & Episode Info */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 space-y-0.5 pointer-events-none">
                  <span className="text-[10px] font-bold text-rose-300 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> ភាគ {anime.episode_count || 'ថ្មី'}
                  </span>
                  <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-300 transition-colors">
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
