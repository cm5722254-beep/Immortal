import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Check, Star, Film } from 'lucide-react';
import type { Anime } from '../../types';

interface AnimeCardProps {
  anime: Anime;
  showProgress?: boolean;
  progressPercent?: number;
  enableGlow?: boolean;
}

export function AnimeCard({
  anime,
}: AnimeCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nami_my_list') || '[]');
      return saved.includes(anime.id);
    } catch {
      return false;
    }
  });

  const detailType = anime.type === 'ANIME' ? 'anime' : anime.type === 'DONGHUA' ? 'donghua' : anime.type === 'DRAMA' ? 'drama' : 'movie';
  const detailUrl = `/${detailType}/${anime.slug}`;
  const watchUrl = `/watch/${anime.slug}/1`;

  const rating = anime.average_rating && anime.average_rating > 0
    ? anime.average_rating.toFixed(1)
    : '9.8';

  const tagText = anime.status === 'COMPLETED'
    ? `ចប់ (${anime.episode_count || 16} ភាគ)`
    : anime.episode_count
    ? `${anime.episode_count} ភាគ`
    : anime.season
    ? `Season ${anime.season}`
    : 'ភាគថ្មីៗ';

  const [imgSrc, setImgSrc] = useState(anime.poster_url || anime.banner_url || '');
  const [triedLocalFallback, setTriedLocalFallback] = useState(false);

  useEffect(() => {
    setImgSrc(anime.poster_url || anime.banner_url || '');
    setImageError(false);
    setTriedLocalFallback(false);
  }, [anime.poster_url, anime.banner_url]);

  const handleImageError = () => {
    if (!triedLocalFallback) {
      setTriedLocalFallback(true);
      // Try local poster by slug or id
      setImgSrc(`/posters/${anime.slug}.jpg`);
    } else {
      setImageError(true);
    }
  };

  const toggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const saved = JSON.parse(localStorage.getItem('nami_my_list') || '[]');
      let updated: number[];
      if (isBookmarked) {
        updated = saved.filter((id: number) => id !== anime.id);
      } else {
        updated = [...saved, anime.id];
      }
      localStorage.setItem('nami_my_list', JSON.stringify(updated));
      setIsBookmarked(!isBookmarked);
    } catch {}
  };

  return (
    <div className="group relative flex flex-col select-none netflix-card tilt-3d">
      <Link
        to={detailUrl}
        className="relative block aspect-[2/3] sm:aspect-[3/4] rounded-lg overflow-hidden bg-[#181818] border border-white/[0.08] group-hover:border-rose-400/60 transition-all duration-300 shadow-md group-hover:shadow-[0_16px_36px_rgba(255,77,109,0.28)]"
      >
        {/* Poster Image or Fallback */}
        {imgSrc && !imageError ? (
          <img
            src={imgSrc}
            alt={anime.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1c24] to-[#0f111a] flex flex-col items-center justify-center p-3 text-center">
            <Film className="w-8 h-8 text-rose-400/60 mb-2" />
            <span className="text-[11px] font-bold text-gray-300 line-clamp-2">
              {anime.title}
            </span>
          </div>
        )}

        {/* Netflix Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

        {/* Top-Left: Star Rating Pill */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 bg-black/75 backdrop-blur-md border border-white/15 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow">
            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
            <span>{rating}</span>
          </span>
        </div>

        {/* Top-Right: Ultra 3D & VIP Badges */}
        <div className="absolute top-2 right-2 z-10 pointer-events-none flex flex-col items-end gap-1">
          {anime.type === 'DONGHUA' && (
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(255,77,109,0.7)] animate-pulse">
              ⚡ ULTRA 3D
            </span>
          )}
          {anime.type === 'MOVIE' ? (
            <span className="bg-gradient-to-r from-sky-500 to-blue-500 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded shadow">
              🍿 ភាពយន្ត
            </span>
          ) : anime.is_free ? (
            <span className="bg-emerald-600/90 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded shadow">
              ឥតគិតថ្លៃ
            </span>
          ) : (
            <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(255,77,109,0.5)]">
              4K VIP
            </span>
          )}
        </div>

        {/* Hover Action Layer: Play & Add to List Buttons appear on Hover */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/95 via-black/50 to-transparent">
          {/* Quick Action Icons */}
          <div className="flex items-center gap-2 mb-2">
            {/* Play Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(watchUrl);
              }}
              className="w-8 h-8 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white flex items-center justify-center shadow-[0_0_12px_rgba(255,77,109,0.7)] transition-all hover:scale-115 active:scale-95 cursor-pointer"
              title="ចាក់ទស្សនា"
            >
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            </button>

            {/* My List Button */}
            <button
              onClick={toggleBookmark}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/40 text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
              title={isBookmarked ? "បានបញ្ចូលក្នុងបញ្ជី" : "បញ្ចូលក្នុងបញ្ជី"}
            >
              {isBookmarked ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Match & Quality Indicators */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-white mb-1">
            <span className="text-[#46d369]">ត្រូវចិត្ត 98%</span>
            <span className="border border-rose-400/50 bg-rose-500/10 text-rose-300 px-1 py-0.2 rounded text-[8px]">4K</span>
            <span className="text-gray-300 font-normal">{tagText}</span>
          </div>
        </div>
      </Link>

      {/* Title & Metadata Below Card */}
      <div className="pt-2 px-0.5 space-y-0.5">
        <Link
          to={detailUrl}
          className="block font-display font-bold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-rose-400 transition-colors leading-snug"
          title={anime.title}
        >
          {anime.title}
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
          <span>{anime.year || '2024'}</span>
          <span>•</span>
          <span>{anime.type === 'ANIME' ? 'រឿងជប៉ុន' : anime.type === 'MOVIE' ? 'ភាពយន្ត' : anime.type === 'DRAMA' ? 'រឿងភាគ' : 'រឿងចិន 3D'}</span>
        </div>
      </div>
    </div>
  );
}

export default AnimeCard;
