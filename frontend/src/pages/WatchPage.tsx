import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Info, Users,
  Film, Download, Zap,
  Play, Search, LayoutGrid
} from 'lucide-react';
import { VideoPlayer } from '../components/player/VideoPlayer';
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
  const { user, isAuthenticated } = useAuthStore();
  void user;
  const { fetchDownloads, startDownload, isDownloaded, getDownloadProgress } = useDownloadStore();
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

  // Open access mode: every viewer watches immediately without VIP or purchase barriers
  void fetchDownloads;

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
          {/* Main Stream Area (Instant Open Playback) */}
          <div className="flex-1 min-w-0">
            <div className="relative sm:rounded-2xl overflow-hidden shadow-2xl bg-black border-y sm:border border-border-subtle">
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
                    disabled={isDownloaded(anime?.id || currentEp.anime_id, currentEp.episode_number) || getDownloadProgress(anime?.id || currentEp.anime_id, currentEp.episode_number)?.status === 'downloading'}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {getDownloadProgress(anime?.id || currentEp.anime_id, currentEp.episode_number)?.status === 'downloading'
                      ? `${getDownloadProgress(anime?.id || currentEp.anime_id, currentEp.episode_number)?.progress || 0}%`
                      : translate('Download episode', appLanguage)}
                  </button>
                )}
              </div>
              {downloadNotice && <p role="status" className="mt-2 text-xs text-rose-500">{downloadNotice}</p>}
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
