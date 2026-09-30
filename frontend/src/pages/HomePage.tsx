import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, TrendingUp, Sparkles, Star, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { getLocalCatalogSync, loadCatalog, extractHomeData } from '../services/catalogService';
import type { Anime, Banner, WatchHistoryItem } from '../types';
import { triggerHaptic } from '../utils/telegram';

// A completely new, ultra-modern Bento Box / Magazine style card
function BentoCard({ anime, isLarge = false }: { anime: Anime; isLarge?: boolean }) {
  const navigate = useNavigate();
  const detailUrl = `/${anime.type === 'ANIME' ? 'anime' : anime.type === 'DONGHUA' ? 'donghua' : anime.type === 'DRAMA' ? 'drama' : 'movie'}/${anime.slug}`;
  const watchUrl = `/watch/${anime.slug}/1`;

  const tagText = anime.status === 'COMPLETED' ? `ចប់ត្រឹម ${anime.episode_count || 16} ភាគ` : anime.episode_count ? `ភាគ ${anime.episode_count}` : 'ថ្មីៗ';

  return (
    <div 
      onClick={() => {
        triggerHaptic('light');
        navigate(detailUrl);
      }}
      className={`group relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/5 cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:border-white/20 hover:shadow-2xl hover:shadow-white/10 ${isLarge ? 'aspect-[4/5] sm:aspect-[16/9] md:aspect-[4/3] lg:aspect-[16/9] col-span-2 row-span-2' : 'aspect-[3/4] col-span-1'}`}
    >
      <img
        src={anime.poster_url || anime.banner_url || ''}
        alt={anime.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
      
      <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
          <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/10">
            {tagText}
          </span>
          {!anime.is_free && (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-1 rounded-lg">
              VIP
            </span>
          )}
        </div>

        <div>
          <h3 className={`font-display font-black text-white leading-tight mb-2 group-hover:text-amber-300 transition-colors ${isLarge ? 'text-2xl sm:text-4xl' : 'text-sm sm:text-lg'}`}>
            {anime.title}
          </h3>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-400 font-medium mb-4">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {anime.rating || '9.5'}</span>
            <span>•</span>
            <span>{anime.year || '2024'}</span>
            <span>•</span>
            <span className="truncate">{anime.type === 'DONGHUA' ? 'រឿងចិន 3D' : anime.type === 'ANIME' ? 'រឿងជប៉ុន' : 'ភាពយន្ត'}</span>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(watchUrl);
            }}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-2.5 sm:py-3 rounded-xl hover:bg-gray-200 transition-colors active:scale-95 text-xs sm:text-sm"
          >
            <Play className="w-4 h-4 fill-black" />
            ចាក់ទស្សនា
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
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
  const [isLoading, setIsLoading] = useState(!initialData);

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
          setIsLoading(false);
        }

        const [donghuaRes, animeRes, movieRes] = await Promise.all([
          api.get('/anime?type=DONGHUA&sort=popular&per_page=12').catch(() => null),
          api.get('/anime?type=ANIME&sort=popular&per_page=6').catch(() => null),
          api.get('/anime?type=MOVIE&sort=popular&per_page=6').catch(() => null),
        ]);

        if (isMounted) {
          if (donghuaRes?.data?.items?.length) {
            const fetched = donghuaRes.data.items as Anime[];
            setForYouDonghua(fetched.slice(0, 4));
            setPopularDonghua(fetched.slice(4, 12));
          }
          if (animeRes?.data?.items?.length) setAnimeList(animeRes.data.items);
          if (movieRes?.data?.items?.length) setMovies(movieRes.data.items);
          setIsLoading(false);
        }
      } catch (err) {} finally {
        if (isMounted) setIsLoading(false);
      }
    };
    initData();
    return () => { isMounted = false; };
  }, []);

  const allCombined = useMemo(() => {
    const map = new Map<number, Anime>();
    [...forYouDonghua, ...popularDonghua, ...animeList, ...movies].forEach((a) => map.set(a.id, a));
    return Array.from(map.values());
  }, [forYouDonghua, popularDonghua, animeList, movies]);

  const heroItem = forYouDonghua[0] || popularDonghua[0];
  const bentoItems = popularDonghua.slice(0, 5); // Take 5 items for the bento grid

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <main className="min-h-screen bg-black text-gray-100 pb-24 font-sans selection:bg-white/20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        
        {/* ── Giant Header ── */}
        <header className="mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter mb-2">ស្វែងរកអានីមេ<br/>ដែលអ្នកចូលចិត្ត</h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-md">ទទួលបានបទពិសោធន៍ទស្សនាភាពយន្តលំដាប់ខ្ពស់ជាមួយគុណភាពច្បាស់ត្រជាក់ភ្នែក គ្មានពាណិជ្ជកម្ម។</p>
        </header>

        {/* ── Modern Bento Grid ── */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              កំពុងពេញនិយមខ្លាំង
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 auto-rows-[200px] sm:auto-rows-[250px] lg:auto-rows-[300px]">
            {heroItem && <BentoCard anime={heroItem} isLarge={true} />}
            {bentoItems.map((anime, index) => (
              <BentoCard key={anime.id} anime={anime} isLarge={false} />
            ))}
          </div>
        </section>

        {/* ── Anime List Grid (Minimalist) ── */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-500" />
              អានីមេជប៉ុនថ្មីៗ
            </h2>
            <Link to="/anime" className="text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center">
              មើលទាំងអស់ <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
            {animeList.slice(0, 6).map((anime) => (
              <BentoCard key={anime.id} anime={anime} isLarge={false} />
            ))}
          </div>
        </section>

        {/* ── Movies Grid (Minimalist) ── */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              ភាពយន្តដុំល្បីៗ
            </h2>
            <Link to="/movies" className="text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center">
              មើលទាំងអស់ <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
            {movies.slice(0, 6).map((anime) => (
              <BentoCard key={anime.id} anime={anime} isLarge={false} />
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

export default HomePage;
