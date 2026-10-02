import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Info, Users,
  Play, Lock, Crown, Send, Film, Download
} from 'lucide-react';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { isMoviePurchased } from '../services/paymentService';
import { useAuthStore } from '../store/authStore';
import { usePromoStore } from '../store/promoStore';
import api from '../services/api';
import { loadCatalog, extractAnimeDetail } from '../services/catalogService';
import type { Anime, Episode, DanmakuItem } from '../types';
import { downloadService } from '../services/downloadService';
import { triggerHaptic } from '../utils/telegram';
import { usePlatform } from '../utils/platform';
import { getVipContactUrl } from '../utils/vip';
import { translate, useLanguageStore } from '../store/languageStore';
import { useDownloadStore } from '../store/downloadStore';

export function WatchPage() {
  const appLanguage = useLanguageStore((state) => state.language);
  const { isTelegram, isMobileApp } = usePlatform();
  const { slug, episodeNumber } = useParams<{ slug: string; episodeNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, isOwner } = useAuthStore();
  const { downloads, fetchDownloads, startDownload, isDownloaded, getDownloadProgress } = useDownloadStore();
  const { promoData, fetchPromoCountdown } = usePromoStore();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEp, setCurrentEp] = useState<Episode | null>(null);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState<string | null>(null);
  const [, setDanmakuList] = useState<DanmakuItem[]>([]);
  const [liveViewers, setLiveViewers] = useState(1);
  const [resumeAt, setResumeAt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [autoplayEnabled] = useState(() => {
    try { return localStorage.getItem('nami_autoplay') !== 'false'; } catch { return true; }
  });
  const [movieUnlocked] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const epNum = parseInt(episodeNumber || '1', 10);

  useEffect(() => {
    fetchPromoCountdown();
  }, [fetchPromoCountdown]);

  useEffect(() => {
    void fetchDownloads();
  }, [fetchDownloads]);

  // ✅ VIP: Admin, Owner, STAFF, is_vip_active, is_vip => always unlocked
  const isVipUser = isAdmin || isOwner || !!user && (user.role === 'ADMIN' || user.role === 'OWNER' || user.role === 'STAFF' || user.is_vip_active === true);
  const hasSeriesTrial = !!user && user.trial_anime_id === anime?.id && !!user.trial_expires_at && new Date(user.trial_expires_at).getTime() > Date.now();
  const isGlobalVipLocked = !!promoData && (promoData.is_vip_locked || promoData.is_expired);
  // ✅ Only treat episode as VIP if is_free is explicitly false (not null/undefined)
  const isCurrentEpVip = currentEp?.is_vip === true || (currentEp as any)?.is_vip_only === true || (currentEp?.is_free !== null && currentEp?.is_free !== undefined && currentEp?.is_free === false);
  const isLocked = (isGlobalVipLocked || isCurrentEpVip) && !isVipUser && !hasSeriesTrial;
  const vipPlan = user?.vip_plan?.toLowerCase() || '';
  const canDownload = isAdmin || isOwner || user?.role === 'STAFF' || (isVipUser && vipPlan !== 'pro');
  const isPlusPlan = vipPlan === 'plus' && !isAdmin && !isOwner && user?.role !== 'STAFF';
  const plusLimitReached = isPlusPlan && downloads.length >= 10;

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
    setAnime(null);
    setEpisodes([]);
    setCurrentEp(null);
    setResumeAt(0);
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

        // Get resume position from history (Server if logged in, LocalStorage for guests)
        let foundResume = false;
        if (isAuthenticated) {
          try {
            const histRes = await api.get('/history');
            const histItem = histRes.data.find(
              (h: { episode_id: number; progress_seconds: number }) => h.episode_id === ep.id
            );
            if (histItem && histItem.progress_seconds > 15) {
              setResumeAt(histItem.progress_seconds);
              foundResume = true;
            }
          } catch { /* no history */ }
        }

        if (!foundResume && slug) {
          try {
            const localResume = localStorage.getItem(`resume_${slug}_${ep.episode_number}`);
            if (localResume) {
              const sec = parseFloat(localResume);
              if (sec > 15) setResumeAt(sec);
            }
          } catch {}
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

      // Keep cached catalog titles on the watch flow when the API is offline.
      // A missing network response is not the same as a title that does not exist.
      try {
        const fallbackCatalog = await loadCatalog();
        const fallbackDetail = extractAnimeDetail(slug, fallbackCatalog);
        if (fallbackDetail) {
          setAnime(fallbackDetail.anime);
          setEpisodes(fallbackDetail.episodes);
          const fallbackEpisode = fallbackDetail.episodes.find((episode) => episode.episode_number === epNum) || fallbackDetail.episodes[0] || null;
          setCurrentEp(fallbackEpisode);
          setIsLoading(false);
          if (!fallbackEpisode) return;
          return;
        }
      } catch { /* use the not-found route only when both API and cache miss */ }

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
    // Save to LocalStorage for guest & logged in users alike
    if (slug && currentEp && currentTime > 10) {
      try {
        localStorage.setItem(`resume_${slug}_${currentEp.episode_number}`, currentTime.toString());
        const histKey = 'local_watch_history';
        const raw = localStorage.getItem(histKey);
        let list: any[] = raw ? JSON.parse(raw) : [];
        list = list.filter((item: any) => !(item.slug === slug && item.episode_number === currentEp.episode_number));
        list.unshift({
          slug,
          episode_number: currentEp.episode_number,
          progress_seconds: currentTime,
          duration_seconds: duration,
          updated_at: Date.now(),
          anime_title: anime?.title,
          poster_url: anime?.poster_url
        });
        localStorage.setItem(histKey, JSON.stringify(list.slice(0, 50)));
      } catch {}
    }

    if (!isAuthenticated || !anime || !currentEp) return;
    try {
      await api.post('/history', {
        anime_id: anime.id,
        episode_id: currentEp.id,
        progress_seconds: currentTime,
        duration_seconds: duration,
      });
    } catch { /* silent */ }
  }, [isAuthenticated, anime, currentEp, slug]);

  const goToEp = (epNumber: number) => {
    triggerHaptic('light');
    navigate(`/watch/${slug}/${epNumber}`);
  };

  const prevEp = episodes.find((e) => e.episode_number === epNum - 1);
  const nextEp = episodes.find((e) => e.episode_number === epNum + 1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#E8452C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentEp) {
    const detailPath = anime
      ? `/${anime.type === 'ANIME' ? 'anime' : anime.type === 'DRAMA' ? 'drama' : anime.type === 'MOVIE' ? 'movie' : 'donghua'}/${anime.slug}`
      : '/explore';
    return (
      <div className="mini-watch-empty min-h-screen bg-[#111216] pt-16 flex flex-col items-center justify-center text-center px-5">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-white/5 text-gray-400"><Film className="h-6 w-6" /></div>
        <h1 className="text-xl text-white font-bold mb-2">Episode unavailable</h1>
        <p className="max-w-sm text-gray-400 mb-6 text-sm leading-relaxed">
          {anime ? 'This title is in your catalog, but no playable episode is available right now.' : 'This episode may have been removed or is not published yet.'}
        </p>
        <div className="flex items-center gap-3">
          <Link to={detailPath} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black">Return to title</Link>
          <Link to="/explore" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white">Browse catalog</Link>
        </div>
      </div>
    );
  }

  return (
    <main className={`mini-watch ${!isTelegram && !isMobileApp ? 'website-watch' : ''} min-h-screen bg-[#080d1a] text-gray-100 pt-0 sm:pt-4 md:pt-6 pb-24 md:pb-12 px-0 sm:px-4 md:px-6 ${isTelegram || isMobileApp ? 'is-mini-app' : ''}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-5">
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
                      <Lock className="w-3.5 h-3.5" /> {translate('Please sign in first', appLanguage)}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight">
                      {anime?.title} ({translate('Episode', appLanguage)} {currentEp.episode_number})
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed px-2">
                      {translate('Sign in to watch in 4K.', appLanguage)}
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
                      {translate('Sign in with Google', appLanguage)}
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
                      <Film className="w-3.5 h-3.5" /> {translate('Special movie access', appLanguage)}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-snug">
                      {anime?.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed px-2">
                      {translate('Special movie', appLanguage)}. <span className="text-amber-300 font-bold">{translate('VIP members must also purchase this movie.', appLanguage)}</span> <strong className="text-amber-400 font-black text-sm">{appLanguage === 'km' ? '$1.00 (≈ 4,000 ៛)' : '$1.00 (≈ KHR 4,000)'}</strong> {translate('One-time purchase, watch forever.', appLanguage)}
                    </p>
                  </div>

                  {/* Buy Button */}
                  <div className="w-full pt-2 max-w-xs mx-auto">
                    <a
                      href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent(appLanguage === 'km' ? `សួស្តី Admin ខ្ញុំចង់ទិញទស្សនារឿង Movie: ${anime?.title} ($1.00) សម្រាប់ Username: ${user?.username || 'Guest'}` : `Hello Admin, I would like to buy this movie: ${anime?.title} ($1.00). Username: ${user?.username || 'Guest'}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm md:text-base flex items-center justify-center gap-2.5 shadow-[0_8px_30px_rgba(245,158,11,0.45)] hover:scale-105 active:scale-95 transition-all"
                    >
                      <Send className="w-5 h-5 stroke-[2.5]" /> {translate('Buy this movie on Telegram', appLanguage)} ($1.00)
                    </a>
                    <p className="text-[11px] text-gray-400 mt-2">
                      💬 {appLanguage === 'km' ? 'ទាក់ទង Admin @watchflixanimeadmin ដើម្បីបើកសិទ្ធិទស្សនាភ្លាមៗ' : 'Contact @watchflixanimeadmin to activate viewing access.'}
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
                      <Crown className="w-3.5 h-3.5 fill-amber-400" /> {translate('VIP members only', appLanguage)}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-snug">
                      {anime?.title} ({translate('Episode', appLanguage)} {currentEp.episode_number})
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed px-2">
                      {isGlobalVipLocked ? translate('Free access expired.', appLanguage) : translate('This episode requires VIP.', appLanguage)}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-1">
                    <a
                      href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent(appLanguage === 'km' ? `សួស្តី Admin ខ្ញុំចង់ដំឡើងសមាជិក VIP សម្រាប់គណនី: ${user?.username || 'ភ្ញៀវ'}` : `Hello Admin, I would like to upgrade this account to VIP: ${user?.username || 'Guest'}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary w-full py-3 px-4 text-xs sm:text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-black shadow-lg shadow-amber-500/30"
                    >
                      <Send className="w-4 h-4" /> {translate('Contact admin to upgrade VIP', appLanguage)}
                    </a>
                    <a
                      href={getVipContactUrl(user?.username)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm whitespace-nowrap transition-all"
                    >
                      {translate('VIP information', appLanguage)}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative sm:rounded-2xl overflow-hidden shadow-2xl bg-black border-y sm:border border-white/10">
                {offlineVideoUrl && (
                  <div className="absolute top-3 left-3 z-30 pointer-events-none">
                    <span className="bg-emerald-600 text-white text-[11px] font-bold py-1 px-2.5 rounded-full shadow-lg flex items-center gap-1">
                      ⚡ {translate('Watch offline', appLanguage)}
                    </span>
                  </div>
                )}
                <VideoPlayer
                  src={offlineVideoUrl || currentEp.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                  subtitleUrl={currentEp.subtitle_url}
                  subtitleTracks={currentEp.subtitle_tracks}
                  qualitySources={currentEp.video_qualities}
                  onProgress={handleProgress}
                  resumeAt={resumeAt}
                  title={`${anime?.title} — ${translate('Episode', appLanguage)} ${currentEp.episode_number}${currentEp.title ? `: ${currentEp.title}` : ''}`}
                  autoPlay
                  hasPrev={!!prevEp}
                  hasNext={!!nextEp}
                  autoNext={autoplayEnabled}
                  onPrevEpisode={() => prevEp && goToEp(prevEp.episode_number)}
                  onNextEpisode={() => nextEp && goToEp(nextEp.episode_number)}
                />
              </div>
            )}


            {/* Episode Meta Bar (Compact Native Layout) */}
            <div className="mt-2.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0a0a0a]/90 border border-white/[0.08] backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#E50914] text-white">
                    {translate('Episode', appLanguage)} {currentEp.episode_number}
                  </span>
                  {offlineVideoUrl ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      {translate('Downloaded', appLanguage)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {liveViewers} {translate('Viewers', appLanguage)}
                    </span>
                  )}
                </div>
                <h1 className="font-display font-bold text-sm sm:text-base md:text-lg text-white tracking-tight truncate">
                  {anime?.title} — {translate('Episode', appLanguage)} {currentEp.episode_number}
                </h1>
                {anime?.alt_title && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{anime.alt_title}</p>
                )}
              </div>

              {/* Prev / Next Controls */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                <button
                  onClick={() => prevEp && goToEp(prevEp.episode_number)}
                  disabled={!prevEp}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a2336] hover:bg-[#222e46] text-gray-200 hover:text-white border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> {translate('Previous', appLanguage)}
                </button>
                <button
                  onClick={() => nextEp && goToEp(nextEp.episode_number)}
                  disabled={!nextEp}
                  className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1 shadow-md shadow-rose-600/30"
                >
                  {translate('Next', appLanguage)} <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {anime && (
                  <Link
                    to={`/donghua/${anime.slug}`}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
                    title={translate('Story details', appLanguage)}
                  >
                    <Info className="w-4 h-4" />
                  </Link>
                )}
                {currentEp && currentEp.video_url && !offlineVideoUrl && (
                  canDownload ? (
                    <button
                      onClick={async () => {
                        setDownloadNotice('');
                        try {
                          await startDownload({
                            animeId: anime?.id || currentEp.anime_id,
                            animeTitle: anime?.title || '',
                            animeSlug: anime?.slug || slug || '',
                            animePoster: anime?.poster_url || '',
                            animeType: anime?.type || 'ANIME',
                            episodeId: currentEp.id,
                            episodeNumber: currentEp.episode_number,
                            episodeTitle: currentEp.title || `Episode ${currentEp.episode_number}`,
                            durationSeconds: currentEp.duration_seconds || 0,
                            videoUrl: currentEp.video_url!,
                          });
                        } catch (error) {
                          setDownloadNotice(error instanceof Error ? error.message : 'Download failed');
                        }
                      }}
                      disabled={plusLimitReached || isDownloaded(anime?.id || currentEp.anime_id, currentEp.episode_number) || getDownloadProgress(anime?.id || currentEp.anime_id, currentEp.episode_number)?.status === 'downloading'}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a2336] hover:bg-[#222e46] text-gray-200 border border-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {getDownloadProgress(anime?.id || currentEp.anime_id, currentEp.episode_number)?.status === 'downloading'
                        ? `${getDownloadProgress(anime?.id || currentEp.anime_id, currentEp.episode_number)?.progress || 0}%`
                        : translate('Download episode', appLanguage)}
                      {isPlusPlan && ` (${Math.max(0, 10 - downloads.length)})`}
                    </button>
                  ) : (
                    <Link to="/vip" className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a2336] text-amber-300 border border-amber-400/20 flex items-center justify-center gap-1">
                      <Crown className="w-3.5 h-3.5" />{translate('Upgrade to Plus', appLanguage)}
                    </Link>
                  )
                )}
              </div>
              {downloadNotice && <p role="status" className="mt-2 text-xs text-rose-300">{downloadNotice}</p>}
              {plusLimitReached && <p className="mt-2 text-xs text-amber-300">{translate('Plus download limit reached', appLanguage)}</p>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
