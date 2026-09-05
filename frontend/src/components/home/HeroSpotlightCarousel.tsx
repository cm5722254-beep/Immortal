import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Info, Plus, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Banner, Anime } from '../../types';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface HeroSpotlightCarouselProps {
  banners?: Banner[];
  anime: Anime[];
}

export function HeroSpotlightCarousel({ banners: _banners, anime }: HeroSpotlightCarouselProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const items = anime.length > 0 ? anime.slice(0, 10) : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nami_my_list') || '[]');
    } catch {
      return [];
    }
  });

  const total = items.length;
  const AUTOPLAY_TIME = 5000;

  // Touch swipe support for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Responsive Window Width for Dynamic 3D Radius
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3D Ring Setup - Scaled for Mobile, Tablet & Desktop
  const RING_COUNT = Math.min(total, 8);
  const ringItems = items.slice(0, RING_COUNT);
  const theta = 360 / RING_COUNT;
  const radius = windowWidth < 380 ? 115 : windowWidth < 480 ? 135 : windowWidth < 768 ? 185 : 250;

  // Auto-rotation timer
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setActiveIndex((curr) => (curr + 1) % total);
    }, AUTOPLAY_TIME);

    return () => clearInterval(timer);
  }, [total, isPaused, activeIndex]);

  if (total === 0) return null;

  const current = items[activeIndex];
  const bgImage = current.banner_url || current.poster_url || '';
  const detailType = current.type === 'ANIME' ? 'anime' : current.type === 'DRAMA' ? 'drama' : current.type === 'MOVIE' ? 'movie' : 'donghua';
  const watchUrl = `/watch/${current.slug}/1`;
  const detailUrl = `/${detailType}/${current.slug}`;

  const rating = current.average_rating && current.average_rating > 0
    ? current.average_rating.toFixed(1)
    : '9.8';

  const isBookmarked = bookmarkedIds.includes(current.id);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: number[];
    if (isBookmarked) {
      updated = bookmarkedIds.filter((id) => id !== current.id);
    } else {
      updated = [...bookmarkedIds, current.id];
      if (isAuthenticated) {
        api.post(`/favorites/${current.id}`).catch(() => {});
      }
    }
    setBookmarkedIds(updated);
    localStorage.setItem('nami_my_list', JSON.stringify(updated));
  };

  const handlePrev = () => {
    setActiveIndex((curr) => (curr - 1 + total) % total);
  };

  const handleNext = () => {
    setActiveIndex((curr) => (curr + 1) % total);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 45) {
      handleNext();
    } else if (distance < -45) {
      handlePrev();
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden select-none bg-[#141414] min-h-[520px] sm:min-h-[620px] md:min-h-[680px] flex items-center touch-pan-y"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── 1. Panoramic Ambient Backdrop ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          key={current.id}
          src={bgImage}
          alt={current.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center sm:object-[center_20%] scale-105 transition-all duration-1000 ease-out"
        />

        {/* Netflix Left-to-Right Cinema Gradient */}
        <div className="absolute inset-0 netflix-billboard-vignette" />

        {/* Netflix Bottom Fade to Solid #141414 */}
        <div className="absolute inset-0 netflix-billboard-fade-bottom" />

        {/* Top Vignette for Navbar readability */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />
      </div>

      {/* ── 2. Content & 3D Rotating Circle Section ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 w-full z-20 pt-16 pb-12">
        <div className="flex flex-col-reverse lg:flex-row items-center justify-between gap-8 lg:gap-12">
          
          {/* Left Column: Movie Info & Actions (Netflix style) */}
          <div className="max-w-xl space-y-4 text-center lg:text-left">
            {/* Netflix Top 10 Ribbon */}
            <div className="inline-flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded bg-[#E50914] text-white font-black text-xs shadow-lg shadow-red-600/40">
                TOP
              </span>
              <span className="font-bold text-xs sm:text-sm tracking-wider uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                #{activeIndex + 1} ពេញនិយមបំផុតនៅកម្ពុជាថ្ងៃនេះ
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display font-black text-2xl sm:text-4xl md:text-5xl lg:text-5xl text-white tracking-tight leading-[1.1] drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] line-clamp-2">
              {current.title}
            </h1>

            {/* Subtitle / Alternate Title */}
            {current.alt_title && (
              <p className="text-gray-300 font-medium text-xs sm:text-sm tracking-wide drop-shadow line-clamp-1">
                {current.alt_title}
              </p>
            )}

            {/* Netflix Metadata Row */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 text-xs sm:text-sm font-bold text-white/90 drop-shadow">
              <span className="text-[#46d369] font-black">98% Match</span>
              <span className="text-yellow-400 font-bold">★ {rating}</span>
              <span className="text-gray-400">•</span>
              <span>{current.year || 2024}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black border border-white/40 bg-black/40 backdrop-blur-md">13+</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black border border-white/40 bg-black/40 backdrop-blur-md">4K ULTRA HD</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black border border-white/40 bg-black/40 backdrop-blur-md">5.1 AUDIO</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-300 font-medium">{current.episode_count ? `${current.episode_count} ភាគ` : 'ភាគថ្មីៗ'}</span>
            </div>

            {/* Description */}
            <p className="text-gray-200 text-xs sm:text-sm leading-relaxed line-clamp-3 max-w-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mx-auto lg:mx-0">
              {current.description || `ទស្សនារឿង ${current.title} កម្រិត 4K UHD Ultra HD លើ NAMI ANIME គ្មានការរំខានដោយពាណិជ្ជកម្ម។`}
            </p>

            {/* Netflix Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={() => navigate(watchUrl)}
                className="netflix-btn-play cursor-pointer"
              >
                <Play className="w-5 h-5 fill-black text-black" />
                <span className="text-sm sm:text-base font-bold">ចាក់ទស្សនា</span>
              </button>

              <Link
                to={detailUrl}
                className="netflix-btn-info cursor-pointer"
              >
                <Info className="w-5 h-5" />
                <span className="text-sm sm:text-base font-semibold">ព័ត៌មានបន្ថែម</span>
              </Link>

              <button
                onClick={toggleBookmark}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                  isBookmarked
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400'
                    : 'border-white/40 bg-black/40 hover:border-white text-white hover:bg-black/60'
                }`}
                title={isBookmarked ? 'បានបញ្ចូលក្នុងបញ្ជី' : 'បញ្ចូលក្នុងបញ្ជីខ្ញុំ'}
              >
                {isBookmarked ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* ── Right Column: 3D ROTATING CIRCULAR CAROUSEL (វិលជារង្វង់ 3D) ── */}
          <div className="relative w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[460px] h-[310px] sm:h-[350px] flex items-center justify-center scene-3d py-4">
            
            {/* Ambient Platform Glow beneath the 3D rotating circle */}
            <div className="absolute bottom-4 w-64 sm:w-72 h-14 bg-[#E50914]/25 blur-3xl rounded-full pointer-events-none" />

            {/* The 3D Rotating Ring */}
            <div
              className="carousel-3d-ring relative w-[130px] sm:w-[160px] md:w-[185px] h-[190px] sm:h-[230px] md:h-[265px]"
              style={{
                transform: `rotateY(${-activeIndex * theta}deg) rotateX(-5deg)`,
              }}
            >
              {ringItems.map((item, idx) => {
                const isActive = idx === (activeIndex % RING_COUNT);
                const itemImg = item.poster_url || item.banner_url || '';

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`card-3d absolute inset-0 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-500 shadow-xl ${
                      isActive
                        ? 'card-3d-active border-[#E50914] z-30'
                        : 'card-3d-inactive border-white/20'
                    }`}
                    style={{
                      transform: `rotateY(${idx * theta}deg) translateZ(${radius}px)`,
                    }}
                    title={item.title}
                  >
                    <img
                      src={itemImg}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/30 pointer-events-none" />

                    {/* Rank Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-md ${
                        isActive ? 'bg-[#E50914] text-white shadow-red-600/50' : 'bg-black/70 text-gray-300'
                      }`}>
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Quality Pill */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-black/60 backdrop-blur-md text-amber-300 border border-amber-400/30">
                        4K
                      </span>
                    </div>

                    {/* Title on Bottom of Card */}
                    <div className="absolute bottom-2.5 inset-x-2 text-center pointer-events-none">
                      <p className="text-[11px] sm:text-xs font-bold text-white line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        {item.title}
                      </p>
                      <span className="text-[9px] text-gray-300 font-medium">
                        {item.episode_count ? `${item.episode_count} ភាគ` : 'ភាគថ្មី'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3D Circular Control Arrows (Left / Right) */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-40 px-1">
              <button
                onClick={handlePrev}
                className="w-9 h-9 rounded-full bg-black/70 hover:bg-[#E50914] text-white flex items-center justify-center border border-white/20 transition-all pointer-events-auto cursor-pointer shadow-lg hover:scale-110"
                title="មុន"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleNext}
                className="w-9 h-9 rounded-full bg-black/70 hover:bg-[#E50914] text-white flex items-center justify-center border border-white/20 transition-all pointer-events-auto cursor-pointer shadow-lg hover:scale-110"
                title="បន្ទាប់"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* ── 3. Bottom Slide Indicators ── */}
      <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-8 lg:right-12 sm:translate-x-0 bottom-3 sm:bottom-4 z-30 flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                idx === activeIndex
                  ? 'w-6 h-1.5 bg-[#E50914]'
                  : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
