import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Play, Bookmark, Share2, MessageSquare, ArrowLeft,
  Star, Check, Sparkles, Crown, Film,
  Search, ArrowDownUp, Info, Send, ThumbsUp, ListPlus,
  LayoutGrid, List, X
} from 'lucide-react';
import { setTelegramMainButton, triggerHaptic } from '../utils/telegram';
import { SkeletonDetail } from '../components/common/SkeletonLoader';
import { StreamingAvailabilityHub } from '../components/common/StreamingAvailabilityHub';
import { TrailerModal } from '../components/common/TrailerModal';
import { isMoviePurchased } from '../services/paymentService';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { loadCatalog, extractAnimeDetail } from '../services/catalogService';
import type { Anime, Episode, Comment } from '../types';
import { usePlatform } from '../utils/platform';
import { translate, useLanguageStore } from '../store/languageStore';

type MyListStatus = 'NONE' | 'WATCHING' | 'PLAN_TO_WATCH' | 'COMPLETED' | 'FAVORITE';

export function DetailPage() {
  const appLanguage = useLanguageStore((state) => state.language);
  const { isTelegram, isMobileApp } = usePlatform();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, isOwner, setUser } = useAuthStore();
  const navigate = useNavigate();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [relatedAnime, setRelatedAnime] = useState<Anime[]>([]);
  const [isFav, setIsFav] = useState(false);
  const [myListStatus, setMyListStatus] = useState<MyListStatus>('NONE');
  const [showMyListDropdown, setShowMyListDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [movieUnlocked] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [claimingTrial, setClaimingTrial] = useState(false);
  const [trialError, setTrialError] = useState('');

  // 5-Star Rating State
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [ratingToast, setRatingToast] = useState<string | null>(null);

  // Comments State
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [newCommentText, setNewCommentText] = useState('');
  const [guestAuthorName, setGuestAuthorName] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<number[]>([]);

  // Episode controls
  const [epSortOrder, setEpSortOrder] = useState<'asc' | 'desc'>('asc');
  const [epSearch, setEpSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'episodes' | 'story' | 'comments' | 'related'>('episodes');
  const [selectedRange, setSelectedRange] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const RANGE_SIZE = 30;

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);

    // Hydrate from local data in the background while live detail requests run.
    let liveAnimeLoaded = false;
    const catalogPromise = loadCatalog().then((catalog) => {
      const detail = extractAnimeDetail(slug, catalog);
      if (detail && !liveAnimeLoaded) {
        setAnime(detail.anime);
        if (detail.episodes.length > 0) setEpisodes(detail.episodes);
        if (detail.related.length > 0) setRelatedAnime(detail.related);
        setIsLoading(false);
      }
      return detail;
    }).catch(() => null);

    try {
      const decodedSlug = decodeURIComponent(slug).trim();
      // The episode route accepts the same slug, so fetch it alongside anime
      // detail instead of waiting for the first request to finish.
      const episodesPromise = api.get(`/anime/${encodeURIComponent(decodedSlug)}/episodes`)
        .then((response) => Array.isArray(response.data) ? response.data as Episode[] : [])
        .catch(() => [] as Episode[]);
      let animeData: Anime | null = null;

      try {
        const animeRes = await api.get(`/anime/${decodedSlug}`);
        animeData = animeRes.data as Anime;
      } catch {
        if (decodedSlug !== slug) {
          try {
            const retryRes = await api.get(`/anime/${slug}`);
            animeData = retryRes.data as Anime;
          } catch {}
        }
      }

      if (!animeData) {
        const allRes = await api.get('/anime?per_page=100').catch(() => ({ data: { items: [] } }));
        const matched = (allRes.data?.items || []).find((a: Anime) =>
          a.slug === slug ||
          a.slug === decodedSlug ||
          a.title?.trim() === decodedSlug ||
          a.title?.trim() === slug
        );
        if (matched) animeData = matched;
      }

      if (animeData) {
        liveAnimeLoaded = true;
        setAnime(animeData);
        const relatedPromise = api.get('/anime?per_page=6&sort=popular')
          .then((response) => response.data?.items?.filter((a: Anime) => a.id !== animeData!.id).slice(0, 5) || [])
          .catch(() => [] as Anime[]);

        // Load saved rating from localStorage or backend
        try {
          const savedRatings = JSON.parse(localStorage.getItem('animekh_user_ratings') || '{}');
          if (savedRatings[animeData.id]) {
            setUserRating(savedRatings[animeData.id]);
          }
        } catch {}

        if (isAuthenticated) {
          api.get(`/anime/${animeData.id}/my-rating`).then((r) => {
            if (r.data?.score) {
              setUserRating(Math.round(r.data.score / 2));
            }
          }).catch(() => {});

          api.get('/favorites').then((r) => {
            const found = r.data.some((a: Anime) => a.id === animeData!.id);
            setIsFav(found);
            if (found) setMyListStatus('FAVORITE');
          }).catch(() => {});
        }

        // Load My List status from localStorage
        try {
          const myLists = JSON.parse(localStorage.getItem('animekh_my_list') || '{}');
          if (myLists[animeData.id]) {
            setMyListStatus(myLists[animeData.id]);
          }
        } catch {}

        let epsData = await episodesPromise;
        if (epsData.length === 0 && animeData.slug && animeData.slug !== decodedSlug) {
          epsData = await api.get(`/anime/${encodeURIComponent(animeData.slug)}/episodes`)
            .then((response) => Array.isArray(response.data) ? response.data as Episode[] : [])
            .catch(() => [] as Episode[]);
        }
        if (epsData.length > 0) {
          setEpisodes(epsData);
        } else {
          // Keep a populated local catalog visible if the live API is cold or
          // temporarily returns an empty response.
          const localDetail = await catalogPromise;
          if (localDetail?.anime.slug === animeData.slug && localDetail.episodes.length > 0) {
            setEpisodes(localDetail.episodes);
          }
        }

        setRelatedAnime(await relatedPromise);

        // Fetch comments
        fetchComments(animeData.id);
      }
    } catch {
      // Error handled by state
    } finally {
      setIsLoading(false);
    }
  }, [slug, isAuthenticated]);

  const fetchComments = async (animeId: number) => {
    try {
      const res = await api.get(`/anime/${animeId}/comments`);
      if (res.data) {
        const apiComments = res.data.items || [];
        // Combine with any local guest comments
        const localComments: Comment[] = JSON.parse(localStorage.getItem(`animekh_comments_${animeId}`) || '[]');
        const combined = [...localComments, ...apiComments];
        setComments(combined);
        setCommentsCount(res.data.total || combined.length);
      }
    } catch {
      // Load fallback local comments
      const localComments: Comment[] = JSON.parse(localStorage.getItem(`animekh_comments_${animeId}`) || '[]');
      setComments(localComments);
      setCommentsCount(localComments.length);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle User Star Rating
  const handleRate = async (star: number) => {
    if (!anime) return;
    setUserRating(star);

    // Save in LocalStorage immediately
    try {
      const savedRatings = JSON.parse(localStorage.getItem('animekh_user_ratings') || '{}');
      savedRatings[anime.id] = star;
      localStorage.setItem('animekh_user_ratings', JSON.stringify(savedRatings));
    } catch {}

    setRatingToast(`អ្នកបានដាក់ពិន្ទុ ${star} ផ្កាយ! អរគុណច្រើន!`);
    setTimeout(() => setRatingToast(null), 3000);

    // Send 10-scale score to backend
    if (isAuthenticated) {
      try {
        await api.post(`/anime/${anime.id}/rate`, { score: star * 2 });
      } catch {}
    }
  };

  // Handle My List Category
  const handleSetMyList = async (status: MyListStatus) => {
    if (!anime) return;
    setMyListStatus(status);
    setShowMyListDropdown(false);

    try {
      const myLists = JSON.parse(localStorage.getItem('animekh_my_list') || '{}');
      if (status === 'NONE') {
        delete myLists[anime.id];
      } else {
        myLists[anime.id] = status;
      }
      localStorage.setItem('animekh_my_list', JSON.stringify(myLists));
    } catch {}

    if (status === 'FAVORITE' || status === 'WATCHING') {
      setIsFav(true);
      if (isAuthenticated) {
        api.post(`/favorites/${anime.id}`).catch(() => {});
      }
    } else if (status === 'NONE') {
      setIsFav(false);
      if (isAuthenticated) {
        api.delete(`/favorites/${anime.id}`).catch(() => {});
      }
    }
  };

  const toggleFavorite = async () => {
    if (!anime) return;
    if (isFav) {
      handleSetMyList('NONE');
    } else {
      handleSetMyList('FAVORITE');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anime || !newCommentText.trim()) return;

    setIsSubmittingComment(true);
    const authorName = user?.username || guestAuthorName.trim() || 'អ្នកទស្សនា (Guest)';

    const newCommentObj: Comment = {
      id: Date.now(),
      anime_id: anime.id,
      user_id: user?.id || 0,
      content: newCommentText.trim(),
      likes_count: 0,
      is_reported: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      user: {
        id: user?.id || 0,
        username: authorName,
        avatar_url: user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorName}`,
      },
      replies: [],
    };

    // Save in LocalStorage immediately
    try {
      const localComments: Comment[] = JSON.parse(localStorage.getItem(`animekh_comments_${anime.id}`) || '[]');
      localComments.unshift(newCommentObj);
      localStorage.setItem(`animekh_comments_${anime.id}`, JSON.stringify(localComments));
      setComments((prev) => [newCommentObj, ...prev]);
      setCommentsCount((prev) => prev + 1);
    } catch {}

    // If authenticated, sync with backend
    if (isAuthenticated) {
      try {
        await api.post(`/anime/${anime.id}/comments`, {
          content: newCommentText.trim(),
        });
      } catch {}
    }

    setNewCommentText('');
    setIsSubmittingComment(false);
  };

  const handleLikeComment = async (commentId: number) => {
    if (likedCommentIds.includes(commentId)) return;
    setLikedCommentIds((prev) => [...prev, commentId]);

    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c))
    );

    if (isAuthenticated) {
      try {
        await api.post(`/comments/${commentId}/like`);
      } catch {}
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

  const claimFreeTrial = async () => {
    if (!anime || anime.type === 'MOVIE') return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setClaimingTrial(true);
    setTrialError('');
    try {
      const response = await api.post('/auth/claim-trial', { anime_id: anime.id });
      setUser(response.data);
    } catch (error: any) {
      setTrialError(error?.response?.data?.detail || 'Could not claim the free trial. Please try again.');
    } finally {
      setClaimingTrial(false);
    }
  };

  // Filter & sort episodes (must be before early returns to satisfy React rules of hooks)
  const filteredEpisodes = useMemo(() => {
    return episodes
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
  }, [episodes, epSearch, epSortOrder]);

  const firstEpNum = episodes.length > 0
    ? Math.min(...episodes.map((e) => e.episode_number))
    : 1;

  const latestEpNum = episodes.length > 0
    ? Math.max(...episodes.map((e) => e.episode_number))
    : 1;

  useEffect(() => {
    if (!isTelegram || !anime || episodes.length === 0) return;
    const buttonLabel = appLanguage === 'km' ? 'មើលឥឡូវនេះ' : 'Watch now';
    return setTelegramMainButton(buttonLabel, () => navigate(`/watch/${anime.slug}/${firstEpNum}`));
  }, [isTelegram, anime?.slug, episodes.length, firstEpNum, appLanguage, navigate]);

  const totalEpisodesCount = filteredEpisodes.length;
  const rangeChunks = useMemo(() => {
    if (totalEpisodesCount <= RANGE_SIZE) return [];
    const chunks: { start: number; end: number; label: string }[] = [];
    for (let i = 0; i < totalEpisodesCount; i += RANGE_SIZE) {
      const start = i + 1;
      const end = Math.min(i + RANGE_SIZE, totalEpisodesCount);
      chunks.push({ start, end, label: `ភាគ ${start} - ${end}` });
    }
    return chunks;
  }, [totalEpisodesCount]);

  const displayedEpisodes = useMemo(() => {
    if (rangeChunks.length === 0 || epSearch.trim()) return filteredEpisodes;
    const startIdx = selectedRange * RANGE_SIZE;
    return filteredEpisodes.slice(startIdx, startIdx + RANGE_SIZE);
  }, [filteredEpisodes, rangeChunks, selectedRange, epSearch]);

  const isAdministrator = isAdmin || isOwner || user?.role === 'ADMIN' || user?.role === 'OWNER';
  const hasSeriesTrial = !!user && user.trial_anime_id === anime?.id && !!user.trial_expires_at && new Date(user.trial_expires_at).getTime() > Date.now();
  const userUnlockedMovies = user?.unlocked_movies || [];
  const hasMovieAccess = isAdministrator || movieUnlocked || (anime?.slug ? (isMoviePurchased(anime.slug) || userUnlockedMovies.includes(anime.slug)) : false);

  if (isLoading) return <SkeletonDetail />;
  if (!anime) {
    return (
      <div className="min-h-screen bg-slate-50/60 text-slate-900 pt-28 pb-16 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
          <Film className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 font-display">រកមិនឃើញរឿងនេះឡើយ</h2>
        <p className="text-slate-500 text-sm max-w-md mb-6">
          រឿងដែលលោកអ្នកកំពុងស្វែងរកប្រហែលជាត្រូវបានផ្លាស់ប្តូរតំណភ្ជាប់ ឬមិនទាន់បានដាក់បញ្ចូល។
        </p>
        <Link to="/search" className="py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-sm">
          ស្វែងរករឿងផ្សេងៗ
        </Link>
      </div>
    );
  }

  return (
    <main className={`mini-detail ${!isTelegram && !isMobileApp ? 'website-detail' : ''} min-h-screen pb-24 md:pb-16 bg-slate-50/50 text-slate-900 selection:bg-blue-600 selection:text-white ${isTelegram || isMobileApp ? 'is-mini-app' : ''}`}>
      {/* ── 1. iOS 27 Liquid Glass White Hero Banner ── */}
      <div className="detail-hero relative w-full overflow-hidden bg-white border-b border-slate-200/80">
        {/* Soft Daylight Backdrop Image */}
        <div className="detail-hero-art relative aspect-[16/10] sm:aspect-[21/9] md:h-[360px] w-full overflow-hidden bg-slate-100">
          <img
            src={anime.banner_url || anime.poster_url}
            alt=""
            className="w-full h-full object-cover object-top sm:object-center opacity-30 blur-md scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/25" />

          <Link
            to={`/watch/${anime.slug}/${firstEpNum}`}
            aria-label="Play"
            className="detail-center-play"
          >
            <Play className="w-8 h-8 fill-current" />
          </Link>

          {/* Floating Top App Action Bar */}
          <div className="detail-top-controls absolute top-3 inset-x-3 sm:inset-x-6 flex items-center justify-between z-30 pt-[max(0rem,env(safe-area-inset-top))]">
            <button
              onClick={() => {
                triggerHaptic('light');
                navigate(-1);
              }}
              aria-label="Go back"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 hover:bg-white backdrop-blur-xl text-slate-800 text-xs font-bold border border-slate-200/90 transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-blue-600" />
              <span>ត្រឡប់</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  toggleFavorite();
                }}
                className={`w-9 h-9 rounded-full border flex items-center justify-center backdrop-blur-xl transition-all active:scale-90 shadow-xs cursor-pointer ${
                  isFav
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white/90 hover:bg-white border-slate-200/90 text-slate-700'
                }`}
                title="Bookmark"
              >
                <Bookmark className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  share();
                }}
                className="w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-slate-200/90 text-slate-700 flex items-center justify-center backdrop-blur-xl transition-all active:scale-90 shadow-xs cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content Card & Metadata Section ── */}
        <div className="detail-hero-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-24 sm:-mt-28 pb-6">
          <div className="flex flex-row items-end gap-4 sm:gap-6">
            {/* Poster Card */}
            <div className="detail-poster w-28 sm:w-40 md:w-48 shrink-0">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_14px_34px_rgba(15,23,42,0.14)] border-2 border-white bg-slate-100">
                <img
                  src={anime.poster_url || anime.banner_url}
                  alt={anime.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between pointer-events-none">
                  <span className="px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-[9px] font-black text-blue-600 border border-slate-200/80 shadow-2xs">
                    4K UHD
                  </span>
                </div>
              </div>
            </div>

            {/* Title & Key Meta on the Right */}
            <div className="detail-meta flex-1 min-w-0 pb-1 space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-200/80 text-blue-700">
                  {anime.type === 'ANIME' ? 'Anime ជប៉ុន' : anime.type === 'MOVIE' ? 'ភាពយន្តដុំ' : 'Donghua 3D'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> {(anime.average_rating || 9.8).toFixed(1)}
                </span>
              </div>

              <h1 className="font-display font-black text-lg sm:text-2xl md:text-3xl text-slate-900 tracking-tight leading-tight line-clamp-2">
                {anime.title}
              </h1>

              {anime.alt_title && (
                <p className="text-xs text-slate-500 line-clamp-1">
                  {anime.alt_title}
                </p>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium flex-wrap pt-0.5">
                <span>{anime.year || 2024}</span>
                <span>•</span>
                <span>{anime.episode_count || episodes.length} ភាគ</span>
                <span>•</span>
                <span className="text-blue-600 font-bold">សំឡេងខ្មែរ</span>
              </div>
            </div>
          </div>

          {/* ── Primary Action Buttons Bar ── */}
          <div className="detail-actions mt-5 pt-4 border-t border-slate-200/70 space-y-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {anime.type === 'MOVIE' && !hasMovieAccess ? (
                <a
                  href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent(`សួស្តី Admin ខ្ញុំចង់ទិញទស្សនារឿង Movie: ${anime.title} ($1.00) សម្រាប់ Username: ${user?.username || 'Guest'}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" /> ទិញទស្សនា Movie ($1.00) តាម Telegram
                </a>
              ) : (
                <Link
                  to={`/watch/${anime.slug}/${firstEpNum}`}
                  onClick={() => triggerHaptic('medium')}
                  className="flex-1 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 active:scale-95 transition-all select-none"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {anime.type === 'MOVIE'
                      ? (isAdministrator ? 'ចាក់ទស្សនា (Admin Access)' : 'ចាក់ទស្សនា Movie')
                      : 'ចាក់ទស្សនា ភាគ 1'}
                  </span>
                </Link>
              )}

              {latestEpNum > 1 && (
                <Link
                  to={`/watch/${anime.slug}/${latestEpNum}`}
                  onClick={() => triggerHaptic('light')}
                  className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition active:scale-95 select-none shrink-0"
                  title={`ភាគចុងក្រោយ (ភាគ ${latestEpNum})`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>ភាគ {latestEpNum}</span>
                </Link>
              )}
            </div>

            {/* Quick Action Icon Pills Row */}
            <div className="detail-quick-actions flex items-center justify-between sm:justify-start gap-2 pt-0.5 text-xs">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowMyListDropdown(!showMyListDropdown);
                }}
                className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all active:scale-95 cursor-pointer relative ${
                  myListStatus !== 'NONE'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {myListStatus === 'WATCHING' ? 'កំពុងមើល' :
                   myListStatus === 'PLAN_TO_WATCH' ? 'គ្រោងមើល' :
                   myListStatus === 'COMPLETED' ? 'ចប់' :
                   myListStatus === 'FAVORITE' ? 'រក្សាទុក' : '+ បញ្ជីខ្ញុំ'}
                </span>

                {showMyListDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 z-50 animate-scale-in text-left">
                    {[
                      { status: 'WATCHING' as MyListStatus, label: 'កំពុងមើល · Follow updates' },
                      { status: 'PLAN_TO_WATCH' as MyListStatus, label: 'គ្រោងមើល (Plan)' },
                      { status: 'COMPLETED' as MyListStatus, label: 'មើលចប់ (Completed)' },
                      { status: 'FAVORITE' as MyListStatus, label: 'ចូលចិត្ត · Follow updates' },
                      { status: 'NONE' as MyListStatus, label: 'ដកចេញពីបញ្ជី' },
                    ].map((item) => (
                      <button
                        key={item.status}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetMyList(item.status);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          myListStatus === item.status
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{item.label}</span>
                        {myListStatus === item.status && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowTrailerModal(true);
                }}
                className="flex-1 sm:flex-initial py-2 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 flex items-center justify-center gap-1.5 font-semibold transition active:scale-95 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 text-blue-600" />
                <span>ឈុតខ្លី</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowRatingModal(true);
                }}
                className="flex-1 sm:flex-initial py-2 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 flex items-center justify-center gap-1.5 font-semibold transition active:scale-95 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>{userRating > 0 ? `${userRating}/5` : 'ដាក់ពិន្ទុ'}</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('comments');
                }}
                className="flex-1 sm:flex-initial py-2 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/90 flex items-center justify-center gap-1.5 font-semibold transition active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>{commentsCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Tab Navigation & Content Section ── */}
      <div className="detail-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        <section className="bg-white rounded-3xl border border-slate-200/85 p-5 sm:p-6 shadow-xs space-y-3" aria-label="Story summary">
          <div className="flex flex-wrap gap-1.5">
            {(anime.genres || []).slice(0, 4).map((genre) => (
              <span key={genre.id} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/80">
                {genre.name}
              </span>
            ))}
            {anime.year && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200/80">
                {anime.year}
              </span>
            )}
          </div>
          <h2 className="text-sm font-bold text-slate-900">រឿងសង្ខេប</h2>
          <p className={`text-xs sm:text-sm text-slate-600 leading-relaxed ${showFullDescription ? '' : 'line-clamp-3'}`}>
            {anime.description || 'មិនមានការពិពណ៌នាសាច់រឿងលម្អិតនៅឡើយទេ។'}
          </p>
          {(anime.description?.length || 0) > 150 && (
            <button
              type="button"
              onClick={() => setShowFullDescription((value) => !value)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {showFullDescription ? 'បង្រួម' : 'អានបន្ថែម'}
            </button>
          )}
        </section>
        {anime.type !== 'MOVIE' && user?.role !== 'ADMIN' && user?.role !== 'OWNER' && user?.role !== 'STAFF' && !user?.is_vip_active && (
          <section className="flex flex-col gap-3 rounded-3xl border border-blue-200/80 bg-blue-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">សាកល្បងមើលដោយឥតគិតថ្លៃ 1 ថ្ងៃសម្រាប់រឿងនេះ</h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">បើកសិទ្ធិមើលគ្រប់ភាគនៃរឿងនេះរយៈពេល 24 ម៉ោង។</p>
              {trialError && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{trialError}</p>}
            </div>
            {user?.trial_anime_id === anime.id && user.trial_expires_at && new Date(user.trial_expires_at).getTime() > Date.now() ? (
              <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-700">កំពុងបើកសាកល្បងឥតគិតថ្លៃ</span>
            ) : user?.trial_claimed_at ? (
              <span className="rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs sm:text-sm text-slate-500">បានប្រើសិទ្ធិសាកល្បងរួចហើយ</span>
            ) : user?.is_vip_active ? null : (
              <button onClick={claimFreeTrial} disabled={claimingTrial} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60 cursor-pointer shadow-xs">
                {claimingTrial ? 'កំពុងដំណើរការ…' : 'បើកមើលសាកល្បង 1 ថ្ងៃ'}
              </button>
            )}
          </section>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('episodes')}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'episodes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Film className="w-4 h-4" /> បញ្ជីភាគ ({episodes.length})
          </button>

          <button
            onClick={() => setActiveTab('story')}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'story'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Info className="w-4 h-4" /> ដំណើររឿងសង្ខេប & ព័ត៌មាន
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'comments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> មតិយោបល់ ({commentsCount})
          </button>

          {relatedAnime.length > 0 && (
            <button
              onClick={() => setActiveTab('related')}
              className={`px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'related'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4" /> រឿងស្រដៀងគ្នា ({relatedAnime.length})
            </button>
          )}
        </div>

        {/* ── TAB 1: EPISODES CONTENT ── */}
        {activeTab === 'episodes' && (
          <div className="space-y-4">
            {/* Episode Toolbar (Search + Range Selector + Sort + View Mode) */}
            <div className="detail-episode-toolbar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              {/* Left: Search input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={epSearch}
                  onChange={(e) => setEpSearch(e.target.value)}
                  placeholder="ស្វែងរកលេខភាគ (ឧ. 1, 12, 105)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Right: Sort Order & View Mode Toggles */}
              <div className="flex items-center gap-2 justify-end flex-wrap">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setEpSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Toggle episode order"
                >
                  <ArrowDownUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>{epSortOrder === 'asc' ? 'ភាគ 1 -> ចុងក្រោយ' : 'ភាគចុងក្រោយ -> 1'}</span>
                </button>

                {/* View Mode Toggle (Grid / List) */}
                <div className="detail-view-toggle flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setViewMode('grid');
                    }}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setViewMode('list');
                    }}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Range Selector Chips (Crunchyroll / Bilibili Style when > 30 episodes) */}
            {rangeChunks.length > 0 && !epSearch.trim() && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {rangeChunks.map((chunk, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedRange(idx);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                      selectedRange === idx
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {chunk.label}
                  </button>
                ))}
              </div>
            )}

            {/* Episodes List Display */}
            {displayedEpisodes.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200/80 rounded-3xl space-y-2">
                <Film className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-slate-700 text-sm font-semibold">រកមិនឃើញភាគដែលស្វែងរកឡើយ</p>
                <p className="text-slate-500 text-xs">សូមសាកល្បងស្វែងរកលេខភាគផ្សេងទៀត។</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Sleek Compact Number Grid (5 per row on mobile, up to 10 on desktop) */
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-2.5">
                {displayedEpisodes.map((ep) => {
                  const episodeThumb = ep.thumbnail_url && ep.thumbnail_url !== anime.poster_url && ep.thumbnail_url !== anime.banner_url ? ep.thumbnail_url : undefined;
                  const isEpVip = !hasSeriesTrial && (ep.is_vip === true || (ep as any).is_vip_only === true || (ep.is_free !== null && ep.is_free !== undefined && ep.is_free === false));

                  return (
                    <Link
                      key={ep.id}
                      to={`/watch/${anime.slug}/${ep.episode_number}`}
                      onClick={() => triggerHaptic('light')}
                      className="group relative aspect-square overflow-hidden flex flex-col items-center justify-center rounded-xl bg-white hover:bg-blue-50 border border-slate-200/80 hover:border-blue-400 text-slate-900 transition-all duration-200 shadow-xs hover:shadow-sm active:scale-95 cursor-pointer select-none"
                    >
                      {episodeThumb && <img src={episodeThumb} alt={`${translate('Episode', appLanguage)} ${ep.episode_number}`} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full rounded-xl object-cover" />}
                      {episodeThumb && <span aria-hidden="true" className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/75 via-black/15 to-black/10" />}
                      {/* VIP Crown Indicator */}
                      {isEpVip && (
                        <div className="absolute top-1 right-1 z-10 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center shadow-xs">
                          <Crown className="w-2 h-2 text-slate-900 fill-slate-900" />
                        </div>
                      )}

                      <span className={`relative z-10 font-display font-black text-sm sm:text-base group-hover:text-blue-600 transition-colors ${episodeThumb ? 'rounded-md bg-black/60 px-2 py-1 text-white' : 'text-slate-900'}`}>
                        {ep.episode_number}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* List Mode with Episode Name & Quick Play */
              <div className="detail-episode-list space-y-2">
                {displayedEpisodes.map((ep) => {
                  const episodeThumb = ep.thumbnail_url && ep.thumbnail_url !== anime.poster_url && ep.thumbnail_url !== anime.banner_url ? ep.thumbnail_url : undefined;
                  const isEpVip = !hasSeriesTrial && (ep.is_vip === true || (ep as any).is_vip_only === true || (ep.is_free !== null && ep.is_free !== undefined && ep.is_free === false));

                  return (
                    <Link
                      key={ep.id}
                      to={`/watch/${anime.slug}/${ep.episode_number}`}
                      onClick={() => triggerHaptic('light')}
                      className="group flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all duration-200 shadow-xs active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {episodeThumb ? <img src={episodeThumb} alt={`${translate('Episode', appLanguage)} ${ep.episode_number}`} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="h-[58px] w-[102px] sm:h-16 sm:w-28 shrink-0 rounded-lg border border-slate-200 bg-slate-900 object-cover" /> : <div className="h-[58px] w-[102px] sm:h-16 sm:w-28 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-black text-sm text-slate-800 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors shrink-0">
                          {ep.episode_number}
                        </div>}
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {ep.title || `ភាគទី ${ep.episode_number}`}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {anime.title} • {ep.duration_seconds ? `${Math.floor(ep.duration_seconds / 60)} នាទី` : 'សំឡេងខ្មែរ'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isEpVip ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> VIP
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            ឥតគិតថ្លៃ
                          </span>
                        )}
                        <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
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
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-display font-black text-xl text-slate-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" /> សាច់រឿងសង្ខេប
                </h3>
                <p className="text-sm md:text-base text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                  {anime.description || 'មិនមានការពិពណ៌នាសាច់រឿងលម្អិតឡើយ។'}
                </p>
              </div>

              <StreamingAvailabilityHub
                animeTitle={anime.title}
                merDonghuaUrl={`/watch/${anime.slug}/1`}
              />
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 text-xs">
              <h4 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
                ព័ត៌មានលម្អិតអំពីរឿង
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ឈ្មោះដើម៖</span>
                  <span className="text-slate-900 font-bold">{anime.alt_title || anime.title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ប្រភេទ៖</span>
                  <span className="text-blue-600 font-bold">{anime.type === 'ANIME' ? 'រឿងជប៉ុន' : anime.type === 'MOVIE' ? 'ភាពយន្តដុំ' : anime.type === 'DRAMA' ? 'រឿងភាគ' : 'រឿងចិន 3D'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ស្ថានភាព៖</span>
                  <span className="text-emerald-600 font-bold">{anime.status === 'COMPLETED' ? 'ចប់សព្វគ្រប់' : 'កំពុងចាក់ផ្សាយ'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ស្ទូឌីយោ៖</span>
                  <span className="text-slate-900 font-bold">{anime.studio || 'NINT Studio Animation'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ឆ្នាំផលិត៖</span>
                  <span className="text-slate-900 font-bold">{anime.year || 2024}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ចំនួនភាគ៖</span>
                  <span className="text-slate-900 font-bold">{anime.episode_count || episodes.length} ភាគ</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">កម្រិតច្បាស់៖</span>
                  <span className="text-blue-600 font-bold">4K Ultra HD • 60 FPS</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: COMMENTS & REVIEWS ── */}
        {activeTab === 'comments' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Post a Comment Form */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" /> បញ្ចេញមតិយោបល់របស់អ្នក
              </h3>
              <form onSubmit={handlePostComment} className="space-y-3">
                {!isAuthenticated && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      ឈ្មោះរបស់អ្នក (Display Name)
                    </label>
                    <input
                      type="text"
                      value={guestAuthorName}
                      onChange={(e) => setGuestAuthorName(e.target.value)}
                      placeholder="ឧ. សុខា, វិចិត្រ..."
                      className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="ចែករំលែកមតិរបស់អ្នកអំពីសាច់រឿង តួអង្គ ឬគុណភាពវីដេអូនៅទីនេះ..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors resize-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-500">
                    សូមបញ្ចេញមតិប្រកបដោយសុជីវធម៌ និងការគោរពគ្នាទៅវិញទៅមក។
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingComment ? 'កំពុងផ្ញើ...' : 'ផ្ញើមតិ'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-slate-700 text-sm font-semibold">មិនទាន់មានមតិយោបល់នៅឡើយទេ</p>
                  <p className="text-slate-500 text-xs">ក្លាយជាអ្នកដំបូងគេដែលបញ្ចេញមតិលើរឿងនេះ!</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3.5"
                  >
                    <img
                      src={c.user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.user?.username || 'user'}`}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover bg-slate-100 border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {c.user?.username || 'អ្នកទស្សនា'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.created_at).toLocaleDateString('km-KH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleLikeComment(c.id)}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                            likedCommentIds.includes(c.id)
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${likedCommentIds.includes(c.id) ? 'fill-current' : ''}`} />
                          <span>{c.likes_count || 0}</span>
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: RELATED RECOMMENDATIONS CONTENT ── */}
        {activeTab === 'related' && (
          <div className="space-y-4">
            <h3 className="font-display font-black text-xl text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" /> រឿងដែលអ្នកអាចនឹងចូលចិត្ត
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {relatedAnime.map((item) => (
                <Link
                  key={item.id}
                  to={`/anime/${item.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-200/80 hover:border-blue-400 transition-all duration-300 shadow-xs hover:shadow-md"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
                    <img
                      src={item.poster_url || item.banner_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-amber-400" /> {(item.average_rating || 9.6).toFixed(1)}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-display font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.episode_count || 'Multi'} ភាគ</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Feedback Modal ── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-[28px] p-6 space-y-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)] animate-scale-in">
            <h3 className="font-display font-bold text-lg text-slate-900">មតិកែលម្អ ឬរាយការណ៍បញ្ហា</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
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
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
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

      {/* ── Interactive Rating Modal ── */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-200/90 rounded-[28px] p-6 space-y-5 shadow-[0_24px_60px_rgba(15,23,42,0.16)] text-center animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-black text-base text-slate-900">ដាក់ពិន្ទុរឿងនេះ</h3>
              <button
                onClick={() => setShowRatingModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">តើអ្នកយល់យ៉ាងណាដែរចំពោះរឿងនេះ?</p>
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      triggerHaptic('medium');
                      handleRate(star);
                      setShowRatingModal(false);
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                    title={`ដាក់ពិន្ទុ ${star} ផ្កាយ`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        (hoverRating || userRating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 hover:text-slate-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-amber-600 h-4">
                {(hoverRating || userRating) === 5 ? 'ល្អឥតខ្ចោះ (5/5)' :
                 (hoverRating || userRating) === 4 ? 'ល្អណាស់ (4/5)' :
                 (hoverRating || userRating) === 3 ? 'មធ្យម (3/5)' :
                 (hoverRating || userRating) === 2 ? 'ធម្មតា (2/5)' :
                 (hoverRating || userRating) === 1 ? 'មិនសូវល្អ (1/5)' : 'សូមចុចផ្កាយដើម្បីដាក់ពិន្ទុ'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Rating Toast */}
      {ratingToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-emerald-500 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" /> {ratingToast}
        </div>
      )}

      {/* Interactive Trailer Modal */}
      <TrailerModal
        anime={anime}
        isOpen={showTrailerModal}
        onClose={() => setShowTrailerModal(false)}
      />

      {(isTelegram || isMobileApp) && (
        <Link to={`/watch/${anime.slug}/${firstEpNum}`} className="detail-bottom-play">
          <Play className="w-5 h-5 fill-current" />
          <span>ចាប់ផ្តើមមើល</span>
        </Link>
      )}
    </main>
  );
}
