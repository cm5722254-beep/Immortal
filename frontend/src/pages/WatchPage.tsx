import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, List, Info, Users,
  Play, Search, Lock, Crown, Send, Film, LayoutGrid
} from 'lucide-react';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { isMoviePurchased } from '../services/paymentService';
import { useAuthStore } from '../store/authStore';
import { usePromoStore } from '../store/promoStore';
import api from '../services/api';
import { loadCatalog, extractAnimeDetail } from '../services/catalogService';
import type { Anime, Episode, DanmakuItem } from '../types';
import { downloadService } from '../services/downloadService';
import { isYouTubeUrl, isFacebookUrl } from '../utils/youtube';

export function WatchPage() {
  const { slug, episodeNumber } = useParams<{ slug: string; episodeNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, isOwner } = useAuthStore();
  const { promoData, fetchPromoCountdown } = usePromoStore();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEp, setCurrentEp] = useState<Episode | null>(null);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState<string | null>(null);
  const [, setDanmakuList] = useState<DanmakuItem[]>([]);
  const [liveViewers, setLiveViewers] = useState(1);
  const [resumeAt, setResumeAt] = useState(0);
  const [epSearch, setEpSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [movieUnlocked] = useState(false);
  const [epViewMode, setEpViewMode] = useState<'grid' | 'list'>('grid');

  const wsRef = useRef<WebSocket | null>(null);
  const epNum = parseInt(episodeNumber || '1', 10);

  useEffect(() => {
    fetchPromoCountdown();
  }, [fetchPromoCountdown]);

  const isVipUser = !!user && (user.role === 'ADMIN' || user.is_vip_active || user.is_vip);
  const isGlobalVipLocked = !!promoData && (promoData.is_vip_locked || promoData.is_expired);
  const isCurrentEpVip = currentEp?.is_vip || (currentEp as any)?.is_vip_only || currentEp?.is_free === false;
  const isLocked = (isGlobalVipLocked || isCurrentEpVip) && !isVipUser;

  // 🍿 Movie Pay-Per-View check ($1.00)
  const isMovie = anime?.type === 'MOVIE';
  const isAdministrator = isAdmin || isOwner || user?.role === 'ADMIN' || user?.role === 'OWNER';
  const userUnlockedMovies = user?.unlocked_movies || [];
  const hasPurchasedMovie = movieUnlocked || (slug ? (isMoviePurchased(slug) || userUnlockedMovies.includes(slug)) : false);
  const isMovieLocked = isMovie && !isAdministrator && !hasPurchasedMovie;

  // Fetch anime & episodes
  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setOfflineVideoUrl(null);

    // 1. Instant load from local catalog (10ms)
    loadCatalog().then((catalog) => {
      if (catalog) {
        const detail = extractAnimeDetail(slug, catalog);
        if (detail) {
          setAnime(detail.anime);
          if (detail.episodes.length > 0) {
            setEpisodes(detail.episodes);
            const ep = detail.episodes.find((e) => e.episode_number === epNum) || detail.episodes[0];
            setCurrentEp(ep || null);
          }
          setIsLoading(false);
        }
      }
    }).catch(() => {});

    const decodedSlug = decodeURIComponent(slug).trim();

    Promise.all([
      api.get(`/anime/${decodedSlug}`).catch(() => api.get(`/anime/${slug}`)),
      api.get(`/anime/${decodedSlug}/episodes`).catch(() => api.get(`/anime/${slug}/episodes`)).catch(() => ({ data: [] })),
    ]).then(async ([animeRes, epsRes]) => {
      const animeData = animeRes?.data as Anime;
      const epsData = (epsRes?.data || []) as Episode[];
      if (animeData) setAnime(animeData);
      let ep: Episode | null = null;
      if (epsData.length > 0) {
        setEpisodes(epsData);
        ep = epsData.find((e) => e.episode_number === epNum) || epsData[0];
        setCurrentEp(ep || null);
      }
      setIsLoading(false);

      if (ep) {
        // Check if video is available offline in IndexedDB
        const offlineUrl = await downloadService.getOfflineVideoUrl(animeData.id, ep.episode_number);
        if (offlineUrl) {
          setOfflineVideoUrl(offlineUrl);
        }

        // Get resume position from history
        if (isAuthenticated) {
          try {
            const histRes = await api.get('/history');
            const histItem = histRes.data.find(
              (h: { episode_id: number; progress_seconds: number }) => h.episode_id === ep.id
            );
            if (histItem && histItem.progress_seconds > 30) {
              setResumeAt(histItem.progress_seconds);
            }
          } catch { /* no history */ }
        }
      }
    }).catch(async () => {
      // Offline Fallback: Check if we have this anime & episode in offline IndexedDB
      try {
        const allDownloads = await downloadService.getAllDownloads();
        const matchedDownloads = allDownloads.filter((d) => d.animeSlug === slug);
        if (matchedDownloads.length > 0) {
          const first = matchedDownloads[0];
          const offlineAnime: Anime = {
            id: first.animeId,
            title: first.animeTitle,
            slug: first.animeSlug,
            poster_url: first.animePoster,
            type: first.animeType as any,
            status: 'ONGOING' as any,
            average_rating: 9.6,
            view_count: 100,
            heat_score: 80000,
            rating_count: 10,
            episode_count: matchedDownloads.length,
            created_at: new Date().toISOString(),
            genres: [],
            is_featured: false,
            is_trending: false,
            is_published: true,
          };
          const offlineEps: Episode[] = matchedDownloads.map((d) => ({
            id: d.episodeId,
            anime_id: d.animeId,
            episode_number: d.episodeNumber,
            title: d.episodeTitle,
            video_url: d.videoUrl,
            duration_seconds: d.durationSeconds,
            view_count: 1,
            created_at: new Date().toISOString(),
            is_published: true,
          }));
          setAnime(offlineAnime);
          setEpisodes(offlineEps);
          const targetEp = offlineEps.find((e) => e.episode_number === epNum) || offlineEps[0];
          setCurrentEp(targetEp);
          const offlineUrl = await downloadService.getOfflineVideoUrl(first.animeId, targetEp.episode_number);
          if (offlineUrl) {
            setOfflineVideoUrl(offlineUrl);
          }
          return;
        }
      } catch (err) {
        console.error('Offline load error:', err);
      }
      navigate('/404');
    }).finally(() => setIsLoading(false));
  }, [slug, epNum, isAuthenticated]);

  // WebSocket for real-time live viewers and live Danmaku stream
  useEffect(() => {
    if (!currentEp) return;

    const wsUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
      .replace(/^http/, 'ws') + `/ws/watch/${currentEp.id}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'VIEWER_COUNT') {
            setLiveViewers(Math.max(1, payload.count));
          } else if (payload.type === 'DANMAKU') {
            const newDanmaku = payload.data as DanmakuItem;
            setDanmakuList((prev) => [...prev, newDanmaku]);
          }
        } catch { /* parse error */ }
      };

      ws.onerror = () => {};
      ws.onclose = () => {};

      return () => {
        ws.close();
      };
    } catch {
      // WS fallback
    }
  }, [currentEp?.id]);

  const handleProgress = useCallback(async (currentTime: number, duration: number) => {
    if (!isAuthenticated || !anime || !currentEp) return;
    try {
      await api.post('/history', {
        anime_id: anime.id,
        episode_id: currentEp.id,
        progress_seconds: currentTime,
        duration_seconds: duration,
      });
    } catch { /* silent */ }
  }, [isAuthenticated, anime, currentEp]);

  const goToEp = (epNumber: number) => {
    navigate(`/watch/${slug}/${epNumber}`);
  };

  const prevEp = episodes.find((e) => e.episode_number === epNum - 1);
  const nextEp = episodes.find((e) => e.episode_number === epNum + 1);

  const filteredEpisodes = episodes.filter((e) =>
    !epSearch.trim() ||
    e.episode_number.toString().includes(epSearch.trim()) ||
    (e.title && e.title.toLowerCase().includes(epSearch.toLowerCase().trim()))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#E8452C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentEp) {
    return (
      <div className="min-h-screen bg-[#0A0E17] pt-24 flex flex-col items-center justify-center text-center px-4">
        <p className="text-2xl text-white font-bold mb-2">Episode Not Found</p>
        <p className="text-gray-400 mb-4 text-sm">This episode may not be published yet.</p>
        {slug && <Link to={`/donghua/${slug}`} className="btn-primary text-xs py-2.5 px-6">Return to Series</Link>}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#141414] text-gray-100 pt-0 sm:pt-4 md:pt-6 pb-24 md:pb-12 px-0 sm:px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Main Stream Area */}
          <div className="flex-1 min-w-0">
            {!isAuthenticated ? (
              /* ─── 🔒 MANDATORY LOGIN GATE (មិនទាន់ LOGIN មិនអាចមើលបាន) ─── */
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#0F1424] via-[#0A0E17] to-[#12070e] border-2 border-amber-500/50 flex items-center justify-center p-6 text-center animate-scale-in">
                {anime?.poster_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
                    style={{ backgroundImage: `url(${anime.poster_url})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-[#0A0E17]/90 to-[#0A0E17]/80 pointer-events-none" />

                <div className="relative z-10 max-w-md mx-auto flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.3)] animate-bounce">
                    <Lock className="w-8 h-8 stroke-[2.4]" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
                      <Lock className="w-3.5 h-3.5" /> សូមចូលគណនីជាមុនសិន
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight">
                      {anime?.title} (ភាគ {currentEp.episode_number})
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed px-2">
                      ដើម្បីទស្សនាវីដេអូកម្រិតច្បាស់ 4K UHD សូមចុច <strong className="text-amber-400">Sign in with Google</strong> ខាងក្រោមដើម្បីចូលទស្សនាភ្លាមៗ។
                    </p>
                  </div>

                  {/* Google Login Action Button */}
                  <div className="w-full pt-2 max-w-xs mx-auto">
                    <Link
                      to="/login"
                      state={{ from: location.pathname }}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/30 hover:scale-105 transition-all"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      ចូលគណនីជាមួយ Google (Sign In)
                    </Link>
                  </div>
                </div>
              </div>
            ) : isMovieLocked ? (
              /* ─── 🍿 MOVIE PAY-PER-VIEW GATE ($1.00) ─── */
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#16121f] via-[#0e0b14] to-[#07050a] border-2 border-amber-500/50 flex items-center justify-center p-6 text-center animate-scale-in">
                {anime?.poster_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110 pointer-events-none"
                    style={{ backgroundImage: `url(${anime.poster_url})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-[#0A0E17]/90 to-[#0A0E17]/70 pointer-events-none" />

                <div className="relative z-10 max-w-md mx-auto flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black shadow-[0_0_35px_rgba(245,158,11,0.45)] animate-bounce">
                    <Film className="w-8 h-8 stroke-[2.4]" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40 shadow-sm">
                      <Film className="w-3.5 h-3.5" /> រឿងភាពយន្តដុំពិសេស
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-snug">
                      {anime?.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed px-2">
                      រឿងនេះជាប្រភេទភាពយន្តដុំ (Movie) ពិសេស។ <span className="text-amber-300 font-bold">ទោះជាសមាជិក VIP ក៏ត្រូវទិញទស្សនាដែរ</span> ក្នុងតម្លៃ <strong className="text-amber-400 font-black text-sm">$1.00 (≈ 4,000 ៛)</strong> តែម្តងគត់ គឺអាចទស្សនាបានរហូត (Admin មើលបានដោយសេរី)។
                    </p>
                  </div>

                  {/* Buy Button */}
                  <div className="w-full pt-2 max-w-xs mx-auto">
                    <a
                      href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent(`សួស្តី Admin ខ្ញុំចង់ទិញទស្សនារឿង Movie: ${anime?.title} ($1.00) សម្រាប់ Username: ${user?.username || 'Guest'}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm md:text-base flex items-center justify-center gap-2.5 shadow-[0_8px_30px_rgba(245,158,11,0.45)] hover:scale-105 active:scale-95 transition-all"
                    >
                      <Send className="w-5 h-5 stroke-[2.5]" /> ទិញទស្សនា ($1.00) តាម Telegram
                    </a>
                    <p className="text-[11px] text-gray-400 mt-2">
                      💬 ទាក់ទង Admin @watchflixanimeadmin ដើម្បីបើកសិទ្ធិទស្សនាភ្លាមៗ
                    </p>
                  </div>
                </div>
              </div>
            ) : isLocked ? (
              /* ─── 👑 VIP REQUIRED GATE ─── */
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-[#0F1424] border border-amber-500/40 flex items-center justify-center p-6 text-center">

                {anime?.poster_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110 pointer-events-none"
                    style={{ backgroundImage: `url(${anime.poster_url})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-[#0A0E17]/90 to-[#0A0E17]/70 pointer-events-none" />

                <div className="relative z-10 max-w-md mx-auto flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-pulse">
                    <Crown className="w-8 h-8 stroke-[2.2]" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
                      <Crown className="w-3.5 h-3.5 fill-amber-400" /> សម្រាប់តែសមាជិក VIP ប៉ុណ្ណោះ
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-snug">
                      {anime?.title} (ភាគ {currentEp.episode_number})
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed px-2">
                      {isGlobalVipLocked
                        ? 'ការទស្សនាដោយឥតគិតថ្លៃ ១៥ ថ្ងៃបានផុតកំណត់ហើយ! ទោះបីជាមានគណនីក៏ដោយ លុះត្រាតែ Admin កំណត់សិទ្ធិ VIP Member ទើបអាចទស្សនាបាន។'
                        : 'ភាគនេះសម្រាប់តែសមាជិក VIP ប៉ុណ្ណោះ! សូមដំឡើងគណនីរបស់អ្នកដើម្បីទស្សនា។'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-1">
                    <a
                      href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent(`សួស្តី Admin ខ្ញុំចង់ដំឡើងសមាជិក VIP សម្រាប់គណនី: ${user?.username || 'ភ្ញៀវ'}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary w-full py-3 px-4 text-xs sm:text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-black shadow-lg shadow-amber-500/30"
                    >
                      <Send className="w-4 h-4" /> ទាក់ទង Admin @watchflixanimeadmin ដំឡើង VIP
                    </a>
                    <Link
                      to="/vip"
                      className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm whitespace-nowrap transition-all"
                    >
                      ព័ត៌មាន VIP
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative sm:rounded-2xl overflow-hidden shadow-2xl bg-black border-y sm:border border-white/10">
                {offlineVideoUrl && (
                  <div className="absolute top-3 left-3 z-30 pointer-events-none">
                    <span className="bg-emerald-600 text-white text-[11px] font-bold py-1 px-2.5 rounded-full shadow-lg flex items-center gap-1">
                      ⚡ ទស្សនា Offline (បានទាញយក)
                    </span>
                  </div>
                )}
                <VideoPlayer
                  src={offlineVideoUrl || currentEp.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                  subtitleUrl={currentEp.subtitle_url}
                  onProgress={handleProgress}
                  resumeAt={resumeAt}
                  title={`${anime?.title} — ភាគ ${currentEp.episode_number}${currentEp.title ? `: ${currentEp.title}` : ''}`}
                  hasPrev={!!prevEp}
                  hasNext={!!nextEp}
                  onPrevEpisode={() => prevEp && goToEp(prevEp.episode_number)}
                  onNextEpisode={() => nextEp && goToEp(nextEp.episode_number)}
                />
              </div>
            )}


            {/* Episode Meta Bar */}
            <div className="mt-4 p-4 mx-2 sm:mx-0 rounded-2xl bg-[#181818] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#E50914] text-white">
                    ភាគ {currentEp.episode_number}
                  </span>
                  {isYouTubeUrl(currentEp?.video_url) ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/40 flex items-center gap-1.5 shadow-sm">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      ម៉ាស៊ីនបម្រើ YouTube
                    </span>
                  ) : isFacebookUrl(currentEp?.video_url) ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center gap-1.5 shadow-sm">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      ម៉ាស៊ីនបម្រើ Facebook
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {liveViewers} នាក់កំពុងមើល
                    </span>
                  )}
                  {offlineVideoUrl && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      បានទាញយក
                    </span>
                  )}
                </div>
                <h1 className="font-display font-black text-base sm:text-xl text-white tracking-tight">
                  {anime?.title} — ភាគ {currentEp.episode_number}
                </h1>
                {anime?.alt_title && (
                  <p className="text-xs text-gray-400 mt-0.5">{anime.alt_title}</p>
                )}
              </div>

              {/* Prev / Next Controls */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => prevEp && goToEp(prevEp.episode_number)}
                  disabled={!prevEp}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1E283C] hover:bg-[#25324C] text-gray-200 hover:text-white border border-[#2A3750] disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> ភាគមុន
                </button>
                <button
                  onClick={() => nextEp && goToEp(nextEp.episode_number)}
                  disabled={!nextEp}
                  className="btn-primary text-xs py-2 px-4 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                >
                  ភាគបន្ទាប់ <ChevronRight className="w-4 h-4" />
                </button>
                {anime && (
                  <Link
                    to={`/donghua/${anime.slug}`}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#1E283C] transition-colors"
                    title="ព័ត៌មានរឿង"
                  >
                    <Info className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Right Dedicated Episode Drawer */}
          <div className="lg:w-80 lg:max-h-[600px] flex flex-col rounded-2xl bg-[#111726] border border-[#1E283C] overflow-hidden shrink-0 shadow-lg">
            {/* Header with Search & View Toggle */}
            <div className="p-3.5 border-b border-[#1E283C] bg-[#161F33]/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <List className="w-4 h-4 text-[#E8452C]" /> បញ្ជីភាគទាំងអស់ ({episodes.length})
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEpViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      epViewMode === 'grid'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    title="ទិដ្ឋភាពក្រឡា"
                    aria-label="ទិដ្ឋភាពក្រឡា"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEpViewMode('list')}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      epViewMode === 'list'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    title="ទិដ្ឋភាពបញ្ជី"
                    aria-label="ទិដ្ឋភាពបញ្ជី"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-gray-400 font-mono ml-1">
                    ភាគ {epNum}
                  </span>
                </div>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={epSearch}
                  onChange={(e) => setEpSearch(e.target.value)}
                  placeholder="ស្វែងរកលេខភាគ..."
                  className="w-full bg-[#111726] border border-[#1E283C] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#E8452C] transition-colors"
                />
              </div>
            </div>

            {/* Episode List / Grid Display */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[420px]">
              {filteredEpisodes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  រកមិនឃើញភាគដែលស្វែងរកឡើយ
                </div>
              ) : epViewMode === 'grid' ? (
                /* Compact Pill Grid (Instant 1-tap jump on Mobile & Desktop) */
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-1.5 p-1">
                  {filteredEpisodes.map((ep) => {
                    const isActive = ep.episode_number === epNum;
                    const isEpVip = ep.is_vip || (ep as any).is_vip_only || ep.is_free === false;

                    return (
                      <button
                        key={ep.id}
                        onClick={() => goToEp(ep.episode_number)}
                        className={`relative py-2.5 px-1 rounded-xl text-center font-bold text-xs transition-all duration-150 active:scale-95 flex flex-col items-center justify-center ${
                          isActive
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 scale-[1.02] border border-amber-400'
                            : isEpVip
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                            : 'bg-[#1E283C] hover:bg-[#2A3750] text-gray-200 border border-white/5'
                        }`}
                        title={`ភាគ ${ep.episode_number}`}
                      >
                        {isEpVip && (
                          <span className="absolute top-1 right-1">
                            <Crown className={`w-2.5 h-2.5 ${isActive ? 'fill-black text-black' : 'fill-amber-400 text-amber-400'}`} />
                          </span>
                        )}
                        <span className="leading-none">{ep.episode_number}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Detailed List View */
                filteredEpisodes.map((ep) => {
                  const isActive = ep.episode_number === epNum;
                  const isEpVip = ep.is_vip || (ep as any).is_vip_only || ep.is_free === false;
                  return (
                    <div
                      key={ep.id}
                      className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl transition-all ${
                        isActive
                          ? 'bg-amber-500/15 text-white border border-amber-500/40 shadow-sm'
                          : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      <button
                        onClick={() => goToEp(ep.episode_number)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            isActive
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                              : isEpVip
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-[#1E283C] text-gray-300'
                          }`}
                        >
                          {isActive ? <Play className="w-3.5 h-3.5 fill-current" /> : isEpVip ? <Crown className="w-3.5 h-3.5 fill-amber-400" /> : ep.episode_number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-bold truncate ${isActive ? 'text-amber-400' : 'text-gray-100'}`}>
                              {ep.title || `ភាគ ${ep.episode_number}`}
                            </p>
                            {isEpVip && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                VIP
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {ep.duration_seconds ? `${Math.floor(ep.duration_seconds / 60)} នាទី` : '24 នាទី'} · Full HD
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
