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

// ─────────────────────────────────────────────────────────────
// 🌟 Ultra-Premium Hero Carousel
// ─────────────────────────────────────────────────────────────
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
    } catch {}
    triggerHaptic('light');
  };

  const detailUrl = `/${
    currentAnime.type === 'ANIME'
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
    <div
      className="relative w-full h-[520px] sm:h-[620px] lg:h-[700px] overflow-hidden select-none bg-black"
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/75 to-transparent w-full lg:w-3/4" />
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#0a0a0f]/80 to-transparent" />
          </div>
        );
      })}

      {/* Hero Content */}
      <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16 lg:pb-20">
        <div className="max-w-2xl sm:max-w-3xl space-y-3 sm:space-y-4">
          {/* Badges Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/20">
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              {currentAnime.type === 'DONGHUA' ? '3D Donghua' : currentAnime.type || 'Anime'}
            </span>

            {!currentAnime.is_free && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Crown className="w-3 h-3 text-amber-400" />
                VIP 4K
              </span>
            )}

            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-md border border-white/10">
              {episodeBadge}
            </span>

            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
          <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-300 font-medium">
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
                <span className="text-gray-400 truncate hidden sm:inline">
                  {currentAnime.genres.map((g) => g.name).slice(0, 3).join(' / ')}
                </span>
              </>
            )}
          </div>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl drop-shadow">
            {currentAnime.description ||
              `${currentAnime.title} គឺជាភាពយន្តភាគគំនូរជីវចល 3D ដ៏អស្ចារ្យ ផ្សាយផ្ទាល់លើវេទិកា ANIMEKH ជាមួយគុណភាព Ultra HD និងសំឡេងភាសាខ្មែរពិរោះ។`}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                triggerHaptic('medium');
                navigate(watchUrl);
              }}
              className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-extrabold text-sm sm:text-base shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>{language === 'km' ? 'ទស្សនាឥឡូវ' : 'Watch Episode 1'}</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                navigate(detailUrl);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base backdrop-blur-md border border-white/15 transition-all hover:scale-105 active:scale-95"
            >
              <Info className="w-4 h-4" />
              <span>{language === 'km' ? 'ពត៌មានលម្អិត' : 'More Details'}</span>
            </button>

            <button
              onClick={() => toggleBookmark(currentAnime.id)}
              className={`p-3 rounded-xl backdrop-blur-md border transition-all hover:scale-105 active:scale-95 ${
                isBookmarked
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-400'
                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
              }`}
              title={isBookmarked ? 'Remove from List' : 'Add to List'}
              aria-label="Add to Watchlist"
            >
              {isBookmarked ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
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
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-110 active:scale-95 hidden sm:flex items-center justify-center"
            aria-label="Previous featured anime"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setCurrentIndex((prev) => (prev + 1) % items.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-110 active:scale-95 hidden sm:flex items-center justify-center"
            aria-label="Next featured anime"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Carousel Slide Indicators */}
          <div className="absolute bottom-4 sm:bottom-6 right-6 sm:right-10 z-30 flex items-center gap-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all rounded-full h-2 ${
                  idx === currentIndex
                    ? 'w-8 bg-amber-400'
                    : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 🎬 Responsive Poster Card (Standard Cinema Aspect Ratio 3:4)
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
    } catch {}
  };

  return (
    <div
      onClick={() => {
        triggerHaptic('light');
        navigate(watchUrl);
      }}
      className="group relative w-[150px] sm:w-[185px] md:w-[210px] flex-shrink-0 cursor-pointer rounded-2xl overflow-hidden bg-[#121318] border border-white/5 hover:border-amber-400/40 shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-900">
        <img
          src={imgSrc}
          alt={anime.title}
          onError={() => setImageError(true)}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
        />

        {/* Gradient shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121318] via-transparent to-black/30 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/10">
            {tagText}
          </span>

          <div className="flex items-center gap-1">
            {!anime.is_free && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow">
                VIP
              </span>
            )}
            <button
              onClick={toggleBookmark}
              className={`w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                isBookmarked
                  ? 'bg-amber-400 text-black'
                  : 'bg-black/50 text-white hover:bg-white hover:text-black'
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
              className="w-6 h-6 rounded-full flex items-center justify-center bg-black/50 hover:bg-white hover:text-black text-white backdrop-blur-md transition-colors"
              title="Details"
              aria-label="Details"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="w-12 h-12 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-xl shadow-amber-500/30 transform group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-black translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3">
        <h3
          className="font-bold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-amber-400 transition-colors"
          title={anime.title}
        >
          {anime.title}
        </h3>

        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
          <div className="flex items-center gap-1 text-amber-400 font-semibold">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{(anime.average_rating || 9.5).toFixed(1)}</span>
          </div>
          <span>{anime.year || 2024}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
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
    <section className="mb-10 sm:mb-12 relative group/shelf">
      {/* Shelf Header */}
      <div className="flex items-end justify-between mb-4 px-4 sm:px-6 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-amber-400" />}
            <h2 className="font-display font-extrabold text-lg sm:text-2xl text-white tracking-wide">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
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
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-amber-400 hover:text-black text-white border border-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-95"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-amber-400 hover:text-black text-white border border-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-95"
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
        } catch {}
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
    return unique.slice(0, 6);
  }, [forYouDonghua, popularDonghua, animeList]);

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
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-400 tracking-wider">
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
      <main className="mini-home min-h-screen bg-[#0a0a0f] text-white pb-10">
        {heroItems.length > 0 && <HeroCarousel items={heroItems} />}
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
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* 🌟 Ultra-Premium Hero Carousel */}
      {heroItems.length > 0 && <HeroCarousel items={heroItems} />}

      {/* Main Shelves Content */}
      <div className="relative z-20 -mt-10 sm:-mt-16 pb-20">
        {/* Continue Watching Section */}
        {continueItems.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
            <ContinueWatchingSection items={continueItems} />
          </div>
        )}

        {/* Interactive Genre Filter Chips */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 shrink-0 mr-1">
              <Compass className="w-4 h-4 text-amber-400" />
              {language === 'km' ? 'ប្រភេទរឿង:' : 'Categories:'}
            </span>
            {genreFilters.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedGenre(tab.id);
                  triggerHaptic('light');
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  selectedGenre === tab.id
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20 scale-105'
                    : 'bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/5'
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

        {/* Shelf 1: 🔥 Trending Now */}
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

        {/* Shelf 2: ⚔️ 3D Donghua Cultivation Epics */}
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

        {/* VIP Promotion Showcase Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-12">
          <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 bg-gradient-to-r from-amber-500/20 via-purple-500/10 to-rose-500/20 border border-amber-400/30 shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-black">
                  <Crown className="w-3.5 h-3.5 fill-black" />
                  VIP PREMIUM MEMBER
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-white">
                  {language === 'km'
                    ? 'ទស្សនារឿងកម្រិត 4K Ultra HD គ្មានការរំខាន'
                    : 'Stream Unlimited 4K Ultra HD With Zero Ads'}
                </h3>
                <p className="text-sm text-gray-300 max-w-xl">
                  {language === 'km'
                    ? 'រីករាយជាមួយភាគថ្មីៗមុនគេ ទាញយកទុកមើលក្រៅបណ្តាញ និងការគាំទ្រពិសេសតាម Telegram។'
                    : 'Enjoy early episode releases, fast cloud streaming, offline downloads, and dedicated support.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/vip"
                  onClick={() => triggerHaptic('medium')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-extrabold text-sm shadow-xl shadow-amber-500/30 transition-all hover:scale-105 active:scale-95"
                >
                  {language === 'km' ? 'ចូលរួមជា VIP ឥឡូវនេះ' : 'Upgrade to VIP'}
                </Link>
                <Link
                  to="/explore"
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 transition-all"
                >
                  {language === 'km' ? 'ស្វែងយល់បន្ថែម' : 'Explore All'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Shelf 3: 🌸 Japanese Anime Favorites */}
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

        {/* Shelf 4: 🎬 Blockbuster Movies & Specials */}
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