import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Check, Film } from 'lucide-react';
import type { Anime } from '../../types';
import { triggerHaptic } from '../../utils/telegram';

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
    <div className="group relative flex flex-col select-none netflix-card tilt-3d active:scale-[0.98] transition-transform duration-150">
      <Link
        to={detailUrl}
        onClick={() => triggerHaptic('light')}
        className="relative block aspect-[2/3] rounded-xl overflow-hidden bg-[#121622] border border-white/[0.08] group-hover:border-rose-400/60 transition-all duration-300 shadow-sm group-hover:shadow-[0_12px_28px_rgba(255,77,109,0.2)]"
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
          <div className="w-full h-full bg-gradient-to-br from-[#1a1c24] to-[#0f111a] flex flex-col items-center justify-center p-2 text-center">
            <Film className="w-6 h-6 text-rose-400/60 mb-1" />
            <span className="text-[10px] font-medium text-gray-300 line-clamp-2">
              {anime.title}
            </span>
          </div>
        )}

        {/* Subtle Bottom Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Single Discrete VIP Badge Top-Right (If Paid) */}
        {!anime.is_free && (
          <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-sm">
              VIP
            </span>
          </div>
        )}

        {/* Single Discrete Episode Badge Bottom-Right */}
        <div className="absolute bottom-1.5 right-1.5 z-10 pointer-events-none">
          <span className="bg-black/70 backdrop-blur-sm text-gray-200 text-[8.5px] font-medium px-1.5 py-0.5 rounded">
            {tagText}
          </span>
        </div>

        {/* Hover Action Layer: Play & Add to List Buttons appear on Hover (Desktop) */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/90 via-black/40 to-transparent hidden sm:flex">
          <div className="flex items-center gap-1.5 mb-1.5">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(watchUrl);
              }}
              className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer"
              title="ចាក់ទស្សនា"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
            </button>
            <button
              onClick={toggleBookmark}
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 border border-white/30 text-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
              title={isBookmarked ? "បានបញ្ចូលក្នុងបញ្ជី" : "បញ្ចូលក្នុងបញ្ជី"}
            >
              {isBookmarked ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </Link>

      {/* Title & Metadata Below Card */}
      <div className="pt-1.5 px-0.5 space-y-0.5">
        <Link
          to={detailUrl}
          className="block font-medium text-[10.5px] sm:text-[11.5px] text-gray-100 line-clamp-1 group-hover:text-rose-400 transition-colors leading-snug tracking-tight mt-0.5"
          title={anime.title}
        >
          {anime.title}
        </Link>
        <div className="flex items-center gap-1 text-[9px] text-gray-400 font-normal leading-tight truncate">
          <span>{anime.year || '2024'}</span>
          <span>•</span>
          <span>{anime.type === 'ANIME' ? 'រឿងជប៉ុន' : anime.type === 'MOVIE' ? 'ភាពយន្ត' : anime.type === 'DRAMA' ? 'រឿងភាគ' : 'រឿងចិន 3D'}</span>
        </div>
      </div>
    </div>
  );
}

export default AnimeCard;
