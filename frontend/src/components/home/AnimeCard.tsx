import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Check, Star, Info } from 'lucide-react';
import type { Anime } from '../../types';
import { triggerHaptic } from '../../utils/telegram';
import { translate, useLanguageStore } from '../../store/languageStore';

interface AnimeCardProps {
  anime: Anime;
  showProgress?: boolean;
  progressPercent?: number;
}

export function AnimeCard({
  anime,
  showProgress,
  progressPercent
}: AnimeCardProps) {
  const navigate = useNavigate();
  const language = useLanguageStore((state) => state.language);
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
    ? (language === 'km' ? `ចប់ត្រឹម ${anime.episode_count || 16} ភាគ` : `Completed · ${anime.episode_count || 16} episodes`)
    : anime.episode_count
    ? `${translate('Episode', language)} ${anime.episode_count}`
    : translate('New', language);

  const [imgSrc, setImgSrc] = useState(anime.poster_url || anime.banner_url || '');

  useEffect(() => {
    setImgSrc(anime.poster_url || anime.banner_url || '');
    setImageError(false);
  }, [anime.poster_url, anime.banner_url]);

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
      triggerHaptic('light');
    } catch {}
  };

  return (
    <div 
      onClick={() => {
        triggerHaptic('light');
        navigate(watchUrl);
      }}
      className="group relative rounded-[20px] sm:rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/5 cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:border-white/20 hover:shadow-2xl hover:shadow-white/10 aspect-[3/4] col-span-1 flex flex-col"
    >
      <img
        src={!imageError ? imgSrc : `/posters/${anime.slug}.jpg`}
        alt={anime.title}
        onError={() => setImageError(true)}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10 opacity-90 transition-opacity group-hover:opacity-100" />
      
      {/* Top Badges */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-4 flex justify-between items-start z-10">
        <span className="bg-white/10 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/10 shadow-sm">
          {tagText}
        </span>
        <div className="flex flex-col gap-1.5 items-end">
          {!anime.is_free && (
            <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm">
              VIP
            </span>
          )}
          <button
            onClick={toggleBookmark}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition-colors active:scale-95"
            title={translate(isBookmarked ? 'Remove from My List' : 'Add to My List', language)}
          >
            {isBookmarked ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              triggerHaptic('light');
              navigate(detailUrl);
            }}
            aria-label="Details"
            title="Details"
            className="w-7 h-7 rounded-full bg-black/45 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 flex flex-col justify-end z-10">
        <h3 className="font-display font-black text-white text-xs sm:text-sm leading-tight mb-1.5 line-clamp-2 group-hover:text-amber-300 transition-colors" title={anime.title}>
          {anime.title}
        </h3>
        
        <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-gray-400 font-medium mb-3">
          <span className="flex items-center gap-1 text-amber-400"><Star className="w-3 h-3 fill-amber-400" /> {anime.average_rating?.toFixed(1) || '9.5'}</span>
          <span>•</span>
          <span>{anime.year || '2024'}</span>
          <span>•</span>
          <span className="truncate">{anime.type === 'ANIME' ? translate('Japanese', language) : anime.type === 'MOVIE' ? translate('Movies', language) : translate('Chinese', language)}</span>
        </div>

        {showProgress && progressPercent !== undefined ? (
          <div className="w-full bg-white/10 rounded-full h-1.5 mb-1 overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full" 
              style={{ width: `${Math.max(5, Math.min(100, progressPercent))}%` }} 
            />
          </div>
        ) : (
          <div className="h-0 group-hover:h-8 sm:group-hover:h-10 opacity-0 group-hover:opacity-100 overflow-hidden transition-all duration-300 ease-out">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate(watchUrl);
              }}
              className="w-full h-full flex items-center justify-center gap-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors text-xs"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              {translate('Play now', language)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnimeCard;
