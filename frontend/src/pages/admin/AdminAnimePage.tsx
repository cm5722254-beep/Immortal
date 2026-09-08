import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit3, Trash2, Search, X, Flame, RefreshCw, RotateCcw, CheckCircle2, Send, Upload, ImageIcon, FolderOpen } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import { triggerConfirm } from '../../store/confirmStore';
import api from '../../services/api';
import { loadCatalog } from '../../services/catalogService';
import type { Anime, Genre, PaginatedResponse, AnimeType } from '../../types';

const DAYS = [
  { value: 'Monday', label: 'ថ្ងៃចន្ទ (Monday)' },
  { value: 'Tuesday', label: 'ថ្ងៃអង្គារ (Tuesday)' },
  { value: 'Wednesday', label: 'ថ្ងៃពុធ (Wednesday)' },
  { value: 'Thursday', label: 'ថ្ងៃព្រហស្បតិ៍ (Thursday)' },
  { value: 'Friday', label: 'ថ្ងៃសុក្រ (Friday)' },
  { value: 'Saturday', label: 'ថ្ងៃសៅរ៍ (Saturday)' },
  { value: 'Sunday', label: 'ថ្ងៃអាទិត្យ (Sunday)' },
];

const EMPTY_FORM = {
  title: '', slug: '', alt_title: '', description: '',
  poster_url: '', banner_url: '', trailer_url: '',
  year: new Date().getFullYear(), status: 'ONGOING', studio: '',
  country: 'China', airing_day: 'Saturday', heat_score: 85000,
  type: 'DONGHUA' as AnimeType, is_featured: false, is_trending: false,
  is_published: true, is_free: false, genre_ids: [] as number[],
};

interface AnimeAdminPageProps {
  animeType?: AnimeType;
}

export function AdminAnimePage({ animeType = 'DONGHUA' }: AnimeAdminPageProps) {
  const [items, setItems] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Anime | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, type: animeType });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isSavingBackup, setIsSavingBackup] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [broadcastingAnimeId, setBroadcastingAnimeId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<'poster' | 'banner' | null>(null);

  const posterInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File, field: 'poster_url' | 'banner_url') => {
    const fieldKey = field === 'poster_url' ? 'poster' : 'banner';
    setUploadingField(fieldKey);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // ❌ Do NOT set Content-Type manually — axios sets multipart/form-data + boundary automatically
      const res = await api.post('/admin/upload-image', formData, { timeout: 60000 });
      if (res.data?.url) {
        // Build full absolute URL: strip /api suffix from baseURL to get origin
        const baseUrl = (api.defaults.baseURL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
        const uploadedUrl = res.data.url.startsWith('http')
          ? res.data.url
          : `${baseUrl}${res.data.url}`;
        setForm((f) => ({ ...f, [field]: uploadedUrl }));
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
        ? detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ')
        : (err?.message || 'Failed to upload image. Please try again.');
      alert(msg);
    } finally {
      setUploadingField(null);
    }
  };

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: animeType,
        page: page.toString(),
        per_page: '15',
        sort: 'latest',
      });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await api.get(`/anime?${params}`);
      const data = res.data as PaginatedResponse<Anime>;
      if (data?.items && data.items.length > 0) {
        setItems(data.items);
        setTotal(data.total);
        setIsLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    // Fallback to local catalog
    try {
      const cat = await loadCatalog();
      if (cat?.anime && cat.anime.length > 0) {
        let filtered = cat.anime.filter((a) => a.type === animeType);
        if (statusFilter !== 'ALL') filtered = filtered.filter((a) => a.status === statusFilter);
        const pageSize = 15;
        const start = (page - 1) * pageSize;
        const paged = filtered.slice(start, start + pageSize);
        setItems(paged);
        setTotal(filtered.length);
      }
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
    api.get('/genres').then((r) => setGenres(r.data)).catch(() => {});
  }, [animeType, page, statusFilter]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, type: animeType, country: animeType === 'ANIME' ? 'Japan' : 'China' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item: Anime) => {
    setEditItem(item);
    setForm({
      title: item.title,
      slug: item.slug,
      alt_title: item.alt_title || '',
      description: item.description || '',
      poster_url: item.poster_url || '',
      banner_url: item.banner_url || '',
      trailer_url: item.trailer_url || '',
      year: item.year || new Date().getFullYear(),
      status: item.status,
      studio: item.studio || '',
      country: item.country || '',
      airing_day: item.airing_day || 'Saturday',
      heat_score: item.heat_score || 85000,
      type: item.type,
      is_featured: item.is_featured,
      is_trending: item.is_trending,
      is_published: item.is_published,
      is_free: item.is_free || false,
      genre_ids: item.genres ? item.genres.map((g) => g.id) : [],
    });
    setError('');
    setShowModal(true);
  };

  const handleDelete = (id: number, title: string) => {
    triggerConfirm({
      title: 'Delete Series',
      message: `តើអ្នកប្រាកដជាចង់លុបរឿង "${title}" មែនទេ?`,
      confirmText: 'លុបចេញ (Delete)',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/anime/${id}`);
          setToastMessage(`🗑️ បានលុបរឿង "${title}" ដោយជោគជ័យ!`);
          fetchItems();
          setTimeout(() => setToastMessage(null), 4000);
        } catch (err: any) {
          alert(err?.response?.data?.detail || 'បរាជ័យក្នុងការលុបរឿង');
        }
      },
    });
  };

  const togglePublish = async (item: Anime) => {
    await api.put(`/anime/${item.id}`, { is_published: !item.is_published });
    fetchItems();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editItem) {
        await api.put(`/anime/${editItem.id}`, form);
      } else {
        await api.post('/anime', form);
      }
      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcastAnimeTelegram = async (anime: Anime) => {
    try {
      setBroadcastingAnimeId(anime.id);
      const res = await api.post(`/anime/${anime.id}/broadcast-telegram`);
      setToastMessage(res.data?.message || `📢 បានផ្សាយដំណឹងរឿង «${anime.title}» ទៅកាន់ Telegram រួចរាល់!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'បរាជ័យក្នុងការផ្សាយដំណឹងទៅ Telegram');
    } finally {
      setBroadcastingAnimeId(null);
    }
  };

  const handleSaveBackup = async () => {
    try {
      setIsSavingBackup(true);
      const res = await api.post('/admin/backup/sync');
      setToastMessage(`💾 បានរក្សាទុកទិន្នន័យ (${res.data.counts?.anime || items.length} រឿង) ជាប់រហូត 100%!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage(`⚠️ បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSavingBackup(false);
    }
  };

  const handleRecoverMissing = async () => {
    triggerConfirm({
      title: `ស្តាររឿង ${title} ដែលបាត់បង់ (Emergency Recover)`,
      message: `តើអ្នកចង់ស្តាររឿង និងភាគទាំងអស់ដែលបានបម្រុងទុកមកវិញមែនទេ? ប្រព័ន្ធនឹងបញ្ចូលរឿងដែលបាត់បង់ដោយសុវត្ថិភាព (Safe Merge)។`,
      confirmText: 'ស្តារឡើងវិញភ្លាមៗ (Recover)',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsRecovering(true);
          const res = await api.post('/admin/backup/recover-missing');
          setToastMessage(`🎉 បានស្តាររឿងដែលបាត់បង់មកវិញជោគជ័យ! (+${res.data.added_counts?.anime || 0} រឿង, +${res.data.added_counts?.episodes || 0} ភាគ)`);
          fetchItems();
          setTimeout(() => setToastMessage(null), 5000);
        } catch (err: any) {
          setToastMessage(`⚠️ បរាជ័យក្នុងការស្តារទិន្នន័យ`);
          setTimeout(() => setToastMessage(null), 4000);
        } finally {
          setIsRecovering(false);
        }
      },
    });
  };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const filtered = items.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.alt_title && a.alt_title.toLowerCase().includes(search.toLowerCase()))
  );

  const title = animeType === 'ANIME' ? 'Anime' : 'Donghua';

  return (
    <AdminLayout title={`គ្រប់គ្រង ${title}`}>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-slide-down shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action Header & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`ស្វែងរក ${title}...`}
              className="input pl-10 py-2 text-xs md:text-sm w-full"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input py-2 px-3 text-xs md:text-sm w-full sm:w-44 shrink-0 bg-[#121212] border border-white/15 text-white"
          >
            <option value="ALL">ស្ថានភាពទាំងអស់ (All Status)</option>
            <option value="ONGOING">កំពុងចាក់ផ្សាយ (Ongoing)</option>
            <option value="COMPLETED">ចប់ជាស្ថាពរ (Completed)</option>
            <option value="UPCOMING">នឹងចេញឆាប់ៗ (Upcoming)</option>
            <option value="HIATUS">ផ្អាកបណ្ដោះអាសន្ន (Hiatus)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
          <button
            onClick={handleSaveBackup}
            disabled={isSavingBackup}
            className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold transition-all active:scale-95 cursor-pointer"
            title="រក្សាទុកទិន្នន័យរឿងទាំងអស់ជាប់រហូត"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSavingBackup ? 'animate-spin' : ''}`} />
            <span>{isSavingBackup ? 'កំពុងរក្សា...' : '💾 Save Data'}</span>
          </button>

          <button
            onClick={handleRecoverMissing}
            disabled={isRecovering}
            className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold transition-all active:scale-95 cursor-pointer"
            title="ស្តាររឿងដែលបាត់បង់មកវិញ"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
            <span>{isRecovering ? 'កំពុងស្តារ...' : '🔄 ស្តាររឿង'}</span>
          </button>

          <button onClick={openCreate} className="btn-primary text-xs md:text-sm py-2 px-4 shadow-lg shadow-brand-500/20 col-span-2 sm:col-span-1 flex items-center justify-center gap-1 cursor-pointer">
            <Plus className="w-4 h-4" /> + បន្ថែម {title} ថ្មី
          </button>
        </div>
      </div>

      {/* Catalog Container */}
      <div className="card overflow-hidden shadow-2xl bg-[#181818] border border-white/10 rounded-2xl">
        {/* ── MOBILE VIEW: Touch-friendly cards for phones (md:hidden) ── */}
        <div className="block md:hidden p-3 space-y-3 divide-y divide-white/5">
          {isLoading ? (
            <div className="py-8"><SkeletonTable rows={4} /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-xs">រកមិនឃើញរឿងឡើយ</p>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 bg-[#151515] p-3.5 rounded-2xl border border-white/5 space-y-3 shadow-md">
                <div className="flex gap-3">
                  <img
                    src={item.poster_url || ''}
                    alt=""
                    className="w-16 h-22 rounded-xl object-cover bg-dark-muted shrink-0 border border-white/10 shadow-md"
                  />
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-white text-sm line-clamp-1">{item.title}</h4>
                        <button
                          onClick={() => togglePublish(item)}
                          className={`badge ${item.is_published ? 'badge-ongoing' : 'badge-hiatus'} text-[9px] font-bold shrink-0 cursor-pointer`}
                        >
                          {item.is_published ? 'Live' : 'Draft'}
                        </button>
                      </div>
                      {item.alt_title && (
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{item.alt_title}</p>
                      )}
                      <p className="text-[10px] text-gray-500 mt-1">
                        {item.studio || 'Studio'} · {item.year || 2024} · {item.airing_day || 'Weekly'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs pt-1.5 border-t border-white/5 text-gray-400">
                      <span className="font-bold text-brand-400 font-mono text-[11px]">{item.episode_count} ភាគ</span>
                      <span>·</span>
                      <span className="text-amber-400 font-bold text-[11px] flex items-center gap-0.5">
                        <Flame className="w-3 h-3 fill-current" /> {item.heat_score?.toLocaleString() || 85000}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <Link
                    to={`/${item.type === 'ANIME' ? 'anime' : item.type === 'MOVIE' ? 'movie' : item.type === 'DRAMA' ? 'drama' : 'donghua'}/${item.slug}`}
                    target="_blank"
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <span>មើលលើ Web ↗</span>
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleBroadcastAnimeTelegram(item)}
                      disabled={broadcastingAnimeId === item.id}
                      className="p-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="ផ្សាយដំណឹងរឿងនេះលើ Telegram"
                    >
                      <Send className={`w-3.5 h-3.5 ${broadcastingAnimeId === item.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> កែប្រែ
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── DESKTOP & TABLET VIEW: Full Data Table (hidden on mobile md:block) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-muted/40 text-left">
                <th className="px-4 py-3.5 text-gray-400 font-bold text-xs">Series</th>
                <th className="px-4 py-3.5 text-gray-400 font-bold text-xs hidden md:table-cell">Airing Day</th>
                <th className="px-4 py-3.5 text-gray-400 font-bold text-xs hidden sm:table-cell">Status</th>
                <th className="px-4 py-3.5 text-gray-400 font-bold text-xs hidden lg:table-cell">Heat / Views</th>
                <th className="px-4 py-3.5 text-gray-400 font-bold text-xs hidden lg:table-cell">Episodes</th>
                <th className="px-4 py-3.5 text-gray-400 font-bold text-xs">State</th>
                <th className="px-4 py-3.5 text-gray-400 font-bold text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <SkeletonTable rows={8} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-xs">
                    {search ? `រកមិនឃើញ "${search}" ឡើយ` : `មិនទាន់មានទិន្នន័យ ${title} នៅឡើយទេ`}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b border-dark-border/40 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.poster_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100'}
                          alt={item.title}
                          className="w-9 h-12 rounded-lg object-cover bg-dark-bg border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate max-w-xs">{item.title}</p>
                          {item.alt_title && (
                            <p className="text-[11px] text-gray-400 truncate max-w-xs">{item.alt_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 font-medium text-xs hidden md:table-cell">
                      {item.airing_day || 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className={`badge ${
                        item.status === 'ONGOING' ? 'badge-ongoing' :
                        item.status === 'COMPLETED' ? 'badge-completed' : 'badge-upcoming'
                      } text-[10px]`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-xs">
                        <p className="text-amber-400 font-bold flex items-center gap-1">
                          <Flame className="w-3 h-3 fill-current" /> {item.heat_score?.toLocaleString() || 85000}
                        </p>
                        <p className="text-gray-500 text-[11px]">{item.view_count.toLocaleString()} views</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 font-bold text-xs hidden lg:table-cell">
                      {item.episode_count} eps
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => togglePublish(item)}
                        className={`badge ${item.is_published ? 'badge-ongoing' : 'badge-hiatus'} cursor-pointer text-[10px]`}
                        title="Click to toggle publish status"
                      >
                        {item.is_published ? 'Live' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleBroadcastAnimeTelegram(item)}
                          disabled={broadcastingAnimeId === item.id}
                          className="btn-icon text-gray-400 hover:text-blue-400"
                          title="ផ្សាយដំណឹងរឿងនេះលើ Telegram"
                        >
                          <Send className={`w-4 h-4 ${broadcastingAnimeId === item.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="btn-icon text-gray-400 hover:text-brand-400"
                          title="Edit Series"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="btn-icon text-gray-400 hover:text-red-400"
                          title="Delete Series"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {total > 15 && (
          <div className="p-4 border-t border-dark-border flex items-center justify-between text-xs text-gray-400">
            <span>Showing {filtered.length} of {total} series</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-3 text-xs">
                Previous
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={items.length < 15} className="btn-secondary py-1 px-3 text-xs">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-md overflow-y-auto py-8 px-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-3xl shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-dark-border bg-dark-muted/30">
              <div>
                <h2 className="font-display font-bold text-xl text-white">
                  {editItem ? `Edit: ${editItem.title}` : `Create New ${title}`}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure series details, airing days, and cover media</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Title (English / Main) *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({
                      ...f, title: e.target.value,
                      slug: editItem ? f.slug : generateSlug(e.target.value),
                    }))}
                    required className="input" placeholder="Renegade Immortal"
                  />
                </div>
                <div>
                  <label className="label">Slug *</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    required className="input" placeholder="renegade-immortal"
                  />
                </div>
                <div>
                  <label className="label">Chinese / Alternative Title</label>
                  <input
                    type="text"
                    value={form.alt_title}
                    onChange={(e) => setForm((f) => ({ ...f, alt_title: e.target.value }))}
                    className="input"
                    placeholder="仙逆 (Xian Ni)"
                  />
                </div>
                <div>
                  <label className="label">Animation Studio</label>
                  <input
                    type="text"
                    value={form.studio}
                    onChange={(e) => setForm((f) => ({ ...f, studio: e.target.value }))}
                    className="input"
                    placeholder="Foch Film / Tencent"
                  />
                </div>
                <div>
                  <label className="label">ថ្ងៃចាក់ផ្សាយប្រចាំសប្តាហ៍ (Weekly Airing Day)</label>
                  <select
                    value={form.airing_day}
                    onChange={(e) => setForm((f) => ({ ...f, airing_day: e.target.value }))}
                    className="input"
                  >
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">កម្រិតកម្តៅទស្សនា (Heat Score)</label>
                  <input
                    type="number"
                    value={form.heat_score}
                    onChange={(e) => setForm((f) => ({ ...f, heat_score: parseInt(e.target.value) || 0 }))}
                    className="input"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">ឆ្នាំចេញផ្សាយ (Release Year)</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) || 2024 }))}
                    className="input"
                    min="1990" max="2030"
                  />
                </div>
                <div>
                  <label className="label">ប្រភេទរឿង (Content Type) *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnimeType }))}
                    className="input"
                  >
                    <option value="DONGHUA">🇨🇳 រឿងចិន 3D (Donghua)</option>
                    <option value="DRAMA">🎭 រឿងភាគ (Drama)</option>
                    <option value="MOVIE">🎬 ភាពយន្តដុំ (Movie)</option>
                    <option value="ANIME">🇯🇵 រឿងជប៉ុន (Anime)</option>
                  </select>
                </div>
                <div>
                  <label className="label">ស្ថានភាពរឿង (Status) *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                    className="input"
                  >
                    <option value="ONGOING">កំពុងចាក់ផ្សាយ (Ongoing)</option>
                    <option value="COMPLETED">ចប់ជាស្ថាពរ (Completed)</option>
                    <option value="UPCOMING">នឹងចេញឆាប់ៗ (Upcoming)</option>
                    <option value="HIATUS">ផ្អាកបណ្ដោះអាសន្ន (Hiatus)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Synopsis / Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="input resize-none"
                  placeholder="Enter the cultivation storyline synopsis..."
                />
              </div>

              {/* Media URLs & Live Previews */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ── POSTER IMAGE ── */}
                <div>
                  <label className="label flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    Poster Image URL
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={form.poster_url}
                      onChange={(e) => setForm((f) => ({ ...f, poster_url: e.target.value }))}
                      className="input flex-1 min-w-0"
                      placeholder="https://... or import a file below"
                    />
                    {/* Hidden file input */}
                    <input
                      ref={posterInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'poster_url');
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => posterInputRef.current?.click()}
                      disabled={uploadingField === 'poster'}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                      title="Import image from your device"
                    >
                      {uploadingField === 'poster' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {uploadingField === 'poster' ? 'Uploading...' : 'Import'}
                      </span>
                    </button>
                  </div>
                  {/* Preview */}
                  {form.poster_url && (
                    <div className="relative group w-20 h-28 rounded-xl overflow-hidden bg-dark-muted border border-dark-border shadow-lg">
                      <img src={form.poster_url} alt="Poster preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, poster_url: '' }))}
                          className="p-1.5 rounded-full bg-red-500/80 text-white"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  {!form.poster_url && (
                    <button
                      type="button"
                      onClick={() => posterInputRef.current?.click()}
                      className="w-20 h-28 rounded-xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-purple-500/5 hover:bg-purple-500/10 flex flex-col items-center justify-center gap-1.5 text-purple-400 transition-all cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Upload</span>
                    </button>
                  )}
                </div>

                {/* ── BANNER IMAGE ── */}
                <div>
                  <label className="label flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    Banner Landscape URL
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={form.banner_url}
                      onChange={(e) => setForm((f) => ({ ...f, banner_url: e.target.value }))}
                      className="input flex-1 min-w-0"
                      placeholder="https://... or import a file below"
                    />
                    {/* Hidden file input */}
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'banner_url');
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploadingField === 'banner'}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                      title="Import image from your device"
                    >
                      {uploadingField === 'banner' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {uploadingField === 'banner' ? 'Uploading...' : 'Import'}
                      </span>
                    </button>
                  </div>
                  {/* Preview */}
                  {form.banner_url && (
                    <div className="relative group w-full h-28 rounded-xl overflow-hidden bg-dark-muted border border-dark-border shadow-lg">
                      <img src={form.banner_url} alt="Banner preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, banner_url: '' }))}
                          className="p-1.5 rounded-full bg-red-500/80 text-white"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  {!form.banner_url && (
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="w-full h-28 rounded-xl border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/5 hover:bg-cyan-500/10 flex flex-col items-center justify-center gap-2 text-cyan-400 transition-all cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Upload Banner</span>
                    </button>
                  )}
                </div>

                {/* Trailer Video URL */}
                <div className="col-span-full">
                  <label className="label flex items-center justify-between">
                    <span>🎬 TRAILER VIDEO URL (YouTube / Direct MP4)</span>
                    <span className="text-[10px] text-gray-400 font-normal">ឧទាហរណ៍៖ https://www.youtube.com/watch?v=...</span>
                  </label>
                  <input
                    type="url"
                    value={form.trailer_url}
                    onChange={(e) => setForm((f) => ({ ...f, trailer_url: e.target.value }))}
                    className="input w-full"
                    placeholder="https://www.youtube.com/watch?v=... ឬ https://.../trailer.mp4"
                  />
                </div>
              </div>

              {/* Genre Multi-select */}
              <div>
                <label className="label">Genre & Cultivation Realms</label>
                <div className="flex flex-wrap gap-2 p-3 bg-dark-muted rounded-2xl border border-dark-border max-h-32 overflow-y-auto">
                  {genres.map((g) => {
                    const selected = form.genre_ids.includes(g.id);
                    return (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => setForm((f) => ({
                          ...f,
                          genre_ids: selected
                            ? f.genre_ids.filter((id) => id !== g.id)
                            : [...f.genre_ids, g.id],
                        }))}
                        className={`badge cursor-pointer transition-all ${
                          selected
                            ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20'
                            : 'bg-dark-card text-gray-400 border-dark-border hover:text-white'
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-6 pt-2">
                {[
                  { key: 'is_published', label: 'Published / Visible on Site' },
                  { key: 'is_free', label: '🆓 Free to Watch / មើលឥតគិតថ្លៃ (No VIP Needed)' },
                  { key: 'is_featured', label: 'Feature on Hero Carousel' },
                  { key: 'is_trending', label: 'Mark as Trending' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form as any)[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-brand-500 rounded"
                    />
                    <span className="text-xs font-semibold text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex gap-3 pt-4 border-t border-dark-border">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
                  {saving ? 'Saving Changes...' : editItem ? 'Update Series' : 'Publish Series'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost py-3">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
