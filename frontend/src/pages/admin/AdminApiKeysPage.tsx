import { useState, useEffect } from 'react';
import {
  Key, Plus, Copy, Check, Trash2, ToggleLeft, ToggleRight,
  Play, Sparkles, RefreshCw, Layers, Database, Lock, AlertCircle
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { apiKeyService } from '../../services/apiKeyService';
import type { ApiKeyItem, SignStreamResult } from '../../services/apiKeyService';

export function AdminApiKeysPage() {
  const [activeTab, setActiveTab] = useState<'keys' | 'stream' | 'bulk'>('keys');

  // Keys state
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyExpiryDays, setKeyExpiryDays] = useState<number | ''>(30);
  const [keyScopes] = useState<string[]>(['anime:read', 'stream:access']);
  const [createdKeyData, setCreatedKeyData] = useState<ApiKeyItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Signed stream state
  const [streamEpId, setStreamEpId] = useState<number | ''>('');
  const [streamExpiryHours, setStreamExpiryHours] = useState<number>(24);
  const [signLoading, setSignLoading] = useState(false);
  const [signResult, setSignResult] = useState<SignStreamResult | null>(null);

  // Bulk import state
  const [bulkAnimeId, setBulkAnimeId] = useState<number | ''>('');
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await apiKeyService.listKeys();
      setKeys(data);
    } catch (e: any) {
      showNotification('បរាជ័យក្នុងការទាញយកបញ្ជី API Keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      showNotification('សូមបញ្ចូលឈ្មោះសម្គាល់ API Key', 'error');
      return;
    }
    setLoading(true);
    try {
      const daysNum = keyExpiryDays !== '' && Number(keyExpiryDays) > 0 ? Number(keyExpiryDays) : 0;
      const created = await apiKeyService.createKey({
        name: keyName.trim(),
        scopes: keyScopes,
        expires_in_days: daysNum,
      });
      setNewKeyModal(false);
      setCreatedKeyData(created);
      showNotification('បង្កើត API Key ជោគជ័យ!');
      setKeyName('');
      loadKeys();
    } catch (e: any) {
      console.error("Create API Key error:", e);
      showNotification(e.response?.data?.detail || 'បរាជ័យក្នុងការបង្កើត API Key', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleToggleKey = async (id: number) => {
    try {
      await apiKeyService.toggleKey(id);
      showNotification('បានផ្លាស់ប្ដូរស្ថានភាព Key');
      loadKeys();
    } catch (e: any) {
      showNotification('បរាជ័យក្នុងការផ្លាស់ប្ដូរ', 'error');
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!window.confirm('តើអ្នកប្រាកដជាចង់ Revoke / លុប API Key នេះមែនទេ?')) return;
    try {
      await apiKeyService.deleteKey(id);
      showNotification('បានលុប Key រួចរាល់');
      loadKeys();
    } catch (e: any) {
      showNotification('បរាជ័យក្នុងការលុប', 'error');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    showNotification('បាន Copy ចូល Clipboard រួចរាល់!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateSignedStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamEpId) {
      showNotification('សូមបញ្ចូល Episode ID', 'error');
      return;
    }
    setSignLoading(true);
    try {
      const res = await apiKeyService.signStreamUrl({
        episode_id: Number(streamEpId),
        expires_in_seconds: streamExpiryHours * 3600,
      });
      setSignResult(res);
      showNotification('Generate Signed Video Stream URL ជោគជ័យ!');
    } catch (e: any) {
      showNotification(e.response?.data?.detail || 'បរាជ័យក្នុងការ Generate Signed URL', 'error');
    } finally {
      setSignLoading(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAnimeId) {
      showNotification('សូមបញ្ចូល Anime ID', 'error');
      return;
    }
    if (!bulkText.trim()) {
      showNotification('សូមបញ្ចូល Link វីដេអូ', 'error');
      return;
    }

    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const episodes = lines.map((line, idx) => {
      const parts = line.split(/:\s*http/i);
      if (parts.length > 1 && !isNaN(Number(parts[0]))) {
        return {
          episode_number: Number(parts[0]),
          video_url: 'http' + parts[1],
          title: `ភាគ ${parts[0]}`,
        };
      }
      return {
        episode_number: idx + 1,
        video_url: line,
        title: `ភាគ ${idx + 1}`,
      };
    });

    setBulkLoading(true);
    try {
      const res = await apiKeyService.bulkImportEpisodes({
        anime_id: Number(bulkAnimeId),
        episodes,
      });
      setBulkResult(res);
      showNotification(`បានបញ្ចូល ${res.added} ភាគ និង Update ${res.updated} ភាគដោយជោគជ័យ!`);
      setBulkText('');
    } catch (e: any) {
      showNotification(e.response?.data?.detail || 'បរាជ័យក្នុងការ Bulk Import', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <AdminLayout title="គ្រប់គ្រង API Keys">
      <div className="space-y-4 sm:space-y-6">
        {/* Toast Notification Alert */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all animate-in fade-in slide-in-from-top-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-white/60 hover:text-white ml-4">✕</button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900/40 via-dark-card to-purple-950/40 border border-brand-500/20 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  DEVELOPER & STREAM API
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  HMAC-SHA256 Ready
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Key className="w-6 h-6 text-brand-400" />
                API & Video Stream Generator Suite
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                គ្រប់គ្រង API Keys សម្រាប់កម្មវិធី Mobile/Bots, បង្កើត Signed Video URLs ការពារ Hotlinking និង Bulk Import ពី Cloudflare R2
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setCreatedKeyData(null);
                  setNewKeyModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                បង្កើត API Key ថ្មី
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-dark-border/60 pb-px">
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'keys'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4" />
              API Keys ({keys.length})
            </button>

            <button
              onClick={() => setActiveTab('stream')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'stream'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" />
              Signed Stream Generator (ការពារ Hotlinking)
            </button>

            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'bulk'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              R2 Bulk Importer
            </button>
          </div>
        </div>

        {/* TAB 1: API KEYS LIST */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-brand-400" />
                  <h2 className="text-sm font-semibold text-white">បញ្ជី Active API Keys ទាំងអស់</h2>
                </div>
                <button
                  onClick={loadKeys}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-dark-bg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading && keys.length === 0 ? (
                <div className="p-12 text-center text-gray-400">កំពុងទាញយកទិន្នន័យ...</div>
              ) : keys.length === 0 ? (
                <div className="p-12 text-center">
                  <Key className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">មិនទាន់មាន API Key ណាមួយត្រូវបានបង្កើតនៅឡើយទេ</p>
                  <button
                    onClick={() => setNewKeyModal(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> ចុចទីនេះដើម្បីបង្កើត Key ដំបូង
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-dark-bg/60 text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-dark-border">
                      <tr>
                        <th className="py-3 px-4">ឈ្មោះ Key</th>
                        <th className="py-3 px-4">Key Prefix</th>
                        <th className="py-3 px-4">Scopes</th>
                        <th className="py-3 px-4">កាលបរិច្ឆេទបង្កើត / ផុតកំណត់</th>
                        <th className="py-3 px-4">ការប្រើប្រាស់ (Requests)</th>
                        <th className="py-3 px-4">ស្ថានភាព</th>
                        <th className="py-3 px-4 text-right">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border">
                      {keys.map((k) => (
                        <tr key={k.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-medium text-white">
                            {k.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-brand-300">
                            <code>{k.key_prefix}...</code>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {k.scopes.split(',').map((s) => (
                                <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-dark-bg border border-dark-border text-gray-300">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-400">
                            <div>បង្កើត៖ {new Date(k.created_at).toLocaleDateString('km-KH')}</div>
                            {k.expires_at ? (
                              <div className="text-amber-400">ផុតកំណត់៖ {new Date(k.expires_at).toLocaleDateString('km-KH')}</div>
                            ) : (
                              <div className="text-emerald-400">គ្មានថ្ងៃផុតកំណត់</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-gray-300">
                            {k.request_count.toLocaleString()} calls
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleKey(k.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                k.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/10 text-red-400 border-red-500/30'
                              }`}
                            >
                              {k.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                              {k.is_active ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteKey(k.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Revoke / Delete Key"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Integration Docs */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                របៀបប្រើប្រាស់ API Key ក្នុង Client / Mobile App
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                បញ្ចូល API Key ក្នុង HTTP Header តាមវិធីមួយក្នុងចំណោមពីរខាងក្រោម៖
              </p>
              <div className="bg-dark-bg rounded-lg p-3 font-mono text-xs text-gray-300 space-y-1.5 border border-dark-border">
                <p className="text-brand-400"># ជម្រើស ១៖ បញ្ចូលតាម X-API-Key Header</p>
                <p className="text-emerald-300">curl -H "X-API-Key: rit_live_your_key_here" https://yourdomain.com/api/anime</p>
                <p className="text-brand-400 pt-2"># ជម្រើស ២៖ បញ្ចូលតាម Bearer Token</p>
                <p className="text-emerald-300">curl -H "Authorization: Bearer rit_live_your_key_here" https://yourdomain.com/api/anime</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SIGNED STREAM GENERATOR */}
        {activeTab === 'stream' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-brand-400" />
                  បង្កើត Signed Stream URL សម្រាប់ Episode
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  បង្កើត URL ដែលមានសុពលភាពតាមម៉ោងកំណត់ (ការពារការលួចចម្លង និង Hotlink ពី Website ដទៃ)
                </p>
              </div>

              <form onSubmit={handleGenerateSignedStream} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Episode ID (លេខសម្គាល់ភាគ):</label>
                  <input
                    type="number"
                    value={streamEpId}
                    onChange={(e) => setStreamEpId(e.target.value ? Number(e.target.value) : '')}
                    placeholder="ឧទាហរណ៍៖ 1, 10, 105..."
                    required
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">សុពលភាព (Duration):</label>
                  <select
                    value={streamExpiryHours}
                    onChange={(e) => setStreamExpiryHours(Number(e.target.value))}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value={1}>១ ម៉ោង (1 Hour)</option>
                    <option value={6}>៦ ម៉ោង (6 Hours)</option>
                    <option value={24}>២៤ ម៉ោង / ១ ថ្ងៃ (24 Hours - Recommended)</option>
                    <option value={168}>៧ ថ្ងៃ (7 Days)</option>
                    <option value={8760}>១ ឆ្នាំ (1 Year)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={signLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50"
                >
                  {signLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Signed Video URL
                </button>
              </form>
            </div>

            {/* Signed Stream Result Card */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Play className="w-4 h-4 text-emerald-400" />
                  លទ្ធផល Signed Stream Link
                </h3>

                {signResult ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Full Signed Stream URL:</span>
                      <div className="flex items-center gap-2 bg-dark-bg border border-brand-500/30 rounded-xl p-3">
                        <input
                          type="text"
                          readOnly
                          value={signResult.signed_url}
                          className="w-full bg-transparent text-xs text-emerald-400 font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopy(signResult.signed_url, 'signed_url')}
                          className="p-1.5 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300"
                          title="Copy Link"
                        >
                          {copiedKey === 'signed_url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-dark-bg/60 p-3 rounded-xl border border-dark-border">
                      <div>
                        <span className="text-gray-500 block">Episode ID:</span>
                        <span className="text-white font-mono">{signResult.episode_id}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">ផុតកំណត់នៅ៖</span>
                        <span className="text-amber-400 font-mono">
                          {new Date(signResult.expires_at * 1000).toLocaleString('km-KH')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-gray-400 block mb-1">Test Playback in Browser:</span>
                      <video
                        src={signResult.signed_url}
                        controls
                        className="w-full rounded-xl bg-black max-h-44 object-contain border border-dark-border"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-dark-border rounded-xl">
                    <Lock className="w-10 h-10 text-gray-600 mb-2" />
                    <p className="text-sm text-gray-400">មិនទាន់មានលទ្ធផលនៅឡើយទេ</p>
                    <p className="text-xs text-gray-500 mt-1">សូមបញ្ចូល Episode ID រួចចុច Generate នៅខាងឆ្វេង</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BULK R2 IMPORTER */}
        {activeTab === 'bulk' && (
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-400" />
                Bulk Episode Importer ពី Cloudflare R2
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                បិទភ្ជាប់ (Paste) បញ្ជី Link វីដេអូច្រើនភាគក្នុងពេលតែមួយ ដើម្បី Add ចូល Database ស្វ័យប្រវត្តិតែមួយ Click
              </p>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Target Anime ID:</label>
                <input
                  type="number"
                  value={bulkAnimeId}
                  onChange={(e) => setBulkAnimeId(e.target.value ? Number(e.target.value) : '')}
                  placeholder="លេខសម្គាល់ Anime ID..."
                  required
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  បញ្ជី Link វីដេអូ (១ ជួរ = ១ ភាគ ឬទម្រង់ "1: https://..."):
                </label>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`ឧទាហរណ៍៖\n1: https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episode_1.mp4\n2: https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episode_2.mp4\n3: https://pub-fce349e1462e4f23abc8af60429b3126.r2.dev/episode_3.mp4`}
                  required
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-4 text-xs font-mono text-emerald-400 focus:outline-none focus:border-brand-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={bulkLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 hover:from-brand-600 hover:to-purple-700 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50"
              >
                {bulkLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Import គ្រប់ភាគទាំងអស់ចូល Database
              </button>
            </form>

            {bulkResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                🎉 បាន Import ជោគជ័យ៖ បន្ថែមថ្មី <strong>{bulkResult.added}</strong> ភាគ និង Update <strong>{bulkResult.updated}</strong> ភាគ!
              </div>
            )}
          </div>
        )}

        {/* Modal: New Key Created Showcase */}
        {createdKeyData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-card border border-brand-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-emerald-400">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">API Key ត្រូវបានបង្កើតជោគជ័យ!</h3>
                  <p className="text-xs text-gray-400">សូមចម្លងទុកឥឡូវនេះ (វានឹងមិនបង្ហាញម្ដងទៀតឡើយ)</p>
                </div>
              </div>

              <div className="bg-dark-bg border border-emerald-500/30 rounded-xl p-4 space-y-2">
                <span className="text-xs text-gray-400 block font-semibold">Your Full Secret API Key:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdKeyData.raw_api_key}
                    className="w-full bg-transparent font-mono text-sm text-emerald-400 font-bold focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(createdKeyData.raw_api_key || '', 'modal_key')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shrink-0"
                  >
                    {copiedKey === 'modal_key' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
              </div>

              <div className="text-xs text-amber-300/80 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>ដើម្បីសុវត្ថិភាព API Key ពេញលេញត្រូវបានបង្ហាញតែម្ដងគត់។ ប្រសិនបើបាត់បង់ អ្នកត្រូវ Revoke និងបង្កើត Key ថ្មី។</span>
              </div>

              <button
                onClick={() => setCreatedKeyData(null)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors"
              >
                យល់ព្រម និងបិទផ្ទាំងនេះ
              </button>
            </div>
          </div>
        )}

        {/* Modal: Create Key Form */}
        {newKeyModal && !createdKeyData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-card border border-dark-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-dark-border pb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Key className="w-5 h-5 text-brand-400" />
                  បង្កើត API Key ថ្មី
                </h3>
                <button
                  onClick={() => setNewKeyModal(false)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">ឈ្មោះសម្គាល់ (Friendly Name):</label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="ឧ. Mobile App Key, Telegram Bot..."
                    required
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">ថ្ងៃផុតកំណត់ (Expiration in Days):</label>
                  <input
                    type="number"
                    value={keyExpiryDays}
                    onChange={(e) => setKeyExpiryDays(e.target.value ? Number(e.target.value) : '')}
                    placeholder="ទទេរសម្រាប់គ្មានថ្ងៃផុតកំណត់"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">ដាក់ទទេរ ឬ 0 ប្រសិនបើចង់ឱ្យ Key ប្រើបានរហូត</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-border">
                  <button
                    type="button"
                    onClick={() => setNewKeyModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-all shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50"
                  >
                    បង្កើត Key ឥឡូវនេះ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
