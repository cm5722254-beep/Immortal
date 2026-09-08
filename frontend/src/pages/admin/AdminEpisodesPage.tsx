import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Edit3, Trash2, X, Play, Film,
  ExternalLink, CheckCircle2, AlertCircle, Layers,
  Crown, Unlock, Sparkles, Globe, Link2, Copy, Check,
  Search, RefreshCw, RotateCcw, CheckSquare, Send
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { triggerConfirm } from '../../store/confirmStore';
import api from '../../services/api';
import { loadCatalog } from '../../services/catalogService';
import type { Anime, Episode } from '../../types';
import { parseYouTubeVideoId, isYouTubeUrl, getYouTubeThumbnail } from '../../utils/youtube';

const EMPTY_EP = {
  anime_id: 0, episode_number: 1, title: '',
  video_url: '', subtitle_url: '', thumbnail_url: '',
  duration_seconds: 1440, is_published: true, is_vip: true, is_free: false,
};

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

  const openCreate = () => {
    setEditEp(null);
    const maxEp = episodes.length > 0 ? Math.max(...episodes.map((e) => e.episode_number)) : 0;
    setForm({
      ...EMPTY_EP,
      anime_id: selectedAnime || 0,
      episode_number: maxEp + 1,
      thumbnail_url: currentAnime?.poster_url || '',
      is_vip: true,
      is_free: false,
    });
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
      // Optimistic update
      setEpisodes((prev) =>
        prev.map((e) =>
          e.id === ep.id
            ? { ...e, is_vip: newIsVip, is_free: !newIsVip, is_vip_only: newIsVip }
            : e
        )
      );
      setStatusMessage(`Episode ${ep.episode_number} ${newIsVip ? 'locked to VIP 👑' : 'set to Free 🟢'}`);
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
        // 1. Instant 0ms Optimistic UI Update
        setEpisodes((prev) =>
          prev.map((ep) => ({ ...ep, is_free: true, is_vip: false, is_vip_only: false }))
        );
        setStatusMessage('✅ All episodes of ALL anime series are now set to Free (គ្រប់រឿងដាក់ Free ទាំងអស់)!');
        setTimeout(() => setStatusMessage(''), 4000);

        // 2. Background sync
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
        // 1. Instant 0ms Optimistic UI Update
        setEpisodes((prev) =>
          prev.map((ep) => {
            const isFree = ep.episode_number <= 3;
            return { ...ep, is_free: isFree, is_vip: !isFree, is_vip_only: !isFree };
          })
        );
        setStatusMessage('✅ Episodes 1-3 set to Free & Ep 4+ locked to VIP for ALL series!');
        setTimeout(() => setStatusMessage(''), 4000);

        // 2. Background sync
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
        // 1. Instant 0ms Optimistic UI Update
        setEpisodes((prev) =>
          prev.map((ep) => ({ ...ep, is_free: false, is_vip: true, is_vip_only: true }))
        );
        setStatusMessage('👑 All episodes of ALL series are now locked to VIP (គ្រប់រឿងជាប់ VIP ទាំងអស់)!');
        setTimeout(() => setStatusMessage(''), 4000);

        // 2. Background sync
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
        // Instant UI update
        setEpisodes((prev) =>
          prev.map((ep) => {
            const isFree = ep.episode_number <= 3;
            return { ...ep, is_free: isFree, is_vip: !isFree, is_vip_only: !isFree };
          })
        );
        setStatusMessage('Episodes 1, 2 & 3 set to Free 🟢 (Ep 4+ locked to VIP 👑)');
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
        // Instant UI update
        setEpisodes((prev) =>
          prev.map((ep) => ({
            ...ep,
            is_free: !lockAllToVip,
            is_vip: lockAllToVip,
            is_vip_only: lockAllToVip,
          }))
        );
        setStatusMessage(lockAllToVip ? 'All episodes locked to VIP 👑' : 'All episodes set to Free 🟢');
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
        // Instant Optimistic Update
        setEpisodes((prev) => prev.filter((e) => !toDelete.includes(e.id)));
        setSelectedEpisodeIds([]);
        setStatusMessage(`✅ បានលុប ${count} ភាគដោយជោគជ័យ!`);
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
      setStatusMessage(res.data?.message || `📢 បានផ្ញើសារដំណឹង ភាគ ${ep.episode_number} ទៅកាន់ Telegram រួចរាល់!`);
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
      setStatusMessage(res.data?.message || `🎉 បានផ្សាយដំណឹង ${count} ភាគដែលបានរើសទៅ Telegram រួចរាល់!`);
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
      setStatusMessage(`💾 បានរក្សាទុកទិន្នន័យ (${res.data.counts?.episodes || episodes.length} ភាគ) ជាប់រហូត 100%!`);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err: any) {
      setStatusMessage(`⚠️ បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ`);
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
          setStatusMessage(`🎉 បានស្តារភាគដែលបាត់បង់មកវិញជោគជ័យ! (+${res.data.added_counts?.episodes || 0} ភាគ, +${res.data.added_counts?.anime || 0} រឿង)`);
          if (selectedAnime) fetchEpisodes(selectedAnime);
          setTimeout(() => setStatusMessage(''), 5000);
        } catch (err: any) {
          setStatusMessage(`⚠️ បរាជ័យក្នុងការស្តារទិន្នន័យ`);
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
        subtitle_url: form.subtitle_url?.trim() || null,
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
            thumbnail_url: currentAnime?.poster_url || '',
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
        <div className="card p-5 bg-gradient-to-r from-[#161f33] via-[#111726] to-[#161f33] border border-amber-500/30 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/40 shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                Global Controls — អនុវត្តលើគ្រប់រឿង និងគ្រប់ភាគទាំងអស់ ({animeList.length} រឿង)
              </h3>
              <p className="text-xs text-gray-400">
                កំណត់សិទ្ធិទស្សនា VIP / Free លើគ្រប់រឿងទាំងអស់ក្នុង Website តែ ១ ឃ្លីកប៉ុណ្ណោះ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Global Set All Free */}
            <button
              onClick={handleGlobalSetAllFree}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
              title="Set ALL episodes of ALL series to Free"
            >
              <Unlock className="w-4 h-4 stroke-[2.5]" /> 🟢 ដាក់ Free គ្រប់រឿង (All Free)
            </button>

            {/* Global Free 3 Episodes */}
            <button
              onClick={handleGlobalSetFree3Episodes}
              className="px-3.5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Free 3 Episodes on ALL Series, and VIP for remaining"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" /> ✨ Free ៣ ភាគដំបូងគ្រប់រឿង
            </button>

            {/* Global Lock All VIP */}
            <button
              onClick={handleGlobalSetAllVip}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Lock ALL episodes of ALL series to VIP"
            >
              <Crown className="w-4 h-4 fill-amber-400" /> 👑 ដាក់ VIP គ្រប់រឿងទាំងអស់
            </button>

            {/* Quick Backup & Recover */}
            <button
              onClick={handleSaveBackup}
              disabled={isSavingBackup}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="រក្សាទុកភាគ និងទិន្នន័យទាំងអស់ជាប់រហូត"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSavingBackup ? 'animate-spin' : ''}`} />
              <span>{isSavingBackup ? 'កំពុងរក្សា...' : '💾 Save Data'}</span>
            </button>

            <button
              onClick={handleRecoverMissing}
              disabled={isRecovering}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="ស្តារភាគ និងរឿងដែលបាត់បង់មកវិញ"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
              <span>{isRecovering ? 'កំពុងស្តារ...' : '🔄 ស្តារភាគដែលបាត់'}</span>
            </button>
          </div>
        </div>

        {/* ── CATEGORY SEPARATION TABS (Donghua ផ្សេង, Anime ផ្សេង, Movie ផ្សេង...) ── */}
        <div className="flex items-center gap-2 pt-1 pb-2 overflow-x-auto no-scrollbar scroll-smooth -mx-3 px-3 sm:mx-0 sm:px-0 shrink-0">
          {[
            { id: 'DONGHUA', label: '🇨🇳 Donghua (រឿងចិន)', count: animeList.filter(a => a.type === 'DONGHUA').length },
            { id: 'ANIME', label: '🇯🇵 Anime (រឿងជប៉ុន)', count: animeList.filter(a => a.type === 'ANIME').length },
            { id: 'MOVIE', label: '🍿 Movie (ភាពយន្តដុំ)', count: animeList.filter(a => a.type === 'MOVIE').length },
            { id: 'DRAMA', label: '🎭 Drama (រឿងភាគ)', count: animeList.filter(a => a.type === 'DRAMA').length },
            { id: 'ALL', label: '✨ ទាំងអស់ (All Series)', count: animeList.length },
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
                className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isTabActive
                    ? 'bg-[#E50914] text-white shadow-lg shadow-red-600/40 ring-2 ring-red-500/50'
                    : 'bg-[#181818] hover:bg-[#252525] text-gray-300 border border-white/10'
                }`}
              >
                <span className="whitespace-nowrap">{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  isTabActive ? 'bg-black/40 text-white' : 'bg-black/60 text-gray-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── VISUAL SERIES POSTER SHELF (រើសរឿងតាម Poster ងាយស្រួលចុច 1-Click) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-[#E50914]" /> ចុចលើ Poster រឿងដើម្បីជ្រើសរើស ({filteredAnimeList.length} រឿង)
            </span>
            {seriesSearch && (
              <button
                onClick={() => setSeriesSearch('')}
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                លុបការស្វែងរក ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            {filteredAnimeList.map((a) => {
              const isSelected = a.id === selectedAnime;
              return (
                <button
                  key={a.id}
                  onClick={() => fetchEpisodes(a.id)}
                  className={`group relative flex-shrink-0 w-24 sm:w-28 rounded-xl overflow-hidden border-2 transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-[#E50914] ring-2 ring-red-500/50 shadow-lg shadow-red-600/30 scale-105 z-10'
                      : 'border-white/10 hover:border-white/40 opacity-75 hover:opacity-100 hover:scale-102'
                  }`}
                  title={a.title}
                >
                  <div className="aspect-[3/4] w-full bg-dark-muted relative">
                    <img
                      src={a.poster_url || a.banner_url}
                      alt={a.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none" />

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}

                    <div className="absolute bottom-1.5 inset-x-1.5 text-center pointer-events-none">
                      <p className="text-[10px] font-bold text-white line-clamp-1 drop-shadow">
                        {a.title}
                      </p>
                      <span className="text-[9px] text-gray-300 font-mono">
                        {a.episode_count} ភាគ
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SERIES SELECTOR BAR & QUICK SEARCH ── */}
        <div className="card p-3 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4 shadow-2xl bg-[#181818] border border-white/10 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 w-full">
            {/* Quick Search within category */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={seriesSearch}
                onChange={(e) => setSeriesSearch(e.target.value)}
                placeholder="ស្វែងរកឈ្មោះរឿង..."
                className="input pl-9 pr-3 py-2 text-xs rounded-xl bg-[#121212] border border-white/10 text-white w-full placeholder-gray-500"
              />
            </div>

            {/* Distinct Series Dropdown */}
            <div className="flex items-center gap-2 flex-1 w-full">
              <Film className="w-5 h-5 text-amber-400 shrink-0" />
              <select
                value={selectedAnime || ''}
                onChange={(e) => e.target.value ? fetchEpisodes(parseInt(e.target.value)) : setSelectedAnime(null)}
                className="input py-2 px-2.5 sm:py-2.5 sm:px-3 text-xs md:text-sm flex-1 font-bold bg-[#121212] border border-white/15 text-white rounded-xl focus:border-[#E50914] truncate"
                aria-label="Select series to manage episodes"
              >
                {selectedCategory === 'ALL' ? (
                  <>
                    <optgroup label="🇨🇳 DONGHUA (រឿងចិន 3D)">
                      {animeList.filter(a => a.type === 'DONGHUA').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} — {a.episode_count} ភាគ
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🇯🇵 ANIME (រឿងជប៉ុន)">
                      {animeList.filter(a => a.type === 'ANIME').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} — {a.episode_count} ភាគ
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🍿 MOVIES (ភាពយន្តដុំ)">
                      {animeList.filter(a => a.type === 'MOVIE').map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} — {a.episode_count} ភាគ
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🎭 DRAMA (រឿងភាគ)">
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

          {/* Quick Action Tools: 2 Columns on Mobile, Wrap on Tablet/Desktop */}
          {selectedAnime && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                onClick={handleSetFreeFirst3Episodes}
                className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                title="Set Ep 1-3 to Free and remaining episodes to VIP"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Free 3 ភាគ
              </button>

              <button
                onClick={() => handleBatchVipToggle(true)}
                className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Lock all episodes in this series to VIP"
              >
                <Crown className="w-3.5 h-3.5 fill-amber-400" /> Lock VIP
              </button>

              <button
                onClick={() => handleBatchVipToggle(false)}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Convert Link 1 (API Stream) to Link 2 (Direct S3 MP4)"
              >
                <Link2 className="w-3.5 h-3.5" /> Convert Link
              </button>

              <button
                onClick={() => setShowBatchModal(true)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Layers className="w-4 h-4 text-cyan-400" /> Batch Add
              </button>

              <button
                onClick={openCreate}
                className="px-3 py-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition cursor-pointer col-span-2 sm:col-span-1"
              >
                <Plus className="w-4 h-4" /> + បន្ថែមភាគថ្មី
              </button>
            </div>
          )}
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* ── SELECTED SERIES SHOWCASE BANNER ── */}
        {currentAnime && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 bg-gradient-to-r from-[#1e1e1e] to-[#141414] border border-white/10 p-3.5 sm:p-4 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <img
                src={currentAnime.poster_url || currentAnime.banner_url}
                alt=""
                className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl object-cover border border-white/15 shadow-md shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                    currentAnime.type === 'DONGHUA'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : currentAnime.type === 'ANIME'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : currentAnime.type === 'MOVIE'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}>
                    {currentAnime.type === 'DONGHUA' ? '🇨🇳 រឿងចិន 3D' : currentAnime.type === 'ANIME' ? '🇯🇵 រឿងជប៉ុន' : currentAnime.type === 'MOVIE' ? '🍿 ភាពយន្តដុំ' : '🎭 រឿងភាគ'}
                  </span>
                  <span className="text-[11px] text-gray-400 font-bold">• {currentAnime.year || 2024}</span>
                  <span className="text-[11px] text-emerald-400 font-bold">• {episodes.length} ភាគសរុប</span>
                </div>
                <h3 className="font-display font-black text-sm sm:text-base text-white truncate">
                  {currentAnime.title}
                </h3>
                {currentAnime.alt_title && (
                  <p className="text-[11px] text-gray-400 truncate">{currentAnime.alt_title}</p>
                )}
              </div>
            </div>

            <Link
              to={`/${currentAnime.type === 'ANIME' ? 'anime' : currentAnime.type === 'MOVIE' ? 'movie' : currentAnime.type === 'DRAMA' ? 'drama' : 'donghua'}/${currentAnime.slug}`}
              target="_blank"
              className="w-full sm:w-auto text-center px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
            >
              មើលលើ Website <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ── EPISODES LIST WITH EPISODE SEARCH & QUICK FILTERS ── */}
        {selectedAnime && (
          <div className="card overflow-hidden shadow-2xl bg-[#181818] border border-white/10 rounded-2xl">
            {/* Header Controls & Filter Pills */}
            {/* Header Controls & Filter Pills */}
            <div className="p-3.5 sm:p-4 border-b border-white/10 space-y-3 bg-[#1e1e1e]/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-xs sm:text-sm text-white">
                    បញ្ជីភាគ ({episodes.length} ភាគ)
                  </span>
                  {episodeSearch && (
                    <span className="text-xs text-gray-400">
                      — រកឃើញ {filteredEpisodes.length} ភាគ
                    </span>
                  )}
                </div>

                {/* Search specific episode */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={episodeSearch}
                    onChange={(e) => setEpisodeSearch(e.target.value)}
                    placeholder="ស្វែងរកភាគ (ឧ. 1, 2, 25)..."
                    className="input pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#121212] border border-white/10 text-white w-full placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Usability Filter Pills (ទាំងអស់ / Free / VIP / ខ្វះ Link) & Select / Add Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setEpisodeFilterTab('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      episodeFilterTab === 'ALL'
                        ? 'bg-white text-black shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    ទាំងអស់ ({episodes.length})
                  </button>
                  <button
                    onClick={() => setEpisodeFilterTab('FREE')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      episodeFilterTab === 'FREE'
                        ? 'bg-emerald-500 text-black shadow-md font-black'
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400'
                    }`}
                  >
                    <Unlock className="w-3 h-3" /> 🟢 Free ({freeCount})
                  </button>
                  <button
                    onClick={() => setEpisodeFilterTab('VIP')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      episodeFilterTab === 'VIP'
                        ? 'bg-amber-500 text-black shadow-md font-black'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400'
                    }`}
                  >
                    <Crown className="w-3 h-3 fill-current" /> 👑 VIP ({vipCount})
                  </button>
                  {missingCount > 0 && (
                    <button
                      onClick={() => setEpisodeFilterTab('MISSING')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        episodeFilterTab === 'MISSING'
                          ? 'bg-red-500 text-white shadow-md font-black'
                          : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40'
                      }`}
                    >
                      <AlertCircle className="w-3 h-3" /> ⚠️ ខ្វះ Link ({missingCount})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Select All Toggle Button */}
                  <button
                    onClick={toggleSelectAll}
                    className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="ជ្រើសរើសគ្រប់ភាគទាំងអស់ក្នុងរឿងនេះ"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedEpisodeIds.length === filteredEpisodes.length && filteredEpisodes.length > 0 ? 'ដោះការរើស (Deselect)' : 'រើសទាំងអស់ (Select All)'}</span>
                  </button>

                  {/* 1-Click Quick Add Next Episode */}
                  <button
                    onClick={openCreate}
                    className="px-3 py-1 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold flex items-center gap-1 transition shadow cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + ភាគ {nextEpNum}
                  </button>
                </div>
              </div>

              {/* ── BATCH SELECTION ACTION BAR (លុបភាគដែលបានរើស / ផ្ញើ Telegram) ── */}
              {selectedEpisodeIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-950/80 via-dark-card to-red-950/80 border border-blue-500/50 rounded-2xl animate-fade-in shadow-2xl">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow">
                      {selectedEpisodeIds.length}
                    </span>
                    <span className="text-xs font-bold text-blue-200">
                      បានជ្រើសរើស {selectedEpisodeIds.length} ភាគក្នុងចំណោម {filteredEpisodes.length} ភាគ
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleBatchBroadcastTelegram}
                      disabled={isBroadcastingBatch}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-blue-600/40 transition active:scale-95 cursor-pointer"
                    >
                      <Send className={`w-3.5 h-3.5 ${isBroadcastingBatch ? 'animate-bounce' : ''}`} />
                      <span>{isBroadcastingBatch ? 'កំពុងផ្ញើ...' : `📢 ផ្សាយទៅ Telegram (${selectedEpisodeIds.length})`}</span>
                    </button>

                    <button
                      onClick={handleBatchDeleteSelected}
                      className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-red-600/40 transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>លុបភាគ ({selectedEpisodeIds.length})</span>
                    </button>

                    <button
                      onClick={() => setSelectedEpisodeIds([])}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold transition cursor-pointer"
                    >
                      ✕ បោះបង់
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── MOBILE VIEW: Touch-friendly cards for phones (md:hidden) ── */}
            <div className="block md:hidden p-3 space-y-2.5 divide-y divide-white/5">
              {isLoading ? (
                <p className="text-center text-gray-500 py-8 text-xs">កំពុងទាញយកទិន្នន័យភាគ...</p>
              ) : filteredEpisodes.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-xs">
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
                      className={`pt-2.5 first:pt-0 p-3 rounded-xl border transition-all space-y-2 shadow-sm cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/40'
                          : 'bg-[#161616] border-white/5'
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
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                          <span className="font-display font-black text-[11px] px-2 py-0.5 rounded bg-[#E50914] text-white shrink-0">
                            EP {ep.episode_number.toString().padStart(2, '0')}
                          </span>
                          <p className="text-xs font-bold text-gray-100 truncate">
                            {ep.title || `Episode ${ep.episode_number}`}
                          </p>
                        </div>
                        <span className={`badge ${ep.is_published ? 'badge-ongoing' : 'badge-hiatus'} text-[9px] shrink-0`}>
                          {ep.is_published ? 'Live' : 'Draft'}
                        </span>
                      </div>

                      {/* URL & Duration */}
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pl-6">
                        <span className="truncate max-w-[200px] font-mono text-[10px] text-emerald-400">
                          {ep.video_url ? '🟢 S3 Stream Set' : '🔴 No Stream URL'}
                        </span>
                        <span>{ep.duration_seconds > 0 ? `${Math.floor(ep.duration_seconds / 60)}m` : '24m'}</span>
                      </div>

                      {/* Actions row on mobile */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 pl-6" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleEpisodeVip(ep)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            isVip
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {isVip ? (
                            <>
                              <Crown className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>VIP Only</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-400" />
                              <span>Free Watch</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSingleBroadcastTelegram(ep)}
                            disabled={broadcastingEpId === ep.id}
                            className="p-2 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 cursor-pointer"
                            title="ផ្ញើសារដំណឹងភាគនេះទៅ Telegram Group"
                          >
                            <Send className={`w-3.5 h-3.5 ${broadcastingEpId === ep.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => setPreviewVideoEp(ep)}
                            className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer"
                            title="ចាក់តេស្តវីដេអូក្នុង Dashboard"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => openEdit(ep)}
                            className="p-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/15 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ep)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer"
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
                  <tr className="border-b border-white/10 bg-black/40">
                    <th className="px-4 py-3.5 text-left w-12">
                      <input
                        type="checkbox"
                        checked={filteredEpisodes.length > 0 && selectedEpisodeIds.length === filteredEpisodes.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500 cursor-pointer"
                        title="ជ្រើសរើសទាំងអស់"
                      />
                    </th>
                    <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">ភាគ #</th>
                    <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">ចំណងជើង (Title)</th>
                    <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">សិទ្ធិមើល (Access)</th>
                    <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">Stream URL</th>
                    <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">Duration</th>
                    <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">Status</th>
                    <th className="px-4 py-3.5 text-right text-gray-400 font-bold text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center text-gray-500 py-12">កំពុងទាញយកទិន្នន័យភាគ...</td></tr>
                  ) : filteredEpisodes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-400 py-12">
                        {episodeSearch
                          ? `រកមិនឃើញភាគដែលស្វែងរក "${episodeSearch}" ឡើយ`
                          : 'មិនទាន់មានភាគនៅឡើយទេ! សូមចុច Batch Add ឬ + បន្ថែមភាគថ្មី'}
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
                          className={`border-b border-dark-border/40 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-950/30 border-blue-500/40'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="px-4 py-3.5 w-12" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectEpisode(ep.id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-display font-black text-sm text-brand-400">
                              EP {ep.episode_number.toString().padStart(2, '0')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-gray-200 font-medium">
                            {ep.title || `Episode ${ep.episode_number}`}
                          </td>
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleEpisodeVip(ep)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                isVip
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-sm shadow-amber-500/20'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              }`}
                              title="Click to toggle VIP / Free"
                            >
                              {isVip ? (
                                <>
                                  <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span>VIP Only</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Free Watch</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-gray-500">
                            {ep.video_url ? (
                              isYouTubeUrl(ep.video_url) ? (
                                <span className="text-xs font-mono text-red-400 flex items-center gap-1.5 truncate max-w-xs font-bold">
                                  <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                  </svg>
                                  <span>YouTube: {parseYouTubeVideoId(ep.video_url)}</span>
                                </span>
                              ) : (
                                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 truncate max-w-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  {ep.video_url.substring(0, 45)}...
                                </span>
                              )
                            ) : (
                              <span className="text-red-400 text-xs flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> No Stream URL
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-gray-400 text-xs">
                            {ep.duration_seconds > 0 ? `${Math.floor(ep.duration_seconds / 60)} mins` : '24 mins'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`badge ${ep.is_published ? 'badge-ongoing' : 'badge-hiatus'} text-[10px]`}>
                              {ep.is_published ? 'Live' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSingleBroadcastTelegram(ep)}
                                disabled={broadcastingEpId === ep.id}
                                className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 transition cursor-pointer"
                                title="ផ្ញើសារដំណឹងភាគនេះទៅ Telegram Group"
                              >
                                <Send className={`w-4 h-4 ${broadcastingEpId === ep.id ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                onClick={() => setPreviewVideoEp(ep)}
                                className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition cursor-pointer"
                                title="ចាក់តេស្តវីដេអូក្នុង Dashboard"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </button>
                              <button onClick={() => openEdit(ep)} className="btn-icon text-gray-400 hover:text-brand-400" title="Edit Episode">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(ep)} className="btn-icon text-gray-400 hover:text-red-400" title="Delete Episode">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#141414] border border-white/20 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1e1e1e]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#E50914] text-white font-black text-xs">
                    EP {previewVideoEp.episode_number}
                  </span>
                  <h3 className="font-bold text-sm text-white truncate">
                    {previewVideoEp.title || `Episode ${previewVideoEp.episode_number}`}
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewVideoEp(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {previewVideoEp.video_url ? (
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-inner">
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
                  <div className="py-16 text-center text-gray-400">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                    <p className="font-bold">ភាគនេះមិនទាន់មានតំណភ្ជាប់ Stream URL ឡើយ</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400 pt-1">
                  <span className="truncate max-w-md font-mono text-[11px] text-gray-300">
                    {previewVideoEp.video_url || 'No URL'}
                  </span>
                  {currentAnime && (
                    <Link
                      to={`/watch/${currentAnime.slug}/${previewVideoEp.episode_number}`}
                      target="_blank"
                      className="text-[#E50914] hover:underline font-semibold flex items-center gap-1 shrink-0"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-dark-border bg-dark-muted/30">
              <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                {editEp ? `✏️ កែប្រែភាគទី ${editEp.episode_number}` : '➕ បន្ថែមភាគរឿងថ្មី'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">រឿង (Series) *</label>
                  <select
                    value={form.anime_id || ''}
                    onChange={(e) => setForm((f) => ({ ...f, anime_id: parseInt(e.target.value) }))}
                    required className="input text-xs"
                  >
                    {animeList.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">ភាគទី (Episode #) *</label>
                  <input
                    type="number"
                    value={form.episode_number}
                    onChange={(e) => setForm((f) => ({ ...f, episode_number: parseInt(e.target.value) || 1 }))}
                    required min="1" className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">ចំណងជើងភាគ (Episode Title)</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="input"
                  placeholder="ឧ. ភាគទី ១ (ឬទុកចោលក៏បាន)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">តំណភ្ជាប់វីដេអូ (YouTube / MP4 / HLS .m3u8 / Embed Iframe) *</label>
                  {isYouTubeUrl(form.video_url) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      YouTube Detected
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={form.video_url}
                  onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                  className="input font-mono text-xs"
                  placeholder="https://www.youtube.com/watch?v=... ឬ https://youtu.be/... ឬ MP4 / m3u8"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  💡 អាចដាក់ link YouTube ធម្មតា (watch?v=, youtu.be, shorts), MP4, m3u8 ឬ iframe embed ក៏បាន
                </p>

                {/* YouTube Link Preview Card */}
                {isYouTubeUrl(form.video_url) && (
                  <div className="mt-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getYouTubeThumbnail(form.video_url, 'hq') || ''}
                        alt="YouTube preview"
                        className="w-16 h-10 rounded-lg object-cover border border-white/20 shrink-0 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          YouTube Video ID: <span className="text-red-400">{parseYouTubeVideoId(form.video_url)}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">Player នឹងចាក់ដោយស្វ័យប្រវត្តិគ្មាន Error ឡើយ</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const thumb = getYouTubeThumbnail(form.video_url, 'hq');
                        if (thumb) setForm((f) => ({ ...f, thumbnail_url: thumb }));
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold shrink-0 transition-colors shadow-sm cursor-pointer"
                    >
                      ប្រើ Thumbnail នេះ
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="label">តំណភ្ជាប់អក្សររត់ (Subtitle URL: .vtt)</label>
                <input
                  type="url"
                  value={form.subtitle_url}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle_url: e.target.value }))}
                  className="input"
                  placeholder="https://.../subtitles-kh.vtt"
                />
              </div>

              {/* VIP Access Control Box */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Crown className="w-4 h-4 fill-amber-400" />
                  </div>
                  <div>
                    <label htmlFor="is_vip_toggle" className="text-xs font-bold text-white block cursor-pointer">
                      Lock to VIP Only (ដាក់ VIP)
                    </label>
                    <span className="text-[11px] text-gray-400 block">
                      {form.is_vip ? '🔒 ទាល់តែមានគណនី VIP ទើបអាចទស្សនាបាន' : '🟢 គ្រប់គ្នាចុចមើលបានដោយសេរី (Free Watch)'}
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
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">រយៈពេល (Duration គិតជាវិនាទី)</label>
                  <input
                    type="number"
                    value={form.duration_seconds}
                    onChange={(e) => setForm((f) => ({ ...f, duration_seconds: parseInt(e.target.value) || 0 }))}
                    className="input"
                    min="0"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                      className="w-4 h-4 accent-brand-500 rounded"
                    />
                    <span className="text-xs font-semibold text-gray-300">ផ្សាយផ្ទាល់ (Published / Live)</span>
                  </label>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex gap-3 pt-4 border-t border-dark-border">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 cursor-pointer">
                  {saving ? 'កំពុងរក្សាទុក...' : editEp ? '💾 កែប្រែភាគរឿង' : '💾 រក្សាទុកភាគរឿង'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost py-3 cursor-pointer">
                  បោះបង់
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Generator Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-dark-border bg-dark-muted/30">
              <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" /> Batch Add Episodes
              </h2>
              <button onClick={() => setShowBatchModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleBatchGenerate} className="p-6 space-y-4">
              <p className="text-xs text-gray-400">
                Automatically generate episodes 1 through N for <strong>{currentAnime?.title}</strong>.
              </p>

              <div>
                <label className="label">Total Episodes to Generate</label>
                <input
                  type="number"
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                  min="1" max="100" className="input"
                />
              </div>

              <div>
                <label className="label">Sample Stream URL Template</label>
                <input
                  type="url"
                  value={batchUrlPattern}
                  onChange={(e) => setBatchUrlPattern(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 fill-amber-400" /> Lock all new episodes to VIP
                </span>
                <input
                  type="checkbox"
                  checked={batchIsVip}
                  onChange={(e) => setBatchIsVip(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex gap-3 pt-4 border-t border-dark-border">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
                  {saving ? 'Generating...' : `Generate ${batchCount} Episodes`}
                </button>
                <button type="button" onClick={() => setShowBatchModal(false)} className="btn-ghost py-3">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Link Converter Modal (Link 1 ➔ Link 2 S3 MP4) ── */}
      {showConverterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-dark-border bg-dark-muted/30">
              <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-400" /> Stream Link Converter (Link 1 ➔ S3 MP4)
              </h2>
              <button onClick={() => setShowConverterModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleConvertLink} className="p-6 space-y-4">
              <div>
                <label className="label">Paste Type 1 Link (/api/video-stream?...)</label>
                <textarea
                  value={converterInput}
                  onChange={(e) => setConverterInput(e.target.value)}
                  required
                  rows={3}
                  placeholder="https://nintanime.com/api/video-stream?episodeId=...&sig=..."
                  className="input font-mono text-xs resize-none"
                />
              </div>

              {converterError && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{converterError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={converterLoading || !converterInput.trim()}
                className="btn-primary w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold"
              >
                {converterLoading ? 'Resolving S3 Direct Link...' : '⚡ Convert to Direct S3 Link'}
              </button>

              {converterOutput && (
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-3 animate-fade-in">
                  <label className="text-xs font-bold text-purple-300 flex items-center justify-between">
                    <span>Direct S3 MP4 URL (Link Type 2):</span>
                    {converterCopied && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </span>
                    )}
                  </label>
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-emerald-300 break-all select-all">
                    {converterOutput}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={copyConvertedLink}
                      className="btn-secondary text-xs py-2.5 px-4 flex-1 flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </button>
                    <button
                      type="button"
                      onClick={useConvertedInNewEpisode}
                      className="btn-primary text-xs py-2.5 px-4 flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600"
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

