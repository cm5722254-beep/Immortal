import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Play, ChevronLeft, ChevronRight, Sparkles, Film } from 'lucide-react';
import type { Banner, Anime } from '../../types';

interface HeroCarousel3DProps {
  banners: Banner[];
  anime: Anime[];
}

interface SlideItem {
  id: number | string;
  title: string;
  subtitle?: string;
  rating?: number;
  badge?: string;
  image: string;
  link: string;
  type?: string;
  year?: string | number;
}

export function HeroCarousel3D({ banners, anime }: HeroCarousel3DProps) {
  const navigate = useNavigate();

  // Combine banners or top anime into rich 3D slides
  const slides: SlideItem[] = banners.length > 0
    ? banners.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle || 'Ultra HD 4K Streaming',
        rating: 9.9,
        badge: 'VIP Top Pick',
        image: b.image_url,
        link: b.link_url || (b.anime_id ? `/donghua/${b.anime_id}` : '/donghua'),
        type: 'DONGHUA',
        year: '2026',
      }))
    : anime.slice(0, 8).map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: a.season ? `Season ${a.season}` : (a.alt_title || `${a.episode_count || 12} Episodes`),
        rating: a.average_rating && a.average_rating > 0 ? a.average_rating : 9.8,
        badge: a.is_free ? 'Free' : 'VIP 4K',
        image: a.banner_url || a.poster_url || '',
        link: `/${a.type === 'ANIME' ? 'anime' : a.type === 'DONGHUA' ? 'donghua' : a.type === 'DRAMA' ? 'drama' : 'movie'}/${a.slug}`,
        type: a.type || 'DONGHUA',
        year: a.year || '2026',
      }));

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  const autoPlayRef = useRef<number | undefined>(undefined);

  const total = slides.length;

  // Auto-play interval
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    autoPlayRef.current = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 4800);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [total, isPaused]);

  if (total === 0) return null;

  const getSlideIndex = (offset: number) => {
    return (activeIndex + offset + total) % total;
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX !== null) {
      setTouchDeltaX(e.touches[0].clientX - touchStartX);
    }
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchDeltaX > 50) {
      handlePrev();
    } else if (touchDeltaX < -50) {
      handleNext();
    }
    setTouchStartX(null);
    setTouchDeltaX(0);
  };

  const activeSlide = slides[activeIndex];
  const leftSlide = slides[getSlideIndex(-1)];
  const rightSlide = slides[getSlideIndex(1)];
  const farLeftSlide = total > 3 ? slides[getSlideIndex(-2)] : null;
  const farRightSlide = total > 3 ? slides[getSlideIndex(2)] : null;

  return (
    <div
      className="relative w-full overflow-hidden pt-4 pb-8 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Dynamic Ambient Blur Spotlight matching active poster ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-out"
        style={{
          backgroundImage: activeSlide.image ? `url(${activeSlide.image})` : undefined,
          backgroundPosition: 'center 20%',
          backgroundSize: 'cover',
          filter: 'blur(60px) brightness(0.28) saturate(1.8)',
          transform: 'scale(1.3)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080306]/85 via-transparent to-[#080306] pointer-events-none" />

      {/* ── 3D Stage Container with Perspective ── */}
      <div
        className="relative max-w-6xl mx-auto px-4 h-[250px] sm:h-[340px] md:h-[400px] lg:h-[450px] flex items-center justify-center"
        style={{ perspective: '1200px' }}
      >
        {/* Far Left Slide (for widescreen desktop) */}
        {farLeftSlide && (
          <div
            onClick={() => setActiveIndex(getSlideIndex(-2))}
            className="hidden lg:block absolute left-4 z-0 w-[22%] aspect-[3/4] max-h-[300px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-700 ease-out opacity-25 hover:opacity-50 filter blur-[1px] shadow-2xl"
            style={{
              transform: 'translateX(-20px) rotateY(38deg) scale(0.72)',
              transformStyle: 'preserve-3d',
            }}
          >
            <img
              src={farLeftSlide.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        )}

        {/* Left Peeking Card */}
        {total > 1 && (
          <div
            onClick={() => setActiveIndex(getSlideIndex(-1))}
            className="absolute left-2 sm:left-10 md:left-20 lg:left-24 z-10 w-[42%] sm:w-[35%] md:w-[30%] lg:w-[28%] aspect-[3/4] max-h-[220px] sm:max-h-[300px] md:max-h-[360px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-700 ease-out opacity-45 hover:opacity-80 shadow-[0_15px_35px_rgba(0,0,0,0.8)] border border-white/10"
            style={{
              transform: 'rotateY(24deg) scale(0.85)',
              transformStyle: 'preserve-3d',
            }}
          >
            <img
              src={leftSlide.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-left line-clamp-1 text-xs font-bold text-gray-200">
              {leftSlide.title}
            </div>
          </div>
        )}

        {/* Center Active Enlarged 3D Hero Card (Floating 3D បែបសំហើរ) */}
        <div
          onClick={() => navigate(activeSlide.link)}
          className="relative z-30 w-[64%] sm:w-[50%] md:w-[40%] lg:w-[36%] aspect-[3/4] max-h-[310px] sm:max-h-[380px] md:max-h-[430px] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(255,77,109,0.35),0_25px_50px_rgba(0,0,0,0.95)] border-2 border-rose-400/80 transition-all duration-700 ease-out group cursor-pointer animate-levitate"
          style={{
            transform: 'rotateY(0deg) scale(1) translateZ(35px)',
            transformStyle: 'preserve-3d',
          }}
        >
          {activeSlide.image && (
            <img
              src={activeSlide.image}
              alt={activeSlide.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}

          {/* Dynamic Scrim Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />

          {/* Top Badges (Rating & 4K VIP) */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
            <span className="badge-rating text-[11px] sm:text-xs py-1 px-2.5 shadow-xl bg-black/80 backdrop-blur-md border border-rose-500/40 text-rose-300">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 animate-pulse" />
              <span className="font-black">{activeSlide.rating?.toFixed(1) || '9.9'}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider py-1 px-2.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-lg shadow-rose-600/40">
              <Sparkles className="w-3 h-3 text-white" />
              {activeSlide.badge || '4K UHD'}
            </span>
          </div>

          {/* Center Pulsing Play Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-rose-600 via-pink-500 to-rose-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(255,77,109,0.85)] group-hover:scale-115 transition-transform duration-300 radar-pulse">
              <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white translate-x-0.5" />
            </div>
          </div>

          {/* Bottom Title, Subtitle, and Watch Callout */}
          <div className="absolute bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-4 text-left z-20 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-rose-300 uppercase tracking-wider">
              <Film className="w-3.5 h-3.5 text-rose-400" />
              <span>{activeSlide.type || 'Donghua'} · {activeSlide.year}</span>
            </div>
            
            <h3 className="font-display font-black text-sm sm:text-lg md:text-xl text-white line-clamp-1 drop-shadow-md group-hover:text-rose-300 transition-colors">
              {activeSlide.title}
            </h3>

            {activeSlide.subtitle && (
              <p className="text-[11px] sm:text-xs text-gray-300 font-medium drop-shadow line-clamp-1">
                {activeSlide.subtitle}
              </p>
            )}

            <div className="pt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 px-3.5 py-1.5 rounded-xl shadow-md shadow-rose-500/30">
                <Play className="w-3 h-3 fill-white" /> ទស្សនាឥឡូវនេះ (Watch Now)
              </span>
            </div>
          </div>
        </div>

        {/* Right Peeking Card */}
        {total > 1 && (
          <div
            onClick={() => setActiveIndex(getSlideIndex(1))}
            className="absolute right-2 sm:right-10 md:right-20 lg:right-24 z-10 w-[42%] sm:w-[35%] md:w-[30%] lg:w-[28%] aspect-[3/4] max-h-[220px] sm:max-h-[300px] md:max-h-[360px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-700 ease-out opacity-45 hover:opacity-85 shadow-[0_15px_35px_rgba(0,0,0,0.8)] border border-white/10 hover:border-rose-400/50"
            style={{
              transform: 'rotateY(-24deg) scale(0.85)',
              transformStyle: 'preserve-3d',
            }}
          >
            <img
              src={rightSlide.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-left line-clamp-1 text-xs font-bold text-gray-200">
              {rightSlide.title}
            </div>
          </div>
        )}

        {/* Far Right Slide (for widescreen desktop) */}
        {farRightSlide && (
          <div
            onClick={() => setActiveIndex(getSlideIndex(2))}
            className="hidden lg:block absolute right-4 z-0 w-[22%] aspect-[3/4] max-h-[300px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-700 ease-out opacity-25 hover:opacity-50 filter blur-[1px] shadow-2xl"
            style={{
              transform: 'translateX(20px) rotateY(-38deg) scale(0.72)',
              transformStyle: 'preserve-3d',
            }}
          >
            <img
              src={farRightSlide.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        )}

        {/* ── Glass Navigation Arrows ── */}
        {total > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="absolute left-1 sm:left-3 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-rose-500 text-white border border-white/15 backdrop-blur-xl flex items-center justify-center transition-all duration-300 shadow-xl active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              onClick={handleNext}
              aria-label="Next Slide"
              className="absolute right-1 sm:right-3 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-rose-500 text-white border border-white/15 backdrop-blur-xl flex items-center justify-center transition-all duration-300 shadow-xl active:scale-90 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}
      </div>

      {/* ── Carousel Pagination Indicators ── */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 relative z-30">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                idx === activeIndex
                  ? 'w-8 bg-gradient-to-r from-rose-500 to-pink-500 shadow-[0_0_12px_rgba(255,77,109,0.8)]'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
