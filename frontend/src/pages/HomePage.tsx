import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, Sparkles, Flame, Film, Tv, Video, Zap
} from 'lucide-react';
import { HeroSpotlightCarousel } from '../components/home/HeroSpotlightCarousel';
import { AnimeCard } from '../components/home/AnimeCard';
import { ContinueWatchingSection } from '../components/home/ContinueWatchingSection';
import { TrendingRankCarousel } from '../components/home/TrendingRankCarousel';
import { QuickCategoryFilter, type CategoryFilterType } from '../components/home/QuickCategoryFilter';
import { MovieTrailersSection } from '../components/home/MovieTrailersSection';

import { SkeletonCard } from '../components/common/SkeletonLoader';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { getLocalCatalogSync, loadCatalog, extractHomeData } from '../services/catalogService';
import type { Anime, Banner, WatchHistoryItem } from '../types';

interface SectionProps {
  title: string;
  icon?: React.ElementType;
  link: string;
  items: Anime[];
  isLoading: boolean;
}

function ContentSection({ title, icon: Icon, link, items, isLoading }: SectionProps) {
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="mb-10 relative group/row">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <Link
          to={link}
          className="group/title inline-flex items-center gap-2 text-white hover:text-rose-400 transition-colors"
        >
          <h2 className="font-display font-bold text-lg sm:text-xl md:text-2xl text-white tracking-wide flex items-center gap-2">
            {Icon && (
              <span className="w-6 h-6 rounded bg-rose-500/20 flex items-center justify-center text-rose-400 shadow-[0_0_10px_rgba(255,77,109,0.3)]">
                <Icon className="w-3.5 h-3.5" />
              </span>
            )}
            <span>{title}</span>
          </h2>
          <span className="text-xs font-semibold text-rose-400 opacity-0 group-hover/title:opacity-100 transition-all transform -translate-x-1 group-hover/title:translate-x-0 hidden sm:inline-flex items-center gap-0.5">
            មើលទាំងអស់ <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {/* ── Netflix Row Container ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-4.5">
          <SkeletonCard count={7} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-4.5">
          {items.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </section>
  );
}

export function HomePage() {
  const { isAuthenticated } = useAuthStore();
  
  // Initial instant synchronous state from local cache (0.001s)
  const initialData = (() => {
    const sync = getLocalCatalogSync();
    if (sync && sync.anime && sync.anime.length > 0) {
      return extractHomeData(sync);
    }
    return null;
  })();

  const [banners, setBanners] = useState<Banner[]>(initialData?.banners || []);
  const [forYouDonghua, setForYouDonghua] = useState<Anime[]>(initialData?.forYouDonghua || []);
  const [popularDonghua, setPopularDonghua] = useState<Anime[]>(initialData?.popularDonghua || []);
  const [drama, setDrama] = useState<Anime[]>(initialData?.drama || []);
  const [movies, setMovies] = useState<Anime[]>(initialData?.movies || []);
  const [animeList, setAnimeList] = useState<Anime[]>(initialData?.animeList || []);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [activeFilter, setActiveFilter] = useState<CategoryFilterType>('ALL');

  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      try {
        // 1. Fast static load from CDN (10ms)
        const catalog = await loadCatalog();
        if (isMounted && catalog && catalog.anime && catalog.anime.length > 0) {
          const extracted = extractHomeData(catalog);
          setBanners(extracted.banners);
          setForYouDonghua(extracted.forYouDonghua);
          setPopularDonghua(extracted.popularDonghua);
          setDrama(extracted.drama);
          setMovies(extracted.movies);
          setAnimeList(extracted.animeList);
          setIsLoading(false);
        }

        // 2. Background live API refresh
        const [donghuaRes, dramaRes, movieRes, animeRes, bannersRes] = await Promise.all([
          api.get('/anime?type=DONGHUA&sort=popular&per_page=18').catch(() => null),
          api.get('/anime?type=DRAMA&sort=popular&per_page=12').catch(() => null),
          api.get('/anime?type=MOVIE&sort=popular&per_page=12').catch(() => null),
          api.get('/anime?type=ANIME&sort=popular&per_page=12').catch(() => null),
          api.get('/admin/banners').catch(() => null),
        ]);

        if (isMounted) {
          if (donghuaRes?.data?.items?.length) {
            const fetched = donghuaRes.data.items as Anime[];
            setForYouDonghua(fetched.slice(0, 6));
            setPopularDonghua(fetched.slice(6, 18));
          }
          if (dramaRes?.data?.items?.length) setDrama(dramaRes.data.items);
          if (movieRes?.data?.items?.length) setMovies(movieRes.data.items);
          if (animeRes?.data?.items?.length) setAnimeList(animeRes.data.items);
          if (bannersRes?.data?.length) {
            setBanners((bannersRes.data as Banner[]).filter((b) => b.is_active));
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Home load notice:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initData();
    return () => { isMounted = false; };
  }, []);

  // ── Load Watch History (Server if authenticated, LocalStorage for guests) ──
  useEffect(() => {
    let isSet = false;
    if (isAuthenticated) {
      api.get('/history')
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setHistory(res.data);
            isSet = true;
          }
        })
        .catch(() => {});
    }

    if (!isSet) {
      try {
        const raw = localStorage.getItem('local_watch_history');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const mapped: WatchHistoryItem[] = list.map((item: any, idx: number) => ({
              id: idx + 1,
              user_id: 0,
              anime_id: 0,
              episode_id: 0,
              progress_seconds: item.progress_seconds || item.progress || 0,
              duration_seconds: item.duration_seconds || item.duration || 1200,
              last_watched_at: new Date(item.updated_at || Date.now()).toISOString(),
              anime_title: item.anime_title || item.slug,
              anime_slug: item.slug,
              anime_poster: item.poster_url || `/posters/${item.slug}.jpg`,
              episode_number: item.episode_number || 1,
              episode_title: `ភាគ ${item.episode_number || 1}`,
              episode_thumbnail: item.episode_thumbnail || item.poster_url || `/posters/${item.slug}.jpg`,
            }));
            setHistory(mapped);
          }
        }
      } catch {}
    }
  }, [isAuthenticated]);

  const handleClearHistory = () => {
    localStorage.removeItem('local_watch_history');
    setHistory([]);
    if (isAuthenticated) {
      api.delete('/history').catch(() => {});
    }
  };

  const handleRemoveHistoryItem = (id: number | string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        const raw = localStorage.getItem('local_watch_history');
        if (raw) {
          const list = JSON.parse(raw);
          const filtered = list.filter((_: any, idx: number) => idx + 1 !== id);
          localStorage.setItem('local_watch_history', JSON.stringify(filtered));
        }
      } catch {}
      return updated;
    });
  };

  // Combine all items for quick filtering
  const allCombined = useMemo(() => {
    const map = new Map<number, Anime>();
    [...forYouDonghua, ...popularDonghua, ...animeList, ...movies, ...drama].forEach((a) => {
      map.set(a.id, a);
    });
    return Array.from(map.values());
  }, [forYouDonghua, popularDonghua, animeList, movies, drama]);

  // Top 10 sorted by heat_score/popularity
  const top10Trending = useMemo(() => {
    return allCombined.slice().sort((a, b) => (b.heat_score || 0) - (a.heat_score || 0)).slice(0, 10);
  }, [allCombined]);

  // Top Ultra 3D (Unreal Engine) Donghua list
  const ultra3dDonghua = useMemo(() => {
    const donghuaList = allCombined.filter((a) => a.type === 'DONGHUA' || a.country === 'China');
    if (donghuaList.length === 0) return popularDonghua;
    return donghuaList.slice(0, 14);
  }, [allCombined, popularDonghua]);

  // Filtered subset when filter is not ALL
  const filteredItems = useMemo(() => {
    if (activeFilter === 'ALL') return [];
    if (activeFilter === 'ULTRA_3D') return ultra3dDonghua;
    if (activeFilter === 'DONGHUA') return [...forYouDonghua, ...popularDonghua];
    if (activeFilter === 'ANIME') return animeList;
    if (activeFilter === 'MOVIE') return movies;
    if (activeFilter === 'DRAMA') return drama;
    if (activeFilter === 'VIP') return allCombined.filter((a) => !a.is_free);
    return allCombined;
  }, [activeFilter, ultra3dDonghua, forYouDonghua, popularDonghua, animeList, movies, drama, allCombined]);

  return (
    <main className="min-h-screen pb-20 md:pb-12 text-gray-100">
      {/* ── 1. 3D Rotating Circular Carousel Banner (BANNER 3D វិលជុំវិញ) ── */}
      <HeroSpotlightCarousel banners={banners} anime={forYouDonghua.length > 0 ? forYouDonghua : popularDonghua} />

      {/* ── 2. Content Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">

        {/* Quick Filter Pill Bar */}
        <QuickCategoryFilter activeFilter={activeFilter} onSelect={setActiveFilter} />

        {/* ── Continue Watching (works for both guests & logged in) ── */}
        {history.length > 0 && activeFilter === 'ALL' && (
          <div className="mb-10">
            <ContinueWatchingSection
              items={history}
              onClear={handleClearHistory}
              onRemoveItem={handleRemoveHistoryItem}
            />
          </div>
        )}

        {/* ── Top 10 Trending Carousel (Netflix Style with Giant Rank Digits) ── */}
        {activeFilter === 'ALL' && top10Trending.length > 0 && (
          <TrendingRankCarousel items={top10Trending} isLoading={isLoading} />
        )}

        {/* ── If a specific category filter is chosen ── */}
        {activeFilter !== 'ALL' ? (
          <section className="mt-6 mb-16 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                {activeFilter === 'ULTRA_3D' && '⚡ កំពូលរឿង Ultra 3D (Unreal Engine 5)'}
                {activeFilter === 'DONGHUA' && '🇨🇳 រឿងចិន 3D (Donghua)'}
                {activeFilter === 'ANIME' && '🇯🇵 រឿងជប៉ុន (Anime)'}
                {activeFilter === 'MOVIE' && '🍿 ភាពយន្តដុំ (Movies)'}
                {activeFilter === 'DRAMA' && '📺 រឿងភាគ (Drama)'}
                {activeFilter === 'VIP' && '⭐ កម្រិត Ultra HD VIP 4K'}
              </h2>
              <span className="text-xs text-rose-300 font-bold bg-[#131926] px-3 py-1 rounded-full border border-rose-500/30 shadow-[0_0_10px_rgba(255,77,109,0.2)]">
                {filteredItems.length} រឿង
              </span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-[#0f1422] rounded-2xl border border-white/[0.08]">
                <p className="text-gray-400 text-sm">មិនទាន់មានទិន្នន័យក្នុងជម្រើសនេះនៅឡើយទេ។</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-4.5">
                {filteredItems.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* ── Full Natural Feed ── */
          <div className="space-y-12 mt-6">
            {/* Top Ultra 3D Unreal Engine Section */}
            <ContentSection
              title="⚡ កំពូលរឿង Ultra 3D (Unreal Engine 5) • 4K 60FPS"
              icon={Zap}
              link="/donghua"
              items={ultra3dDonghua}
              isLoading={isLoading}
            />

            {/* 🎬 New Movie & Donghua Trailers Showcase Section */}
            <MovieTrailersSection items={ultra3dDonghua.length > 0 ? ultra3dDonghua : popularDonghua} />

            {/* Recommended For You */}
            <ContentSection
              title="រឿងណែនាំសម្រាប់អ្នក"
              icon={Sparkles}
              link="/explore"
              items={forYouDonghua}
              isLoading={isLoading}
            />

            {/* Popular Donghua */}
            <ContentSection
              title="រឿងចិនកំពុងពេញនិយម (Donghua)"
              icon={Flame}
              link="/donghua"
              items={popularDonghua}
              isLoading={isLoading}
            />

            {/* Japanese Anime Series */}
            <ContentSection
              title="រឿងជប៉ុនកំពូលទស្សនា (Anime)"
              icon={Film}
              link="/anime"
              items={animeList}
              isLoading={isLoading}
            />

            {/* Chinese Drama Series */}
            <ContentSection
              title="រឿងភាគមនោសញ្ចេតនា (Drama)"
              icon={Tv}
              link="/drama"
              items={drama}
              isLoading={isLoading}
            />

            {/* Movies */}
            <ContentSection
              title="ភាពយន្តដុំពិសេស (Movies)"
              icon={Video}
              link="/movies"
              items={movies}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </main>
  );
}

