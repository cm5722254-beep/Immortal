import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, Play, Trash2, HardDrive, WifiOff, Film, Clock, Sparkles, Check,
  RefreshCw
} from 'lucide-react';
import { useDownloadStore } from '../store/downloadStore';
import type { DownloadedItem } from '../services/downloadService';
import { translate, useLanguageStore } from '../store/languageStore';

export function DownloadsPage() {
  const appLanguage = useLanguageStore((state) => state.language);
  const { downloads, activeDownloads, storageUsed, isOnline, fetchDownloads, deleteDownload, cancelDownload } = useDownloadStore();

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  // Group downloads by Anime
  const groupedDownloads = downloads.reduce<Record<number, { animeTitle: string; animeSlug: string; animePoster: string; animeType: string; episodes: DownloadedItem[] }>>((acc, item) => {
    if (!acc[item.animeId]) {
      acc[item.animeId] = {
        animeTitle: item.animeTitle,
        animeSlug: item.animeSlug,
        animePoster: item.animePoster,
        animeType: item.animeType,
        episodes: [],
      };
    }
    acc[item.animeId].episodes.push(item);
    return acc;
  }, {});

  const animeList = Object.entries(groupedDownloads).map(([id, data]) => ({
    animeId: parseInt(id, 10),
    ...data,
  }));

  const activeDownloadsList = Object.values(activeDownloads);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  return (
    <main className="mini-downloads-page max-w-[1600px] mx-auto px-4 md:px-8 py-8 animate-fade-in space-y-8 min-h-[80vh] bg-bg-base text-text-primary">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-between gap-4 animate-slide-down">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold text-sm">{translate('Offline mode', appLanguage)}</p>
              <p className="text-xs text-amber-600">{translate('Downloaded episodes are available here offline.', appLanguage)}</p>
            </div>
          </div>
          <span className="badge bg-amber-500/20 text-amber-500 border border-amber-500/40 text-xs">
            {translate('Offline', appLanguage)}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-text-primary flex items-center gap-3">
            <Download className="w-7 h-7 text-blue-600" /> {translate('Download library', appLanguage)}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {translate('Watch downloads any time, even without internet.', appLanguage)}
          </p>
        </div>

        <button
          onClick={() => fetchDownloads()}
          className="btn-secondary text-xs self-start sm:self-auto flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {translate('Refresh', appLanguage)}
        </button>
      </div>

      {/* Storage & Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-bg-card border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary uppercase">{translate('Storage used', appLanguage)}</span>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-display font-black text-2xl text-text-primary">{storageUsed.usedMB} MB</p>
          <p className="text-xs text-text-secondary mt-1">{translate('Free space on device', appLanguage)}: ~{storageUsed.quotaMB} MB</p>
        </div>

        <div className="card p-5 bg-bg-card border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary uppercase">{translate('Downloaded titles', appLanguage)}</span>
            <Film className="w-4 h-4 text-purple-600" />
          </div>
          <p className="font-display font-black text-2xl text-text-primary">{animeList.length}</p>
          <p className="text-xs text-text-secondary mt-1">{downloads.length} {translate('episodes saved', appLanguage)}</p>
        </div>

        <div className="card p-5 bg-bg-card border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary uppercase">{translate('Offline playback status', appLanguage)}</span>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <Check className="w-3.5 h-3.5" /> {translate('Ready', appLanguage)} 100%
            </span>
          </div>
          <p className="font-display font-black text-xl text-text-primary">{translate('Device storage', appLanguage)}</p>
          <p className="text-xs text-text-secondary mt-1">{translate('Play videos quickly and save mobile data.', appLanguage)}</p>
        </div>
      </div>

      {/* Active Downloads Queue */}
      {activeDownloadsList.length > 0 && (
        <div className="card p-6 border-border-subtle bg-bg-card space-y-4">
          <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" /> {translate('Downloading', appLanguage)}
          </h2>
          <div className="space-y-3">
            {activeDownloadsList.map((ad) => (
              <div key={ad.id} className="p-4 rounded-xl bg-bg-subtle border border-border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">{ad.animeTitle}</h4>
                    <p className="text-xs text-text-secondary">{translate('Episode', appLanguage)} {ad.episodeNumber} • {formatBytes(ad.downloadedBytes)} / {formatBytes(ad.totalBytes)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-blue-600">{ad.progress}%</span>
                    <button
                      onClick={() => cancelDownload(ad.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-semibold px-2 py-1 rounded bg-red-500/10 border border-red-500/20"
                    >
                      {translate('Cancel', appLanguage)}
                    </button>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${ad.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downloaded Content */}
      {downloads.length === 0 && activeDownloadsList.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-slate-200 bg-white space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <Download className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-lg text-slate-900">{translate('No downloads yet', appLanguage)}</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {translate('Download episodes from the watch page to watch them offline.', appLanguage)}
          </p>
          <div className="pt-2">
            <Link to="/explore" className="btn-primary text-sm px-6 py-2.5">
              {translate('Browse Donghua and Anime', appLanguage)}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="font-display font-bold text-xl text-slate-900">{translate('Downloaded series', appLanguage)} ({animeList.length})</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {animeList.map((group) => (
              <div key={group.animeId} className="bg-white rounded-3xl p-5 border border-slate-200/85 hover:border-blue-300 shadow-xs transition-all space-y-4">
                {/* Anime Header Card */}
                <div className="flex gap-4">
                  <div className="w-20 h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0">
                    {group.animePoster ? (
                      <img src={group.animePoster} alt={group.animeTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                        {group.animeTitle[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="badge-donghua text-[10px]">{group.animeType}</span>
                    <h3 className="font-display font-bold text-base text-slate-900 line-clamp-2 mt-1.5">
                      {group.animeTitle}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {group.episodes.length} {translate('episodes stored', appLanguage)}
                    </p>
                  </div>
                </div>

                {/* Episodes List in this Anime */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  {group.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="p-2.5 rounded-2xl bg-slate-50/90 hover:bg-slate-100/80 border border-slate-200/70 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {ep.episodeNumber}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-slate-900 truncate">
                            {translate('Episode', appLanguage)} {ep.episodeNumber} - {ep.episodeTitle}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> ~{Math.round(ep.durationSeconds / 60)} {translate('minutes', appLanguage)}</span>
                            <span>•</span>
                            <span>{formatBytes(ep.fileSize)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          to={`/watch/${group.animeSlug}/${ep.episodeNumber}`}
                          className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs"
                          title={translate('Play offline', appLanguage)}
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                        </Link>
                        <button
                          onClick={() => deleteDownload(ep.id)}
                          className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200/80 hover:border-red-200 transition-colors cursor-pointer"
                          title={translate('Delete from storage', appLanguage)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
