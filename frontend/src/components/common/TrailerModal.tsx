import { useState, useEffect } from 'react';
import { X, Play, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Anime } from '../../types';

interface TrailerModalProps {
  anime: Anime | null;
  isOpen: boolean;
  onClose: () => void;
}

// Fallback high-quality trailer videos if anime has no trailer_url
const FALLBACK_TRAILERS: Record<string, string> = {
  'renegade-immortal': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'perfect-world': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'battle-through-the-heavens': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'soul-land-2-the-peerless-tang-clan': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
};

const DEFAULT_TRAILER = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

export function TrailerModal({ anime, isOpen, onClose }: TrailerModalProps) {
  const navigate = useNavigate();
  const [playerMode, setPlayerMode] = useState<'youtube' | 'mp4'>('youtube');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Reset playerMode when modal opens
      setPlayerMode('youtube');
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !anime) return null;

  const rawTrailerUrl = anime.trailer_url?.trim() || FALLBACK_TRAILERS[anime.slug] || DEFAULT_TRAILER;
  const mp4FallbackUrl = FALLBACK_TRAILERS[anime.slug] || DEFAULT_TRAILER;

  // Check if YouTube URL
  const isYouTube = rawTrailerUrl.includes('youtube.com') || rawTrailerUrl.includes('youtu.be');
  let youtubeEmbedUrl = '';
  let directYouTubeUrl = '';

  if (isYouTube) {
    let videoId = '';
    if (rawTrailerUrl.includes('youtu.be/')) {
      videoId = rawTrailerUrl.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (rawTrailerUrl.includes('watch?v=')) {
      videoId = rawTrailerUrl.split('watch?v=')[1]?.split('&')[0] || '';
    } else if (rawTrailerUrl.includes('embed/')) {
      videoId = rawTrailerUrl.split('embed/')[1]?.split('?')[0] || '';
    }
    if (videoId) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0&playsinline=1`;
      directYouTubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  const detailType = anime.type === 'ANIME' ? 'anime' : anime.type === 'DRAMA' ? 'drama' : anime.type === 'MOVIE' ? 'movie' : 'donghua';
  const watchUrl = `/watch/${anime.slug}/1`;
  const detailUrl = `/${detailType}/${anime.slug}`;

  const handleWatchFull = () => {
    onClose();
    navigate(watchUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="relative z-10 w-full max-w-4xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-[28px] overflow-hidden shadow-[0_24px_60px_rgba(15,23,42,0.16)] animate-scale-in flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-white border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Film className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  ឈុតខ្លីផ្លូវការ • OFFICIAL TRAILER
                </span>
                <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                  4K ULTRA HD
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1 mt-0.5">
                {anime.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {directYouTubeUrl && (
              <a
                href={directYouTubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                title="បើកមើលលើ YouTube App ឬ Website"
              >
                <span>មើលលើ YouTube</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition active:scale-90 cursor-pointer"
              title="បិទ (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Switcher Bar */}
        {isYouTube && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold text-[11px]">ម៉ាស៊ីនចាក់វីដេអូ៖</span>
              <button
                onClick={() => setPlayerMode('youtube')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  playerMode === 'youtube'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                YouTube
              </button>
              <button
                onClick={() => setPlayerMode('mp4')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  playerMode === 'mp4'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                HD 4K Server (គ្មាន Error)
              </button>
            </div>

            {directYouTubeUrl && (
              <a
                href={directYouTubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 text-[11px] underline sm:no-underline"
              >
                <span>ប្រសិនបើមាន Error 153 សូមចុចមើលលើ YouTube ផ្ទាល់</span>
              </a>
            )}
          </div>
        )}

        {/* Video Player Container */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden shrink-0">
          {isYouTube && youtubeEmbedUrl && playerMode === 'youtube' ? (
            <iframe
              src={youtubeEmbedUrl}
              title={`Trailer: ${anime.title}`}
              className="w-full h-full border-0"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video
              src={isYouTube && playerMode === 'mp4' ? mp4FallbackUrl : rawTrailerUrl}
              controls
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-contain"
              poster={anime.banner_url || anime.poster_url || undefined}
            />
          )}
        </div>

        {/* Footer Info & Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-center sm:text-left">
            <h3 className="text-base font-bold text-slate-900 line-clamp-1">
              {anime.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-xl">
              {anime.description || `ទស្សនាសាច់រឿងពេញ ${anime.title} កម្រិត 4K UHD 60FPS លើ MerDonghua`}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                navigate(detailUrl);
              }}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              ព័ត៌មានលម្អិត
            </button>

            <button
              onClick={handleWatchFull}
              className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20 transition active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>ទស្សនារឿងពេញ (Watch Full)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrailerModal;
