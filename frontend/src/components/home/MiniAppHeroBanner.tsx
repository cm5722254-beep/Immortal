import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Info, Plus, Check, Star } from 'lucide-react';
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
      {/* ── 1. Full-Bleed Cinema Backdrop with Smooth Vignette ── */}
      <div className="relative aspect-[16/10] max-h-[290px] w-full overflow-hidden">
        <img
          key={current.id}
          src={bgImage}
          alt={current.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top sm:object-center transition-all duration-700 ease-out"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Ambient Gradients - seamlessly blend into background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#080d1a]/60 to-transparent pointer-events-none" />

        {/* Minimalist Rank Badge */}
        <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 backdrop-blur-md border border-white/15 text-gray-200 shadow-sm">
            TOP #{activeIndex + 1}
          </span>
        </div>
      </div>

      {/* ── 2. Movie Info & Primary Actions (Compact Native App Layout) ── */}
      <div className="relative px-4 pb-3 -mt-14 z-20 space-y-2 text-center">
        {/* Title */}
        <h1 className="font-display font-bold text-base sm:text-lg text-white tracking-tight leading-snug drop-shadow-md truncate max-w-xs mx-auto">
          {current.title}
        </h1>

        {/* Clean, Subtle Meta Line */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-300 font-medium">
          <span className="text-rose-400 font-semibold">
            {current.type === 'ANIME' ? 'Anime ជប៉ុន' : current.type === 'MOVIE' ? 'ភាពយន្តដុំ' : 'រឿងចិន 3D'}
          </span>
          <span className="text-white/30">•</span>
          <span>{current.episode_count ? `${current.episode_count} ភាគ` : 'ភាគថ្មីៗ'}</span>
          <span className="text-white/30">•</span>
          <span className="text-amber-400 font-semibold flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-current" /> {(current.average_rating || 9.8).toFixed(1)}
          </span>
        </div>

        {/* Sleek Action Buttons */}
        <div className="flex items-center justify-center gap-2.5 pt-0.5">
          {/* Primary Play Button */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              navigate(watchUrl);
            }}
            className="py-1.5 px-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            <span>ចាក់ទស្សនា</span>
          </button>

          {/* Add to My List */}
          <button
            onClick={toggleBookmark}
            className={`py-1.5 px-3.5 rounded-full border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
              isBookmarked
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400'
                : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
            }`}
          >
            {isBookmarked ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isBookmarked ? 'បានបញ្ចូល' : 'បញ្ជីខ្ញុំ'}</span>
          </button>

          {/* Info Details */}
          <Link
            to={detailUrl}
            onClick={() => triggerHaptic('light')}
            className="p-1.5 rounded-full border border-white/15 bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-all active:scale-90"
            title="ព័ត៌មានលម្អិត"
          >
            <Info className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Minimal Subtle Dot Indicators */}
        <div className="flex items-center justify-center gap-1 pt-1.5">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                triggerHaptic('light');
                setActiveIndex(idx);
              }}
              className={`transition-all duration-200 rounded-full cursor-pointer ${
                idx === activeIndex
                  ? 'w-4 h-1 bg-rose-500 rounded-full'
                  : 'w-1 h-1 bg-white/25 hover:bg-white/50'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
