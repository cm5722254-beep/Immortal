import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Subtitles,
  ChevronLeft, ChevronRight, AlertCircle,
  Moon, Sun, FastForward, Check, ShieldAlert,
  Smartphone, RotateCw, Scan, ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePlatform } from '../../utils/platform';
import { parseYouTubeVideoId, getYouTubeEmbedUrl, isFacebookUrl, getFacebookEmbedUrl } from '../../utils/youtube';

interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  subtitleUrl?: string;
  subtitleTracks?: Array<{ src: string; lang: string; label: string }>;
  qualitySources?: Array<{ src: string; label: string }>;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  resumeAt?: number;
  title?: string;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  autoNext?: boolean;
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const EMPTY_SUBTITLE_TRACKS: Array<{ src: string; lang: string; label: string }> = [];
const EMPTY_QUALITY_SOURCES: Array<{ src: string; label: string }> = [];

export function VideoPlayer({
  src,
  autoPlay = false,
  subtitleUrl,
  subtitleTracks = EMPTY_SUBTITLE_TRACKS,
  qualitySources = EMPTY_QUALITY_SOURCES,
  onProgress,
  onEnded,
  resumeAt = 0,
  title,
  onPrevEpisode,
  onNextEpisode,
  hasPrev,
  hasNext,
  autoNext = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressReportRef = useRef<number | undefined>(undefined);
  const hideControlsTimer = useRef<number | undefined>(undefined);

  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [scaleMode, setScaleMode] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [isRotatedLandscape, setIsRotatedLandscape] = useState(false);
  const [screenOrientation, setScreenOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const hudTimerRef = useRef<any>(null);

  const showHud = (msg: string) => {
    setHudMessage(msg);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      setHudMessage(null);
    }, 1800);
  };
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState(() => {
    try { return localStorage.getItem('nami_playback_quality') || 'Auto'; } catch { return 'Auto'; }
  });
  const [qualityOptions, setQualityOptions] = useState<Array<{ label: string; level: number; height: number; src?: string }>>([]);
  const [showSettings, setShowSettings] = useState(false);
  const showSettingsRef = useRef(showSettings);
  useEffect(() => {
    showSettingsRef.current = showSettings;
  }, [showSettings]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);

  const { user } = useAuthStore();
  const { isTelegram } = usePlatform();
  const [cinemaMode, setCinemaMode] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [isIframeEmbed, setIsIframeEmbed] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [isFacebookVideo, setIsFacebookVideo] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const pendingQualitySwitchRef = useRef<{ time: number; wasPlaying: boolean; label: string } | null>(null);
  const [triedProxy, setTriedProxy] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(() => {
    try { return localStorage.getItem('nami_subtitles_enabled') !== 'false'; } catch { return true; }
  });
  const availableSubtitleTracks = subtitleTracks.length ? subtitleTracks : (subtitleUrl ? [{ src: subtitleUrl, lang: 'und', label: 'Subtitles' }] : []);
  const [selectedSubtitle, setSelectedSubtitle] = useState(() => {
    try { return localStorage.getItem('nami_subtitle_track') || ((subtitleTracks.length || subtitleUrl) ? '0' : 'off'); } catch { return (subtitleTracks.length || subtitleUrl) ? '0' : 'off'; }
  });
  const handleQualitySelect = (option: { label: string; level: number; src?: string }) => {
    if (option.src) {
      if (option.src === currentSrc) {
        setQuality(option.label);
        return;
      }
      pendingQualitySwitchRef.current = {
        time: videoRef.current?.currentTime || 0,
        wasPlaying: !!videoRef.current && !videoRef.current.paused,
        label: option.label,
      };
      setCurrentSrc(option.src);
      setQuality(option.label);
      return;
    }
    if (hlsRef.current) hlsRef.current.currentLevel = option.level;
    setQuality(option.label);
    try { localStorage.setItem('nami_playback_quality', option.label); } catch {}
  };
  useEffect(() => {
    if (selectedSubtitle !== 'off' && Number(selectedSubtitle) >= availableSubtitleTracks.length) {
      const next = availableSubtitleTracks.length ? '0' : 'off';
      setSelectedSubtitle(next);
      setSubtitlesEnabled(next !== 'off');
      try { localStorage.setItem('nami_subtitle_track', next); } catch {}
    }
  }, [availableSubtitleTracks.length, selectedSubtitle]);
  const toggleSubtitles = () => {
    const next = !subtitlesEnabled;
    setSubtitlesEnabled(next);
    if (next && selectedSubtitle === 'off' && availableSubtitleTracks.length) {
      setSelectedSubtitle('0');
      try { localStorage.setItem('nami_subtitle_track', '0'); } catch {}
    }
    try { localStorage.setItem('nami_subtitles_enabled', String(next)); } catch {}
    showHud(`Subtitles ${next ? 'on' : 'off'}`);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const syncSubtitleTracks = () => {
      Array.from(video.textTracks).forEach((track, index) => {
        track.mode = subtitlesEnabled && selectedSubtitle === String(index) ? 'showing' : 'disabled';
      });
    };
    syncSubtitleTracks();
    video.addEventListener('loadedmetadata', syncSubtitleTracks);
    video.textTracks.addEventListener?.('addtrack', syncSubtitleTracks);
    return () => {
      video.removeEventListener('loadedmetadata', syncSubtitleTracks);
      video.textTracks.removeEventListener?.('addtrack', syncSubtitleTracks);
    };
  }, [subtitleUrl, subtitleTracks, subtitlesEnabled, selectedSubtitle]);

  // ─── ANTI-SCREEN RECORDING & SCREENSHOT SECURITY STATE ───────────
  const [captureBlocked, setCaptureBlocked] = useState(false);
  const [watermarkPos, setWatermarkPos] = useState({ top: 15, left: 20 });

  // Drifting dynamic watermark to prevent external cam/recording
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: Math.floor(10 + Math.random() * 75),
        left: Math.floor(8 + Math.random() * 70),
      });
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut & PrintScreen deterrent -> Immediate Ejection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') ||
        (e.metaKey && e.shiftKey && ['s', '3', '4', '5'].includes(e.key.toLowerCase())) ||
        (e.shiftKey && e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        setCaptureBlocked(true);

        try {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = '';
          }
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch {}

        setTimeout(() => {
          window.location.replace('https://www.google.com');
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── SMART SOURCE DETECTOR (YouTube, Google Drive, OK.ru, HLS, MP4) ───
  useEffect(() => {
    if (!src) return;
    const clean = src.trim();
    const ytId = parseYouTubeVideoId(clean);

    if (ytId) {
      setYoutubeVideoId(ytId);
      setIsFacebookVideo(false);
      setIsIframeEmbed(true);
      const embedUrl = getYouTubeEmbedUrl(ytId, { autoplay: true });
      setCurrentSrc(embedUrl);
      setIsLoading(false);
      setError(null);
    } else if (isFacebookUrl(clean)) {
      setYoutubeVideoId(null);
      setIsFacebookVideo(true);
      setIsIframeEmbed(true);
      const embedUrl = getFacebookEmbedUrl(clean, { autoplay: true });
      setCurrentSrc(embedUrl);
      setIsLoading(false);
      setError(null);
    } else {
      setYoutubeVideoId(null);
      setIsFacebookVideo(false);
      // Check if other embed iframe (Google Drive, OK.ru, Streamtape, Dood, etc.)
      const isOtherEmbed = clean.includes('/embed/') ||
        clean.includes('drive.google.com/file/d/') ||
        clean.includes('ok.ru/videoembed') ||
        clean.includes('streamtape.com/e/') ||
        clean.includes('iframe.mediadelivery.net') ||
        clean.includes('dood');

      if (isOtherEmbed) {
        let finalEmbed = clean;
        if (clean.includes('drive.google.com/file/d/') && clean.includes('/view')) {
          finalEmbed = clean.replace('/view', '/preview');
        }
        setIsIframeEmbed(true);
        setCurrentSrc(finalEmbed);
        setIsLoading(false);
        setError(null);
      } else {
        setIsIframeEmbed(false);
        setCurrentSrc(clean);
      }
    }
    setTriedProxy(false);
  }, [src]);

  // Initialize HLS or direct MP4
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSrc || isIframeEmbed) return;

    try {
      (video as any).referrerPolicy = 'no-referrer';
    } catch {}

    setError(null);
    setIsLoading(true);
    setIsPlaying(false);
    const alternateSources = qualitySources.map((quality) => ({ label: quality.label, level: -2, height: Number.parseInt(quality.label, 10) || 0, src: quality.src }));
    setQuality(pendingQualitySwitchRef.current?.label || 'Auto');
    setQualityOptions(alternateSources);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (currentSrc.includes('.m3u8') || currentSrc.includes('m3u8') || currentSrc.includes('b-cdn.net') || currentSrc.includes('mediadelivery.net')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });
        hlsRef.current = hls;
        hls.loadSource(currentSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setError(null);
          const uniqueLevels = new Map<string, { label: string; level: number; height: number }>();
          hls.levels.forEach((level, index) => {
            const height = level.height || 0;
            const label = height >= 2160 ? '4K Ultra HD' : height >= 1080 ? '1080p Full HD' : height >= 720 ? '720p HD' : height ? `${height}p` : 'Auto';
            if (label !== 'Auto' && !uniqueLevels.has(label)) uniqueLevels.set(label, { label, level: index, height });
          });
          const options = Array.from(uniqueLevels.values()).sort((a, b) => b.height - a.height);
          setQualityOptions([...options, ...alternateSources.filter((source) => !options.some((option) => option.label === source.label))]);
          let preferredQuality = 'Auto';
          try {
            preferredQuality = localStorage.getItem('nami_playback_quality') || 'Auto';
            if (localStorage.getItem('nami_data_saver') === 'true' && preferredQuality === 'Auto') preferredQuality = '480p';
          } catch {}
          const preferredLevel = options.find((option) => option.label === preferredQuality);
          if (preferredLevel) {
            hls.currentLevel = preferredLevel.level;
            setQuality(preferredLevel.label);
          } else {
            hls.currentLevel = -1;
            setQuality('Auto');
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            handleVideoError();
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentSrc;
      } else {
        video.src = currentSrc;
      }
    } else {
      video.src = currentSrc;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      clearInterval(progressReportRef.current);
    };
  }, [currentSrc, isIframeEmbed, qualitySources]);

  // A viewer has already chosen an episode before arriving here, so start its
  // stream as soon as the browser has enough data. If autoplay is blocked by
  // the browser, the normal player controls remain available.
  useEffect(() => {
    const video = videoRef.current;
    if (!autoPlay || !video || isIframeEmbed) return;

    let disposed = false;
    const startPlayback = () => {
      if (disposed || !video.paused) return;
      void video.play().catch(() => {});
    };

    video.addEventListener('canplay', startPlayback, { once: true });
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) startPlayback();
    return () => {
      disposed = true;
      video.removeEventListener('canplay', startPlayback);
    };
  }, [autoPlay, currentSrc, isIframeEmbed]);

  const handleVideoError = () => {
    if (!src) {
      setError('No stream URL provided for this episode.');
      return;
    }

    // Auto-fallback to backend proxy on CORS or 403 hotlink blocks
    if (!triedProxy && (src.includes('nintanime.com') || src.includes('s3.') || src.includes('http'))) {
      setTriedProxy(true);
      const isProd = import.meta.env.PROD;
      const proxyBase = import.meta.env.VITE_API_URL || (isProd ? 'https://immortal-s7ui.onrender.com' : 'http://localhost:8000');
      const proxyUrl = `${proxyBase}/api/stream/proxy?url=${encodeURIComponent(src)}`;
      setCurrentSrc(proxyUrl);
      setError(null);
      setIsLoading(true);
      return;
    }

    setError('Stream format or source is unavailable. Click retry or check if the stream link has expired.');
  };

  // Resume at saved position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      if (resumeAt > 0) video.currentTime = resumeAt;
    };
    video.addEventListener('loadedmetadata', handler, { once: true });
    return () => video.removeEventListener('loadedmetadata', handler);
  }, [resumeAt, src]);

  // Progress reporting
  useEffect(() => {
    clearInterval(progressReportRef.current);
    if (isPlaying) {
      progressReportRef.current = window.setInterval(() => {
        const video = videoRef.current;
        if (video && onProgress) {
          onProgress(Math.floor(video.currentTime), Math.floor(video.duration || 0));
        }
      }, 5000);
    }
    return () => clearInterval(progressReportRef.current);
  }, [isPlaying, onProgress]);

  // Auto-hide controls after 3 seconds of inactivity while playing
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      window.clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = undefined;
    }
    // Auto-hide after 3 seconds if playing and settings menu isn't open
    if (isPlayingRef.current && !showSettingsRef.current) {
      hideControlsTimer.current = window.setTimeout(() => {
        if (isPlayingRef.current && !showSettingsRef.current) {
          setShowControls(false);
        }
      }, 3000);
    }
  }, []);

  // When playback state changes, manage controls visibility and auto-hide timer
  useEffect(() => {
    if (isPlaying) {
      resetControlsTimer();
    } else {
      setShowControls(true);
      if (hideControlsTimer.current) {
        window.clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = undefined;
      }
    }
    return () => {
      if (hideControlsTimer.current) {
        window.clearTimeout(hideControlsTimer.current);
      }
    };
  }, [isPlaying, resetControlsTimer]);

  // When settings menu is closed while playing, start 3s timer
  useEffect(() => {
    if (!showSettings && isPlaying) {
      resetControlsTimer();
    }
  }, [showSettings, isPlaying, resetControlsTimer]);

  // Video event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // Show skip intro button between 0s and 90s
    setShowSkipIntro(video.currentTime > 2 && video.currentTime < 90);

    if (video.buffered.length > 0) {
      setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
    if (autoNext && hasNext) onNextEpisode?.();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
      resetControlsTimer();
    }
  };

  const handlePlayerTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // If clicking on an interactive control button or slider, let its own handler handle it
    if ((e.target as HTMLElement)?.closest('button, input, a, select, [role="button"]')) {
      return;
    }

    if (isIframeEmbed) return;

    if (!showControls) {
      // Controls were hidden -> Reveal controls and start 3s timer
      resetControlsTimer();
    } else {
      // Controls were visible -> If playing, tapping anywhere on player immediately hides them
      if (isPlaying) {
        setShowControls(false);
        if (hideControlsTimer.current) {
          window.clearTimeout(hideControlsTimer.current);
          hideControlsTimer.current = undefined;
        }
      } else {
        // If paused, tap resumes play
        togglePlay();
      }
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * duration;
  };

  const skipIntro = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 85;
    setShowSkipIntro(false);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (videoRef.current) videoRef.current.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Aspect ratio / Scale mode cycler: 'contain' (Fit) -> 'cover' (Fill - no black bars) -> 'fill' (Stretch)
  const cycleScaleMode = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setScaleMode((prev) => {
      if (prev === 'contain') {
        showHud('📐 ពេញអេក្រង់ (Crop to Fill - គ្មានគែមខ្មៅ)');
        return 'cover';
      } else if (prev === 'cover') {
        showHud('📐 ពង្រីកពេញ (Stretch)');
        return 'fill';
      } else {
        showHud('📐 ទំហំដើម (Fit 16:9)');
        return 'contain';
      }
    });
  };

  // Toggle Portrait Fullscreen (មើលបញ្ឈពេញអេក្រង់)
  const togglePortraitFullscreen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    try {
      (window as any).Telegram?.WebApp?.expand?.();
    } catch {}

    // If already in portrait fullscreen, exit
    if ((isFullscreen || isPseudoFullscreen) && !isRotatedLandscape && screenOrientation === 'portrait') {
      setIsFullscreen(false);
      setIsPseudoFullscreen(false);
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {}
      showHud('📱 ចាកចេញពីរបៀបបញ្ឈ');
      return;
    }

    // Switch to portrait fullscreen
    setIsRotatedLandscape(false);
    setScreenOrientation('portrait');
    setIsFullscreen(true);
    setIsPseudoFullscreen(true);

    if (window.screen && (window.screen.orientation as any)?.unlock) {
      try { (window.screen.orientation as any).unlock(); } catch {}
    }
    if (window.screen && (window.screen.orientation as any)?.lock) {
      try { await (window.screen.orientation as any).lock('portrait'); } catch {}
    }

    showHud('📱 របៀបបញ្ឈពេញអេក្រង់ (Portrait Full)');
  };

  // Toggle Landscape Fullscreen (មើលផ្ដេកពេញអេក្រង់)
  const toggleLandscapeFullscreen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    const telegramWebApp = (window as any).Telegram?.WebApp;
    try { telegramWebApp?.expand?.(); } catch {}

    // If already in landscape fullscreen, exit
    if ((isFullscreen || isPseudoFullscreen) && (isRotatedLandscape || screenOrientation === 'landscape')) {
      setIsFullscreen(false);
      setIsPseudoFullscreen(false);
      setIsRotatedLandscape(false);
      setScreenOrientation('portrait');
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {}
      try { telegramWebApp?.exitFullscreen?.(); } catch {}
      if (window.screen && (window.screen.orientation as any)?.unlock) {
        try { (window.screen.orientation as any).unlock(); } catch {}
      }
      try { telegramWebApp?.unlockOrientation?.(); } catch {}
      showHud('🔄 ចាកចេញពីរបៀបផ្ដេក');
      return;
    }

    setIsFullscreen(true);
    setIsPseudoFullscreen(true);
    setScreenOrientation('landscape');

    if (isTelegram && telegramWebApp) {
      try {
        await new Promise<void>((resolve) => {
          let settled = false;
          let timeout: number | undefined;
          const finish = () => {
            if (settled) return;
            settled = true;
            telegramWebApp.offEvent?.('fullscreenChanged', finish);
            if (timeout !== undefined) window.clearTimeout(timeout);
            resolve();
          };
          timeout = window.setTimeout(finish, 350);
          telegramWebApp.onEvent?.('fullscreenChanged', finish);
          telegramWebApp.requestFullscreen?.();
        });
      } catch {}
    } else {
      try {
        if (container.requestFullscreen) await container.requestFullscreen();
        else if ((container as any).webkitRequestFullscreen) await (container as any).webkitRequestFullscreen();
      } catch {}
    }

    if (window.screen && (window.screen.orientation as any)?.lock) {
      try {
        await (window.screen.orientation as any).lock('landscape');
      } catch {}
    }

    // Telegram WebViews that cannot rotate the device use a rotated video surface instead.
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    setIsRotatedLandscape(window.innerHeight > window.innerWidth);

    showHud('🔄 របៀបផ្ដេកពេញអេក្រង់ (Landscape Full)');
  };

  // Standard Fullscreen Toggle (smart: checks current device orientation)
  const toggleFullscreen = async () => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement ||
      isPseudoFullscreen
    );

    if (isCurrentlyFullscreen) {
      setIsFullscreen(false);
      setIsPseudoFullscreen(false);
      setIsRotatedLandscape(false);
      try {
        if (document.exitFullscreen && document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {}
      if (window.screen && (window.screen.orientation as any)?.unlock) {
        try { (window.screen.orientation as any).unlock(); } catch {}
      }
    } else {
      if (window.innerHeight > window.innerWidth) {
        await togglePortraitFullscreen();
      } else {
        await toggleLandscapeFullscreen();
      }
    }
  };

  // Sync fullscreen change event & Escape key
  useEffect(() => {
    const handler = () => {
      const fs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      // Telegram fullscreen is managed by the Mini App client and may not expose
      // document.fullscreenElement. Do not let its DOM event collapse our overlay.
      if (isTelegram && isPseudoFullscreen && !fs) return;
      setIsFullscreen(fs);
      if (!fs) {
        setIsPseudoFullscreen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPseudoFullscreen) {
        setIsPseudoFullscreen(false);
        setIsFullscreen(false);
        return;
      }

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          showHud('⏪ -10s');
        }
      } else if (e.code === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
          showHud('⏩ +10s');
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    window.addEventListener('keydown', handleKey);

    // Auto-adapt on screen orientation change (Portrait <-> Landscape)
    const handleOrientation = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      if (isTelegram && isLandscape && isPlaying) {
        setIsFullscreen(true);
        setIsPseudoFullscreen(true);
        setIsRotatedLandscape(false);
        setScreenOrientation('landscape');
      } else if (isTelegram && (isFullscreen || isPseudoFullscreen)) {
        setIsRotatedLandscape(!isLandscape);
      } else if (isLandscape && isPlaying) {
        setIsFullscreen(true);
        setIsPseudoFullscreen(true);
      } else if (!isLandscape && !document.fullscreenElement) {
        setIsPseudoFullscreen(false);
      }
    };

    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [isPseudoFullscreen, isPlaying, isTelegram, isFullscreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
      if (e.key === 'f') { e.preventDefault(); toggleFullscreen(); }
      if (e.key === 'm') { e.preventDefault(); toggleMute(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10); }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (videoRef.current) videoRef.current.currentTime = Math.min(duration, currentTime + 10); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setVolume((v) => Math.min(1, v + 0.1)); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setVolume((v) => Math.max(0, v - 0.1)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, isMuted, currentTime, duration, isPseudoFullscreen]);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black select-none overflow-hidden group/player transition-all duration-300 ${
        isFullscreen || isPseudoFullscreen
          ? 'fixed inset-0 z-[99999] w-screen h-[100dvh] max-w-none rounded-none border-none shadow-none flex items-center justify-center bg-black'
          : 'w-full aspect-video rounded-xl sm:rounded-2xl border border-white/[0.08] shadow-2xl'
      } ${cinemaMode ? 'cinema-active' : ''} ${!showControls && isPlaying ? 'cursor-none' : 'cursor-default'}`}
      style={isRotatedLandscape ? {
        transform: 'rotate(90deg)',
        transformOrigin: 'center center',
        width: '100dvh',
        height: '100dvw',
        position: 'fixed',
        top: '50%',
        left: '50%',
        marginTop: '-50dvw',
        marginLeft: '-50dvh',
        zIndex: 99999,
      } : undefined}
      onMouseMove={resetControlsTimer}
      onMouseEnter={resetControlsTimer}
      onMouseLeave={() => {
        if (isPlaying && !showSettings) {
          setShowControls(false);
          if (hideControlsTimer.current) {
            window.clearTimeout(hideControlsTimer.current);
            hideControlsTimer.current = undefined;
          }
        }
      }}
      onTouchStart={resetControlsTimer}
      onTouchMove={resetControlsTimer}
      onClick={handlePlayerTap}
      onDoubleClick={(e) => { e.stopPropagation(); cycleScaleMode(e); }}
    >
      {/* Video or Iframe Element */}
      {isIframeEmbed ? (
        <div className="relative w-full h-full bg-black">
          <iframe
            src={currentSrc}
            className={`w-full h-full border-0 transition-all duration-300 ${scaleMode === 'cover' ? 'object-cover' : ''}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            title={title || 'Video Player'}
            onLoad={() => setIsLoading(false)}
          />
          {youtubeVideoId && (
            <div className="absolute top-3 right-3 z-30 pointer-events-auto flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
              <a
                href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-2.5 py-1 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-[10px] sm:text-xs font-bold shadow-lg backdrop-blur-md flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                title="បើកមើលលើ YouTube App / Web ផ្ទាល់"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>មើលលើ YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {isFacebookVideo && (
            <div className="absolute top-3 right-3 z-30 pointer-events-auto flex items-center gap-2">
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xl border border-blue-400/40 backdrop-blur-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 animate-pulse"
                title="បើកមើលលើ Facebook App / Web ផ្ទាល់"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>មើលលើ Facebook</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay={autoPlay}
          className={`w-full h-full select-none pointer-events-auto transition-all duration-300 ${
            scaleMode === 'cover' ? 'object-cover' : scaleMode === 'fill' ? 'object-fill' : 'object-contain'
          }`}
          playsInline
          webkit-playsinline="true"
          disablePictureInPicture
          controlsList="nodownload noplaybackrate noremoteplayback"
          onContextMenu={(e) => e.preventDefault()}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={handleEnded}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => {
            setIsLoading(false); setError(null);
            const pending = pendingQualitySwitchRef.current;
            if (pending && videoRef.current) {
              pendingQualitySwitchRef.current = null;
              videoRef.current.currentTime = Math.min(pending.time, Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : pending.time);
              if (pending.wasPlaying) videoRef.current.play().catch(() => {});
            }
          }}
          onError={handleVideoError}
        >
          {availableSubtitleTracks.map((track, index) => <track key={`${track.lang}-${index}`} kind="subtitles" src={track.src} srcLang={track.lang} label={track.label} />)}
        </video>
      )}

      {/* ─── DYNAMIC ANTI-RECORDING USER WATERMARK ─── */}
      <div
        className="absolute pointer-events-none z-20 transition-all duration-1000 select-none opacity-30 hover:opacity-10 text-[10px] sm:text-xs font-mono font-medium text-white/60 bg-black/40 px-2 py-1 rounded-lg border border-white/10 backdrop-blur-[1px] flex items-center gap-1.5"
        style={{
          top: `${watermarkPos.top}%`,
          left: `${watermarkPos.left}%`,
        }}
      >
        <span>🛡️ NAMI ANIME</span>
        <span>•</span>
        <span className="text-amber-200/70">{user?.username || 'Member'}</span>
        <span>•</span>
        <span className="text-gray-400/70">ID: {user?.id || 'VIP'}</span>
      </div>

      {/* ─── ANTI-SCREEN CAPTURE BLACKOUT OVERLAY ─── */}
      {captureBlocked && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center p-6 z-50 animate-fade-in pointer-events-auto">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 mb-3 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <p className="text-white font-bold text-lg">⚠️ Screen Recording Protected</p>
          <p className="text-gray-400 text-xs mt-1 max-w-sm">
            ការថត Screenshot ឬ Record Screen ត្រូវបានហាមឃាត់ដើម្បីការពារកម្មសិទ្ធិបញ្ញា។
          </p>
        </div>
      )}

      {/* Skip Intro Button */}



      {showSkipIntro && (
        <button
          onClick={(e) => { e.stopPropagation(); skipIntro(); }}
          className={`absolute bottom-20 left-6 z-30 btn bg-black/80 hover:bg-brand-600 border border-brand-500/50 text-white text-xs px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-2 shadow-xl transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <FastForward className="w-4 h-4 text-brand-400" />
          រំលងផ្ដើមរឿង (85s)
        </button>
      )}

      {/* Error Overlay with Retry */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-center px-4 z-30 pointer-events-auto">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-white font-semibold text-lg mb-1">បញ្ហាក្នុងការចាក់វីដេអូ</p>
          <p className="text-gray-400 text-xs max-w-sm mb-4">{error}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVideoError();
              }}
              className="btn-primary text-xs py-2 px-4"
            >
              ព្យាយាមចាក់ឡើងវិញ
            </button>
            {src && (
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="btn-secondary text-xs py-2 px-4"
              >
                បើកតំណវីដេអូដើម
              </a>
            )}
          </div>
        </div>
      )}

      {/* Loading Spinner (Only show for native HTML5 video; hidden for YouTube / Facebook / Iframe embeds) */}
      {!isIframeEmbed && isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-30">
          <div className="w-14 h-14 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin glow-md" />
        </div>
      )}

      {/* Floating HUD Feedback (Orientation / Scale Fit alerts) */}
      {hudMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="px-3.5 py-1.5 rounded-full bg-black/85 text-white text-xs sm:text-sm font-semibold border border-brand-500/50 shadow-2xl backdrop-blur-md flex items-center gap-2">
            <span>{hudMessage}</span>
          </div>
        </div>
      )}

      {/* Controls Overlay (Hidden when playing YouTube/iframe to avoid duplicate controls) */}
      {!isIframeEmbed && (
      <div
        className={`${isTelegram ? 'hidden' : ''} absolute inset-0 flex flex-col justify-between p-3 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] px-[max(0.75rem,env(safe-area-inset-left))] bg-gradient-to-t from-black/90 via-transparent to-black/60 transition-all duration-300 z-30 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget && isPlaying) {
            setShowControls(false);
            if (hideControlsTimer.current) {
              window.clearTimeout(hideControlsTimer.current);
              hideControlsTimer.current = undefined;
            }
          }
        }}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pointer-events-auto gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-white font-bold text-xs sm:text-sm md:text-base drop-shadow-md truncate max-w-[140px] sm:max-w-sm">
              {title}
            </p>
            <span className={`badge text-[9px] sm:text-[10px] shrink-0 ${
              youtubeVideoId
                ? 'bg-red-600/20 text-red-400 border-red-500/40'
                : 'bg-brand-500/20 text-brand-400 border-brand-500/40'
            }`}>
              {youtubeVideoId ? 'YouTube HD' : quality}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Switch: Portrait Fullscreen (បញ្ឈពេញ) */}
            <button
              onClick={togglePortraitFullscreen}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center gap-1 border transition-all ${
                (isFullscreen || isPseudoFullscreen) && !isRotatedLandscape && screenOrientation === 'portrait'
                  ? 'bg-brand-500 text-white border-brand-400 shadow-md shadow-brand-500/30'
                  : 'glass text-white/90 hover:text-white border-white/10 hover:border-white/25'
              }`}
              title="មើលបញ្ឈពេញអេក្រង់ (Portrait Full)"
            >
              <Smartphone className="w-3.5 h-3.5 text-brand-400" />
              <span>បញ្ឈ</span>
            </button>

            {/* Quick Switch: Landscape Fullscreen (ផ្ដេកពេញ) */}
            <button
              onClick={toggleLandscapeFullscreen}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center gap-1 border transition-all ${
                (isFullscreen || isPseudoFullscreen) && (isRotatedLandscape || screenOrientation === 'landscape')
                  ? 'bg-brand-500 text-white border-brand-400 shadow-md shadow-brand-500/30'
                  : 'glass text-white/90 hover:text-white border-white/10 hover:border-white/25'
              }`}
              title="មើលផ្ដេកពេញអេក្រង់ (Landscape Full)"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>ផ្ដេក</span>
            </button>

            {/* Cinema light toggle */}
            <button
              onClick={() => setCinemaMode(!cinemaMode)}
              className="btn-icon glass text-white text-xs hidden sm:flex"
              title="Cinema Lights"
            >
              {cinemaMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {hasPrev && (
              <button onClick={onPrevEpisode} className="btn-icon glass text-white" aria-label="Previous episode">
                <ChevronLeft className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            )}
            {hasNext && (
              <button onClick={onNextEpisode} className="btn-icon glass text-white" aria-label="Next episode">
                <ChevronRight className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Controls Area */}
        <div className="space-y-3 pointer-events-auto">

          {/* Seek Progress Bar */}
          <div
            className="relative h-2 bg-white/20 rounded-full cursor-pointer group/seek hover:h-3 transition-all duration-150"
            onClick={seek}
          >
            {/* Buffered */}
            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
            {/* Played progress */}
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-cyan-400 rounded-full" style={{ width: `${progressPct}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover/seek:opacity-100 transition-opacity shadow-lg shadow-brand-500/50" />
            </div>
          </div>

          {/* Control Buttons Row */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-brand-400 transition-colors p-1.5 sm:p-1 active:scale-90" aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />}
            </button>

            {/* Skip 10s */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime -= 10;
                  showHud('⏪ -10s');
                }
              }}
              className="btn-icon text-white hover:text-brand-400 p-1.5 sm:p-2 cursor-pointer"
              aria-label="Skip back 10s"
              title="ថយក្រោយ 10 វិនាទី (Left Arrow / J)"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime += 10;
                  showHud('⏩ +10s');
                }
              }}
              className="btn-icon text-white hover:text-brand-400 p-1.5 sm:p-2 cursor-pointer"
              aria-label="Skip forward 10s"
              title="ទៅមុខ 10 វិនាទី (Right Arrow / L)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1 sm:gap-2 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-brand-400 p-1.5 sm:p-2" aria-label="Toggle mute">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                onChange={changeVolume}
                className="hidden sm:block w-0 group-hover/vol:w-20 transition-all duration-200 accent-brand-500 cursor-pointer h-1"
                aria-label="Volume"
              />
            </div>

            {/* Time Stamp */}
            <span className="text-white text-[10px] sm:text-xs font-mono ml-0.5 sm:ml-1 shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />



            {/* Settings Dropdown (Speed & Quality) */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="btn-icon text-white hover:text-brand-400"
                aria-label="Playback settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-3 glass-dark border border-dark-border rounded-2xl p-3 min-w-[180px] z-50 animate-scale-in shadow-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 px-2 mb-1.5">ល្បឿនចាក់ (Speed)</p>
                  <div className="grid grid-cols-3 gap-1 mb-3">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          if (videoRef.current) videoRef.current.playbackRate = s;
                          setSpeed(s);
                        }}
                        className={`text-xs py-1 rounded-lg transition-colors ${speed === s ? 'bg-brand-500 text-white font-bold' : 'text-gray-300 hover:bg-white/10'}`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 px-2 mb-1.5">កម្រិតច្បាស់ (Quality)</p>
                  <div className="space-y-1">
                    {qualityOptions.length ? [{ label: 'Auto', level: -1, height: 0 }, ...qualityOptions].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          handleQualitySelect(option);
                          setShowSettings(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-xs rounded-lg flex items-center justify-between transition-colors ${quality === option.label ? 'text-brand-400 font-bold bg-brand-500/10' : 'text-gray-300 hover:bg-white/5'}`}
                      >
                        {option.label}
                        {quality === option.label && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )) : <p className="px-2 py-2 text-xs leading-5 text-gray-300">This source has one fixed quality.</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Subtitle Indicator */}
            {availableSubtitleTracks.length > 0 && (
              <button onClick={toggleSubtitles} className={`btn-icon ${subtitlesEnabled ? 'text-brand-400' : 'text-white/60'}`} aria-label={subtitlesEnabled ? 'Turn subtitles off' : 'Turn subtitles on'} aria-pressed={subtitlesEnabled} title={subtitlesEnabled ? 'Subtitles on' : 'Subtitles off'}>
                <Subtitles className="w-5 h-5" />
              </button>
            )}

            {/* Screen Fit / Fill Toggle (កាត់គែមខ្មៅ / ពង្រីកពេញ) */}
            <button
              onClick={cycleScaleMode}
              className={`btn-icon transition-all p-1.5 sm:p-2 rounded-lg ${
                scaleMode === 'cover'
                  ? 'text-brand-400 bg-brand-500/20 border border-brand-500/40 shadow-sm'
                  : scaleMode === 'fill'
                  ? 'text-amber-400 bg-amber-500/20 border border-amber-500/40'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              title={`ទម្រង់អេក្រង់: ${scaleMode === 'cover' ? 'ពេញអេក្រង់ (Crop to Fill - គ្មានគែមខ្មៅ)' : scaleMode === 'fill' ? 'ពង្រីកពេញ (Stretch)' : 'ទំហំដើម (Fit 16:9)'}`}
              aria-label="Toggle Screen Fit"
            >
              <Scan className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>

            {/* Quick Rotate for mobile */}
            <button
              onClick={toggleLandscapeFullscreen}
              className="btn-icon text-white/80 hover:text-white hover:bg-white/10 p-1.5 sm:p-2 sm:hidden"
              title="បង្វិលផ្ដេក/បញ្ឈ"
              aria-label="Rotate screen"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white hover:text-brand-400 transition-colors p-1.5 sm:p-2" aria-label="Toggle fullscreen">
              {isFullscreen || isPseudoFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Compact Telegram Mini App controls */}
      {!isIframeEmbed && isTelegram && (
        <div className={`absolute inset-0 z-30 flex flex-col justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-b from-black/65 via-transparent to-black/70 transition-opacity duration-200 ${showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center justify-between gap-3 text-white drop-shadow-md">
            <p className="min-w-0 truncate text-sm font-semibold">{title}</p>
            <button onClick={toggleFullscreen} className="shrink-0 rounded-full bg-black/30 p-2" aria-label="Toggle fullscreen">
              {isFullscreen || isPseudoFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center justify-center gap-10 text-white">
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10); showHud('−10s'); }} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 active:scale-90" aria-label="Back 10 seconds">
              <span className="relative"><SkipBack className="h-7 w-7" /><span className="absolute inset-0 flex items-center justify-center pt-1 text-[9px] font-bold">10</span></span>
            </button>
            <button onClick={togglePlay} className="flex h-16 w-16 items-center justify-center rounded-full text-white active:scale-90" aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className="h-12 w-12 fill-current" /> : <Play className="h-12 w-12 fill-current" />}
            </button>
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(duration || currentTime + 10, currentTime + 10); showHud('+10s'); }} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 active:scale-90" aria-label="Forward 10 seconds">
              <span className="relative"><SkipForward className="h-7 w-7" /><span className="absolute inset-0 flex items-center justify-center pt-1 text-[9px] font-bold">10</span></span>
            </button>
          </div>

          <div className="space-y-2 text-white drop-shadow-md">
            <input aria-label="Playback position" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value); }} className="mini-player-seek w-full" style={{ background: `linear-gradient(to right, #16c66b ${progressPct}%, rgba(255,255,255,.4) ${progressPct}%)` }} />
            <div className="flex items-center justify-between text-xs text-white/90">
              <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              <div className="flex items-center gap-5">
                <button onClick={() => setShowSettings((open) => !open)} className="whitespace-nowrap font-medium">Audio &amp; Subtitles</button>
                <button onClick={() => setShowSettings((open) => !open)} className="font-medium">{speed}X</button>
                <button onClick={() => setShowSettings((open) => !open)} className="font-medium">{quality === 'Auto' ? 'Auto' : quality}</button>
              </div>
            </div>
          </div>

          {showSettings && createPortal(
            <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/65 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
              <div role="dialog" aria-modal="true" aria-label="Playback settings" className="w-full max-w-2xl max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#17191f] px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-semibold">Playback settings</h3><p className="mt-1 text-sm text-white/65">Choose subtitles, playback speed, and available video quality.</p></div><button onClick={() => setShowSettings(false)} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Done</button></div>
                <section className="mb-6"><h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">Audio &amp; Subtitles</h4>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setSelectedSubtitle('off'); setSubtitlesEnabled(false); try { localStorage.setItem('nami_subtitle_track', 'off'); localStorage.setItem('nami_subtitles_enabled', 'false'); } catch {} }} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium ${selectedSubtitle === 'off' || !subtitlesEnabled ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white'}`}>Subtitles off</button>
                    {availableSubtitleTracks.map((track, index) => <button key={`${track.lang}-${index}`} onClick={() => { setSelectedSubtitle(String(index)); setSubtitlesEnabled(true); try { localStorage.setItem('nami_subtitle_track', String(index)); localStorage.setItem('nami_subtitles_enabled', 'true'); } catch {} }} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium ${selectedSubtitle === String(index) && subtitlesEnabled ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white'}`}>{track.label || track.lang}</button>)}
                    {(hlsRef.current?.audioTracks || []).map((track, index) => <button key={`${track.lang}-${index}`} onClick={() => { if (hlsRef.current) hlsRef.current.audioTrack = index; showHud(`Audio: ${track.name || track.lang || `Track ${index + 1}`}`); }} className={`min-h-11 rounded-xl px-4 py-2 text-sm ${hlsRef.current?.audioTrack === index ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white'}`}>{track.name || track.lang || `Audio ${index + 1}`}</button>)}
                    {!availableSubtitleTracks.length && !hlsRef.current?.audioTracks.length && <p className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm leading-6 text-white/70">No subtitle files or alternate audio tracks are provided for this episode yet.</p>}
                  </div>
                </section>
                <section className="mb-6"><h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">Playback speed</h4><div className="flex flex-wrap gap-2">{SPEEDS.map((value) => <button key={value} onClick={() => { if (videoRef.current) videoRef.current.playbackRate = value; setSpeed(value); }} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium ${speed === value ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white'}`}>{value}X</button>)}</div></section>
                <section><h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">Video quality</h4><div className="flex flex-wrap gap-2">{qualityOptions.length ? [{ label: 'Auto', level: -1, height: 0 }, ...qualityOptions].map((option) => <button key={option.label} onClick={() => handleQualitySelect(option)} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium ${quality === option.label ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white'}`}>{option.label}</button>) : <p className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm leading-6 text-white/70">This source has one fixed quality. Add another encoded file in episode settings to enable quality switching.</p>}</div></section>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
}
