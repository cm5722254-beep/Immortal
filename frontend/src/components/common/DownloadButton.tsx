import { useEffect } from 'react';
import { Download, Check, Loader2, X } from 'lucide-react';
import { useDownloadStore } from '../../store/downloadStore';
import type { Anime, Episode } from '../../types';

interface DownloadButtonProps {
  anime: Anime;
  episode: Episode;
  variant?: 'icon' | 'full' | 'compact';
}

export function DownloadButton({ anime, episode, variant = 'full' }: DownloadButtonProps) {
  const { isDownloaded, getDownloadProgress, startDownload, cancelDownload, fetchDownloads } = useDownloadStore();

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  const downloaded = isDownloaded(anime.id, episode.episode_number);
  const active = getDownloadProgress(anime.id, episode.episode_number);

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (downloaded) {
      return;
    }

    if (active?.status === 'downloading') {
      cancelDownload(active.id);
      return;
    }

    startDownload({
      animeId: anime.id,
      animeTitle: anime.title,
      animeSlug: anime.slug,
      animePoster: anime.poster_url || '',
      animeType: anime.type,
      episodeId: episode.id,
      episodeNumber: episode.episode_number,
      episodeTitle: episode.title || `Episode ${episode.episode_number}`,
      durationSeconds: episode.duration_seconds || 1200,
      videoUrl: episode.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    });
  };

  if (variant === 'icon') {
    if (downloaded) {
      return (
        <button
          onClick={handleDownloadClick}
          title="Downloaded for Offline Viewing"
          className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center transition-all"
        >
          <Check className="w-4 h-4" />
        </button>
      );
    }

    if (active?.status === 'downloading') {
      return (
        <button
          onClick={handleDownloadClick}
          title="Cancel Download"
          className="relative w-8 h-8 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40 flex items-center justify-center group"
        >
          <Loader2 className="w-4 h-4 animate-spin group-hover:hidden" />
          <X className="w-4 h-4 text-red-400 hidden group-hover:block" />
          <span className="absolute -bottom-1 -right-1 text-[9px] font-mono font-black bg-brand-600 px-1 rounded-full text-white">
            {active.progress}%
          </span>
        </button>
      );
    }

    return (
      <button
        onClick={handleDownloadClick}
        title="Download for Offline Viewing"
        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 flex items-center justify-center transition-all hover:scale-105"
      >
        <Download className="w-4 h-4" />
      </button>
    );
  }

  if (variant === 'compact') {
    if (downloaded) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <Check className="w-3 h-3" /> Offline
        </span>
      );
    }

    if (active?.status === 'downloading') {
      return (
        <button
          onClick={handleDownloadClick}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-300 bg-brand-500/20 px-2 py-0.5 rounded-md border border-brand-500/30"
        >
          <Loader2 className="w-3 h-3 animate-spin" /> {active.progress}%
        </button>
      );
    }

    return (
      <button
        onClick={handleDownloadClick}
        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-md border border-white/10 transition-colors"
      >
        <Download className="w-3 h-3" /> Save
      </button>
    );
  }

  // Default 'full' variant
  if (downloaded) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-sm">
        <Check className="w-4 h-4 text-emerald-400" />
        <span>ទាញយករួច (Saved Offline)</span>
      </div>
    );
  }

  if (active?.status === 'downloading') {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-brand-950/60 border border-brand-500/40 text-xs font-bold text-white shadow-lg animate-pulse">
        <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
        <div className="flex flex-col">
          <span className="text-[11px] text-brand-300">កំពុងទាញយក... {active.progress}%</span>
          <div className="w-24 h-1 bg-black/40 rounded-full overflow-hidden mt-0.5">
            <div className="h-full bg-brand-500 transition-all duration-200" style={{ width: `${active.progress}%` }} />
          </div>
        </div>
        <button
          onClick={handleDownloadClick}
          title="Cancel"
          className="ml-1 p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownloadClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-brand-500/20 text-gray-200 hover:text-white border border-white/10 hover:border-brand-500/40 text-xs font-bold transition-all duration-200 hover:scale-105 shadow-sm"
    >
      <Download className="w-4 h-4 text-brand-400" />
      <span>ទាញយកទុកមើល (Download Offline)</span>
    </button>
  );
}
