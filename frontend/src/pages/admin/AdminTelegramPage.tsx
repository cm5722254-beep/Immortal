import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, Bot, Check, AlertCircle, RefreshCw, Radio, ExternalLink,
  FolderDown, Play, Square, RotateCcw, Search, ShieldCheck,
  CheckCircle2, Clock, Trash2, Terminal, Settings, Globe, Layers
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import api from '../../services/api';

interface ChannelAudit {
  status: string;
  status_label: string;
  found_episodes?: number[];
  needs_reset?: boolean;
  episodes_to_upload?: number[];
}

interface CatalogAnimeItem {
  id: number;
  title: string;
  alt_title?: string;
  episodes_count: number;
  first_ep: number;
  last_ep: number;
  matched_channel_id: number | null;
  matched_channel_title: string;
  match_confidence: number;
  channel_audit: ChannelAudit;
}

interface FolderChannel {
  id: number;
  title: string;
  username?: string;
}

export function AdminTelegramPage() {
  const location = useLocation();
  const isSyncRoute = location.pathname.includes('/channel-sync');
  const [activeMainTab, setActiveMainTab] = useState<'sync' | 'bot'>(isSyncRoute ? 'sync' : 'sync');

  useEffect(() => {
    if (location.pathname.includes('/channel-sync')) {
      setActiveMainTab('sync');
    } else if (location.pathname.includes('/miniapp') || location.pathname.includes('/broadcast')) {
      setActiveMainTab('bot');
    }
  }, [location.pathname]);

  // ── Bot Status State ──────────────────────────────────────────────────
  const [loadingBot, setLoadingBot] = useState(false);
  const [syncingTest, setSyncingTest] = useState(false);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── 24/7 Channel Auto-Sync State ──────────────────────────────────────
  const [syncState, setSyncState] = useState<any>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [scanningFolder, setScanningFolder] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<'all_matched' | 'need_upload' | 'complete' | 'reset'>('all_matched');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings form state
  const [folderLink, setFolderLink] = useState('https://t.me/addlist/7NvrQmWmBNUwZDNl');
  const [compressionPreset, setCompressionPreset] = useState('720p_low_mb');
  const [delaySeconds, setDelaySeconds] = useState(10);
  const [daemon247Enabled, setDaemon247Enabled] = useState(true);
  const [autoResumeStartup, setAutoResumeStartup] = useState(true);
  const [autoResetIncomplete, setAutoResetIncomplete] = useState(true);
  const [captionTemplate, setCaptionTemplate] = useState('');

  const fetchBotStatus = useCallback(async () => {
    setLoadingBot(true);
    try {
      const res = await api.get('/admin/telegram/status');
      setBotStatus(res.data);
    } catch {
      // Non-fatal
    } finally {
      setLoadingBot(false);
    }
  }, []);

  const fetchSyncState = useCallback(async (populateConfig = false) => {
    try {
      const res = await api.get('/admin/telegram-sync/state');
      const data = res.data;
      setSyncState(data);
      if (populateConfig && data?.config) {
        setFolderLink(data.config.folder_link || 'https://t.me/addlist/7NvrQmWmBNUwZDNl');
        setCompressionPreset(data.config.compression_preset || '720p_low_mb');
        setDelaySeconds(data.config.delay_seconds ?? 10);
        setDaemon247Enabled(data.config.daemon_24_7_enabled !== false);
        setAutoResumeStartup(data.config.auto_resume_on_startup !== false);
        setAutoResetIncomplete(data.config.auto_reset_incomplete_channel !== false);
        setCaptionTemplate(data.config.caption_template || '');
      }
      if (selectedIds.size === 0 && Array.isArray(data?.catalog_anime)) {
        const autoSelect = new Set<number>();
        data.catalog_anime.forEach((a: CatalogAnimeItem) => {
          if (a.matched_channel_id && a.episodes_count > 0 && a.channel_audit?.status !== 'complete') {
            autoSelect.add(a.id);
          }
        });
        if (autoSelect.size > 0) setSelectedIds(autoSelect);
      }
    } catch (err: any) {
      // Fallback
    }
  }, [selectedIds.size]);

  useEffect(() => {
    fetchBotStatus();
    fetchSyncState(true);
    const timer = setInterval(() => {
      fetchSyncState(false);
    }, 2500);
    return () => clearInterval(timer);
  }, [fetchBotStatus, fetchSyncState]);

  const sendTestNotification = async () => {
    setSyncingTest(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await api.post('/admin/telegram/test');
      setTestResult(`បានបញ្ជូនសារសាកល្បងជោគជ័យទៅកាន់ ${res.data.sent_count} គោលដៅ!`);
      fetchBotStatus();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'មិនអាចផ្ញើសារសាកល្បងបានទេ');
    } finally {
      setSyncingTest(false);
    }
  };

  // ── 24/7 Sync Actions ─────────────────────────────────────────────────
  const handleStartSync = async (customIds?: number[]) => {
    setError(null);
    setTestResult(null);
    const ids = customIds || Array.from(selectedIds);
    try {
      const res = await api.post('/admin/telegram-sync/start', { anime_ids: ids });
      if (res.data?.started) {
        setTestResult(`បានចាប់ផ្ដើម 24/7 Auto-Sync សម្រាប់ ${res.data.count} រឿង!`);
      } else {
        setError('ប្រព័ន្ធកំពុងតែដំណើរការរួចហើយ');
      }
      fetchSyncState(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'បរាជ័យក្នុងការចាប់ផ្ដើម Auto-Sync');
    }
  };

  const handleResumeCheckpoint = async () => {
    setError(null);
    try {
      const res = await api.post('/admin/telegram-sync/resume');
      if (res.data?.started) {
        setTestResult(`បានបន្តការងារពី Checkpoint (${res.data.resumed_count} រឿង) ដោយមិនធ្វើស្ទួន!`);
      } else {
        setError(res.data?.message || 'គ្មានការងារសល់ក្នុង Checkpoint ទេ');
      }
      fetchSyncState(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'បរាជ័យក្នុងការបន្ត Checkpoint');
    }
  };

  const handleStopSync = async () => {
    try {
      await api.post('/admin/telegram-sync/stop');
      setTestResult('បានបញ្ជាផ្អាក និងរក្សាទុកក្នុង Checkpoint រួចរាល់!');
      fetchSyncState(false);
    } catch {
      setError('មិនអាចផ្អាកបានទេ');
    }
  };

  const handleAuditAll = async () => {
    setAuditing(true);
    setError(null);
    try {
      const res = await api.post('/admin/telegram-sync/audit-channels');
      setTestResult(`បានស្កេនឆែកមើលភាគក្នុង Channel ទាំង ${res.data.audited_count} រឿងរួចរាល់ ១០០%!`);
      await fetchSyncState(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'កំហុសពេលស្កេន Channel');
    } finally {
      setAuditing(false);
    }
  };

  const handleScanFolder = async () => {
    setScanningFolder(true);
    setError(null);
    try {
      const res = await api.post('/admin/telegram-sync/scan-folder', { folder_link: folderLink });
      setTestResult(`បានស្កេន Folder (${res.data.channels_count} Channels) និងផ្គូផ្គងរឿង ${res.data.matched_anime_count} រឿង!`);
      await fetchSyncState(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'កំហុសពេលស្កេន Folder');
    } finally {
      setScanningFolder(false);
    }
  };

  const handleSaveConfig = async () => {
    setLoadingSync(true);
    try {
      await api.post('/admin/telegram-sync/config', {
        folder_link: folderLink,
        compression_preset: compressionPreset,
        delay_seconds: Number(delaySeconds) || 10,
        daemon_24_7_enabled: daemon247Enabled,
        auto_resume_on_startup: autoResumeStartup,
        auto_reset_incomplete_channel: autoResetIncomplete,
        caption_template: captionTemplate,
      });
      setTestResult('បានរក្សាទុកការកំណត់ 24/7 Auto-Sync ជោគជ័យ!');
      setShowSettingsModal(false);
      fetchSyncState(true);
    } catch {
      setError('មិនអាចរក្សាទុកការកំណត់បានទេ');
    } finally {
      setLoadingSync(false);
    }
  };

  const handleOverrideChannel = async (animeId: number, channelIdStr: string) => {
    try {
      await api.post('/admin/telegram-sync/override-channel', {
        anime_id: animeId,
        channel_id: channelIdStr ? Number(channelIdStr) : null,
      });
      fetchSyncState(false);
    } catch {
      setError('មិនអាចប្ដូរ Channel បានទេ');
    }
  };

  // ── Computed Catalog & KPI Stats ──────────────────────────────────────
  const catalogAnime: CatalogAnimeItem[] = syncState?.catalog_anime || [];
  const folderChannels: FolderChannel[] = syncState?.folder_channels || [];

  const stats = useMemo(() => {
    const matched = catalogAnime.filter((a) => a.matched_channel_id && a.episodes_count > 0);
    const complete = matched.filter((a) => a.channel_audit?.status === 'complete').length;
    const partial = matched.filter((a) => a.channel_audit?.status === 'partial_valid').length;
    const empty = matched.filter((a) => a.channel_audit?.status === 'empty').length;
    const reset = matched.filter((a) => a.channel_audit?.status === 'incomplete_reset_needed').length;
    return {
      totalMatched: matched.length,
      complete,
      needUpload: partial + empty + reset,
      partial,
      empty,
      reset,
    };
  }, [catalogAnime]);

  const filteredRows = useMemo(() => {
    return catalogAnime.filter((a) => {
      if (!a.matched_channel_id || a.episodes_count <= 0) return false;
      const st = a.channel_audit?.status || 'not_scanned';
      if (filterMode === 'need_upload' && st === 'complete') return false;
      if (filterMode === 'complete' && st !== 'complete') return false;
      if (filterMode === 'reset' && st !== 'incomplete_reset_needed') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${a.title || ''} ${a.alt_title || ''} ${a.matched_channel_title || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [catalogAnime, filterMode, searchQuery]);

  const toggleSelectRow = (id: number, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const selectAllIncomplete = () => {
    const next = new Set<number>();
    catalogAnime.forEach((a) => {
      if (a.matched_channel_id && a.episodes_count > 0 && a.channel_audit?.status !== 'complete') {
        next.add(a.id);
      }
    });
    setSelectedIds(next);
  };

  const cpSummary = syncState?.checkpoint_summary || {};
  const hasUnfinishedCheckpoint = cpSummary.unfinished_queue && (cpSummary.remaining_in_queue || 0) > 0 && !syncState?.is_running;

  return (
    <AdminLayout title="គ្រប់គ្រង Telegram & 24/7 Channel Auto-Sync">
      <div className="space-y-6 animate-fade-in max-w-7xl">
        {/* Top Header & Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
                <FolderDown className="w-5 h-5" />
              </span>
              <div>
                <h1 className="font-display font-black text-lg sm:text-2xl text-slate-900 flex items-center gap-2">
                  Website to Telegram Channel Auto-Sync (24/7)
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    24/7 Cloud Ready
                  </span>
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  ទាញយករឿងពី Website តាមលំដាប់ភាគ (1, 2, 3...) បង្រួមទំហំ MB តូចច្បាស់ និង Upload ចូល Channel នីមួយៗដោយស្វ័យប្រវត្តិ ២៤ ម៉ោង
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setActiveMainTab('sync')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMainTab === 'sync'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderDown className="w-3.5 h-3.5" /> 24/7 Channel Sync ({stats.totalMatched})
              </button>
              <button
                onClick={() => setActiveMainTab('bot')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMainTab === 'bot'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="w-3.5 h-3.5" /> Bot & Mini App
              </button>
            </div>

            <button
              onClick={() => setShowSettingsModal(!showSettingsModal)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2 shadow-2xs transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" /> ការកំណត់ & Caption
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {testResult && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-slide-down text-sm font-medium">
            <Check className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{testResult}</span>
          </div>
        )}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 animate-slide-down text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Settings Drawer / Modal */}
        {showSettingsModal && (
          <div className="bg-white border border-blue-200 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" /> ការកំណត់ប្រព័ន្ធ 24/7 Auto-Sync & ទម្រង់ Description
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                បិទផ្ទាំងនេះ
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Telegram Folder Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={folderLink}
                    onChange={(e) => setFolderLink(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleScanFolder}
                    disabled={scanningFolder}
                    className="shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    {scanningFolder ? '...' : 'Scan'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">កម្រិតបង្រួមទំហំវីដេអូ (FFmpeg Low MB)</label>
                <select
                  value={compressionPreset}
                  onChange={(e) => setCompressionPreset(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="720p_low_mb">720p HD — ទំហំតូចបំផុត (35MB-65MB/ភាគ) ណែនាំ</option>
                  <option value="480p_ultra">480p Ultra Light — តិចមេបំផុត (20MB-35MB/ភាគ)</option>
                  <option value="1080p_opt">1080p Full HD — ច្បាស់ខ្លាំង (80MB-130MB/ភាគ)</option>
                  <option value="copy_raw">Original Stream — មិនបង្រួម (លឿនបំផុត)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">រយៈពេលសម្រាករវាងភាគ (វិនាទី)</label>
                <input
                  type="number"
                  min={3}
                  max={120}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={daemon247Enabled}
                  onChange={(e) => setDaemon247Enabled(e.target.checked)}
                />
                បើកប្រព័ន្ធ 24/7 Auto-Watcher (Upload ភាគថ្មីស្វ័យប្រវត្តិ)
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoResumeStartup}
                  onChange={(e) => setAutoResumeStartup(e.target.checked)}
                />
                បន្តការងារស្វ័យប្រវត្តិពេលដាច់ភ្លើង ឬ Restart Server
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoResetIncomplete}
                  onChange={(e) => setAutoResetIncomplete(e.target.checked)}
                />
                លុបសារចាស់ & Upload សារថ្មីពីភាគ 1 បើ Channel ខ្វះភាគ 1
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ទម្រង់ Description ពីក្រោមវីដេអូ (ប្រើ {'{ep_num}'} សម្រាប់លេខភាគ)
              </label>
              <textarea
                rows={5}
                value={captionTemplate}
                onChange={(e) => setCaptionTemplate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleSaveConfig}
                disabled={loadingSync}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> រក្សាទុកការកំណត់ទាំងអស់
              </button>
            </div>
          </div>
        )}

        {activeMainTab === 'sync' ? (
          <>
            {/* Crash-Safe Checkpoint Resume Banner */}
            {hasUnfinishedCheckpoint && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-sm text-amber-950">
                      រកឃើញការងារមិនទាន់ចប់ក្នុងប្រព័ន្ធការពារដាច់ភ្លើង (Crash-Safe Checkpoint)
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      នៅសល់ <b>{cpSummary.remaining_in_queue} រឿង</b> មិនទាន់ Upload ចប់។ ចុចប៊ូតុងខាងស្ដាំដើម្បីបន្តពីភាគបន្ទាប់ដោយមិនធ្វើស្ទួនភាគចាស់ឡើយ។
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResumeCheckpoint}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 shadow-xs transition cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-4 h-4" /> បន្តការងារដែលសល់ (Resume)
                </button>
              </div>
            )}

            {/* 5 KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase">គណនី Telegram (24/7)</span>
                <p className="font-display font-black text-base sm:text-lg text-emerald-700 mt-1 truncate">
                  {syncState?.tg_authorized
                    ? `${syncState?.tg_user?.first_name || 'Connected'} (+${syncState?.tg_user?.phone || '855888162192'})`
                    : 'កំពុងភ្ជាប់ Session...'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">ចងចាំ Session អចិន្ត្រៃយ៍</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase">រឿងក្នុង Folder សរុប</span>
                <p className="font-display font-black text-2xl text-slate-900 mt-1">{stats.totalMatched}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">ផ្គូផ្គង ១០០% ជាមួយ Website</p>
              </div>

              <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase">គ្រប់ភាគ ១០០% (រំលង)</span>
                <p className="font-display font-black text-2xl text-emerald-600 mt-1">{stats.complete}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">មានភាគគ្រប់រួចរាល់ក្នុង Channel</p>
              </div>

              <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-blue-700 uppercase">ត្រូវ Upload បន្ត/ថ្មី</span>
                <p className="font-display font-black text-2xl text-blue-600 mt-1">{stats.needUpload}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  បន្ត: {stats.partial} | ទទេ: {stats.empty} | ខ្វះភាគ១: {stats.reset}
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Upload រួចសរុប</span>
                <p className="font-display font-black text-2xl text-slate-900 mt-1">
                  {cpSummary.total_uploaded_all_time || 0} <span className="text-xs font-semibold text-slate-500">ភាគ</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">កត់ត្រាក្នុង Checkpoint</p>
              </div>
            </div>

            {/* Live Pipeline & Control Bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        syncState?.is_running ? 'bg-blue-600 animate-ping' : 'bg-emerald-500'
                      }`}
                    />
                    <span className="font-display font-bold text-sm sm:text-base text-slate-900">
                      {syncState?.current_phase || 'រួចរាល់សម្រាប់ដំណើរការ 24/7'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    កំពុងដំណើរការលើរឿង៖ <b className="text-slate-800">{syncState?.current_anime || '-'}</b> | ភាគទី៖{' '}
                    <b className="text-blue-600">{syncState?.current_ep || '-'}</b> ({syncState?.step_progress || 0}%)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAuditAll}
                    disabled={auditing || syncState?.is_running}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin' : ''}`} />
                    {auditing ? 'កំពុងស្កេន Channel...' : 'ស្កេនឆែកភាគក្នុង Channel ឡើងវិញ'}
                  </button>

                  {!syncState?.is_running ? (
                    <button
                      onClick={() => handleStartSync()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 shadow-xs transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" /> ចាប់ផ្ដើម Upload រឿងដែលបានជ្រើសរើស ({selectedIds.size})
                    </button>
                  ) : (
                    <button
                      onClick={handleStopSync}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 shadow-xs transition cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" /> ផ្អាក & រក្សាទុក Checkpoint
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-sky-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, syncState?.step_progress || 0))}%` }}
                />
              </div>

              {/* Telegram Web Remote Control Guide */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <b>បញ្ជាតាម Telegram Web (web.telegram.org):</b> វាយពាក្យបញ្ជាក្នុង <b>Saved Messages</b> ឬក្នុង Chat ជាមួយ{' '}
                    <b>@{botStatus?.bot_username || 'animeflickh_bot'}</b>៖
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-blue-700 font-bold">/sync_status</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-emerald-700 font-bold">/sync_start</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-rose-700 font-bold">/sync_stop</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold">/sync_audit</span>
                </div>
              </div>
            </div>

            {/* Series <-> Channel Mapping & Audit Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setFilterMode('all_matched')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filterMode === 'all_matched'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    រឿងក្នុង Folder ទាំងអស់ ({stats.totalMatched})
                  </button>
                  <button
                    onClick={() => setFilterMode('need_upload')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filterMode === 'need_upload'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ត្រូវ Upload បន្ត/ថ្មី ({stats.needUpload})
                  </button>
                  <button
                    onClick={() => setFilterMode('complete')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filterMode === 'complete'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    គ្រប់ភាគ ១០០% ({stats.complete})
                  </button>
                  <button
                    onClick={() => setFilterMode('reset')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filterMode === 'reset'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ខ្វះភាគ 1 ត្រូវលុបដាក់ថ្មី ({stats.reset})
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ស្វែងរកឈ្មោះរឿង ឬ Channel..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 w-56"
                    />
                  </div>
                  <button
                    onClick={selectAllIncomplete}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    ជ្រើសរើសរឿងមិនទាន់គ្រប់
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ដកជ្រើសរើស
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3 px-4 w-10">ជ្រើស</th>
                      <th className="py-3 px-4">ឈ្មោះរឿងលើ Website</th>
                      <th className="py-3 px-4">ភាគលើ Website</th>
                      <th className="py-3 px-4">Telegram Channel ក្នុង Folder</th>
                      <th className="py-3 px-4">លទ្ធផលស្កេន Channel & សកម្មភាព</th>
                      <th className="py-3 px-4 text-right">បញ្ជាភ្លាម</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredRows.map((a) => {
                      const audit = a.channel_audit || { status: 'not_scanned', status_label: 'មិនទាន់ស្កេន' };
                      const isChecked = selectedIds.has(a.id);

                      let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (audit.status === 'complete') {
                        badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      } else if (audit.status === 'partial_valid') {
                        badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                      } else if (audit.status === 'empty') {
                        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                      } else if (audit.status === 'incomplete_reset_needed') {
                        badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                      }

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => toggleSelectRow(a.id, e.target.checked)}
                              className="rounded border-slate-300 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{a.title}</p>
                            <p className="text-[11px] text-slate-400">
                              ID: #{a.id} {a.alt_title ? `• ${a.alt_title}` : ''}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200/60">
                              <Layers className="w-3 h-3" /> {a.episodes_count} ភាគ ({a.first_ep}-{a.last_ep})
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={a.matched_channel_id || ''}
                              onChange={(e) => handleOverrideChannel(a.id, e.target.value)}
                              className="w-full max-w-[230px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                            >
                              <option value="">-- ជ្រើសរើស Channel --</option>
                              {folderChannels.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                  {ch.title}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold text-[11px] ${badgeStyle}`}>
                              {audit.status === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                              {audit.status === 'partial_valid' && <Clock className="w-3.5 h-3.5 shrink-0" />}
                              {audit.status === 'incomplete_reset_needed' && <Trash2 className="w-3.5 h-3.5 shrink-0" />}
                              <span>{audit.status_label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {audit.status !== 'complete' ? (
                              <button
                                onClick={() => handleStartSync([a.id])}
                                disabled={syncState?.is_running}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] px-2.5 py-1.5 transition cursor-pointer disabled:opacity-50"
                              >
                                <Play className="w-3 h-3" /> Upload ឥឡូវ
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                <ShieldCheck className="w-3.5 h-3.5" /> រួចរាល់
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Console Logs */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" /> កំណត់ហេតុដំណើរការផ្ទាល់ (24/7 Live Auto-Sync Logs)
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {syncState?.logs?.length || 0} events
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
                {(syncState?.logs || []).length === 0 ? (
                  <p className="text-slate-500">ប្រព័ន្ធត្រៀមរួចរាល់...</p>
                ) : (
                  (syncState?.logs || []).map((log: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span
                        className={
                          log.level === 'ok'
                            ? 'text-emerald-400'
                            : log.level === 'warn'
                            ? 'text-amber-300'
                            : log.level === 'err'
                            ? 'text-rose-400'
                            : 'text-slate-200'
                        }
                      >
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── Bot Status & Test Dispatch Tab ────────────────────────────── */
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bot Status</span>
                  <span
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      botStatus?.bot_online
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${botStatus?.bot_online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {loadingBot ? 'Checking' : botStatus?.bot_online ? 'Online' : 'Unavailable'}
                  </span>
                </div>
                <p className="font-display font-black text-xl text-slate-900">
                  {botStatus?.bot_username ? `@${botStatus.bot_username}` : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {botStatus?.bot_info?.first_name || 'Telegram Notification & Mini App Bot'}
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Action</span>
                  <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                    <Send className="w-4 h-4" />
                  </span>
                </div>
                <p className="font-display font-black text-xl text-slate-900">Test Dispatch</p>
                <p className="text-xs text-slate-500 mt-1">សាកល្បងផ្ញើសារជូនដំណឹងទៅកាន់ Group និង Subscribers</p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscribers / Chats</span>
                  <span className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200/60 flex items-center justify-center text-sky-600">
                    <Radio className="w-4 h-4" />
                  </span>
                </div>
                <p className="font-display font-black text-xl text-slate-900">
                  {(botStatus?.subscribers_count ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Registered chat recipients</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-600" /> Test Dispatch
                  </h2>
                  <p className="text-slate-600 text-sm mt-1">
                    ចុចខាងក្រោមដើម្បីផ្ញើសារសាកល្បងទៅកាន់ Telegram Bot របស់អ្នក។
                  </p>
                </div>
                {botStatus?.bot_username && (
                  <a
                    href={`https://t.me/${encodeURIComponent(botStatus.bot_username)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-semibold text-xs px-3.5 py-2.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-600" /> Open @{botStatus.bot_username}
                  </a>
                )}
              </div>
              <button
                onClick={sendTestNotification}
                disabled={syncingTest}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 px-6 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {syncingTest ? 'កំពុងផ្ញើសារ...' : 'ផ្ញើសារសាកល្បងទៅកាន់ Bot'}
              </button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
