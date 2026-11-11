import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Star,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Sparkles,
  Crown,
  Flame,
  Info,
  Layers,
  Compass,
} from 'lucide-react';
import api from '../services/api';
import { getLocalCatalogSync, loadCatalog, extractHomeData } from '../services/catalogService';
import type { Anime, WatchHistoryItem } from '../types';
import { triggerHaptic } from '../utils/telegram';
import { usePlatform } from '../utils/platform';
import { ContinueWatchingSection } from '../components/home/ContinueWatchingSection';
import { SpaceCosmos3DHero, type SpaceHeroSlide } from '../components/home/SpaceCosmos3DHero';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';

function getLocalContinueHistory(): WatchHistoryItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem('local_watch_history') || '[]') as Array<Record<string, any>>;
    return raw.slice(0, 12).map((item, index) => ({
      id: Number(item.updated_at) || index,
      user_id: 0,
      anime_id: 0,
      episode_id: 0,
      progress_seconds: Number(item.progress_seconds) || 0,
      duration_seconds: Number(item.duration_seconds) || 0,
      last_watched_at: new Date(Number(item.updated_at) || Date.now()).toISOString(),
      anime_title: String(item.anime_title || 'Continue watching'),
      anime_slug: String(item.slug || ''),
      anime_poster: String(item.poster_url || ''),
      episode_number: Number(item.episode_number) || 1,
      episode_thumbnail: String(item.thumbnail_url || ''),
    }));
  } catch {
    return [];
  }
}

// Legacy HeroCarousel replaced cleanly by SpaceCosmos3DHero
void HeroCarousel;
function HeroCarousel({ items }: { items: Anime[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const language = useLanguageStore((state) => state.language);
  const navigate = useNavigate();

  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nami_my_list') || '[]');
    } catch {
      return [];
    }
  });

  // Auto-advance hero slide every 6 seconds
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [items.length, isPaused]);

  if (!items || items.length === 0) return null;

  const currentAnime = items[currentIndex] || items[0];
  const isBookmarked = bookmarkedIds.includes(currentAnime.id);

  const toggleBookmark = (animeId: number) => {
    let updated: number[];
    if (bookmarkedIds.includes(animeId)) {
      updated = bookmarkedIds.filter((id) => id !== animeId);
    } else {
      updated = [...bookmarkedIds, animeId];
    }
    setBookmarkedIds(updated);
    try {
      localStorage.setItem('nami_my_list', JSON.stringify(updated));
    } catch { }
    triggerHaptic('light');
  };

  const detailUrl = `/${currentAnime.type === 'ANIME'
    ? 'anime'
    : currentAnime.type === 'DONGHUA'
      ? 'donghua'
      : currentAnime.type === 'DRAMA'
        ? 'drama'
        : 'movie'
    }/${currentAnime.slug}`;
  const watchUrl = `/watch/${currentAnime.slug}/1`;

  const episodeBadge =
    currentAnime.status === 'COMPLETED'
      ? language === 'km'
        ? `ចប់បរិបូរណ៍ (${currentAnime.episode_count || 16} ភាគ)`
        : `Completed (${currentAnime.episode_count || 16} eps)`
      : language === 'km'
        ? `ភាគទី ${currentAnime.episode_count || 'ថ្មី'}`
        : `Ep. ${currentAnime.episode_count || 'New'}`;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-4">
      <div
        className="relative w-full h-[480px] sm:h-[560px] lg:h-[620px] rounded-3xl overflow-hidden select-none bg-slate-950 border border-slate-200/60 shadow-sm"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Background Banner Slides */}
        {items.map((anime, index) => {
          const isCurrent = index === currentIndex;
          const bannerSrc = anime.banner_url || anime.poster_url || `/posters/${anime.slug}.jpg`;
          return (
            <div
              key={anime.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={bannerSrc}
                alt={anime.title}
                className={`w-full h-full object-cover object-top transition-transform duration-7000 ease-out ${
                  isCurrent ? 'scale-105' : 'scale-100'
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `/posters/${anime.slug}.jpg`;
                }}
              />
              {/* Cinematic Vignette Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent w-full lg:w-3/4" />
              <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-slate-950/60 to-transparent" />
            </div>
          );
        })}

        {/* Hero Content */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 flex flex-col justify-end pb-10 sm:pb-14 lg:pb-16">
          <div className="max-w-2xl sm:max-w-3xl space-y-3 sm:space-y-4">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/95 text-slate-900 border border-white/60 shadow-xs backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                {currentAnime.type === 'DONGHUA' ? '3D Donghua' : currentAnime.type || 'Anime'}
              </span>

              {!currentAnime.is_free && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 shadow-xs">
                  <Crown className="w-3 h-3 fill-slate-950" />
                  VIP 4K
                </span>
              )}

              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md border border-white/20">
                {episodeBadge}
              </span>

              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 backdrop-blur-md">
                Khmer Dub & Sub
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight sm:leading-tight drop-shadow-md">
              {currentAnime.title}
            </h1>

            {/* Subtitle / Chinese name */}
            {currentAnime.alt_title && (
              <p className="text-sm sm:text-base text-amber-300 font-medium tracking-wide">
                {currentAnime.alt_title}
              </p>
            )}

            {/* Meta Info: Rating, Year, Country */}
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 font-medium">
              <span className="flex items-center gap-1 text-amber-400 font-bold bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md border border-amber-400/30">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {(currentAnime.average_rating || 9.5).toFixed(1)}
              </span>
              <span>•</span>
              <span>{currentAnime.year || 2024}</span>
              <span>•</span>
              <span>{currentAnime.country || 'China'}</span>
              {currentAnime.genres && currentAnime.genres.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-slate-300 truncate hidden sm:inline">
                    {currentAnime.genres.map((g) => g.name).slice(0, 3).join(' / ')}
                  </span>
                </>
              )}
            </div>

            {/* Synopsis */}
            <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl drop-shadow">
              {currentAnime.description ||
                `${currentAnime.title} គឺជាភាពយន្តភាគគំនូរជីវចល 3D ដ៏អស្ចារ្យ ផ្សាយផ្ទាល់លើវេទិកា ANIMEKH ជាមួយគុណភាព Ultra HD និងសំឡេងភាសាខ្មែរពិរោះ។`}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  navigate(watchUrl);
                }}
                className="flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>{language === 'km' ? 'ទស្សនាឥឡូវ' : 'Watch Episode 1'}</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  navigate(detailUrl);
                }}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/90 hover:bg-white text-slate-800 font-bold text-sm sm:text-base backdrop-blur-xl border border-white/60 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Info className="w-4 h-4" />
                <span>{language === 'km' ? 'ពត៌មានលម្អិត' : 'Details'}</span>
              </button>

              <button
                onClick={() => toggleBookmark(currentAnime.id)}
                className={`p-3 rounded-2xl backdrop-blur-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${
                  isBookmarked
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-white/90 hover:bg-white text-slate-800 border-white/60'
                }`}
                title={isBookmarked ? 'Remove from List' : 'Add to List'}
                aria-label="Add to Watchlist"
              >
                {isBookmarked ? <Check className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => {
                triggerHaptic('light');
                setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-white/90 hover:bg-white text-slate-800 backdrop-blur-xl border border-slate-200/80 shadow-md transition-all hover:scale-110 active:scale-95 hidden sm:flex items-center justify-center cursor-pointer"
              aria-label="Previous featured anime"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setCurrentIndex((prev) => (prev + 1) % items.length);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-white/90 hover:bg-white text-slate-800 backdrop-blur-xl border border-slate-200/80 shadow-md transition-all hover:scale-110 active:scale-95 hidden sm:flex items-center justify-center cursor-pointer"
              aria-label="Next featured anime"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Carousel Slide Indicators */}
            <div className="absolute bottom-4 sm:bottom-6 right-6 sm:right-10 z-30 flex items-center gap-1.5">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all rounded-full h-1.5 cursor-pointer ${
                    idx === currentIndex
                      ? 'w-7 bg-blue-500'
                      : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 🎬 Responsive Poster Card (Apple iOS 27 Pure White Glass)
// ─────────────────────────────────────────────────────────────
function CinemaPosterCard({ anime }: { anime: Anime }) {
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

  const detailType =
    anime.type === 'ANIME'
      ? 'anime'
      : anime.type === 'DONGHUA'
        ? 'donghua'
        : anime.type === 'DRAMA'
          ? 'drama'
          : 'movie';
  const detailUrl = `/${detailType}/${anime.slug}`;
  const watchUrl = `/watch/${anime.slug}/1`;

  const tagText =
    anime.status === 'COMPLETED'
      ? language === 'km'
        ? `ចប់ · ${anime.episode_count || 16} ភាគ`
        : `Completed · ${anime.episode_count || 16} eps`
      : anime.episode_count
        ? language === 'km'
          ? `ភាគ ${anime.episode_count}`
          : `Ep. ${anime.episode_count}`
        : language === 'km'
          ? 'ថ្មី'
          : 'New';

  const imgSrc = !imageError
    ? anime.poster_url || anime.banner_url || `/posters/${anime.slug}.jpg`
    : `/posters/${anime.slug}.jpg`;

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
    } catch { }
  };

  return (
    <div
      onClick={() => {
        triggerHaptic('light');
        navigate(watchUrl);
      }}
      className="group relative w-[145px] sm:w-[180px] md:w-[200px] flex-shrink-0 cursor-pointer rounded-2xl overflow-hidden bg-white border border-slate-200/80 hover:border-blue-400 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 select-none"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
        <img
          src={imgSrc}
          alt={anime.title}
          onError={() => setImageError(true)}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
        />

        {/* Gradient shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20 opacity-70 group-hover:opacity-50 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 backdrop-blur-md border border-slate-200/80 shadow-xs">
            {tagText}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleBookmark}
              className={`w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/60 shadow-xs'
              }`}
              title="Bookmark"
              aria-label="Bookmark"
            >
              {isBookmarked ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                navigate(detailUrl);
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/60 backdrop-blur-md shadow-xs transition-colors cursor-pointer"
              title="Details"
              aria-label="Details"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 transform group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-white translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3">
        <h3
          className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 group-hover:text-blue-600 transition-colors"
          title={anime.title}
        >
          {anime.title}
        </h3>

        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
          <div className="flex items-center gap-1 text-amber-500 font-bold">
            <Star className="w-3 h-3 fill-amber-500" />
            <span>{(anime.average_rating || 9.5).toFixed(1)}</span>
          </div>
          <span>{anime.year || 2024}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200/60">
            {anime.type === 'DONGHUA' ? '3D' : anime.type || 'Anime'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 📚 Horizontal Carousel Row with Smooth Arrow Navigation
// ─────────────────────────────────────────────────────────────
function AnimeCarouselShelf({
  title,
  subtitle,
  icon: Icon,
  items,
  viewAllLink,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  items: Anime[];
  viewAllLink?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const language = useLanguageStore((state) => state.language);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -600 : 600;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    triggerHaptic('light');
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="mb-8 sm:mb-10 relative group/shelf select-none">
      {/* Shelf Header */}
      <div className="flex items-end justify-between mb-3 px-4 sm:px-6 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-blue-600" />}
            <h2 className="font-display font-black text-lg sm:text-xl md:text-2xl text-slate-900 tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors px-3 py-1 rounded-full hover:bg-blue-50"
          >
            <span>{language === 'km' ? 'មើលទាំងអស់' : 'View All'}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Row with Navigation Controls */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-all shadow-md hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Horizontal Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar px-4 sm:px-6 lg:px-8 pb-3 scroll-smooth"
        >
          {items.map((anime) => (
            <CinemaPosterCard key={anime.id} anime={anime} />
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-all shadow-md hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// 🏠 Main HomePage Component
// ─────────────────────────────────────────────────────────────
export function HomePage() {
  const language = useLanguageStore((state) => state.language);
  const { isTelegram, isMobileApp } = usePlatform();
  const { isAuthenticated } = useAuthStore();

  const initialData = (() => {
    const sync = getLocalCatalogSync();
    if (sync && sync.anime && sync.anime.length > 0) return extractHomeData(sync);
    return null;
  })();

  const [forYouDonghua, setForYouDonghua] = useState<Anime[]>(initialData?.forYouDonghua || []);
  const [popularDonghua, setPopularDonghua] = useState<Anime[]>(initialData?.popularDonghua || []);
  const [animeList, setAnimeList] = useState<Anime[]>(initialData?.animeList || []);
  const [movies, setMovies] = useState<Anime[]>(initialData?.movies || []);
  const [allAnimeCatalog, setAllAnimeCatalog] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [continueItems, setContinueItems] = useState<WatchHistoryItem[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Load continue watching history
  useEffect(() => {
    let active = true;
    const loadContinue = async () => {
      let history = getLocalContinueHistory();
      if (isAuthenticated) {
        try {
          const response = await api.get('/history');
          if (Array.isArray(response.data)) history = response.data;
        } catch { }
      }
      const incomplete = history
        .filter(
          (item) =>
            item.progress_seconds > 0 &&
            (!item.duration_seconds || item.progress_seconds < item.duration_seconds * 0.95)
        )
        .slice(0, 12);
      if (active) setContinueItems(incomplete);
    };
    void loadContinue();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // Load catalog data from live API and local cache
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      try {
        const catalog = await loadCatalog();
        if (isMounted && catalog && catalog.anime && catalog.anime.length > 0) {
          const extracted = extractHomeData(catalog);
          setForYouDonghua(extracted.forYouDonghua);
          setPopularDonghua(extracted.popularDonghua);
          setAnimeList(extracted.animeList);
          setMovies(extracted.movies);
          setAllAnimeCatalog(catalog.anime);
          setIsLoading(false);
        }
      } catch {
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const refreshFromCatalog = () => {
      const catalog = getLocalCatalogSync();
      if (!catalog?.anime?.length) return;
      const extracted = extractHomeData(catalog);
      setForYouDonghua(extracted.forYouDonghua);
      setPopularDonghua(extracted.popularDonghua);
      setAnimeList(extracted.animeList);
      setMovies(extracted.movies);
      setAllAnimeCatalog(catalog.anime);
    };

    window.addEventListener('nami-catalog-updated', refreshFromCatalog);
    initData();
    return () => {
      isMounted = false;
      window.removeEventListener('nami-catalog-updated', refreshFromCatalog);
    };
  }, []);

  // Top featured hero items
  const heroItems = useMemo(() => {
    const combined = [...forYouDonghua, ...popularDonghua, ...animeList];
    const unique = combined.filter(
      (item, index, all) => all.findIndex((o) => o.id === item.id) === index
    );
    return unique.slice(0, 8);
  }, [forYouDonghua, popularDonghua, animeList]);

  const spaceHeroSlides = useMemo<SpaceHeroSlide[]>(() => {
    return heroItems.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      banner_url: item.banner_url || item.poster_url || '',
      poster_url: item.poster_url || '',
      type: item.type,
      rating: (item as any).rating || (item as any).score || '9.8',
      episode_count: item.episode_count,
      description: item.description,
    }));
  }, [heroItems]);

  // Genre filter chips
  const genreFilters = [
    { id: 'all', label: language === 'km' ? 'ទាំងអស់' : 'All' },
    { id: 'cultivation', label: language === 'km' ? 'បដិបត្តិធម៌' : 'Cultivation' },
    { id: 'xianxia', label: language === 'km' ? 'ទេពកោសល្យ' : 'Xianxia' },
    { id: 'action', label: language === 'km' ? 'សកម្មភាព' : 'Action' },
    { id: 'fantasy', label: language === 'km' ? 'វេទមន្ត' : 'Fantasy' },
    { id: 'sci-fi', label: language === 'km' ? 'វិទ្យាសាស្ត្រ' : 'Sci-Fi' },
    { id: 'comedy', label: language === 'km' ? 'កំប្លែង' : 'Comedy' },
  ];

  // Filtered anime row by active genre
  const genreFilteredItems = useMemo(() => {
    if (selectedGenre === 'all') return [];
    return allAnimeCatalog
      .filter((a) => a.genres?.some((g) => g.slug === selectedGenre))
      .slice(0, 16);
  }, [allAnimeCatalog, selectedGenre]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-text-secondary tracking-wider">
          {language === 'km' ? 'កំពុងដំណើរការ ANIMEKH...' : 'Loading ANIMEKH...'}
        </p>
      </div>
    );
  }

  // Telegram / Mobile App layout
  if (isTelegram || isMobileApp) {
    const miniSections = [
      {
        title: language === 'km' ? 'រឿងភាគដុងហួរ 3D' : 'Donghua for You',
        items: popularDonghua,
        link: '/donghua',
      },
      {
        title: language === 'km' ? 'អានីម៉ែជប៉ុន' : 'Popular Anime',
        items: animeList,
        link: '/anime',
      },
      {
        title: language === 'km' ? 'ភាពយន្តពិសេស' : 'Movies & Specials',
        items: movies,
        link: '/movies',
      },
    ].filter((s) => s.items.length > 0);

    return (
      <main className="mini-home min-h-screen bg-bg-base text-text-primary pb-10">
        {spaceHeroSlides.length > 0 && (
          <div className="px-3 pt-3">
            <SpaceCosmos3DHero slides={spaceHeroSlides} />
          </div>
        )}
        <div className="mini-home-sections mt-6">
          <ContinueWatchingSection items={continueItems} />
          {miniSections.map((section) => (
            <AnimeCarouselShelf
              key={section.title}
              title={section.title}
              items={section.items}
              viewAllLink={section.link}
            />
          ))}
        </div>
      </main>
    );
  }

  // Desktop & Tablet Web Layout
  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      {/* 3D Spaceship & Orbiting Planets Cosmos Hero + 3D Story Banner Slider */}
      {spaceHeroSlides.length > 0 && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <SpaceCosmos3DHero slides={spaceHeroSlides} />
        </div>
      )}

      {/* Main Shelves Content */}
      <div className="relative z-20 pt-6 pb-20">
        {/* Continue Watching Section */}
        {continueItems.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <ContinueWatchingSection items={continueItems} />
          </div>
        )}

        {/* Interactive Genre Filter Chips */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 shrink-0 mr-1">
              <Compass className="w-4 h-4 text-blue-600" />
              {language === 'km' ? 'ប្រភេទរឿង:' : 'Categories:'}
            </span>
            {genreFilters.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedGenre(tab.id);
                  triggerHaptic('light');
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  selectedGenre === tab.id
                    ? 'bg-blue-600 text-white shadow-xs scale-105'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-xs'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Filtered Genre Shelf (if selected) */}
        {selectedGenre !== 'all' && genreFilteredItems.length > 0 && (
          <AnimeCarouselShelf
            title={
              language === 'km'
                ? `រឿងតាមប្រភេទ: ${genreFilters.find((g) => g.id === selectedGenre)?.label}`
                : `Genre: ${genreFilters.find((g) => g.id === selectedGenre)?.label}`
            }
            subtitle={
              language === 'km'
                ? `បានរកឃើញ ${genreFilteredItems.length} រឿងក្នុងប្រភេទនេះ`
                : `Found ${genreFilteredItems.length} series in this category`
            }
            icon={Layers}
            items={genreFilteredItems}
            viewAllLink={`/explore?genre=${selectedGenre}`}
          />
        )}

        {/* Shelf 1: Trending Now */}
        <AnimeCarouselShelf
          title={language === 'km' ? 'កំពុងពេញនិយមខ្លាំង' : 'Trending Now'}
          subtitle={
            language === 'km'
              ? 'រឿងដែលទទួលបានការទស្សនាច្រើនជាងគេប្រចាំសប្តាហ៍'
              : 'Top rated series watched by the community this week'
          }
          icon={Flame}
          items={[...forYouDonghua, ...popularDonghua].slice(0, 14)}
          viewAllLink="/donghua"
        />

        {/* Shelf 2: 3D Donghua Cultivation Epics */}
        <AnimeCarouselShelf
          title={language === 'km' ? 'រឿងភាគដុងហួរ 3D កំពូល' : 'Top 3D Donghua'}
          subtitle={
            language === 'km'
              ? 'ពិភពបដិបត្តិធម៌ ក្បាច់គុណ និងសង្គ្រាមអាទិទេព'
              : 'Cultivation, martial arts, and immortal hero sagas'
          }
          icon={Sparkles}
          items={popularDonghua.slice(0, 16)}
          viewAllLink="/donghua"
        />

        {/* Clean Aerospace Theme Banner — Zero Paywall Clutter */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
          <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-bg-card border border-border-subtle shadow-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="space-y-1.5 text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                  <Sparkles className="w-3.5 h-3.5" />
                  MerDonghua Space Edition
                </span>
                <h3 className="text-xl sm:text-2xl font-display font-black text-text-primary tracking-tight">
                  {language === 'km'
                    ? 'រីករាយទស្សនារឿងកម្រិត 4K ភ្លាមៗដោយឥតគិតថ្លៃ'
                    : 'Watch Unlimited 4K Series & Movies Instantly'}
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary max-w-xl">
                  {language === 'km'
                    ? 'គ្រាន់តែចុចលើរឿងណាមួយ អាចទស្សនាបានភ្លាមៗទាំងលើទូរស័ព្ទ និងកុំព្យូទ័រ ជាមួយផ្ទៃពណ៌ស និងប្រផេះងាយស្រួលភ្នែក។'
                    : 'Click any series to watch instantly across mobile and desktop in crisp White or Cosmic Grey.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/donghua"
                  onClick={() => triggerHaptic('light')}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
                >
                  {language === 'km' ? 'ទស្សនា Donghua 3D' : 'Browse Donghua'}
                </Link>
                <Link
                  to="/explore"
                  className="px-5 py-2.5 rounded-2xl bg-bg-card-subtle hover:bg-slate-200/70 text-text-primary font-bold text-xs sm:text-sm border border-border-subtle transition-all active:scale-95"
                >
                  {language === 'km' ? 'រុករកទាំងអស់' : 'Explore All'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Shelf 3: Japanese Anime Favorites */}
        {animeList.length > 0 && (
          <AnimeCarouselShelf
            title={language === 'km' ? 'អានីម៉ែជប៉ុនល្បីៗ' : 'Popular Anime'}
            subtitle={
              language === 'km'
                ? 'សាច់រឿងប្លែកៗ កំពូលវីរបុរស និងផ្សងព្រេង'
                : 'Action-packed adventures, fantasy worlds, and fan favorites'
            }
            items={animeList.slice(0, 16)}
            viewAllLink="/anime"
          />
        )}

        {/* Shelf 4: Blockbuster Movies & Specials */}
        {movies.length > 0 && (
          <AnimeCarouselShelf
            title={language === 'km' ? 'ភាពយន្តពិសេស 3D Donghua' : 'Movies & Specials'}
            subtitle={
              language === 'km'
                ? 'ខ្សែភាពយន្តខ្នាតធំ ក្រាហ្វិកកម្រិតហូលីវូដ'
                : 'Feature-length animation movies with cinematic sound'
            }
            items={movies.slice(0, 14)}
            viewAllLink="/movies"
          />
        )}
      </div>
    </main>
  );
}

export default HomePage;