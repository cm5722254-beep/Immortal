import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Star, ChevronRight, Search, Bookmark, ChevronLeft } from 'lucide-react';
import api from '../services/api';
import { getLocalCatalogSync, loadCatalog, extractHomeData } from '../services/catalogService';
import type { Anime } from '../types';
import { triggerHaptic } from '../utils/telegram';
import { usePlatform } from '../utils/platform';
import { AnimeCard } from '../components/home/AnimeCard';

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
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {anime.average_rating?.toFixed(1) || '9.5'}</span>
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
  void BentoCard;
  const { isTelegram, isMobileApp } = usePlatform();

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
  const [heroIndex, setHeroIndex] = useState(0);

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

  const heroItems = [...forYouDonghua, ...popularDonghua, ...animeList].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 8);
  const heroItem = heroItems[heroIndex] || forYouDonghua[0] || popularDonghua[0];

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (isTelegram || isMobileApp) {
    const miniSections = [
      { title: 'Continue watching', items: forYouDonghua },
      { title: 'Popular anime', items: animeList },
      { title: 'Donghua for you', items: popularDonghua },
      { title: 'Movies & drama', items: movies },
    ].filter((section) => section.items.length > 0);

    return (
      <main className="mini-home min-h-screen bg-[#111216] text-white pb-5">
        <header className="mini-home-header">
          <Link to="/" className="mini-brand" aria-label="Huang Anime home">Huang<span>+</span></Link>
          <Link to="/search" className="mini-search" aria-label="Search"><span>Search anime and drama</span><Search className="w-5 h-5" /></Link>
          <Link to="/vip" className="mini-vip">VIP</Link>
        </header>
        <nav className="mini-categories" aria-label="Browse categories">
          {[
            ['For You', '/'], ['Donghua', '/donghua'], ['Anime', '/anime'],
            ['Drama', '/drama'], ['Movies', '/movies'], ['Explore', '/explore'],
          ].map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}
        </nav>
        {heroItem && (
          <section className="mini-hero">
            <Link to={`/${heroItem.type === 'ANIME' ? 'anime' : heroItem.type === 'DRAMA' ? 'drama' : heroItem.type === 'MOVIE' ? 'movie' : 'donghua'}/${heroItem.slug}`} className="mini-hero-art">
              <img src={heroItem.banner_url || heroItem.poster_url || ''} alt={heroItem.title} />
              <div className="mini-hero-shade" />
              <div className="mini-hero-copy">
                <span className="mini-hero-tag">✦ Featured</span>
                <h1>{heroItem.title}</h1>
                <p>{heroItem.description || `${heroItem.year || 'New'} · ${heroItem.episode_count || 'New'} episodes · ★ ${(heroItem.average_rating || 9.5).toFixed(1)}`}</p>
              </div>
            </Link>
            <Link to={`/watch/${heroItem.slug}/1`} className="mini-hero-play" aria-label={`Play ${heroItem.title}`}><Play className="w-6 h-6 fill-current" /></Link>
          </section>
        )}
        <div className="mini-home-sections">
          {miniSections.map((section) => (
            <section key={section.title} className="mini-shelf">
              <div className="mini-shelf-heading"><h2>{section.title}</h2><Link to="/explore">More <ChevronRight className="w-4 h-4" /></Link></div>
              <div className="mini-poster-row">
                {section.items.slice(0, 9).map((anime) => (
                  <Link key={`${section.title}-${anime.id}`} to={`/${anime.type === 'ANIME' ? 'anime' : anime.type === 'DRAMA' ? 'drama' : anime.type === 'MOVIE' ? 'movie' : 'donghua'}/${anime.slug}`} className="mini-poster-card">
                    <div className="mini-poster-art"><img src={anime.poster_url || anime.banner_url || ''} alt={anime.title} loading="lazy" />
                      {!anime.is_free && <span className="mini-poster-badge">VIP</span>}
                      {anime.status === 'ONGOING' && <span className="mini-poster-update">Updated · {anime.episode_count || 'New'}</span>}
                    </div>
                    <span className="mini-poster-title">{anime.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="website-home min-h-screen bg-[#111216] text-gray-100 pb-24 font-sans selection:bg-white/20">
      {heroItem && <section className="website-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(12,19,36,.98) 0%,rgba(12,19,36,.84) 28%,rgba(12,19,36,.12) 67%,rgba(12,19,36,.5) 100%),linear-gradient(0deg,#111216 0%,transparent 29%),url('${heroItem.banner_url || heroItem.poster_url || ''}')` }}>
        <div className="website-hero-copy">
          <div className="website-hero-eyebrow"><span>TOP {heroIndex + 1}</span><span>{heroItem.is_free ? 'Limited free' : 'VIP'}</span><span>{heroItem.type === 'ANIME' ? 'Anime' : heroItem.type === 'DRAMA' ? 'Drama' : 'Popular'}</span></div>
          <h1>{heroItem.title}</h1>
          <div className="website-hero-meta"><b>★ {(heroItem.average_rating || 9.6).toFixed(1)}</b><i />{heroItem.year || '2026'}<i />13+<i />{heroItem.episode_count || 12} Episodes</div>
          <div className="website-hero-tags">{[heroItem.type === 'ANIME' ? 'Japan' : 'Chinese Mainland', heroItem.type === 'ANIME' ? 'Japanese' : 'Mandarin', 'Adventure'].map((tag) => <span key={tag}>{tag}</span>)}</div>
          <p>{heroItem.description || `Discover ${heroItem.title}, now streaming on Huang Anime.`}</p>
          <div className="website-hero-actions"><Link to={`/watch/${heroItem.slug}/1`} className="website-play"><Play fill="currentColor" /></Link><button type="button" className="website-save" onClick={() => { const saved = JSON.parse(localStorage.getItem('nami_my_list') || '[]'); const next = saved.includes(heroItem.id) ? saved.filter((id: number) => id !== heroItem.id) : [...saved, heroItem.id]; localStorage.setItem('nami_my_list', JSON.stringify(next)); }} aria-label="Add to My List"><Bookmark /></button></div>
        </div>
        {heroItems.length > 1 && <><button className="website-hero-arrow prev" onClick={() => setHeroIndex((heroIndex - 1 + heroItems.length) % heroItems.length)} aria-label="Previous"><ChevronLeft /></button><button className="website-hero-arrow next" onClick={() => setHeroIndex((heroIndex + 1) % heroItems.length)} aria-label="Next"><ChevronRight /></button><div className="website-hero-dots">{heroItems.map((item, index) => <button key={item.id} onClick={() => setHeroIndex(index)} className={index === heroIndex ? 'active' : ''} aria-label={`Show ${item.title}`} />)}</div></>}
      </section>}
      <div className="website-home-content">
        {[
          { title: 'Popular on Huang Anime', items: [...popularDonghua, ...animeList], to: '/explore' },
          { title: 'Trending Chinese Animation', items: popularDonghua, to: '/donghua' },
          { title: 'Latest Release', items: animeList, to: '/anime' },
          { title: 'Movies & Drama', items: movies, to: '/movies' },
        ].filter((section) => section.items.length > 0).map((section) => <section className="website-shelf" key={section.title}>
          <div className="website-shelf-heading"><h2>{section.title}</h2><Link to={section.to}>More <ChevronRight size={16}/></Link></div>
          <div className="website-shelf-row">{section.items.slice(0, 10).map((anime) => <div className="website-shelf-card" key={`${section.title}-${anime.id}`}><AnimeCard anime={anime}/><span>{anime.title}</span></div>)}</div>
        </section>)}
      </div>
    </main>
  );
}

export default HomePage;
