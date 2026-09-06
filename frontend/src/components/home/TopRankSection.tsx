import { Link } from 'react-router-dom';
import { Flame, Star, Play, Trophy } from 'lucide-react';
import type { Anime } from '../../types';

interface TopRankSectionProps {
  items: Anime[];
  isLoading: boolean;
}

export function TopRankSection({ items, isLoading }: TopRankSectionProps) {
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="px-4 md:px-8 max-w-[1600px] mx-auto my-12">
      <div className="section-header mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
              🔥 តារាងចំណាត់ថ្នាក់កំពូល
            </span>
          </div>
          <h2 className="section-title text-gradient-gold text-2xl md:text-3xl flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400 fill-amber-400/20" />
            <span>កំពូលរឿងទាំង ១០ ពេញនិយមបំផុត</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">តារាងចំណាត់ថ្នាក់រឿងដែលមានអ្នកទស្សនាច្រើន និងពេញនិយមបំផុតប្រចាំសប្តាហ៍</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {isLoading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))
        ) : (
          items.slice(0, 10).map((anime, index) => {
            const rank = (index + 1).toString().padStart(2, '0');
            const isTop3 = index < 3;

            return (
              <Link
                key={anime.id}
                to={`/anime/${anime.slug}`}
                className={`relative card p-3.5 flex items-center gap-3.5 group transition-all duration-300 rounded-2xl bg-[#0e0b1c] hover:-translate-y-1 ${
                  index === 0
                    ? 'border-amber-500/50 shadow-[0_4px_20px_rgba(245,158,11,0.2)] bg-gradient-to-r from-amber-500/10 to-[#0e0b1c]'
                    : index === 1
                    ? 'border-slate-400/40 shadow-slate-400/10'
                    : index === 2
                    ? 'border-amber-700/40'
                    : 'border-white/10 hover:border-amber-500/30'
                }`}
              >
                {/* Giant Stylized Rank Number */}
                <div
                  className={`font-display font-black text-4xl sm:text-5xl select-none shrink-0 w-10 text-center leading-none ${
                    index === 0
                      ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                      : index === 1
                      ? 'text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400'
                      : index === 2
                      ? 'text-transparent bg-clip-text bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800'
                      : 'text-gray-700 group-hover:text-gray-400 transition-colors'
                  }`}
                >
                  {rank}
                </div>

                {/* Poster */}
                <div className="relative w-14 h-20 rounded-xl overflow-hidden bg-[#161224] shrink-0 shadow-md">
                  {anime.poster_url ? (
                    <img
                      src={anime.poster_url}
                      alt={anime.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-gray-600">
                      {anime.title[0]}
                    </div>
                  )}
                  {/* Play icon overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                      anime.type === 'DONGHUA' ? 'bg-red-600/30 text-red-300 border border-red-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}>
                      {anime.type === 'DONGHUA' ? 'រឿងចិន 3D' : anime.type === 'ANIME' ? 'រឿងជប៉ុន' : anime.type === 'MOVIE' ? 'ភាពយន្ត' : 'រឿងភាគ'}
                    </span>
                    {isTop3 && (
                      <span className="badge-4k text-[8px] py-0">4K</span>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-xs text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                    {anime.title}
                  </h3>
                  {anime.alt_title && (
                    <p className="text-[10px] text-gray-400 line-clamp-1 font-serif">{anime.alt_title}</p>
                  )}

                  <div className="flex items-center gap-2 mt-2 pt-1 border-t border-white/5">
                    <span className="text-[10px] text-orange-400 font-bold flex items-center gap-0.5">
                      <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                      {(anime.heat_score || 95000).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-0.5 ml-auto">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {anime.average_rating ? anime.average_rating.toFixed(1) : '5.0'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}

