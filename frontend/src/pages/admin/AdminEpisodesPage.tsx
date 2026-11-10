import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Edit3, Trash2, X, Play, Film,
  ExternalLink, CheckCircle2, AlertCircle, Layers,
  Crown, Unlock, Sparkles, Globe, Link2, Copy, Check,
  Search, RefreshCw, RotateCcw, CheckSquare, Send, ImagePlus
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { triggerConfirm } from '../../store/confirmStore';
import api from '../../services/api';
import { loadCatalog } from '../../services/catalogService';
import type { Anime, Episode } from '../../types';
import { parseYouTubeVideoId, isYouTubeUrl, getYouTubeThumbnail, isFacebookUrl } from '../../utils/youtube';

const INPUT_CLASS =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all';
const LABEL_CLASS =
  'block text-xs font-semibold text-slate-700 mb-1.5';

const EMPTY_EP = {
  anime_id: 0, episode_number: 1, title: '',
  video_url: '', subtitle_url: '', thumbnail_url: '',
  duration_seconds: 1440, is_published: true, is_vip: true, is_free: false,
};
type SubtitleTrackForm = { label: string; lang: string; src: string };
type VideoQualityForm = { label: string; src: string };

export function AdminEpisodesPage() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<number | null>(null);
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [converterInput, setConverterInput] = useState('');
  const [converterOutput, setConverterOutput] = useState('');
  const [converterLoading, setConverterLoading] = useState(false);
  const [converterCopied, setConverterCopied] = useState(false);
  const [converterError, setConverterError] = useState('');
  const [editEp, setEditEp] = useState<Episode | null>(null);
  const [form, setForm] = useState({ ...EMPTY_EP });
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrackForm[]>([]);
  const [videoQualities, setVideoQualities] = useState<VideoQualityForm[]>([]);
  const [primaryQuality, setPrimaryQuality] = useState('');
  const [isDetectingQuality, setIsDetectingQuality] = useState(false);
  const [batchCount, setBatchCount] = useState(12);
  const [batchUrlPattern, setBatchUrlPattern] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  const [batchIsVip, setBatchIsVip] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSavingBackup, setIsSavingBackup] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [broadcastingEpId, setBroadcastingEpId] = useState<number | null>(null);
  const [isBroadcastingBatch, setIsBroadcastingBatch] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Category & search separation
  const [selectedCategory, setSelectedCategory] = useState<'DONGHUA' | 'ANIME' | 'MOVIE' | 'DRAMA' | 'ALL'>('DONGHUA');
  const [seriesSearch, setSeriesSearch] = useState('');
  const [episodeSearch, setEpisodeSearch] = useState('');

  // Usability additions: Filter tabs & In-Dashboard Video Player Modal
  const [episodeFilterTab, setEpisodeFilterTab] = useState<'ALL' | 'FREE' | 'VIP' | 'MISSING'>('ALL');
  const [previewVideoEp, setPreviewVideoEp] = useState<Episode | null>(null);

  const uploadEpisodeThumbnail = async (file: File) => {
    setIsUploadingThumbnail(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const response = await api.post('/admin/upload-image', data, { timeout: 60000 });
      if (!response.data?.url) throw new Error('Image upload did not return a URL.');
      const baseUrl = (api.defaults.baseURL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
      const imageUrl = response.data.url.startsWith('http') ? response.data.url : `${baseUrl}${response.data.url}`;
      setForm((current) => ({ ...current, thumbnail_url: imageUrl }));
    } catch (uploadError: any) {
      const detail = uploadError?.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : uploadError?.message || 'Could not upload episode thumbnail.');
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const fetchEpisodes = async (animeId: number) => {
    setIsLoading(true);
    setSelectedAnime(animeId);
    setSelectedEpisodeIds([]);
    try {
      const res = await api.get(`/anime/${animeId}/episodes`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setEpisodes(res.data);
        setIsLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    // Fallback to local catalog
    try {
      const cat = await loadCatalog();
      if (cat?.episodes) {
        const matching = cat.episodes.filter((e) => e.anime_id === animeId);
        setEpisodes(matching);
      }
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    api.get('/anime?per_page=100&sort=az')
      .then((res) => {
        const items: Anime[] = res.data.items || [];
        if (items.length > 0) {
          setAnimeList(items);
          const firstDonghua = items.find((a) => a.type === 'DONGHUA') || items[0];
          fetchEpisodes(firstDonghua.id);
          return;
        }
        throw new Error('Empty');
      })
      .catch(async () => {
        const cat = await loadCatalog();
        if (cat?.anime && cat.anime.length > 0) {
          setAnimeList(cat.anime);
          const firstDonghua = cat.anime.find((a) => a.type === 'DONGHUA') || cat.anime[0];
          fetchEpisodes(firstDonghua.id);
        }
      });
  }, []);

  // Filter series by Category & Search
  const filteredAnimeList = animeList.filter((a) => {
    const matchesCategory = selectedCategory === 'ALL' || a.type === selectedCategory;
    const matchesSearch = !seriesSearch.trim() ||
      a.title.toLowerCase().includes(seriesSearch.toLowerCase()) ||
      (a.alt_title && a.alt_title.toLowerCase().includes(seriesSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Filter episodes by Tab (All, Free, VIP, Missing Link) & Search
  const freeCount = episodes.filter(e => e.is_free || !e.is_vip).length;
  const vipCount = episodes.filter(e => e.is_vip || !e.is_free).length;
  const missingCount = episodes.filter(e => !e.video_url || !e.video_url.trim()).length;
  const nextEpNum = episodes.length > 0 ? Math.max(...episodes.map(e => e.episode_number)) + 1 : 1;

  const filteredEpisodes = episodes.filter((ep) => {
    const isVip = ep.is_vip ?? (ep.is_free === false || (ep as any).is_vip_only);
    if (episodeFilterTab === 'FREE' && isVip) return false;
    if (episodeFilterTab === 'VIP' && !isVip) return false;
    if (episodeFilterTab === 'MISSING' && ep.video_url && ep.video_url.trim()) return false;

    if (!episodeSearch.trim()) return true;
    const q = episodeSearch.toLowerCase().trim();
    return (
      ep.episode_number.toString().includes(q) ||
      (ep.title && ep.title.toLowerCase().includes(q)) ||
      (ep.video_url && ep.video_url.toLowerCase().includes(q))
    );
  });

  const currentAnime = animeList.find((a) => a.id === selectedAnime);
  const needsEpisodeThumbnail = (episode: Episode) => {
    const thumbnail = episode.thumbnail_url?.trim();
    const isSeriesArtwork = thumbnail && (thumbnail === currentAnime?.poster_url || thumbnail === currentAnime?.banner_url);
    return Boolean(episode.video_url?.trim() && (!thumbnail || isSeriesArtwork) && !isYouTubeUrl(episode.video_url));
  };

  const generateMissingThumbnails = async () => {
    const pending = episodes.filter(needsEpisodeThumbnail);
    if (!pending.length) {
      setStatusMessage('All episodes with video links already have thumbnails.');
      window.setTimeout(() => setStatusMessage(''), 3500);
      return;
    }

    setIsGeneratingThumbnails(true);
    setError('');
    let generated = 0;
    let failed = 0;
    try {
      for (let i = 0; i < pending.length; i += 2) {
        const batch = pending.slice(i, i + 2);
        const results = await Promise.all(batch.map(async (episode) => {
          try {
            const response = await api.post(`/stream/episodes/${episode.id}/generate-thumbnail`, {}, { timeout: 45000 });
            return { episodeId: episode.id, thumbnailUrl: response.data.thumbnail_url as string, ok: true };
          } catch {
            failed += 1;
            return { episodeId: episode.id, thumbnailUrl: '', ok: false };
          }
        }));
        generated += results.filter((result) => result.ok).length;
        setEpisodes((current) => current.map((episode) => {
          const result = results.find((item) => item.episodeId === episode.id && item.ok);
          return result?.ok && result.thumbnailUrl ? { ...episode, thumbnail_url: result.thumbnailUrl } : episode;
        }));
        setStatusMessage(`Generating episode images... ${Math.min(i + batch.length, pending.length)} / ${pending.length}`);
      }
      setStatusMessage(`Generated ${generated} episode thumbnails${failed ? `; ${failed} failed` : ''}.`);
    } finally {
      setIsGeneratingThumbnails(false);
      window.setTimeout(() => setStatusMessage(''), 6000);
    }
  };

  const detectPrimaryQuality = () => {
    const source = form.video_url.trim();
    if (!source) {
      setError('Add the video URL before detecting its quality.');
      return;
    }

    setError('');
    setIsDetectingQuality(true);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      probe.removeAttribute('src');
      probe.load();
      setIsDetectingQuality(false);
    };
    const timeoutId = window.setTimeout(() => {
      finish();
      setError('Could not read video quality from this link. Check that the R2 URL is public and supports video playback.');
    }, 20000);

    probe.onloadedmetadata = () => {
      const width = probe.videoWidth;
      const height = probe.videoHeight;
      if (!height) {
        finish();
        setError('The video link did not report its resolution.');
        return;
      }
      setPrimaryQuality(`${height}p`);
      setStatusMessage(`Detected ${height}p${width ? ` (${width}x${height})` : ''}.`);
      window.setTimeout(() => setStatusMessage(''), 3500);
      finish();
    };
    probe.onerror = () => {
      finish();
      setError('Could not read video quality from this link. Check that the R2 URL is public and supports video playback.');
    };
    probe.src = source;
    probe.load();
  };

  const openCreate = () => {
    setEditEp(null);
    const maxEp = episodes.length > 0 ? Math.max(...episodes.map((e) => e.episode_number)) : 0;
    setForm({
      ...EMPTY_EP,
      anime_id: selectedAnime || 0,
      episode_number: maxEp + 1,
      thumbnail_url: '',
      is_vip: true,
      is_free: false,
    });
    setSubtitleTracks([]);
    setVideoQualities([]);
    setPrimaryQuality('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (ep: Episode) => {
    setEditEp(ep);
    const isVip = ep.is_vip ?? (ep.is_free === false || (ep as any).is_vip_only);
    setForm({
      anime_id: ep.anime_id,
      episode_number: ep.episode_number,
      title: ep.title || '',
      video_url: ep.video_url || '',
      subtitle_url: ep.subtitle_url || '',
      thumbnail_url: ep.thumbnail_url || '',
      duration_seconds: ep.duration_seconds || 1440,
      is_published: ep.is_published,
      is_vip: isVip,
      is_free: !isVip,
    });
    setSubtitleTracks(
      ep.subtitle_tracks?.length
        ? ep.subtitle_tracks.map((track) => ({ ...track }))
        : ep.subtitle_url
        ? [{ label: 'Subtitles', lang: 'und', src: ep.subtitle_url }]
        : []
    );
    const primaryQualitySource = ep.video_qualities?.find((quality) => quality.src === ep.video_url);
    setPrimaryQuality(primaryQualitySource?.label || '');
    setVideoQualities(
      ep.video_qualities?.filter((quality) => quality.src !== ep.video_url).map((quality) => ({ ...quality })) || []
    );
    setError('');
    setShowModal(true);
  };

  const toggleEpisodeVip = async (ep: Episode) => {
    const isCurrentlyVip = ep.is_vip ?? (ep.is_free === false || (ep as any).is_vip_only);
    const newIsVip = !isCurrentlyVip;
    try {
      await api.put(`/episodes/${ep.id}`, {
        is_free: !newIsVip,
        is_vip: newIsVip,
        is_vip_only: newIsVip,
      });
      setEpisodes((prev) =>
        prev.map((e) =>
          e.id === ep.id
            ? { ...e, is_vip: newIsVip, is_free: !newIsVip, is_vip_only: newIsVip }
            : e
        )
      );
      setStatusMessage(`Episode ${ep.episode_number} ${newIsVip ? 'locked to VIP' : 'set to Free'}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update VIP status');
    }
  };

  // ── Global Actions for ALL Anime and Episodes ──
  const handleGlobalSetAllFree = () => {
    triggerConfirm({
      title: 'Set ALL Episodes Free Globally (ដាក់ Free គ្រប់រឿងទាំងអស់)',
      message: 'Are you sure you want to set ALL episodes of ALL anime and donghua series to FREE (ឥតគិតថ្លៃ)? Every user can watch everything without VIP.',
      confirmText: 'Yes, Set ALL Free Globally',
      variant: 'info',
      onConfirm: async () => {
        setEpisodes((prev) =>
          prev.map((ep) => ({ ...ep, is_free: true, is_vip: false, is_vip_only: false }))
        );
        setStatusMessage('All episodes of ALL anime series are now set to Free (គ្រប់រឿងដាក់ Free ទាំងអស់)!');
        setTimeout(() => setStatusMessage(''), 4000);

        try {
          try {
            await api.put('/admin/episodes/set-all-free');
          } catch {
            const listRes = await api.get('/anime?per_page=100');
            const allAnime = listRes.data.items || [];
            await Promise.all(
              allAnime.map(async (item: any) => {
                const epsRes = await api.get(`/anime/${item.id}/episodes`).catch(() => ({ data: [] }));
                return Promise.all(
                  epsRes.data.map((ep: any) =>
                    api.put(`/episodes/${ep.id}`, { is_free: true, is_vip: false, is_vip_only: false }).catch(() => {})
                  )
                );
              })
            );
          }
          if (selectedAnime) fetchEpisodes(selectedAnime);
        } catch (err: any) {
          console.error('Batch sync error:', err);
        }
      },
    });
  };

  const handleGlobalSetFree3Episodes = () => {
    triggerConfirm({
      title: 'Free 3 Episodes on ALL Series (ដាក់ Free ៣ ភាគដំបូងលើគ្រប់រឿង)',
      message: 'Are you sure you want to set Episode 1, 2, and 3 to FREE and lock all subsequent episodes (Ep 4+) to VIP for ALL anime series on the entire website?',
      confirmText: 'Yes, Apply to ALL Series',
      variant: 'info',
      onConfirm: async () => {
        setEpisodes((prev) =>
          prev.map((ep) => {
            const isFree = ep.episode_number <= 3;
            return { ...ep, is_free: isFree, is_vip: !isFree, is_vip_only: !isFree };
          })
        );
        setStatusMessage('Episodes 1-3 set to Free & Ep 4+ locked to VIP for ALL series!');
        setTimeout(() => setStatusMessage(''), 4000);

        try {
          try {
            await api.put('/admin/episodes/set-free-3-episodes-all');
          } catch {
            const listRes = await api.get('/anime?per_page=100');
            const allAnime = listRes.data.items || [];
            await Promise.all(
              allAnime.map(async (item: any) => {
                const epsRes = await api.get(`/anime/${item.id}/episodes`).catch(() => ({ data: [] }));
                return Promise.all(
                  epsRes.data.map((ep: any) => {
                    const isFree = ep.episode_number <= 3;
                    return api.put(`/episodes/${ep.id}`, { is_free: isFree, is_vip: !isFree, is_vip_only: !isFree }).catch(() => {});
                  })
                );
              })
            );
          }
          if (selectedAnime) fetchEpisodes(selectedAnime);
        } catch (err: any) {
          console.error('Batch sync error:', err);
        }
      },
    });
  };

  const handleGlobalSetAllVip = () => {
    triggerConfirm({
      title: 'Lock ALL Series to VIP (ដាក់ VIP គ្រប់រឿងទាំងអស់)',
      message: 'Are you sure you want to lock ALL episodes of ALL series to VIP? Non-VIP users will need a VIP membership to watch any episode.',
      confirmText: 'Yes, Lock ALL to VIP',
      variant: 'warning',
      onConfirm: async () => {
        setEpisodes((prev) =>
          prev.map((ep) => ({ ...ep, is_free: false, is_vip: true, is_vip_only: true }))
        );
        setStatusMessage('All episodes of ALL series are now locked to VIP (គ្រប់រឿងជាប់ VIP ទាំងអស់)!');
        setTimeout(() => setStatusMessage(''), 4000);

        try {
          try {
            await api.put('/admin/episodes/set-all-vip');
          } catch {
            const listRes = await api.get('/anime?per_page=100');
            const allAnime = listRes.data.items || [];
            await Promise.all(
              allAnime.map(async (item: any) => {
                const epsRes = await api.get(`/anime/${item.id}/episodes`).catch(() => ({ data: [] }));
                return Promise.all(
                  epsRes.data.map((ep: any) =>
                    api.put(`/episodes/${ep.id}`, { is_free: false, is_vip: true, is_vip_only: true }).catch(() => {})
                  )
                );
              })
            );
          }
          if (selectedAnime) fetchEpisodes(selectedAnime);
        } catch (err: any) {
          console.error('Batch sync error:', err);
        }
      },
    });
  };

  // ── Selected Anime Actions ──
  const handleSetFreeFirst3Episodes = () => {
    if (!selectedAnime) return;
    triggerConfirm({
      title: `Set Free 3 Episodes for ${currentAnime?.title || 'this anime'}`,
      message: `Set Episode 1, 2, and 3 to Free and lock subsequent episodes (Ep 4+) to VIP for ${currentAnime?.title}?`,
      confirmText: 'Set Free 3 Episodes',
      variant: 'info',
      onConfirm: async () => {
        setEpisodes((prev) =>
          prev.map((ep) => {
            const isFree = ep.episode_number <= 3;
            return { ...ep, is_free: isFree, is_vip: !isFree, is_vip_only: !isFree };
          })
        );
        setStatusMessage('Episodes 1, 2 & 3 set to Free (Ep 4+ locked to VIP)');
        setTimeout(() => setStatusMessage(''), 3000);

        try {
          await Promise.all(
            episodes.map((ep) => {
              const isFree = ep.episode_number <= 3;
              const isVip = !isFree;
              return api.put(`/episodes/${ep.id}`, {
                is_free: isFree,
                is_vip: isVip,
                is_vip_only: isVip,
              });
            })
          );
        } catch (err: any) {
          console.error(err);
        }
      },
    });
  };

  const handleBatchVipToggle = (lockAllToVip: boolean) => {
    if (!selectedAnime) return;
    triggerConfirm({
      title: lockAllToVip ? `Lock All Episodes to VIP (${currentAnime?.title})` : `Set All Episodes to Free (${currentAnime?.title})`,
      message: lockAllToVip
        ? `Lock all ${episodes.length} episodes of "${currentAnime?.title}" to VIP?`
        : `Set all ${episodes.length} episodes of "${currentAnime?.title}" to Free?`,
      confirmText: lockAllToVip ? 'Lock All to VIP' : 'Set All Free',
      variant: lockAllToVip ? 'warning' : 'info',
      onConfirm: async () => {
        setEpisodes((prev) =>
          prev.map((ep) => ({
            ...ep,
            is_free: !lockAllToVip,
            is_vip: lockAllToVip,
            is_vip_only: lockAllToVip,
          }))
        );
        setStatusMessage(lockAllToVip ? 'All episodes locked to VIP' : 'All episodes set to Free');
        setTimeout(() => setStatusMessage(''), 3000);

        try {
          await Promise.all(
            episodes.map((ep) =>
              api.put(`/episodes/${ep.id}`, {
                is_free: !lockAllToVip,
                is_vip: lockAllToVip,
                is_vip_only: lockAllToVip,
              })
            )
          );
        } catch (err: any) {
          console.error(err);
        }
      },
    });
  };

  const toggleSelectEpisode = (id: number) => {
    setSelectedEpisodeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEpisodeIds.length === filteredEpisodes.length) {
      setSelectedEpisodeIds([]);
    } else {
      setSelectedEpisodeIds(filteredEpisodes.map((e) => e.id));
    }
  };

  const handleBatchDeleteSelected = () => {
    if (selectedEpisodeIds.length === 0) return;
    const count = selectedEpisodeIds.length;
    triggerConfirm({
      title: `Delete ${count} Selected Episodes (លុប ${count} ភាគដែលបានរើស)`,
      message: `តើអ្នកពិតជាចង់លុបភាគដែលបានជ្រើសរើសទាំង ${count} ភាគនេះចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយបានឡើយ។`,
      confirmText: `Yes, Delete ${count} Episodes (លុបទាំងអស់)`,
      variant: 'danger',
      onConfirm: async () => {
        const toDelete = [...selectedEpisodeIds];
        setEpisodes((prev) => prev.filter((e) => !toDelete.includes(e.id)));
        setSelectedEpisodeIds([]);
        setStatusMessage(`បានលុប ${count} ភាគដោយជោគជ័យ!`);
        setTimeout(() => setStatusMessage(''), 3500);

        try {
          await api.post('/episodes/batch-delete', { episode_ids: toDelete });
        } catch {
          await Promise.all(toDelete.map((id) => api.delete(`/episodes/${id}`).catch(() => {})));
        }
        if (selectedAnime) fetchEpisodes(selectedAnime);
      },
    });
  };

  const handleSingleBroadcastTelegram = async (ep: Episode) => {
    try {
      setBroadcastingEpId(ep.id);
      const res = await api.post(`/episodes/${ep.id}/broadcast-telegram`);
      setStatusMessage(res.data?.message || `បានផ្ញើសារដំណឹង ភាគ ${ep.episode_number} ទៅកាន់ Telegram រួចរាល់!`);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'បរាជ័យក្នុងការផ្ញើសារទៅ Telegram');
    } finally {
      setBroadcastingEpId(null);
    }
  };

  const handleBatchBroadcastTelegram = async () => {
    if (selectedEpisodeIds.length === 0) return;
    const count = selectedEpisodeIds.length;
    try {
      setIsBroadcastingBatch(true);
      const res = await api.post('/episodes/batch-broadcast-telegram', { episode_ids: selectedEpisodeIds });
      setStatusMessage(res.data?.message || `បានផ្សាយដំណឹង ${count} ភាគដែលបានរើសទៅ Telegram រួចរាល់!`);
      setSelectedEpisodeIds([]);
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'បរាជ័យក្នុងការផ្សាយដំណឹងជាក្រុម');
    } finally {
      setIsBroadcastingBatch(false);
    }
  };

  const handleDelete = (ep: Episode) => {
    triggerConfirm({
      title: `Delete Episode ${ep.episode_number}`,
      message: `Are you sure you want to delete Episode ${ep.episode_number} (${ep.title || 'Untitled'})?`,
      confirmText: 'Delete Episode',
      variant: 'danger',
      onConfirm: async () => {
        await api.delete(`/episodes/${ep.id}`);
        if (selectedAnime) fetchEpisodes(selectedAnime);
      },
    });
  };

  const handleSaveBackup = async () => {
    try {
      setIsSavingBackup(true);
      const res = await api.post('/admin/backup/sync');
      setStatusMessage(`បានរក្សាទុកទិន្នន័យ (${res.data.counts?.episodes || episodes.length} ភាគ) ជាប់រហូត 100%!`);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch {
      setStatusMessage('បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ');
      setTimeout(() => setStatusMessage(''), 4000);
    } finally {
      setIsSavingBackup(false);
    }
  };

  const handleRecoverMissing = async () => {
    triggerConfirm({
      title: 'ស្តារភាគរឿងដែលបាត់បង់ (Recover Missing Episodes)',
      message: 'តើអ្នកចង់ស្តារភាគរឿងទាំងអស់ដែលបានបម្រុងទុកមកវិញមែនទេ? ប្រព័ន្ធនឹងពិនិត្យ និងបញ្ចូលភាគដែលបាត់បង់មកវិញដោយស្វ័យប្រវត្តិ (Safe Merge)។',
      confirmText: 'ស្តារឡើងវិញភ្លាមៗ (Recover)',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsRecovering(true);
          const res = await api.post('/admin/backup/recover-missing');
          setStatusMessage(`បានស្តារភាគដែលបាត់បង់មកវិញជោគជ័យ! (+${res.data.added_counts?.episodes || 0} ភាគ, +${res.data.added_counts?.anime || 0} រឿង)`);
          if (selectedAnime) fetchEpisodes(selectedAnime);
          setTimeout(() => setStatusMessage(''), 5000);
        } catch {
          setStatusMessage('បរាជ័យក្នុងការស្តារទិន្នន័យ');
          setTimeout(() => setStatusMessage(''), 4000);
        } finally {
          setIsRecovering(false);
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const cleanPayload = {
        anime_id: Number(form.anime_id),
        episode_number: Number(form.episode_number),
        title: form.title?.trim() || null,
        description: (form as any).description?.trim() || null,
        video_url: form.video_url?.trim() || null,
        video_qualities: [
          ...(primaryQuality.trim() && form.video_url?.trim() ? [{ label: primaryQuality.trim(), src: form.video_url.trim() }] : []),
          ...videoQualities
            .filter((quality) => quality.src.trim() && quality.src.trim() !== form.video_url?.trim())
            .map((quality) => ({ label: quality.label.trim(), src: quality.src.trim() })),
        ],
        subtitle_url: form.subtitle_url?.trim() || null,
        subtitle_tracks: subtitleTracks
          .filter((track) => track.src.trim())
          .map((track) => ({
            ...track,
            src: track.src.trim(),
            lang: track.lang.trim() || 'und',
            label: track.label.trim() || track.lang.trim() || 'Subtitles',
          })),
        thumbnail_url: form.thumbnail_url?.trim() || null,
        duration_seconds: Number(form.duration_seconds) || 1440,
        is_published: Boolean(form.is_published),
        is_free: !form.is_vip,
      };

      if (editEp) {
        await api.put(`/episodes/${editEp.id}`, cleanPayload);
        setStatusMessage(`បានកែប្រែភាគទី ${cleanPayload.episode_number} ជោគជ័យ!`);
      } else {
        await api.post('/episodes', cleanPayload);
        setStatusMessage(`បានបន្ថែមភាគទី ${cleanPayload.episode_number} ជោគជ័យ!`);
      }
      setTimeout(() => setStatusMessage(''), 4000);
      setShowModal(false);
      if (selectedAnime) fetchEpisodes(selectedAnime);
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      const msg = typeof d === 'string'
        ? d
        : Array.isArray(d)
        ? d.map((x: any) => x.msg || JSON.stringify(x)).join('; ')
        : (d?.msg || err?.message || 'បរាជ័យក្នុងការរក្សាទុកភាគរឿង (Failed to save episode)');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnime) return;
    setSaving(true);
    setError('');
    try {
      const existingEpNums = new Set(episodes.map((e) => e.episode_number));
      for (let epNum = 1; epNum <= batchCount; epNum++) {
        if (!existingEpNums.has(epNum)) {
          await api.post('/episodes', {
            anime_id: selectedAnime,
            episode_number: epNum,
            title: `Episode ${epNum}`,
            video_url: batchUrlPattern,
            duration_seconds: 1440,
            thumbnail_url: '',
            is_published: true,
            is_free: !batchIsVip,
            is_vip: batchIsVip,
          });
        }
      }
      setShowBatchModal(false);
      fetchEpisodes(selectedAnime);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Batch creation partially failed');
    } finally {
      setSaving(false);
    }
  };

  const handleConvertLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!converterInput.trim()) return;
    setConverterLoading(true);
    setConverterError('');
    setConverterOutput('');
    setConverterCopied(false);
    try {
      const res = await api.post('/admin/convert-stream-link', { url: converterInput.trim() });
      if (res.data?.direct_url) {
        setConverterOutput(res.data.direct_url);
      } else {
        setConverterError('Could not resolve direct S3 URL');
      }
    } catch (err: any) {
      setConverterError(err?.response?.data?.detail || err?.message || 'Conversion failed');
    } finally {
      setConverterLoading(false);
    }
  };

  const copyConvertedLink = () => {
    if (!converterOutput) return;
    navigator.clipboard.writeText(converterOutput);
    setConverterCopied(true);
    setTimeout(() => setConverterCopied(false), 2500);
  };

  const useConvertedInNewEpisode = () => {
    openCreate();
    setForm((prev) => ({
      ...prev,
      video_url: converterOutput,
    }));
    setShowConverterModal(false);
  };

  return (
    <AdminLayout title="Episode Stream & VIP Management">
      <div className="space-y-6">
        {/* ── Global Website-Wide VIP & Free Controls (គ្រប់រឿងទាំងអស់) ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                Global Controls — អនុវត្តលើគ្រប់រឿង និងគ្រប់ភាគទាំងអស់ ({animeList.length} រឿង)
              </h3>
              <p className="text-xs text-slate-500">
                កំណត់សិទ្ធិទស្សនា VIP / Free លើគ្រប់រឿងទាំងអស់ក្នុង Website តែ ១ ឃ្លីកប៉ុណ្ណោះ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Global Set All Free */}
            <button
              onClick={handleGlobalSetAllFree}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              title="Set ALL episodes of ALL series to Free"
            >
              <Unlock className="w-4 h-4" /> ដាក់ Free គ្រប់រឿង (All Free)
            </button>

            {/* Global Free 3 Episodes */}
            <button
              onClick={handleGlobalSetFree3Episodes}
              className="px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Free 3 Episodes on ALL Series, and VIP for remaining"
            >
              <Sparkles className="w-4 h-4 text-blue-600" /> Free ៣ ភាគដំបូងគ្រប់រឿង
            </button>

            {/* Global Lock All VIP */}
            <button
              onClick={handleGlobalSetAllVip}
              className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Lock ALL episodes of ALL series to VIP"
            >
              <Crown className="w-4 h-4 fill-amber-500 text-amber-600" /> ដាក់ VIP គ្រប់រឿងទាំងអស់
            </button>

            {/* Quick Backup & Recover */}
            <button
              onClick={handleSaveBackup}
              disabled={isSavingBackup}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="រក្សាទុកភាគ និងទិន្នន័យទាំងអស់ជាប់រហូត"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSavingBackup ? 'animate-spin' : ''}`} />
              <span>{isSavingBackup ? 'កំពុងរក្សា...' : 'Save Data'}</span>
            </button>

            <button
              onClick={handleRecoverMissing}
              disabled={isRecovering}
              className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="ស្តារភាគ និងរឿងដែលបាត់បង់មកវិញ"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
              <span>{isRecovering ? 'កំពុងស្តារ...' : 'ស្តារភាគដែលបាត់'}</span>
            </button>
          </div>
        </div>

        {/* ── CATEGORY SEPARATION TABS ── */}
        <div className="flex items-center gap-2 pt-1 pb-2 overflow-x-auto no-scrollbar scroll-smooth -mx-3 px-3 sm:mx-0 sm:px-0 shrink-0">
          {[
            { id: 'DONGHUA', label: 'Donghua (រឿងចិន)', count: animeList.filter(a => a.type === 'DONGHUA').length },
            { id: 'ANIME', label: 'Anime (រឿងជប៉ុន)', count: animeList.filter(a => a.type === 'ANIME').length },
            { id: 'MOVIE', label: 'Movie (ភាពយន្តដុំ)', count: animeList.filter(a => a.type === 'MOVIE').length },
            { id: 'DRAMA', label: 'Drama (រឿងភាគ)', count: animeList.filter(a => a.type === 'DRAMA').length },
            { id: 'ALL', label: 'ទាំងអស់ (All Series)', count: animeList.length },
          ].map((tab) => {
            const isTabActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCategory(tab.id as any);
                  const firstMatch = tab.id === 'ALL'
                    ? animeList[0]
                    : animeList.find(a => a.type === tab.id);
                  if (firstMatch) {
                    fetchEpisodes(firstMatch.id);
                  }
                }}
                className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isTabActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span className="whitespace-nowrap">{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isTabActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── VISUAL SERIES POSTER SHELF ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-blue-600" /> ចុចលើ Poster រឿងដើម្បីជ្រើសរើស ({filteredAnimeList.length} រឿង)
            </span>
            {seriesSearch && (
              <button
                onClick={() => setSeriesSearch('')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                <span>លុបការស្វែងរក</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {filteredAnimeList.map((a) => {
              const isSelected = a.id === selectedAnime;
              return (
                <button
                  key={a.id}
                  onClick={() => fetchEpisodes(a.id)}
                  className={`group relative flex-shrink-0 w-24 sm:w-28 rounded-xl overflow-hidden bg-white border-2 transition-all cursor-pointer text-left flex flex-col ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md z-10'
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                  title={a.title}
                >
                  <div className="aspect-[3/4] w-full bg-slate-100 relative overflow-hidden">
                    <img
                      src={a.poster_url || a.banner_url}
                      alt={a.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-white border-t border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-900 line-clamp-1">
                      {a.title}
                    </p>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {a.episode_count} ភាគ
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SERIES SELECTOR BAR & QUICK SEARCH ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 w-full">
            {/* Quick Search within category */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={seriesSearch}
                onChange={(e) => setSeriesSearch(e.target.value)}
                placeholder="ស្វែងរកឈ្មោះរឿង..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
              />
            </div>

            {/* Distinct Series Dropdown */}
            <div className="flex items-center gap-2 flex-1 w-full">
              <Film className="w-5 h-5 text-blue-600 shrink-0" />
              <select
                value={selectedAnime || ''}
                onChange={(e) => e.target.value ? fetchEpisodes(parseInt(e.target.value)) : setSelectedAnime(null)}
                className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-2.5 sm:py-2.5 sm:px-3 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 truncate"
                aria-label="Select series to manage episodes"
              >
                {selectedCategory === 'ALL' ? (
                  <>
                    <optgroup label="DONGHUA (រឿងចិន 3D)">
                      {animeList.filter(a => a.type === 'DONGHUA').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} — {a.episode_count} ភាគ
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="ANIME (រឿងជប៉ុន)">
                      {animeList.filter(a => a.type === 'ANIME').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} — {a.episode_count} ភាគ
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="MOVIES (ភាពយន្តដុំ)">
                      {animeList.filter(a => a.type === 'MOVIE').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} — {a.episode_count} ភាគ
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="DRAMA (រឿងភាគ)">
                      {animeList.filter(a => a.type === 'DRAMA').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} — {a.episode_count} ភាគ
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  filteredAnimeList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} — {a.episode_count} ភាគ
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Quick Action Tools */}
          {selectedAnime && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                onClick={() => void generateMissingThumbnails()}
                disabled={isGeneratingThumbnails || !episodes.some(needsEpisodeThumbnail)}
                className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Create episode stills from the R2 video links and save them to R2"
              >
                {isGeneratingThumbnails ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                {isGeneratingThumbnails ? 'Generating...' : `Generate images (${episodes.filter(needsEpisodeThumbnail).length})`}
              </button>
              <button
                onClick={handleSetFreeFirst3Episodes}
                className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Set Ep 1-3 to Free and remaining episodes to VIP"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Free 3 ភាគ
              </button>

              <button
                onClick={() => handleBatchVipToggle(true)}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Lock all episodes in this series to VIP"
              >
                <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" /> Lock VIP
              </button>

              <button
                onClick={() => handleBatchVipToggle(false)}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Unlock all episodes in this series to Free"
              >
                <Unlock className="w-3.5 h-3.5" /> Set Free
              </button>

              <button
                onClick={() => {
                  setShowConverterModal(true);
                  setConverterError('');
                  setConverterOutput('');
                  setConverterCopied(false);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Convert Link 1 (API Stream) to Link 2 (Direct S3 MP4)"
              >
                <Link2 className="w-3.5 h-3.5 text-blue-600" /> Convert Link
              </button>

              <button
                onClick={() => setShowBatchModal(true)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-blue-600" /> Batch Add
              </button>

              <button
                onClick={openCreate}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer col-span-2 sm:col-span-1"
              >
                <Plus className="w-4 h-4" /> បន្ថែមភាគថ្មី
              </button>
            </div>
          )}
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* ── SELECTED SERIES SHOWCASE BANNER ── */}
        {currentAnime && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4 bg-white border border-slate-200/80 p-3.5 sm:p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
              <img
                src={currentAnime.poster_url || currentAnime.banner_url}
                alt=""
                className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${
                      currentAnime.type === 'DONGHUA'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : currentAnime.type === 'ANIME'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : currentAnime.type === 'MOVIE'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {currentAnime.type === 'DONGHUA' ? 'រឿងចិន 3D' : currentAnime.type === 'ANIME' ? 'រឿងជប៉ុន' : currentAnime.type === 'MOVIE' ? 'ភាពយន្តដុំ' : 'រឿងភាគ'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">· {currentAnime.year || 2024}</span>
                  <span className="text-[11px] text-emerald-700 font-semibold">· {episodes.length} ភាគសរុប</span>
                </div>
                <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                  {currentAnime.title}
                </h3>
                {currentAnime.alt_title && (
                  <p className="text-[11px] text-slate-500 truncate">{currentAnime.alt_title}</p>
                )}
              </div>
            </div>

            <Link
              to={`/${currentAnime.type === 'ANIME' ? 'anime' : currentAnime.type === 'MOVIE' ? 'movie' : currentAnime.type === 'DRAMA' ? 'drama' : 'donghua'}/${currentAnime.slug}`}
              target="_blank"
              className="w-full sm:w-auto text-center px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
            >
              មើលលើ Website <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ── EPISODES LIST WITH EPISODE SEARCH & QUICK FILTERS ── */}
        {selectedAnime && (
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            {/* Header Controls & Filter Pills */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 space-y-3 bg-slate-50/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-xs sm:text-sm text-slate-900">
                    បញ្ជីភាគ ({episodes.length} ភាគ)
                  </span>
                  {episodeSearch && (
                    <span className="text-xs text-slate-500">
                      — រកឃើញ {filteredEpisodes.length} ភាគ
                    </span>
                  )}
                </div>

                {/* Search specific episode */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={episodeSearch}
                    onChange={(e) => setEpisodeSearch(e.target.value)}
                    placeholder="ស្វែងរកភាគ (ឧ. 1, 2, 25)..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  />
                </div>
              </div>

              {/* Usability Filter Pills & Select / Add Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setEpisodeFilterTab('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      episodeFilterTab === 'ALL'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    ទាំងអស់ ({episodes.length})
                  </button>
                  <button
                    onClick={() => setEpisodeFilterTab('FREE')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                      episodeFilterTab === 'FREE'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <Unlock className="w-3 h-3" /> Free ({freeCount})
                  </button>
                  <button
                    onClick={() => setEpisodeFilterTab('VIP')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                      episodeFilterTab === 'VIP'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <Crown className="w-3 h-3 fill-current" /> VIP ({vipCount})
                  </button>
                  {missingCount > 0 && (
                    <button
                      onClick={() => setEpisodeFilterTab('MISSING')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                        episodeFilterTab === 'MISSING'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <AlertCircle className="w-3 h-3" /> ខ្វះ Link ({missingCount})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Select All Toggle Button */}
                  <button
                    onClick={toggleSelectAll}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="ជ្រើសរើសគ្រប់ភាគទាំងអស់ក្នុងរឿងនេះ"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {selectedEpisodeIds.length === filteredEpisodes.length && filteredEpisodes.length > 0
                        ? 'ដោះការរើស (Deselect)'
                        : 'រើសទាំងអស់ (Select All)'}
                    </span>
                  </button>

                  {/* 1-Click Quick Add Next Episode */}
                  <button
                    onClick={openCreate}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> ភាគ {nextEpNum}
                  </button>
                </div>
              </div>

              {/* ── BATCH SELECTION ACTION BAR ── */}
              {selectedEpisodeIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                      {selectedEpisodeIds.length}
                    </span>
                    <span className="text-xs font-semibold text-blue-900">
                      បានជ្រើសរើស {selectedEpisodeIds.length} ភាគក្នុងចំណោម {filteredEpisodes.length} ភាគ
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleBatchBroadcastTelegram}
                      disabled={isBroadcastingBatch}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Send className={`w-3.5 h-3.5 ${isBroadcastingBatch ? 'animate-bounce' : ''}`} />
                      <span>{isBroadcastingBatch ? 'កំពុងផ្ញើ...' : `ផ្សាយទៅ Telegram (${selectedEpisodeIds.length})`}</span>
                    </button>

                    <button
                      onClick={handleBatchDeleteSelected}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>លុបភាគ ({selectedEpisodeIds.length})</span>
                    </button>

                    <button
                      onClick={() => setSelectedEpisodeIds([])}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>បោះបង់</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── MOBILE VIEW: Touch-friendly cards for phones (md:hidden) ── */}
            <div className="block md:hidden p-3 space-y-2.5">
              {isLoading ? (
                <p className="text-center text-slate-500 py-8 text-xs">កំពុងទាញយកទិន្នន័យភាគ...</p>
              ) : filteredEpisodes.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-xs">
                  {episodeSearch ? `រកមិនឃើញភាគ "${episodeSearch}" ឡើយ` : 'មិនទាន់មានភាគនៅឡើយទេ'}
                </p>
              ) : (
                filteredEpisodes.map((ep) => {
                  const isVip = ep.is_vip ?? (ep.is_free === false || (ep as any).is_vip_only);
                  const isSelected = selectedEpisodeIds.includes(ep.id);
                  return (
                    <div
                      key={ep.id}
                      onClick={() => toggleSelectEpisode(ep.id)}
                      className={`p-3 rounded-xl border transition-all space-y-2 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20'
                          : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectEpisode(ep.id);
                            }}
                            className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                          <span className="font-display font-bold text-[11px] px-2 py-0.5 rounded-lg bg-blue-600 text-white shrink-0">
                            EP {ep.episode_number.toString().padStart(2, '0')}
                          </span>
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {ep.title || `Episode ${ep.episode_number}`}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0 border ${
                            ep.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {ep.is_published ? 'Live' : 'Draft'}
                        </span>
                      </div>

                      {/* URL & Duration */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pl-6">
                        <span className={`truncate max-w-[200px] font-mono text-[10px] font-medium ${ep.video_url ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {ep.video_url ? 'S3 Stream Set' : 'No Stream URL'}
                        </span>
                        <span>{ep.duration_seconds > 0 ? `${Math.floor(ep.duration_seconds / 60)}m` : '24m'}</span>
                      </div>

                      {/* Actions row on mobile */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 pl-6" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleEpisodeVip(ep)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            isVip
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isVip ? (
                            <>
                              <Crown className="w-3 h-3 fill-amber-500 text-amber-600" />
                              <span>VIP Only</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-600" />
                              <span>Free Watch</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSingleBroadcastTelegram(ep)}
                            disabled={broadcastingEpId === ep.id}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                            title="ផ្ញើសារដំណឹងភាគនេះទៅ Telegram Group"
                          >
                            <Send className={`w-3.5 h-3.5 ${broadcastingEpId === ep.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => setPreviewVideoEp(ep)}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                            title="ចាក់តេស្តវីដេអូក្នុង Dashboard"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => openEdit(ep)}
                            className="p-2 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ep)}
                            className="p-2 rounded-lg bg-white text-slate-500 border border-slate-200 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── DESKTOP & TABLET VIEW: Full Data Table (hidden on mobile md:block) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3.5 text-left w-12">
                      <input
                        type="checkbox"
                        checked={filteredEpisodes.length > 0 && selectedEpisodeIds.length === filteredEpisodes.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="ជ្រើសរើសទាំងអស់"
                      />
                    </th>
                    <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">ភាគ #</th>
                    <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">ចំណងជើង (Title)</th>
                    <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">សិទ្ធិមើល (Access)</th>
                    <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">Stream URL</th>
                    <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">Duration</th>
                    <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">Status</th>
                    <th className="px-4 py-3.5 text-right text-slate-500 font-semibold text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center text-slate-500 py-12">កំពុងទាញយកទិន្នន័យភាគ...</td></tr>
                  ) : filteredEpisodes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-slate-500 py-12">
                        {episodeSearch
                          ? `រកមិនឃើញភាគដែលស្វែងរក "${episodeSearch}" ឡើយ`
                          : 'មិនទាន់មានភាគនៅឡើយទេ! សូមចុច Batch Add ឬ បន្ថែមភាគថ្មី'}
                      </td>
                    </tr>
                  ) : (
                    filteredEpisodes.map((ep) => {
                      const isVip = ep.is_vip ?? (ep.is_free === false || (ep as any).is_vip_only);
                      const isSelected = selectedEpisodeIds.includes(ep.id);
                      return (
                        <tr
                          key={ep.id}
                          onClick={() => toggleSelectEpisode(ep.id)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-3.5 w-12" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectEpisode(ep.id)}
                              className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-display font-bold text-sm text-blue-600">
                              EP {ep.episode_number.toString().padStart(2, '0')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-900 font-medium">
                            {ep.title || `Episode ${ep.episode_number}`}
                          </td>
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleEpisodeVip(ep)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                isVip
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title="Click to toggle VIP / Free"
                            >
                              {isVip ? (
                                <>
                                  <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                                  <span>VIP Only</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Free Watch</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {ep.video_url ? (
                              isYouTubeUrl(ep.video_url) ? (
                                <span className="text-xs font-mono text-rose-600 flex items-center gap-1.5 truncate max-w-xs font-semibold">
                                  <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                  </svg>
                                  <span>YouTube: {parseYouTubeVideoId(ep.video_url)}</span>
                                </span>
                              ) : (
                                <span className="text-xs font-mono text-emerald-700 flex items-center gap-1 truncate max-w-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                  {ep.video_url.substring(0, 45)}...
                                </span>
                              )
                            ) : (
                              <span className="text-rose-600 text-xs flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3.5 h-3.5" /> No Stream URL
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs">
                            {ep.duration_seconds > 0 ? `${Math.floor(ep.duration_seconds / 60)} mins` : '24 mins'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                ep.is_published
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {ep.is_published ? 'Live' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSingleBroadcastTelegram(ep)}
                                disabled={broadcastingEpId === ep.id}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 transition cursor-pointer"
                                title="ផ្ញើសារដំណឹងភាគនេះទៅ Telegram Group"
                              >
                                <Send className={`w-4 h-4 ${broadcastingEpId === ep.id ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                onClick={() => setPreviewVideoEp(ep)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 transition cursor-pointer"
                                title="ចាក់តេស្តវីដេអូក្នុង Dashboard"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </button>
                              <button
                                onClick={() => openEdit(ep)}
                                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-blue-600 transition cursor-pointer"
                                title="Edit Episode"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(ep)}
                                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                                title="Delete Episode"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── IN-DASHBOARD INSTANT VIDEO PREVIEW PLAYER MODAL ── */}
        {previewVideoEp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-bold text-xs shrink-0">
                    EP {previewVideoEp.episode_number}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 truncate">
                    {previewVideoEp.title || `Episode ${previewVideoEp.episode_number}`}
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewVideoEp(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {previewVideoEp.video_url ? (
                  <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
                    {isYouTubeUrl(previewVideoEp.video_url) ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${parseYouTubeVideoId(previewVideoEp.video_url)}?autoplay=1&enablejsapi=1&rel=0`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="w-full h-full border-0"
                      />
                    ) : (
                      <video
                        src={previewVideoEp.video_url}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-500">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">ភាគនេះមិនទាន់មានតំណភ្ជាប់ Stream URL ឡើយ</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                  <span className="truncate max-w-md font-mono text-[11px] text-slate-600">
                    {previewVideoEp.video_url || 'No URL'}
                  </span>
                  {currentAnime && (
                    <Link
                      to={`/watch/${currentAnime.slug}/${previewVideoEp.episode_number}`}
                      target="_blank"
                      className="text-blue-600 hover:underline font-semibold flex items-center gap-1 shrink-0"
                    >
                      បើកមើលលើ Frontend <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single Episode Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 shrink-0">
              <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                {editEp ? `កែប្រែភាគទី ${editEp.episode_number}` : 'បន្ថែមភាគរឿងថ្មី'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>រឿង (Series) *</label>
                  <select
                    value={form.anime_id || ''}
                    onChange={(e) => setForm((f) => ({ ...f, anime_id: parseInt(e.target.value) }))}
                    required
                    className={`${INPUT_CLASS} text-xs`}
                  >
                    {animeList.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>ភាគទី (Episode #) *</label>
                  <input
                    type="number"
                    value={form.episode_number}
                    onChange={(e) => setForm((f) => ({ ...f, episode_number: parseInt(e.target.value) || 1 }))}
                    required
                    min="1"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>ចំណងជើងភាគ (Episode Title)</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="ឧ. ភាគទី ១ (ឬទុកចោលក៏បាន)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    តំណភ្ជាប់វីដេអូ (Facebook / YouTube / MP4 / HLS / Iframe) *
                  </label>
                  {isYouTubeUrl(form.video_url) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full shrink-0">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      YouTube Detected
                    </span>
                  )}
                  {isFacebookUrl(form.video_url) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shrink-0">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook Video Detected
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={form.video_url}
                  onChange={(e) => {
                    const nextUrl = e.target.value;
                    setForm((f) => ({ ...f, video_url: nextUrl }));
                    if (nextUrl.trim() !== form.video_url.trim()) setPrimaryQuality('');
                  }}
                  className={`${INPUT_CLASS} font-mono text-xs`}
                  placeholder="https://www.facebook.com/... ឬ YouTube ឬ MP4 / m3u8"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  អាចដាក់ link Facebook Video (fb.watch, facebook.com/watch), YouTube (watch?v=, youtu.be), MP4, m3u8 ឬ iframe embed ក៏បាន
                </p>

                {/* YouTube Link Preview Card */}
                {isYouTubeUrl(form.video_url) && (
                  <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getYouTubeThumbnail(form.video_url, 'hq') || ''}
                        alt="YouTube preview"
                        className="w-16 h-10 rounded-lg object-cover border border-rose-200 shrink-0 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          YouTube Video ID: <span className="text-rose-600">{parseYouTubeVideoId(form.video_url)}</span>
                        </p>
                        <p className="text-[10px] text-slate-500">Player នឹងចាក់ដោយស្វ័យប្រវត្តិគ្មាន Error ឡើយ</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const thumb = getYouTubeThumbnail(form.video_url, 'hq');
                        if (thumb) setForm((f) => ({ ...f, thumbnail_url: thumb }));
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold shrink-0 transition-colors shadow-sm cursor-pointer"
                    >
                      ប្រើ Thumbnail នេះ
                    </button>
                  </div>
                )}

                {/* Facebook Link Preview Card */}
                {isFacebookUrl(form.video_url) && (
                  <div className="mt-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                          Facebook Video Stream
                        </p>
                        <p className="text-[11px] text-slate-600">
                          ត្រូវប្រាកដថា Post នោះដាក់ Privacy ជា <span className="text-emerald-700 font-bold">Public (សាធារណៈ)</span> ទើបអាចទស្សនាបានពេញលេញ
                        </p>
                      </div>
                    </div>
                    <a
                      href={form.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shrink-0 transition-colors shadow-sm flex items-center gap-1"
                    >
                      តេស្តបើកមើល <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className={LABEL_CLASS}>តំណភ្ជាប់អក្សររត់ (Subtitle URL: .vtt)</label>
                <input
                  type="url"
                  value={form.subtitle_url}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle_url: e.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="https://.../subtitles-kh.vtt"
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>រូបភាពតំណាងភាគ (Episode Thumbnail URL)</label>
                <input
                  type="url"
                  value={form.thumbnail_url}
                  onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                  className={`${INPUT_CLASS} font-mono text-xs`}
                  placeholder="https://.../episode-02.jpg"
                />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={isUploadingThumbnail}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) void uploadEpisodeThumbnail(file);
                      event.currentTarget.value = '';
                    }}
                  />
                  {isUploadingThumbnail ? 'កំពុង Upload រូបភាព...' : 'Upload រូបភាពភាគ'}
                </label>
                <p className="mt-1 text-[11px] text-slate-500">
                  បញ្ចូល URL រូបភាព frame ពិតរបស់ភាគនេះ។ សម្រាប់ YouTube អាចប្រើប៊ូតុង Thumbnail ខាងលើ។
                </p>
                {form.thumbnail_url.trim() && (
                  <img
                    src={form.thumbnail_url}
                    alt="Episode thumbnail preview"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    onLoad={(event) => { event.currentTarget.style.display = 'block'; }}
                    className="mt-2 aspect-video max-h-36 w-auto rounded-xl border border-slate-200 object-cover"
                  />
                )}
              </div>

              <div>
                <label className={LABEL_CLASS}>Subtitles by language (WebVTT .vtt)</label>
                <p className="mb-2 text-xs text-slate-500">
                  Add real subtitle file URLs. A language appears in the player only when its file is provided.
                </p>
                <div className="space-y-2">
                  {subtitleTracks.map((track, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
                      <input
                        className={INPUT_CLASS}
                        value={track.label}
                        placeholder="Name (Khmer)"
                        onChange={(e) => setSubtitleTracks((items) => items.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)))}
                      />
                      <input
                        className={INPUT_CLASS}
                        value={track.lang}
                        placeholder="Language (km)"
                        onChange={(e) => setSubtitleTracks((items) => items.map((item, i) => (i === index ? { ...item, lang: e.target.value } : item)))}
                      />
                      <input
                        type="url"
                        className={INPUT_CLASS}
                        value={track.src}
                        placeholder="https://.../subtitles-km.vtt"
                        onChange={(e) => setSubtitleTracks((items) => items.map((item, i) => (i === index ? { ...item, src: e.target.value } : item)))}
                      />
                      <button
                        type="button"
                        className="rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-colors"
                        onClick={() => setSubtitleTracks((items) => items.filter((_, i) => i !== index))}
                        aria-label="Remove subtitle track"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 transition-colors"
                  onClick={() => setSubtitleTracks((items) => [...items, { label: '', lang: '', src: '' }])}
                >
                  <Plus className="w-3.5 h-3.5" /> Add subtitle language
                </button>
              </div>

              <div>
                <label className={LABEL_CLASS} htmlFor="primary-video-quality">Quality of the main video link</label>
                <p className="mb-2 text-xs text-slate-500">
                  Detect the resolution from this video link or enter its label. This uses the one source URL and does not create other encodes.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="primary-video-quality"
                    className={`${INPUT_CLASS} flex-1`}
                    value={primaryQuality}
                    onChange={(event) => setPrimaryQuality(event.target.value)}
                    placeholder="1080p"
                  />
                  <button
                    type="button"
                    onClick={detectPrimaryQuality}
                    disabled={isDetectingQuality || !form.video_url.trim() || isYouTubeUrl(form.video_url) || isFacebookUrl(form.video_url)}
                    className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
                  >
                    {isDetectingQuality ? 'Reading video...' : 'Detect from link'}
                  </button>
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>Alternate video quality sources</label>
                <p className="mb-2 text-xs text-slate-500">
                  Add separate encoded files (or a quality-specific HLS URL). The player switches to these real sources.
                </p>
                <div className="space-y-2">
                  {videoQualities.map((quality, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_3fr_auto]">
                      <input
                        className={INPUT_CLASS}
                        value={quality.label}
                        placeholder="720p HD"
                        onChange={(e) => setVideoQualities((items) => items.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)))}
                      />
                      <input
                        type="url"
                        className={INPUT_CLASS}
                        value={quality.src}
                        placeholder="https://.../episode-720p.mp4"
                        onChange={(e) => setVideoQualities((items) => items.map((item, i) => (i === index ? { ...item, src: e.target.value } : item)))}
                      />
                      <button
                        type="button"
                        className="rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-colors"
                        onClick={() => setVideoQualities((items) => items.filter((_, i) => i !== index))}
                        aria-label="Remove video quality source"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 transition-colors"
                  onClick={() => setVideoQualities((items) => [...items, { label: '', src: '' }])}
                >
                  <Plus className="w-3.5 h-3.5" /> Add video quality
                </button>
              </div>

              {/* VIP Access Control Box */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Crown className="w-4 h-4 fill-amber-500" />
                  </div>
                  <div>
                    <label htmlFor="is_vip_toggle" className="text-xs font-bold text-slate-900 block cursor-pointer">
                      Lock to VIP Only (ដាក់ VIP)
                    </label>
                    <span className="text-[11px] text-slate-600 block">
                      {form.is_vip ? 'ទាល់តែមានគណនី VIP ទើបអាចទស្សនាបាន' : 'គ្រប់គ្នាចុចមើលបានដោយសេរី (Free Watch)'}
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="is_vip_toggle"
                    checked={form.is_vip}
                    onChange={(e) => setForm((f) => ({ ...f, is_vip: e.target.checked, is_free: !e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>រយៈពេល (Duration គិតជាវិនាទី)</label>
                  <input
                    type="number"
                    value={form.duration_seconds}
                    onChange={(e) => setForm((f) => ({ ...f, duration_seconds: parseInt(e.target.value) || 0 }))}
                    className={INPUT_CLASS}
                    min="0"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-700">ផ្សាយផ្ទាល់ (Published / Live)</span>
                  </label>
                </div>
              </div>

              {error && <p className="text-rose-600 text-xs">{error}</p>}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'កំពុងរក្សាទុក...' : editEp ? 'កែប្រែភាគរឿង' : 'រក្សាទុកភាគរឿង'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-3 px-5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Generator Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" /> Batch Add Episodes
              </h2>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchGenerate} className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Automatically generate episodes 1 through N for <strong className="text-slate-900">{currentAnime?.title}</strong>.
              </p>

              <div>
                <label className={LABEL_CLASS}>Total Episodes to Generate</label>
                <input
                  type="number"
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                  min="1"
                  max="100"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>Sample Stream URL Template</label>
                <input
                  type="url"
                  value={batchUrlPattern}
                  onChange={(e) => setBatchUrlPattern(e.target.value)}
                  className={`${INPUT_CLASS} text-xs`}
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" /> Lock all new episodes to VIP
                </span>
                <input
                  type="checkbox"
                  checked={batchIsVip}
                  onChange={(e) => setBatchIsVip(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {error && <p className="text-rose-600 text-xs">{error}</p>}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {saving ? 'Generating...' : `Generate ${batchCount} Episodes`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="py-3 px-5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Link Converter Modal (Link 1 -> Link 2 S3 MP4) ── */}
      {showConverterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-600" /> Stream Link Converter (Link 1 to S3 MP4)
              </h2>
              <button
                onClick={() => setShowConverterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertLink} className="p-6 space-y-4">
              <div>
                <label className={LABEL_CLASS}>Paste Type 1 Link (/api/video-stream?...)</label>
                <textarea
                  value={converterInput}
                  onChange={(e) => setConverterInput(e.target.value)}
                  required
                  rows={3}
                  placeholder="https://nintanime.com/api/video-stream?episodeId=...&sig=..."
                  className={`${INPUT_CLASS} font-mono text-xs resize-none`}
                />
              </div>

              {converterError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{converterError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={converterLoading || !converterInput.trim()}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {converterLoading ? 'Resolving S3 Direct Link...' : 'Convert to Direct S3 Link'}
              </button>

              {converterOutput && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Direct S3 MP4 URL (Link Type 2):</span>
                    {converterCopied && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </span>
                    )}
                  </label>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 font-mono text-xs text-blue-700 break-all select-all">
                    {converterOutput}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={copyConvertedLink}
                      className="text-xs font-semibold py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex-1 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>
                    <button
                      type="button"
                      onClick={useConvertedInNewEpisode}
                      className="text-xs font-semibold py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex-1 flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Use in New Episode
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
