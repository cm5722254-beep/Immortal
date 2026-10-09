import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Star, ChevronRight, ChevronLeft, Bookmark, Clock, Bell, X } from 'lucide-react';
import api from '../services/api';
import { getLocalCatalogSync, loadCatalog, extractHomeData } from '../services/catalogService';
import type { Anime, WatchHistoryItem } from '../types';
import { triggerHaptic } from '../utils/telegram';
import { usePlatform } from '../utils/platform';
import { AnimeCard } from '../components/home/AnimeCard';
import { ContinueWatchingSection } from '../components/home/ContinueWatchingSection';
import { useAuthStore } from '../store/authStore';
import { translate, useLanguageStore } from '../store/languageStore';

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

// Premium Hero Banner Component
function PremiumHeroBanner({ anime }: { anime: Anime }) {
  const navigate = useNavigate();
  const detailUrl = `/${anime.type === 'ANIME' ? 'anime' : anime.type === 'DONGHUA' ? 'donghua' : anime.type === 'DRAMA' ? 'drama' : 'movie'}/${anime.slug}`;
  const watchUrl = `/watch/${anime.slug}/1`;

  const tagText = anime.status === 'COMPLETED' ? `Complete ${anime.episode_count || 16} Episodes` : anime.episode_count ? `${anime.episode_count} Episodes` : 'New Release';

  return (
    <div className="relative w-full h-[600px] bg-gradient-to-b from-[var(--animekh-bg-base)] via-[var(--animekh-bg-base)/80] to-transparent">
      <div className="absolute inset-0">
        <img
          src={anime.banner_url || anime.poster_url || ''}
          alt={anime.title}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--animekh-bg-base)] via-[var(--animekh-bg-base)/60] to-transparent" />
      </div>

      <div className="relative z-10 flex h-full items-end pb-[var(--animekh-spacing-12)] px-6 lg:px-12">
        <div className="max-w-4xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="animekh-badge">{{tagText}}</span>
            {!anime.is_free && (
              <span className="animekh-badge animekh-badge-outline">VIP</span>
            )}
          </div>

          <h1 className="animekh-font-display text-5xl sm:text-6xl font-black text-text-primary mb-4">
            {anime.title}
          </h1>

          <p className="animekh-text-secondary max-w-xl line-clamp-3">
            {anime.description || `Discover ${anime.title}, now streaming on ANIMEKH.`}
          </p>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-text-secondary">
              <Star className="h-4 w-4 text-accent-primary" />
              <span>{anime.average_rating?.toFixed(1) || '9.5'} • </span>
              <span>{anime.year || '2024'} • </span>
              <span className="truncate">
                {anime.type === 'DONGHUA' ? 'Chinese Animation 3D' :
                 anime.type === 'ANIME' ? 'Japanese Anime' :
                 'Movie/Drama'}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              to={watchUrl}
              onClick={() => triggerHaptic('light')}
              className="animekh-btn-primary flex-1 sm:flex-none py-3 sm:px-8 text-lg font-semibold hover:bg-accent-primary/90"
            >
              <Play className="h-4 w-4 mr-2" />
              Watch Now
            </Link>

            <Link
              to={detailUrl}
              onClick={() => triggerHaptic('light')}
              className="animekh-btn-secondary flex-1 sm:flex-none py-3 sm:px-8 text-lg font-semibold hover:bg-accent-primary/10"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Premium Section Header
function SectionHeader({ title, description, viewAllLink }: {
  title: string;
  description?: string;
  viewAllLink?: string
}) {
  return (
    <div className="animekh-section-header">
      <div className="space-y-2">
        <h2 className="animekh-section-title">{title}</h2>
        {description && <p className="animekh-section-description">{description}</p>}
      </div>
      {viewAllLink && (
        <Link
          to={viewAllLink}
          className="animekh-btn-ghost hover:text-accent-primary"
        >
          View All <ChevronRight className="h-4 w-4 ml-2" />
        </Link>
      )}
    </div>
  );
}

// Premium Anime Card (Updated for V2)
function PremiumAnimeCard({ anime, isFeatured = false }: { anime: Anime; isFeatured?: boolean }) {
  const navigate = useNavigate();
  const detailUrl = `/${anime.type === 'ANIME' ? 'anime' : anime.type === 'DONGHUA' ? 'donghua' : anime.type === 'DRAMA' ? 'drama' : 'movie'}/${anime.slug}`;
  const watchUrl = `/watch/${anime.slug}/1`;

  return (
    <Link
      to={detailUrl}
      onClick={(e) => {
        e.stopPropagation();
        triggerHaptic('light');
        navigate(detailUrl);
      }}
      className="group relative w-full cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-bg-card hover:border-accent-primary/30 transition-all duration-300">
        {/* Poster Image */}
        <div className="relative h-[200px] w-full">
          <img
            src={anime.poster_url || anime.banner_url || ''}
            alt={anime.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {!anime.is_free && (
            <div className="absolute top-3 left-3 animekh-badge animekh-badge-outline">
              VIP
            </div>
          )}
          {anime.status === 'ONGOING' && (
            <div className="absolute top-3 left-3 animekh-badge">
              Updated • {anime.episode_count || 'New'}
            </div>
          )}

          {/* Play Button on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Play className="h-6 w-6 text-accent-primary bg-accent-primary/20 rounded-full hover:bg-accent-primary/30"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('light');
                navigate(watchUrl);
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="animekh-badge">{anime.status === 'COMPLETED' ? 'Complete' : 'Ongoing'}</span>
            <span className="animekh-badge animekh-badge-outline">{anime.type}</span>
          </div>

          <h3 className="animekh-font-display text-lg font-semibold text-text-primary mb-2 line-clamp-2 hover:text-accent-primary transition-colors duration-200">
            {anime.title}
          </h3>

          <div className="flex items-center gap-2 text-text-secondary/80 text-sm mb-3">
            <Star className="h-3 w-3 text-accent-primary" />
            <span>{anime.average_rating?.toFixed(1) || '9.5'}</span>
          </div>

          <div className="flex items-center gap-3 text-text-secondary text-sm">
            <span>{anime.year || '2024'}</span>
            <span>•</span>
            <span>{anime.episode_count || 'New'} Episodes</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              navigate(watchUrl);
            }}
            className="w-full animekh-btn-primary hover:bg-accent-primary/90"
          >
            <Play className="h-4 w-4 mr-2" />
            Watch
          </button>
        </div>
      </div>
    </Link>
  );
}

// Premium Continue Watching Section
function PremiumContinueWatchingSection({ items }: { items: WatchHistoryItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="animekh-section">
      <SectionHeader
        title="Continue Watching"
        description="Pick up where you left off"
      />
      <div className="overflow-x-auto space-x-4 pb-8">
        <div className="flex space-x-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-[200px] min-w-[200px]"
            >
              <Link
                to={`/watch/${item.anime_slug}/${item.episode_number}`}
                onClick={() => triggerHaptic('light')}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-bg-card hover:border-accent-primary/30 transition-all duration-300">
                  <div className="relative h-[112px] w-full">
                    <img
                      src={item.anime_poster || ''}
                      alt={item.anime_title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Progress Overlay */}
                    {item.progress_seconds > 0 && item.duration_seconds > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="relative w-10 h-10">
                          <div className="absolute inset-0">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845
                                   a 15.9155 15.9155 0 0 1 0 31.831
                                   a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="3"
                              />
                              <path
                                d="M18 2.0845
                                   a 15.9155 15.9155 0 0 1 {item.progress_seconds / item.duration_seconds * 31.831} 0
                                   a 2.0845 2.0845 0 0 0 0 4.169
                                   a 15.9155 15.9155 0 0 0 {-item.progress_seconds / item.duration_seconds * 31.831} 0
                                   a 2.0845 2.0845 0 0 0 0 -4.169"
                                fill="none"
                                stroke="var(--animekh-accent-primary)"
                                strokeWidth="3"
                              />
                              <circle cx="18" cy="18" r="2.0845" fill="var(--animekh-accent-primary)" />
                            </svg>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center text-text-xs font-medium text-text-primary">
                            {Math.round((item.progress_seconds / item.duration_seconds) * 100)}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Play className="h-5 w-5 text-accent-primary bg-accent-primary/20 rounded-full hover:bg-accent-primary/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          navigate(`/watch/${item.anime_slug}/${item.episode_number}`);
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3">
                    <h4 className="font-semibold text-text-primary mb-1 line-clamp-2 hover:text-accent-primary transition-colors duration-200">
                      {item.anime_title}
                    </h4>
                    <p className="text-text-secondary/70 text-sm">
                      Episode {item.episode_number} •
                      {Math.floor(item.progress_seconds / 60)}:{String(Math.floor(item.progress_seconds % 60)).padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  void PremiumAnimeCard;
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
  const [isLoading, setIsLoading] = useState(!initialData);
  const [heroIndex, setHeroIndex] = useState(0);
  const [continueItems, setContinueItems] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    let active = true;
    const loadContinue = async () => {
      let history = getLocalContinueHistory();
      if (isAuthenticated) {
        try {
          const response = await api.get('/history');
          if (Array.isArray(response.data)) history = response.data;
        } catch { /* retain this device's local progress as a fallback */ }
      }
      const incomplete = history
        .filter((item) => item.progress_seconds > 0 && (!item.duration_seconds || item.progress_seconds < item.duration_seconds * 0.95))
        .slice(0, 12);
      if (active) setContinueItems(incomplete);
    };
    void loadContinue();
    return () => { active = false; };
  }, [isAuthenticated]);

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

      } catch (err) {} finally {
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
    };
    window.addEventListener('nami-catalog-updated', refreshFromCatalog);
    initData();
    return () => { isMounted = false; window.removeEventListener('nami-catalog-updated', refreshFromCatalog); };
  }, []);

  const heroItems = [...forYouDonghua, ...popularDonghua, ...animeList].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 8);
  const heroItem = heroItems[heroIndex] || forYouDonghua[0] || popularDonghua[0];

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (isTelegram || isMobileApp) {
    const miniSections = [
      { title: translate('Popular anime', language), items: animeList },
      { title: translate('Donghua for you', language), items: popularDonghua },
      { title: translate('Movies & drama', language), items: movies },
    ].filter((section) => section.items.length > 0);

    return (
      <main className="mini-home min-h-screen bg-[#111216] text-white pb-5">
        {heroItem && (
          <section className="mini-hero">
            <Link to={`/watch/${heroItem.slug}/1`} className="mini-hero-art">
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
          <ContinueWatchingSection items={continueItems} />
          {miniSections.map((section) => (
            <section key={section.title} className="mini-shelf">
              <div className="mini-shelf-heading"><h2>{section.title}</h2><Link to="/explore">{translate('More', language)} <ChevronRight className="w-4 h-4" /></Link></div>
              <div className="mini-poster-row">
                {section.items.slice(0, 9).map((anime) => (
                  <Link key={`${section.title}-${anime.id}`} to={`/watch/${anime.slug}/1`} className="mini-poster-card">
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
    <main className="min-h-screen bg-[var(--animekh-bg-base)] text-[var(--animekh-text-primary)]">
      {/* Premium Hero Banner */}
      {heroItem && <PremiumHeroBanner anime={heroItem} />}

      {/* Main Content */}
      <div className="relative z-10 pt-[var(--animekh-spacing-20)] pb-[var(--animekh-spacing-16)]">
        <div className="animekh-container">
          {/* Continue Watching Section */}
          {continueItems.length > 0 && <PremiumContinueWatchingSection items={continueItems} />}

          {/* Trending Now Section */}
          <section className="animekh-section">
            <SectionHeader
              title="Trending Now"
              description="What's hot on ANIMEKH this week"
              viewAllLink="/explore"
            />
            <div className="overflow-x-auto space-x-4 pb-8">
              <div className="flex space-x-4">
                {[...popularDonghua, ...animeList]
                  .slice(0, 8)
                  .map((anime) => (
                    <PremiumAnimeCard key={anime.id} anime={anime} />
                  ))}
              </div>
            </div>
          </section>

          {/* For You (Personalized) Section */}
          <section className="animekh-section">
            <SectionHeader
              title="For You"
              description="Personalized recommendations based on your taste"
              viewAllLink="/explore"
            />
            <div className="overflow-x-auto space-x-4 pb-8">
              <div className="flex space-x-4">
                {[...forYouDonghua, ...popularDonghua]
                  .slice(0, 8)
                  .map((anime) => (
                    <PremiumAnimeCard key={anime.id} anime={anime} />
                  ))}
              </div>
            </div>
          </section>

          {/* New & Popular Section */}
          <section className="animekh-section">
            <SectionHeader
              title="New & Popular"
              description="Latest releases and fan favorites"
              viewAllLink="/anime"
            />
            <div className="overflow-x-auto space-x-4 pb-8">
              <div className="flex space-x-4">
                {[...animeList, ...movies]
                  .slice(0, 8)
                  .map((anime) => (
                    <PremiumAnimeCard key={anime.id} anime={anime} />
                  ))}
              </div>
            </div>
          </section>

          {/* Genre Sections */}
          <section className="animekh-section">
            <SectionHeader
              title="Genres"
              description="Explore by genre"
              viewAllLink="/explore"
            />
            <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Action & Adventure */}
              <Link
                to="/explore?genre=action"
                className="animekh-card hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-primary/20 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-primary/20 rounded-lg">
                        <Play className="h-4 w-4 text-accent-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">Action & Adventure</h3>
                        <p className="text-text-secondary/60 text-sm">Epic battles and thrilling journeys</p>
                      </div>
                    </div>
                    <span className="text-text-secondary/40">→</span>
                  </div>
                  <p className="text-text-secondary/60 mt-2">Discover heart-pounding action series and adventure epics</p>
                </div>
              </Link>

              /* Romance */
              <Link
                to="/explore?genre=romance"
                className="animekh-card hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-primary/20 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-primary/20 rounded-lg">
                        <Star className="h-4 w-4 text-accent-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">Romance</h3>
                        <p className="text-text-secondary/60 text-sm">Love stories that touch the heart</p>
                      </div>
                    </div>
                    <span className="text-text-secondary/40">→</span>
                  </div>
                  <p className="text-text-secondary/60 mt-2">From sweet first loves to dramatic passionate tales</p>
                </div>
              </Link>

              /* Fantasy */
              <Link
                to="/explore?genre=fantasy"
                className="animekh-card hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-primary/20 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-primary/20 rounded-lg">
                        <Bell className="h-4 w-4 text-accent-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">Fantasy</h3>
                        <p className="text-text-secondary/60 text-sm">Magical worlds and mythical creatures</p>
                      </div>
                    </div>
                    <span className="text-text-secondary/40">→</span>
                  </div>
                  <p className="text-text-secondary/60 mt-2">Enter realms of wonder and enchantment</p>
                </div>
              </Link>

              /* Comedy */
              <Link
                to="/explore?genre=comedy"
                className="animekh-card hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-primary/20 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-primary/20 rounded-lg">
                        <X className="h-4 w-4 text-accent-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">Comedy</h3>
                        <p className="text-text-secondary/60 text-sm">Laugh-out-loud moments and hilarious situations</p>
                      </div>
                    </div>
                    <span className="text-text-secondary/40">→</span>
                  </div>
                  <p className="text-text-secondary/60 mt-2">Light-hearted series that will brighten your day</p>
                </div>
              </Link>

              /* Drama */
              <Link
                to="/explore?genre=drama"
                className="animekh-card hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-primary/20 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-primary/20 rounded-lg">
                        <Bookmark className="h-4 w-4 text-accent-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">Drama</h3>
                        <p className="text-text-secondary/60 text-sm">Intense emotional stories and character studies</p>
                      </div>
                    </div>
                    <span className="text-text-secondary/40">→</span>
                  </div>
                  <p className="text-text-secondary/60 mt-2">Powerful storytelling that resonates deeply</p>
                </div>
              </Link>

              /* Horror/Thriller */
              <Link
                to="/explore?genre=horror"
                className="animekh-card hover:-translate-y-1 hover:shadow-lg hover:shadow-accent-primary/20 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-accent-primary/20 rounded-lg">
                        <Star className="h-4 w-4 text-accent-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">Horror & Thriller</h3>
                        <p className="text-text-secondary/60 text-sm">Suspenseful tales that will keep you on edge</p>
                      </div>
                    </div>
                    <span className="text-text-secondary/40">→</span>
                  </div>
                  <p className="text-text-secondary/60 mt-2">Chilling horror and pulse-pounding thrillers</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default HomePage;