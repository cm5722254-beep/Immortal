import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Info, Plus, Check, Star, Sparkles } from 'lucide-react';
import type { Banner, Anime } from '../../types';
import { triggerHaptic } from '../../utils/telegram';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface MiniAppHeroBannerProps {
  banners?: Banner[];
  anime: Anime[];
}

export function MiniAppHeroBanner({ banners, anime }: MiniAppHeroBannerProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const items = (() => {
    const bannerItems = (banners || [])
      .filter((b) => b.is_active && b.image_url)
      .map((b) => {
        const matched = anime.find((a) => a.id === b.anime_id);
        return {
          id: matched ? matched.id : 999000 + b.id,
          title: b.title || matched?.title || 'រឿងពិសេស Ultra 3D',
          slug: matched?.slug || (b.link_url ? b.link_url.replace(/^\//, '').replace(/^watch\//, '').split('/')[0] : 'donghua'),
          alt_title: b.subtitle || matched?.alt_title || 'កម្រិត 4K Ultra HD 60FPS',
          description: matched?.description || b.subtitle || 'ទស្សនារឿង Ultra 3D គ្មានការរំខានដោយពាណិជ្ជកម្ម។',
          banner_url: b.image_url,
          poster_url: matched?.poster_url || b.image_url,
          type: matched?.type || 'DONGHUA',
          year: matched?.year || 2026,
          episode_count: matched?.episode_count || 12,
          average_rating: matched?.average_rating || 9.9,
          link_url: b.link_url,
        } as Anime & { link_url?: string };
      });

    if (bannerItems.length > 0) {
      const existingIds = new Set(bannerItems.map((b) => b.id));
      const remaining = anime.filter((a) => !existingIds.has(a.id));
      return [...bannerItems, ...remaining].slice(0, 8);
    }
    return anime.slice(0, 8);
  })();

  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nami_my_list') || '[]');
    } catch {
      return [];
    }
  });

  const total = items.length;

  // Auto slide every 5s
  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((curr) => (curr + 1) % total);
    }, 5000);
    return () => clearInterval(timer);
  }, [total]);

  if (total === 0) return null;

  const current = items[activeIndex];
  const bgImage = current.banner_url || current.poster_url || '';
  const detailType = current.type === 'ANIME' ? 'anime' : current.type === 'DRAMA' ? 'drama' : current.type === 'MOVIE' ? 'movie' : 'donghua';
  const watchUrl = (current as any).link_url || `/watch/${current.slug}/1`;
  const detailUrl = (current as any).link_url || `/${detailType}/${current.slug}`;
  const isBookmarked = bookmarkedIds.includes(current.id);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
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

  const handleNext = () => {
    triggerHaptic('light');
    setActiveIndex((curr) => (curr + 1) % total);
  };

  const handlePrev = () => {
    triggerHaptic('light');
    setActiveIndex((curr) => (curr - 1 + total) % total);
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
      className="relative w-full overflow-hidden select-none bg-[#080d1a] touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── 1. Full-Bleed Cinema Backdrop ── */}
      <div className="relative aspect-[16/11] sm:aspect-[16/9] w-full overflow-hidden">
        <img
          key={current.id}
          src={bgImage}
          alt={current.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top sm:object-center scale-105 transition-all duration-700 ease-out animate-fade-in"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Ambient Gradients (Top, Bottom & Vignette) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d1a]/80 via-transparent to-transparent h-20" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#080d1a]/60 pointer-events-none" />

        {/* Floating Rank Badge Top Right */}
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-md border border-rose-500/40 text-rose-300 shadow-lg shadow-rose-500/20">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>TOP #{activeIndex + 1}</span>
          </span>
        </div>
      </div>

      {/* ── 2. Movie Info & Primary Actions ── */}
      <div className="relative px-4 pt-1 pb-4 -mt-16 z-20 space-y-3">
        {/* Genre & Quality Tags */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/40 text-rose-200 backdrop-blur-md">
            {current.type === 'ANIME' ? '🇯🇵 Anime ជប៉ុន' : current.type === 'MOVIE' ? '🍿 ភាពយន្តដុំ' : '🐉 Donghua 3D'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 backdrop-blur-md flex items-center gap-1">
            <Star className="w-2.5 h-2.5 fill-amber-400" /> {(current.average_rating || 9.8).toFixed(1)}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-gray-200 border border-white/15 text-[10px]">
            4K UHD
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-gray-200 border border-white/15 text-[10px]">
            {current.episode_count ? `${current.episode_count} ភាគ` : 'ភាគថ្មីៗ'}
          </span>
        </div>

        {/* Main Title */}
        <div className="text-center px-2">
          <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] line-clamp-2">
            {current.title}
          </h1>
          {current.alt_title && (
            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 font-medium">
              {current.alt_title}
            </p>
          )}
        </div>

        {/* Prominent Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {/* Primary Play Button */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              navigate(watchUrl);
            }}
            className="flex-1 max-w-[200px] py-2.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(255,77,109,0.45)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white text-white" />
            <span>ចាក់ទស្សនាឥឡូវនេះ</span>
          </button>

          {/* Add to My List */}
          <button
            onClick={toggleBookmark}
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              isBookmarked
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title={isBookmarked ? 'បានបញ្ចូល' : 'បញ្ចូលក្នុងបញ្ជី'}
          >
            {isBookmarked ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>

          {/* Info Details */}
          <Link
            to={detailUrl}
            onClick={() => triggerHaptic('light')}
            className="w-10 h-10 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90"
            title="ព័ត៌មានលម្អិត"
          >
            <Info className="w-4 h-4 text-gray-200" />
          </Link>
        </div>

        {/* Animated Dot Indicators */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                triggerHaptic('light');
                setActiveIndex(idx);
              }}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                idx === activeIndex
                  ? 'w-6 h-1.5 bg-gradient-to-r from-rose-500 to-pink-500 shadow-[0_0_8px_#ff4d6d]'
                  : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
