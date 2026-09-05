import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, ChevronLeft, ChevronRight, Star, Sparkles, Flame, Film, Crown } from 'lucide-react';
import type { Banner, Anime } from '../../types';

interface HeroBannerProps {
  banners: Banner[];
  anime: Anime[];
}

export function HeroBanner({ banners, anime }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);

  const slides = banners.length > 0
    ? banners.map((b) => ({ banner: b, animeItem: anime.find((a) => a.id === b.anime_id) }))
    : anime.slice(0, 6).map((a) => ({ banner: null, animeItem: a }));

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = window.setTimeout(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 7000);
    return () => clearTimeout(timerRef.current);
  }, [current, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[current];
  const item = slide.animeItem;
  const bgImage = slide.banner?.image_url || item?.banner_url || item?.poster_url;
  const title = slide.banner?.title || item?.title || '';
  const subtitle = slide.banner?.subtitle || item?.alt_title || '';
  const detailType = item?.type === 'ANIME' ? 'anime' : item?.type === 'DRAMA' ? 'drama' : item?.type === 'MOVIE' ? 'movie' : 'donghua';
  const linkUrl = slide.banner?.link_url || (item ? `/${detailType}/${item.slug}` : '/');
  const watchUrl = item ? `/watch/${item.slug}/1` : '/';


  return (
    <section className="relative w-full min-h-[580px] h-[78vh] max-h-[860px] overflow-hidden bg-[#07050e]">
      {/* Background Image with Slow Cinematic Zoom */}
      {bgImage && (
        <div key={current} className="absolute inset-0 animate-fade-in overflow-hidden">
          <img
            src={bgImage}
            alt={title}
            className="w-full h-full object-cover object-center scale-105 animate-pulse-slow transition-transform duration-1000 ease-out"
          />
        </div>
      )}

      {/* Multi-layered Cinematic Donghua Gradients & Dragon Fog */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07050e] via-[#07050e]/80 md:via-[#07050e]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07050e] via-[#07050e]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07050e]/70 via-transparent to-[#07050e]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.18),transparent_50%)] pointer-events-none" />

      {/* Main Hero Content Layout */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-12 md:pb-16 px-4 md:px-12 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          
          {/* Left Column: Title, Cultivation Metadata, & Action CTAs */}
          <div className="lg:col-span-8 space-y-4 max-w-3xl animate-slide-up" key={current}>
            
            {/* Top Badges: Type, Cultivation Studio, 4K UHD, Heat Score */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs py-1 px-3 shadow-lg shadow-red-600/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-white" />
                {item?.type === 'DONGHUA' ? '🇨🇳 DONGHUA 3D' : '🇯🇵 ANIME'}
              </span>

              <span className="badge-4k">4K UHD</span>

              <span className="badge-studio">
                {item?.studio || 'Tencent Penguin / Foch Film'}
              </span>

              {item?.airing_day && (
                <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  {item.airing_day}s Release
                </span>
              )}

              {item && item.heat_score > 0 && (
                <span className="flex items-center gap-1 text-orange-400 text-xs font-black bg-black/60 px-2.5 py-0.5 rounded-full border border-orange-500/30 backdrop-blur-md">
                  <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500 animate-bounce" />
                  {(item.heat_score / 1000).toFixed(1)}K 热度
                </span>
              )}

              {item && (item.average_rating ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-yellow-400 text-xs font-black bg-black/60 px-2.5 py-0.5 rounded-full border border-yellow-500/30 backdrop-blur-md">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" />
                  {(item.average_rating ?? 5.0).toFixed(1)}
                </span>
              )}
            </div>

            {/* Chinese Alt Title / Subtitle */}
            {subtitle && (
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg sm:text-2xl text-amber-400/90 tracking-widest font-black drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                  {subtitle}
                </span>
              </div>
            )}

            {/* Primary Main Title */}
            <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl text-white tracking-tight leading-[1.1] drop-shadow-2xl">
              {title}
            </h1>

            {/* Description Snippet */}
            {item?.description && (
              <p className="text-gray-300 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3 max-w-2xl drop-shadow-md">
                {item.description}
              </p>
            )}

            {/* Cultivation Genre Realm Tags */}
            {item && item.genres && item.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {item.genres.slice(0, 4).map((g) => (
                  <Link
                    key={g.id}
                    to={`/explore?genre=${g.slug}`}
                    className="px-3 py-1 text-xs font-bold rounded-xl bg-white/10 hover:bg-brand-500/30 text-gray-200 hover:text-white border border-white/10 hover:border-brand-500/50 backdrop-blur-md transition-all duration-200 shadow-sm"
                  >
                    #{g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Interactive CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-3">
              <Link
                to={watchUrl}
                className="btn-primary text-sm sm:text-base px-7 py-3.5 shadow-xl shadow-red-600/30 hover:scale-105 transition-transform flex items-center gap-2.5 font-bold"
              >
                <Play className="w-5 h-5 fill-white" />
                ទស្សនាឥឡូវនេះ (Episode 1)
              </Link>
              <Link
                to={linkUrl}
                className="btn-secondary text-sm sm:text-base px-6 py-3.5 glass hover:bg-white/15 border-white/20 text-white font-bold flex items-center gap-2"
              >
                <Info className="w-5 h-5 text-gray-300" />
                ព័ត៌មានរឿង
              </Link>
              <Link
                to="/vip"
                className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 backdrop-blur-md transition-all hover:scale-105"
              >
                <Crown className="w-4 h-4 fill-amber-400" /> VIP 4K UHD
              </Link>
            </div>
          </div>

          {/* Right Column: Carousel Slide Preview Thumbnails */}
          <div className="hidden lg:flex lg:col-span-4 flex-col justify-end items-end space-y-3">
            <span className="text-[11px] font-mono text-gray-400 tracking-wider flex items-center gap-1.5 uppercase font-bold">
              <Film className="w-3.5 h-3.5 text-brand-400" /> ភាពយន្តពេញនិយម (Top Spotlight)
            </span>
            <div className="flex items-center gap-2.5 bg-black/60 p-2 rounded-2xl border border-white/10 backdrop-blur-xl">
              {slides.map((s, idx) => {
                const sImg = s.banner?.image_url || s.animeItem?.poster_url;
                const sTitle = s.banner?.title || s.animeItem?.title;
                const isActive = idx === current;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrent(idx)}
                    className={`relative w-14 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                      isActive
                        ? 'border-amber-400 scale-105 shadow-lg shadow-amber-500/40 ring-2 ring-amber-400/50'
                        : 'border-transparent opacity-60 hover:opacity-100 hover:scale-100'
                    }`}
                    title={sTitle}
                  >
                    <img src={sImg} alt={sTitle} className="w-full h-full object-cover" />
                    {isActive && (
                      <div className="absolute inset-0 bg-amber-500/10 border-b-2 border-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Slide Navigation Controls */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-brand-600/90 text-white flex items-center justify-center border border-white/10 backdrop-blur-md hover:scale-110 transition-all shadow-xl"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % slides.length)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-brand-600/90 text-white flex items-center justify-center border border-white/10 backdrop-blur-md hover:scale-110 transition-all shadow-xl"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </section>
  );
}

