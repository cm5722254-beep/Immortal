import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Play, Bookmark, Share2, MessageSquare, ArrowLeft,
  Star, Check, Sparkles, Crown, Clock, Film,
  Search, ArrowDownUp, Flame, Info, Tv
} from 'lucide-react';
import { SkeletonDetail } from '../components/common/SkeletonLoader';
import { StreamingAvailabilityHub } from '../components/common/StreamingAvailabilityHub';
import { MoviePaymentModal } from '../components/payment/MoviePaymentModal';
import { isMoviePurchased } from '../services/paymentService';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { loadCatalog, extractAnimeDetail } from '../services/catalogService';
import type { Anime, Episode } from '../types';

export function DetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated, isAdmin, isOwner } = useAuthStore();
  const navigate = useNavigate();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [relatedAnime, setRelatedAnime] = useState<Anime[]>([]);
  const [isFav, setIsFav] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isMoviePayModalOpen, setIsMoviePayModalOpen] = useState(false);
  const [movieUnlocked, setMovieUnlocked] = useState(false);

  // Episode controls
  const [epSortOrder, setEpSortOrder] = useState<'asc' | 'desc'>('asc');
  const [epSearch, setEpSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'episodes' | 'story' | 'related'>('episodes');

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);

    // 1. Instant load from local catalog (10ms)
    try {
      const catalog = await loadCatalog();
      if (catalog) {
        const detail = extractAnimeDetail(slug, catalog);
        if (detail) {
          setAnime(detail.anime);
          if (detail.episodes.length > 0) setEpisodes(detail.episodes);
          if (detail.related.length > 0) setRelatedAnime(detail.related);
          setIsLoading(false);
        }
      }
    } catch {}

    try {
      const decodedSlug = decodeURIComponent(slug).trim();
      let animeData: Anime | null = null;
      let epsData: Episode[] = [];

      try {
        const animeRes = await api.get(`/anime/${decodedSlug}`);
        animeData = animeRes.data as Anime;
      } catch {
        // Retry with original slug if different
        if (decodedSlug !== slug) {
          try {
            const retryRes = await api.get(`/anime/${slug}`);
            animeData = retryRes.data as Anime;
          } catch {}
        }
      }

      if (!animeData) {
        // Search in all anime list as last resort
        const allRes = await api.get('/anime?per_page=100').catch(() => ({ data: { items: [] } }));
        const matched = (allRes.data?.items || []).find((a: Anime) => 
          a.slug === slug || 
          a.slug === decodedSlug || 
          a.title?.trim() === decodedSlug || 
          a.title?.trim() === slug
        );
        if (matched) {
          animeData = matched;
        }
      }

      if (animeData) {
        setAnime(animeData);
        try {
          const epsRes = await api.get(`/anime/${animeData.slug || animeData.id}/episodes`);
          epsData = epsRes.data || [];
        } catch {
          epsData = [];
        }
        setEpisodes(epsData);

        const relatedRes = await api.get('/anime?per_page=6&sort=popular').catch(() => ({ data: { items: [] } }));
        setRelatedAnime(relatedRes.data?.items?.filter((a: Anime) => a.id !== animeData!.id).slice(0, 5) || []);

        if (isAuthenticated) {
          api.get('/favorites').then((r) => {
            setIsFav(r.data.some((a: Anime) => a.id === animeData!.id));
          }).catch(() => {});
        }
      }
    } catch {
      // Error handled by state
    } finally {
      setIsLoading(false);
    }
  }, [slug, isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleFavorite = async () => {
    if (!isAuthenticated || !anime) { navigate('/login'); return; }
    try {
      if (isFav) {
        await api.delete(`/favorites/${anime.id}`);
        setIsFav(false);
      } else {
        await api.post(`/favorites/${anime.id}`);
        setIsFav(true);
      }
    } catch {
      setIsFav(!isFav);
    }
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: anime?.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('បានចម្លងតំណភ្ជាប់ (Link copied to clipboard)!');
    }
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setTimeout(() => {
      setShowFeedbackModal(false);
      setFeedbackSent(false);
      setFeedbackText('');
    }, 1500);
  };

  if (isLoading) return <SkeletonDetail />;
  if (!anime) {
    return (
      <div className="min-h-screen bg-[#141414] pt-28 pb-16 flex flex-col items-center justify-center text-center px-4">
        <Film className="w-16 h-16 text-amber-500/50 mb-4 animate-pulse" />
        <h2 className="text-2xl font-black text-white mb-2 font-display">រកមិនឃើញរឿងនេះឡើយ (Title Not Found)</h2>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          រឿងដែលលោកអ្នកកំពុងស្វែងរកប្រហែលជាត្រូវបានផ្លាស់ប្តូរតំណភ្ជាប់ ឬមិនទាន់បានដាក់បញ្ចូល។
        </p>
        <Link to="/explore" className="py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition shadow-lg">
          រុករករឿងផ្សេងៗ (Explore All)
        </Link>
      </div>
    );
  }

  // Filter & sort episodes
  const filteredEpisodes = episodes
    .filter((ep) => {
      if (!epSearch.trim()) return true;
      const numMatch = ep.episode_number.toString().includes(epSearch.trim());
      const titleMatch = (ep.title || '').toLowerCase().includes(epSearch.toLowerCase());
      return numMatch || titleMatch;
    })
    .sort((a, b) => {
      if (epSortOrder === 'asc') return a.episode_number - b.episode_number;
      return b.episode_number - a.episode_number;
    });

  const firstEpNum = episodes.length > 0
    ? Math.min(...episodes.map((e) => e.episode_number))
    : 1;

  const latestEpNum = episodes.length > 0
    ? Math.max(...episodes.map((e) => e.episode_number))
    : 1;

  return (
    <main className="min-h-screen pb-24 md:pb-16 bg-[#141414] text-gray-100 selection:bg-[#E50914] selection:text-white">
      {/* ── 1. Full-Bleed Cinematic Hero Banner with Poster & Title ── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-[#181818] via-[#141414] to-[#141414] pt-16 md:pt-20">
        {/* Background Backdrop Image */}
        <div className="absolute inset-0 z-0 opacity-25 md:opacity-30 blur-sm scale-105 pointer-events-none">
          <img
            src={anime.banner_url || anime.poster_url}
            alt=""
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Ambient Top & Bottom Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent z-0 pointer-events-none" />

        {/* Back Arrow Floating Action */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-semibold border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" /> ត្រឡប់ក្រោយ (Back)
          </button>
        </div>

        {/* Hero Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-6 md:py-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 lg:gap-10">
            {/* Left: Premium Glossy Poster Card */}
            <div className="w-48 sm:w-56 md:w-64 lg:w-72 shrink-0 group">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-2 border-white/15 group-hover:border-amber-500/50 transition-all duration-300 bg-[#121622]">
                <img
                  src={anime.poster_url || anime.banner_url}
                  alt={anime.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Rating Badge Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-300 text-xs font-black shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{(anime.average_rating || 9.8).toFixed(1)}</span>
                </div>

                {/* Type Badge Overlay */}
                {/* Type Badge Overlay */}
                <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
                  {anime.type === 'ANIME' ? 'រឿងជប៉ុន' : anime.type === 'MOVIE' ? 'ភាពយន្តដុំ' : anime.type === 'DRAMA' ? 'រឿងភាគ' : 'រឿងចិន 3D'}
                </div>

                {/* HD / 4K Tag at bottom */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none">
                  <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-bold text-amber-400 border border-amber-500/30">
                    4K Ultra HD
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/80 backdrop-blur-md text-[10px] font-bold text-white">
                    {anime.status === 'COMPLETED' ? 'ចប់ជាស្ថាពរ' : 'កំពុងចាក់ផ្សាយ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Rich Series Title & Metadata Section */}
            <div className="flex-1 text-center md:text-left space-y-4">
              {/* Breadcrumb / Tag row */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-4 h-4 fill-amber-400" /> រឿងល្បីពេញនិយម
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 font-semibold">{anime.country === 'China' ? 'ប្រទេសចិន' : anime.country === 'Japan' ? 'ប្រទេសជប៉ុន' : (anime.country || 'ចិន')}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 font-semibold">ឆ្នាំ {anime.year || 2024}</span>
                {anime.studio && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">{anime.studio}</span>
                  </>
                )}
              </div>

              {/* Main Title */}
              <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight drop-shadow-lg">
                {anime.title}
              </h1>

              {/* Alt Title & Season */}
              {anime.alt_title && (
                <p className="text-sm sm:text-base text-gray-400 font-medium italic">
                  {anime.alt_title}
                </p>
              )}

              {/* Badges & Meta Chips */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                {anime.type === 'MOVIE' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border border-amber-500/50 text-amber-300 text-xs font-black shadow-sm">
                    🍿 Movie ($1.00)
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {(anime.average_rating || 9.8).toFixed(1)} ពិន្ទុ
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold">
                  <Film className="w-3.5 h-3.5 text-cyan-400" /> {anime.episode_count || episodes.length} ភាគសរុប
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold">
                  <Tv className="w-3.5 h-3.5 text-purple-400" /> សំឡេង & អក្សរខ្មែរ
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> ~20-25 នាទី/ភាគ
                </span>
              </div>

              {/* Genre Pills */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
                  {anime.genres.map((g) => (
                    <Link
                      key={g.id}
                      to={`/explore?genre=${g.slug}`}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-[#161f30] hover:bg-amber-500 hover:text-black text-gray-300 border border-white/10 transition-all shadow-sm"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Primary Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
                {/* Watch / Buy Primary CTA */}
                {(() => {
                  const isAdministrator = isAdmin || isOwner || user?.role === 'ADMIN' || user?.role === 'OWNER';
                  const hasMovieAccess = isAdministrator || movieUnlocked || (anime.slug ? isMoviePurchased(anime.slug) : false);

                  if (anime.type === 'MOVIE' && !hasMovieAccess) {
                    return (
                      <button
                        onClick={() => setIsMoviePayModalOpen(true)}
                        className="py-3.5 px-7 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm md:text-base flex items-center gap-2.5 shadow-[0_8px_30px_rgba(245,158,11,0.35)] hover:scale-[1.03] active:scale-[0.98] transition-all"
                      >
                        <Film className="w-5 h-5 fill-black stroke-[2.5]" /> ទិញទស្សនារឿងនេះ ($1.00)
                      </button>
                    );
                  }

                  return (
                    <Link
                      to={`/watch/${anime.slug}/${firstEpNum}`}
                      className="py-3.5 px-7 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm md:text-base flex items-center gap-2.5 shadow-[0_8px_30px_rgba(245,158,11,0.35)] hover:scale-[1.03] active:scale-[0.98] transition-all"
                    >
                      <Play className="w-5 h-5 fill-black stroke-[2.5]" /> {
                        anime.type === 'MOVIE'
                          ? (isAdministrator ? '▶ ចាក់ទស្សនា (Admin Access)' : '▶ ចាក់ទស្សនា (បានទិញរួច)')
                          : 'ទស្សនាភាគ ១'
                      }
                    </Link>
                  );
                })()}

                {/* Latest Episode Button (if more than 1 ep) */}
                {latestEpNum > 1 && (
                  <Link
                    to={`/watch/${anime.slug}/${latestEpNum}`}
                    className="py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs md:text-sm border border-white/15 hover:border-amber-500/40 transition flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" /> ភាគចុងក្រោយ (ភាគ {latestEpNum})
                  </Link>
                )}

                {/* Bookmark Toggle */}
                <button
                  onClick={toggleFavorite}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-2 text-xs md:text-sm font-bold ${
                    isFav
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-lg shadow-red-500/20'
                      : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                  }`}
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Bookmark className={`w-4 h-4 ${isFav ? 'fill-red-400' : ''}`} />
                  <span>{isFav ? 'បានរក្សាទុក' : 'រក្សាទុក'}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={share}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15 transition flex items-center gap-2 text-xs md:text-sm font-bold"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">ចែករំលែក</span>
                </button>

                {/* Feedback Modal Trigger */}
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15 transition flex items-center gap-2 text-xs md:text-sm font-bold"
                  title="Report or Feedback"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">មតិកែលម្អ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Tab Navigation & Content Section ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('episodes')}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all ${
              activeTab === 'episodes'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-4 h-4" /> បញ្ជីភាគ ({episodes.length})
          </button>

          <button
            onClick={() => setActiveTab('story')}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all ${
              activeTab === 'story'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Info className="w-4 h-4" /> ដំណើររឿងសង្ខេប & ព័ត៌មាន
          </button>

          {relatedAnime.length > 0 && (
            <button
              onClick={() => setActiveTab('related')}
              className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all ${
                activeTab === 'related'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4" /> រឿងស្រដៀងគ្នា ({relatedAnime.length})
            </button>
          )}
        </div>

        {/* ── TAB 1: EPISODES CONTENT ── */}
        {activeTab === 'episodes' && (
          <div className="space-y-6">
            {/* Episode Toolbar (Search + Sort + View Mode) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#111726]/80 border border-white/10 backdrop-blur-xl shadow-lg">
              {/* Left: Search input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={epSearch}
                  onChange={(e) => setEpSearch(e.target.value)}
                  placeholder="ស្វែងរកលេខភាគ..."
                  className="w-full bg-[#161f33] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Right: Sort Order & View Mode Toggles */}
              <div className="flex items-center gap-2 justify-end">
                {/* Sort Order Button */}
                <button
                  onClick={() => setEpSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 rounded-xl bg-[#161f33] hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Toggle episode order"
                >
                  <ArrowDownUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>{epSortOrder === 'asc' ? 'ភាគ 1 ➔ ចុងក្រោយ' : 'ភាគចុងក្រោយ ➔ 1'}</span>
                </button>

              </div>
            </div>

            {/* Episodes List Display: Clean & Modern Netflix Episode Grid */}
            {filteredEpisodes.length === 0 ? (
              <div className="text-center py-16 bg-[#181818]/60 rounded-3xl border border-white/5 space-y-2">
                <Film className="w-10 h-10 text-gray-500 mx-auto" />
                <p className="text-gray-400 text-sm font-semibold">រកមិនឃើញភាគដែលស្វែងរកឡើយ</p>
                <p className="text-gray-500 text-xs">សូមសាកល្បងស្វែងរកលេខភាគផ្សេងទៀត។</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 sm:gap-3">
                {filteredEpisodes.map((ep) => {
                  const isEpVip = ep.is_vip || (ep as any).is_vip_only || ep.is_free === false;

                  return (
                    <Link
                      key={ep.id}
                      to={`/watch/${anime.slug}/${ep.episode_number}`}
                      className="group relative flex flex-col items-center justify-center py-3.5 px-2 rounded-xl bg-[#1e1e1e] border border-white/10 hover:border-[#E50914] hover:bg-[#E50914] text-white transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      {isEpVip && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center shadow">
                          <Crown className="w-2.5 h-2.5 fill-black" />
                        </div>
                      )}
                      <span className="text-xs sm:text-sm font-black tracking-tight group-hover:text-white">
                        ភាគ {ep.episode_number}
                      </span>
                      <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.2 rounded ${
                        isEpVip ? 'bg-amber-500/20 text-amber-300 group-hover:bg-black/30 group-hover:text-white' : 'bg-emerald-500/20 text-emerald-300 group-hover:bg-black/30 group-hover:text-white'
                      }`}>
                        {isEpVip ? 'VIP' : 'FREE'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: STORY & DETAILS CONTENT ── */}
        {activeTab === 'story' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left 2 Cols: Full Synopsis */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 md:p-8 rounded-3xl bg-[#111726] border border-white/10 shadow-2xl space-y-4">
                <h3 className="font-display font-black text-xl text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-400" /> សាច់រឿងសង្ខេប (Synopsis)
                </h3>
                <p className="text-sm md:text-base text-gray-300 leading-relaxed font-sans whitespace-pre-line">
                  {anime.description || 'មិនមានការពិពណ៌នាសាច់រឿងលម្អិតឡើយ។'}
                </p>
              </div>

              {/* Streaming Availability */}
              <StreamingAvailabilityHub
                animeTitle={anime.title}
                merDonghuaUrl={`/watch/${anime.slug}/1`}
              />
            </div>

            {/* Right 1 Col: Metadata Info Card */}
            <div className="p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-2xl space-y-4 text-xs">
              <h4 className="font-display font-bold text-sm text-white border-b border-white/10 pb-3">
                ព័ត៌មានលម្អិត (Series Info)
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">ឈ្មោះដើម (Original):</span>
                  <span className="text-white font-bold">{anime.alt_title || anime.title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">ប្រភេទ (Category):</span>
                  <span className="text-amber-400 font-bold">{anime.type || 'Donghua'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">ស្ថានភាព (Status):</span>
                  <span className="text-emerald-400 font-bold">{anime.status === 'COMPLETED' ? 'ចប់សព្វគ្រប់' : 'កំពុងចាក់ផ្សាយ (Ongoing)'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">ស្ទូឌីយោ (Studio):</span>
                  <span className="text-white font-bold">{anime.studio || 'NINT Studio Animation'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">ឆ្នាំផលិត (Release):</span>
                  <span className="text-white font-bold">{anime.year || 2024}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">ចំនួនភាគ (Episodes):</span>
                  <span className="text-white font-bold">{anime.episode_count || episodes.length} ភាគ</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">គុណភាព (Resolution):</span>
                  <span className="text-amber-400 font-bold">4K Ultra HD • 60 FPS</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: RELATED RECOMMENDATIONS CONTENT ── */}
        {activeTab === 'related' && (
          <div className="space-y-4">
            <h3 className="font-display font-black text-xl text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> រឿងដែលអ្នកអាចនឹងចូលចិត្ត (You May Also Like)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {relatedAnime.map((item) => (
                <Link
                  key={item.id}
                  to={`/donghua/${item.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-[#111726] border border-white/10 hover:border-amber-500/50 transition-all duration-300 shadow-xl"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#182033]">
                    <img
                      src={item.poster_url || item.banner_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-400">
                      ⭐ {(item.average_rating || 9.6).toFixed(1)}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-display font-bold text-xs text-white group-hover:text-amber-400 transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.episode_count || 'Multi'} ភាគ</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Feedback Modal ── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#111726] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl animate-scale-in">
            <h3 className="font-display font-bold text-lg text-white">មតិកែលម្អ ឬរាយការណ៍បញ្ហា (Feedback)</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              មានបញ្ហាទាក់ទងនឹងវីដេអូ សំឡេង ឬចំណងជើង? សូមផ្ញើសារមកកាន់យើងខ្ញុំ៖
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="សរសេរមតិ ឬបញ្ហារបស់អ្នកនៅទីនេះ..."
              rows={4}
              className="input resize-none text-xs"
            />
            {feedbackSent ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" /> សូមអរគុណ! មតិរបស់អ្នកត្រូវបានផ្ញើរួចរាល់។
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="btn-secondary text-xs py-2.5 px-4"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleFeedbackSubmit}
                  className="btn-primary text-xs py-2.5 px-5"
                >
                  ផ្ញើមតិ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {anime && (
        <MoviePaymentModal
          isOpen={isMoviePayModalOpen}
          onClose={() => setIsMoviePayModalOpen(false)}
          movieSlug={anime.slug}
          movieTitle={anime.title}
          posterUrl={anime.poster_url}
          onPaymentSuccess={() => {
            setMovieUnlocked(true);
            setIsMoviePayModalOpen(false);
          }}
        />
      )}
    </main>
  );
}
