import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, Play, Trash2, HardDrive, WifiOff, Film, Clock, Sparkles, Check,
  RefreshCw
} from 'lucide-react';
import { useDownloadStore } from '../store/downloadStore';
import type { DownloadedItem } from '../services/downloadService';

export function DownloadsPage() {
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
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 animate-fade-in space-y-8 min-h-[80vh]">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-4 animate-slide-down">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold text-sm">អ្នកកំពុងស្ថិតក្នុងទម្រង់គ្មានអ៊ីនធឺណិត (Offline Mode)</p>
              <p className="text-xs text-amber-300/80">អ្នកអាចទស្សនាភាគដែលបានទាញយករួចនៅក្នុងបណ្ណាល័យនេះដោយសេរី!</p>
            </div>
          </div>
          <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs">
            ទម្រង់ Offline
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white flex items-center gap-3">
            <Download className="w-7 h-7 text-brand-400" /> បណ្ណាល័យទាញយកទុកមើល
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            ទស្សនាភាគដែលបានទាញយកទុកមើលគ្រប់ពេលវេលា ទោះបីគ្មានសេវាអ៊ីនធឺណិតក៏ដោយ។
          </p>
        </div>

        <button
          onClick={() => fetchDownloads()}
          className="btn-secondary text-xs self-start sm:self-auto flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> ធ្វើបច្ចុប្បន្នភាព
        </button>
      </div>

      {/* Storage & Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-gradient-to-br from-brand-950/40 to-dark-card border-brand-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase">ទំហំផ្ទុកបានប្រើ</span>
            <HardDrive className="w-4 h-4 text-brand-400" />
          </div>
          <p className="font-display font-black text-2xl text-white">{storageUsed.usedMB} MB</p>
          <p className="text-xs text-gray-400 mt-1">ទំហំទំនេរនៅលើឧបករណ៍: ~{storageUsed.quotaMB} MB</p>
        </div>

        <div className="card p-5 bg-gradient-to-br from-purple-950/40 to-dark-card border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase">ចំនួនរឿងទាញយក</span>
            <Film className="w-4 h-4 text-purple-400" />
          </div>
          <p className="font-display font-black text-2xl text-white">{animeList.length}</p>
          <p className="text-xs text-gray-400 mt-1">សរុប {downloads.length} ភាគបានរក្សាទុក</p>
        </div>

        <div className="card p-5 bg-gradient-to-br from-emerald-950/40 to-dark-card border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase">ស្ថានភាពទុកមើលក្រៅបណ្ដាញ</span>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              <Check className="w-3.5 h-3.5" /> រួចរាល់ 100%
            </span>
          </div>
          <p className="font-display font-black text-xl text-white">ទំហំផ្ទុកលើឧបករណ៍</p>
          <p className="text-xs text-gray-400 mt-1">ចាក់វីដេអូបានលឿន មិនអស់ទិន្នន័យអ៊ីនធឺណិត</p>
        </div>
      </div>

      {/* Active Downloads Queue */}
      {activeDownloadsList.length > 0 && (
        <div className="card p-6 border-brand-500/40 space-y-4">
          <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" /> កំពុងទាញយក
          </h2>
          <div className="space-y-3">
            {activeDownloadsList.map((ad) => (
              <div key={ad.id} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">{ad.animeTitle}</h4>
                    <p className="text-xs text-gray-400">ភាគទី {ad.episodeNumber} • {formatBytes(ad.downloadedBytes)} / {formatBytes(ad.totalBytes)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-brand-400">{ad.progress}%</span>
                    <button
                      onClick={() => cancelDownload(ad.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded bg-red-500/10 border border-red-500/20"
                    >
                      បោះបង់
                    </button>
                  </div>
                </div>
                <div className="w-full h-2 bg-dark-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-brand-500 transition-all duration-200" style={{ width: `${ad.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downloaded Content */}
      {downloads.length === 0 && activeDownloadsList.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-dark-border space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto border border-brand-500/20">
            <Download className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-lg text-white">មិនទាន់មានវីដេអូទាញយកនៅឡើយទេ</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            លោកអ្នកអាចចុចលើប៊ូតុង <b>"ទាញយកទុកមើល"</b> ក្នុងទំព័រមើលរឿង ដើម្បីរក្សាទុកភាគដែលលោកអ្នកចូលចិត្តទស្សនាពេលគ្មានអ៊ីនធឺណិត។
          </p>
          <div className="pt-2">
            <Link to="/donghua" className="btn-primary text-sm px-6 py-2.5">
              រុករករឿង Donghua & Anime
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="font-display font-bold text-xl text-white">រឿងដែលបានទាញយករួច ({animeList.length})</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {animeList.map((group) => (
              <div key={group.animeId} className="card p-5 border border-dark-border hover:border-brand-500/40 transition-all space-y-4">
                {/* Anime Header Card */}
                <div className="flex gap-4">
                  <div className="w-20 h-28 rounded-xl overflow-hidden bg-dark-muted shrink-0 shadow-md">
                    {group.animePoster ? (
                      <img src={group.animePoster} alt={group.animeTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">
                        {group.animeTitle[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="badge-donghua text-[10px]">{group.animeType}</span>
                    <h3 className="font-display font-bold text-base text-white line-clamp-2 mt-1">
                      {group.animeTitle}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {group.episodes.length} ភាគបានរក្សាទុក
                    </p>
                  </div>
                </div>

                {/* Episodes List in this Anime */}
                <div className="space-y-2 pt-2 border-t border-dark-border/60">
                  {group.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="p-2.5 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {ep.episodeNumber}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-white truncate">
                            ភាគ {ep.episodeNumber} - {ep.episodeTitle}
                          </p>
                          <p className="text-[11px] text-gray-400 flex items-center gap-2">
                            <span><Clock className="w-3 h-3 inline" /> ~{Math.round(ep.durationSeconds / 60)} នាទី</span>
                            <span>•</span>
                            <span>{formatBytes(ep.fileSize)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          to={`/watch/${group.animeSlug}/${ep.episodeNumber}`}
                          className="p-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-all hover:scale-105 shadow-sm"
                          title="Play Offline"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                        </Link>
                        <button
                          onClick={() => deleteDownload(ep.id)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete from storage"
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
    </div>
  );
}
