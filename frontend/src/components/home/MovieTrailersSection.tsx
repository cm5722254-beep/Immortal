import { useState } from 'react';
import { Film, Play, ChevronRight, Zap } from 'lucide-react';
import type { Anime } from '../../types';
import { TrailerModal } from '../common/TrailerModal';

interface MovieTrailersSectionProps {
  items: Anime[];
}

export function MovieTrailersSection({ items }: MovieTrailersSectionProps) {
  const [selectedTrailerAnime, setSelectedTrailerAnime] = useState<Anime | null>(null);

  if (!items || items.length === 0) return null;

  const trailerItems = items.slice(0, 10);

  return (
    <section className="mb-12 relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
            <Film className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-display font-black text-lg sm:text-xl md:text-2xl text-white tracking-wide flex items-center gap-2">
              <span>🎬 ឈុតខ្លីៗភាពយន្តថ្មីៗ (Movie Trailers)</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 hidden sm:inline">
                NEW TRAILERS
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
              ទស្សនាវីដេអូឈុតខ្លីផ្លូវការកម្រិត 4K Ultra HD មុនពេលទស្សនារឿងពេញ
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll / Grid of 16:9 Trailer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {trailerItems.map((anime) => {
          const bannerImg = anime.banner_url || anime.poster_url;
          return (
            <div
              key={anime.id}
              onClick={() => setSelectedTrailerAnime(anime)}
              className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#0d1526] border border-white/10 hover:border-rose-400/60 shadow-lg hover:shadow-[0_12px_30px_rgba(255,77,109,0.25)] transition-all duration-300 cursor-pointer tilt-3d"
            >
              {/* 16:9 Video Thumbnail */}
              <div className="relative aspect-video w-full bg-[#161c2e] overflow-hidden">
                {bannerImg ? (
                  <img
                    src={bannerImg}
                    alt={anime.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1a233a] text-gray-400">
                    <Film className="w-8 h-8 opacity-40" />
                  </div>
                )}

                {/* Gradient Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Center Play Icon with Radar Glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(255,77,109,0.7)] group-hover:scale-115 transition-all duration-300 radar-pulse">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Top Badge: 4K Trailer */}
                <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-md border border-rose-500/40 text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-md shadow">
                    <Zap className="w-3 h-3 text-rose-400" /> 4K TRAILER
                  </span>
                </div>

                {/* Bottom Duration Badge */}
                <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none">
                  <span className="inline-flex items-center bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    ឈុតខ្លីផ្លូវការ
                  </span>
                </div>
              </div>

              {/* Card Meta Info */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-display font-bold text-sm text-white line-clamp-1 group-hover:text-rose-400 transition-colors">
                    {anime.title}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                    {anime.alt_title || anime.studio || `${anime.year || '2024'} • ${anime.type === 'ANIME' ? 'Anime' : 'Donghua 3D'}`}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs font-bold text-rose-400">
                  <span className="flex items-center gap-1">
                    <Play className="w-3 h-3 fill-rose-400" />
                    <span>ទស្សនាឈុតខ្លី (Watch Trailer)</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Trailer Modal */}
      <TrailerModal
        anime={selectedTrailerAnime}
        isOpen={Boolean(selectedTrailerAnime)}
        onClose={() => setSelectedTrailerAnime(null)}
      />
    </section>
  );
}

export default MovieTrailersSection;
