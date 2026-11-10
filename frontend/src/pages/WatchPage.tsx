import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Info, Users,
  Lock, Crown, Send, Film, Download, Zap,
  Play, Search, LayoutGrid
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
  const { fetchPromoCountdown } = usePromoStore();

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
  const [selectedRange, setSelectedRange] = useState(0);
  const [epSearch, setEpSearch] = useState('');
  const RANGE_SIZE = 25;

  const wsRef = useRef<WebSocket | null>(null);
  const skipEpisodeFetchRef = useRef<string | null>(null);
  const epNum = parseInt(episodeNumber || '1', 10);

  // Auto-sync selectedRange to current episode's range
  useEffect(() => {
    if (epNum > 0) {
      setSelectedRange(Math.floor((epNum - 1) / RANGE_SIZE));
    }
  }, [epNum]);

  const totalRanges = Math.ceil(episodes.length / RANGE_SIZE);
  const displayedEpisodes = useMemo(() => {
    if (epSearch.trim()) {
      const q = epSearch.trim().toLowerCase();
      return episodes.filter(
        (e) => String(e.episode_number).includes(q) || (e.title && e.title.toLowerCase().includes(q))
      );
    }
    const start = selectedRange * RANGE_SIZE;
    return episodes.slice(start, start + RANGE_SIZE);
  }, [episodes, selectedRange, epSearch]);

  useEffect(() => {
    fetchPromoCountdown();
  }, [fetchPromoCountdown]);

  useEffect(() => {
    void fetchDownloads();
  }, [fetchDownloads]);

  // VIP verification: user must have VIP (Admin, Owner, Staff, is_vip, or active VIP status) to watch
  const isVipUser = isAdmin || isOwner || !!user && (user.role === 'ADMIN' || user.role === 'OWNER' || user.role === 'STAFF' || user.is_vip_active === true || user.is_vip === true);
  const hasSeriesTrial = !!user && user.trial_anime_id === anime?.id && !!user.trial_expires_at && new Date(user.trial_expires_at).getTime() > Date.now();
  const isLocked = !isVipUser && !hasSeriesTrial;
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
    const routeKey = `${slug}/${epNum}`;
    if (skipEpisodeFetchRef.current === routeKey) {
      skipEpisodeFetchRef.current = null;
      setIsLoading(false);
      return;
    }
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
    const episode = episodes.find((item) => item.episode_number === epNumber);
    if (!episode) {
      navigate(`/watch/${slug}/${epNumber}`, { replace: true });
      return;
    }
    const routeKey = `${slug}/${epNumber}`;
    skipEpisodeFetchRef.current = routeKey;
    setIsLoading(false);
    setResumeAt(0);
    setOfflineVideoUrl(null);
    setCurrentEp(episode);
    try {
      const savedTime = Number(localStorage.getItem(`resume_${slug}_${epNumber}`) || 0);
      if (savedTime > 15) setResumeAt(savedTime);
    } catch { /* Continue from the beginning. */ }
    if (anime) {
      void downloadService.getOfflineVideoUrl(anime.id, epNumber).then((url) => {
        if (window.location.pathname === `/watch/${slug}/${epNumber}`) setOfflineVideoUrl(url);
      });
    }
    navigate(`/watch/${slug}/${epNumber}`, { replace: true });
  };

  const prevEp = episodes.find((e) => e.episode_number === epNum - 1);
  const nextEp = episodes.find((e) => e.episode_number === epNum + 1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentEp) {
    const detailPath = anime
      ? `/${anime.type === 'ANIME' ? 'anime' : anime.type === 'DRAMA' ? 'drama' : anime.type === 'MOVIE' ? 'movie' : 'donghua'}/${anime.slug}`
      : '/explore';
    return (
      <div className="mini-watch-empty min-h-screen bg-slate-50 text-slate-800 pt-16 flex flex-col items-center justify-center text-center px-5">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500"><Film className="h-6 w-6" /></div>
        <h1 className="text-xl text-slate-900 font-bold mb-2">Episode unavailable</h1>
        <p className="max-w-sm text-slate-500 mb-6 text-sm leading-relaxed">
          {anime ? 'This title is in your catalog, but no playable episode is available right now.' : 'This episode may have been removed or is not published yet.'}
        </p>
        <div className="flex items-center gap-3">
          <Link to={detailPath} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs">Return to title</Link>
          <Link to="/explore" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Browse catalog</Link>
        </div>
      </div>
    );
  }

  return (
    <main className={`mini-watch ${!isTelegram && !isMobileApp ? 'website-watch' : ''} min-h-screen bg-bg-base text-text-primary pt-0 sm:pt-4 md:pt-6 pb-24 md:pb-12 px-0 sm:px-4 md:px-6 ${isTelegram || isMobileApp ? 'is-mini-app' : ''}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-5">
          {/* Main Stream Area */}
          <div className="flex-1 min-w-0">
            {(!isAuthenticated && isLocked) ? (
              /* ─── MANDATORY LOGIN GATE (មិនទាន់ LOGIN មិនអាចមើលបាន) ─── */
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-sm bg-white/95 border border-slate-200/90 flex items-center justify-center p-6 text-center animate-scale-in">
                {anime?.poster_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-10 scale-110 pointer-events-none"
                    style={{ backgroundImage: `url(${anime.poster_url})` }}
                  />
                )}

                <div className="relative z-10 max-w-md mx-auto flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                    <Lock className="w-8 h-8 stroke-[2.4]" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/70">
                      <Lock className="w-3.5 h-3.5" /> {translate('Please sign in first', appLanguage)}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 tracking-tight">
                      {anime?.title} ({translate('Episode', appLanguage)} {currentEp.episode_number})
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed px-2">
                      {translate('Sign in to watch in 4K.', appLanguage)}
                    </p>
                  </div>

                  {/* Google Login Action Button */}
                  <div className="w-full pt-2 max-w-xs mx-auto">
                    <Link
                      to="/login"
                      state={{ from: location.pathname }}
                      className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xs hover:scale-105 active:scale-95 transition-all"
                    >
                      <svg className="w-4 h-4 shrink-0 fill-white" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      {translate('Sign in with Google', appLanguage)}
                    </Link>
                  </div>
                </div>
              </div>
            ) : isMovieLocked ? (
              /* ─── MOVIE PAY-PER-VIEW GATE ($1.00) ─── */
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-sm bg-white/95 border border-slate-200/90 flex items-center justify-center p-6 text-center animate-scale-in">
                {anime?.poster_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-10 scale-110 pointer-events-none"
                    style={{ backgroundImage: `url(${anime.poster_url})` }}
                  />
                )}

                <div className="relative z-10 max-w-md mx-auto flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
                    <Film className="w-8 h-8 stroke-[2.4]" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-black border border-amber-200 shadow-xs">
                      <Film className="w-3.5 h-3.5 text-amber-600" /> {translate('Special movie access', appLanguage)}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 tracking-tight leading-snug">
                      {anime?.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed px-2">
                      {translate('Special movie', appLanguage)}. <span className="text-amber-800 font-bold">{translate('VIP members must also purchase this movie.', appLanguage)}</span> <strong className="text-slate-900 font-black text-sm">{appLanguage === 'km' ? '$1.00 (≈ 4,000 ៛)' : '$1.00 (≈ KHR 4,000)'}</strong> {translate('One-time purchase, watch forever.', appLanguage)}
                    </p>
                  </div>

                  {/* Buy Button */}
                  <div className="w-full pt-2 max-w-xs mx-auto">
                    <a
                      href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent(appLanguage === 'km' ? `សួស្តី Admin ខ្ញុំចង់ទិញទស្សនារឿង Movie: ${anime?.title} ($1.00) សម្រាប់ Username: ${user?.username || 'Guest'}` : `Hello Admin, I would like to buy this movie: ${anime?.title} ($1.00). Username: ${user?.username || 'Guest'}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm md:text-base flex items-center justify-center gap-2.5 shadow-xs hover:scale-105 active:scale-95 transition-all"
                    >
                      <Send className="w-5 h-5 stroke-[2.5]" /> {translate('Buy this movie on Telegram', appLanguage)} ($1.00)
                    </a>
                  </div>
                </div>
              </div>
            ) : isLocked ? (
              /* ─── VIP REQUIRED GATE ─── */
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-sm bg-white/95 border border-slate-200/90 flex items-center justify-center p-6 text-center">
                {anime?.poster_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-10 scale-110 pointer-events-none"
                    style={{ backgroundImage: `url(${anime.poster_url})` }}
                  />
                )}

                <div className="relative z-10 max-w-md mx-auto flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
                    <Crown className="w-8 h-8 stroke-[2.2] fill-amber-500" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                      <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" /> {translate('VIP members only', appLanguage)}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 tracking-tight leading-snug">
                      {anime?.title} ({translate('Episode', appLanguage)} {currentEp.episode_number})
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed px-2">
                      {appLanguage === 'km' ? 'វីដេអូនេះតម្រូវឱ្យមានសមាជិកភាព VIP ទើបអាចទស្សនាបាន។' : 'This video requires an active VIP membership to watch.'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-1 max-w-xs mx-auto">
                    <Link
                      to="/vip"
                      className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black shadow-xs transition-transform active:scale-95"
                    >
                      <Crown className="w-4 h-4 fill-slate-950" /> {translate('Upgrade VIP', appLanguage)}
                    </Link>
                    <a
                      href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent(appLanguage === 'km' ? `សួស្តី Admin ខ្ញុំចង់ដំឡើងសមាជិក VIP សម្រាប់គណនី: ${user?.username || 'ភ្ញៀវ'}` : `Hello Admin, I would like to upgrade this account to VIP: ${user?.username || 'Guest'}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{translate('Contact admin to upgrade VIP', appLanguage)}</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative sm:rounded-2xl overflow-hidden shadow-2xl bg-black border-y sm:border border-white/10">
                {offlineVideoUrl && (
                  <div className="absolute top-3 left-3 z-30 pointer-events-none">
                    <span className="bg-emerald-600 text-white text-[11px] font-bold py-1 px-2.5 rounded-full shadow-lg flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> {translate('Watch offline', appLanguage)}
                    </span>
                  </div>
                )}
                <VideoPlayer
                  src={offlineVideoUrl || currentEp.video_url || ''}
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


            {/* Episode Meta Bar */}
            <div className="mt-2.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-600 text-white">
                    {translate('Episode', appLanguage)} {currentEp.episode_number}
                  </span>
                  {offlineVideoUrl ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {translate('Downloaded', appLanguage)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {liveViewers} {translate('Viewers', appLanguage)}
                    </span>
                  )}
                </div>
                <h1 className="font-display font-bold text-sm sm:text-base md:text-lg text-slate-900 tracking-tight truncate">
                  {anime?.title} — {translate('Episode', appLanguage)} {currentEp.episode_number}
                </h1>
                {anime?.alt_title && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{anime.alt_title}</p>
                )}
              </div>

              {/* Prev / Next Controls */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  onClick={() => prevEp && goToEp(prevEp.episode_number)}
                  disabled={!prevEp}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> {translate('Previous', appLanguage)}
                </button>
                <button
                  onClick={() => nextEp && goToEp(nextEp.episode_number)}
                  disabled={!nextEp}
                  className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  {translate('Next', appLanguage)} <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {anime && (
                  <Link
                    to={`/donghua/${anime.slug}`}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
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
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {getDownloadProgress(anime?.id || currentEp.anime_id, currentEp.episode_number)?.status === 'downloading'
                        ? `${getDownloadProgress(anime?.id || currentEp.anime_id, currentEp.episode_number)?.progress || 0}%`
                        : translate('Download episode', appLanguage)}
                      {isPlusPlan && ` (${Math.max(0, 10 - downloads.length)})`}
                    </button>
                  ) : (
                    <Link to="/vip" className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />{translate('Upgrade to Plus', appLanguage)}
                    </Link>
                  )
                )}
              </div>
              {downloadNotice && <p role="status" className="mt-2 text-xs text-rose-500">{downloadNotice}</p>}
              {plusLimitReached && <p className="mt-2 text-xs text-amber-600">{translate('Plus download limit reached', appLanguage)}</p>}
            </div>

            {/* ── Interactive Episode Selector (រើសភាគបានតាមចិត្ត អាចដូរបាន) ── */}
            {episodes.length > 0 && (
              <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                {/* Header: Title, Count, Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shadow-xs">
                      <LayoutGrid className="w-4 h-4" />
                    </span>
                    <div>
                      <h2 className="font-display font-black text-sm sm:text-base text-slate-900">
                        {appLanguage === 'km' ? 'ជ្រើសរើសភាគទស្សនា' : 'Select Episode'}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {episodes.length} {appLanguage === 'km' ? 'ភាគសរុប' : 'Total Episodes'}
                      </p>
                    </div>
                  </div>

                  {/* Quick Filter / Search */}
                  {episodes.length > 12 && (
                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={epSearch}
                        onChange={(e) => setEpSearch(e.target.value)}
                        placeholder={appLanguage === 'km' ? 'ស្វែងរកភាគ...' : 'Search episode...'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Range Tabs (if > 25 episodes) */}
                {totalRanges > 1 && !epSearch && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3">
                    {Array.from({ length: totalRanges }).map((_, rIdx) => {
                      const start = rIdx * RANGE_SIZE + 1;
                      const end = Math.min((rIdx + 1) * RANGE_SIZE, episodes.length);
                      const isRangeActive = selectedRange === rIdx;
                      return (
                        <button
                          key={rIdx}
                          onClick={() => setSelectedRange(rIdx)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                            isRangeActive
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {start} - {end}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Episode Cards Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {displayedEpisodes.map((ep) => {
                    const isCurrent = ep.episode_number === currentEp.episode_number;
                    return (
                      <button
                        key={ep.id || ep.episode_number}
                        onClick={() => goToEp(ep.episode_number)}
                        className={`group relative p-2.5 rounded-xl text-center transition-all duration-150 cursor-pointer flex flex-col items-center justify-center min-h-[50px] ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/30'
                            : 'bg-slate-50 hover:bg-blue-50/60 text-slate-700 hover:text-blue-600 border border-slate-200/70 hover:border-blue-300'
                        }`}
                        title={`Episode ${ep.episode_number}`}
                      >
                        <span className="text-xs sm:text-sm font-bold">
                          {ep.episode_number}
                        </span>
                        {isCurrent ? (
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-100 flex items-center gap-0.5 mt-0.5">
                            <Play className="w-2.5 h-2.5 fill-white" /> {appLanguage === 'km' ? 'កំពុងមើល' : 'Now'}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 group-hover:text-blue-500 mt-0.5">
                            {appLanguage === 'km' ? 'ភាគ' : 'Ep'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
