import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Edit3, Trash2, Search, X, Flame, RefreshCw, RotateCcw,
  CheckCircle2, Send, Upload, ImageIcon, FolderOpen, ExternalLink
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import { triggerConfirm } from '../../store/confirmStore';
import api from '../../services/api';
import { loadCatalog } from '../../services/catalogService';
import type { Anime, Genre, PaginatedResponse, AnimeType } from '../../types';
import { AdminSeriesDownloader } from './AdminSeriesDownloader';

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

const INPUT_CLASS =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all';
const LABEL_CLASS =
  'block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5';

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
  const [selectedAnimeIds, setSelectedAnimeIds] = useState<number[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const posterInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File, field: 'poster_url' | 'banner_url') => {
    const fieldKey = field === 'poster_url' ? 'poster' : 'banner';
    setUploadingField(fieldKey);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Do NOT set Content-Type manually — axios sets multipart/form-data + boundary automatically
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
    setSelectedAnimeIds([]);
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
          setToastMessage(`បានលុបរឿង "${title}" ដោយជោគជ័យ!`);
          fetchItems();
          setTimeout(() => setToastMessage(null), 4000);
        } catch (err: any) {
          alert(err?.response?.data?.detail || 'បរាជ័យក្នុងការលុបរឿង');
        }
      },
    });
  };

  const toggleAnimeSelection = (id: number) => {
    setSelectedAnimeIds((selected) => selected.includes(id)
      ? selected.filter((selectedId) => selectedId !== id)
      : [...selected, id]);
  };

  const toggleVisibleAnimeSelection = () => {
    const visibleIds = filtered.map((item) => item.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedAnimeIds.includes(id));
    setSelectedAnimeIds((selected) => allVisibleSelected
      ? selected.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...selected, ...visibleIds])));
  };

  const handleDeleteSelected = () => {
    const selectedItems = items.filter((item) => selectedAnimeIds.includes(item.id));
    if (!selectedItems.length) return;
    const names = selectedItems.slice(0, 3).map((item) => `“${item.title}”`).join(', ');
    const extraCount = selectedItems.length - 3;
    triggerConfirm({
      title: `Delete selected series (${selectedItems.length})?`,
      message: `Permanently delete ${names}${extraCount > 0 ? ` and ${extraCount} more` : ''}? All episodes, comments, ratings, favorites, and watch history for these series will also be deleted.`,
      confirmText: `Delete ${selectedItems.length}`,
      variant: 'danger',
      onConfirm: async () => {
        setIsDeletingSelected(true);
        let deleted = 0;
        let failed = 0;
        for (const item of selectedItems) {
          try {
            await api.delete(`/anime/${item.id}`);
            deleted += 1;
          } catch {
            failed += 1;
          }
        }
        setSelectedAnimeIds([]);
        await fetchItems();
        setIsDeletingSelected(false);
        setToastMessage(`Deleted ${deleted} series${failed ? `; ${failed} failed` : ''}.`);
        window.setTimeout(() => setToastMessage(null), 5000);
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
      setToastMessage(res.data?.message || `បានផ្សាយដំណឹងរឿង «${anime.title}» ទៅកាន់ Telegram រួចរាល់!`);
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
      setToastMessage(`បានរក្សាទុកទិន្នន័យ (${res.data.counts?.anime || items.length} រឿង) ជាប់រហូត 100%!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch {
      setToastMessage('បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSavingBackup(false);
    }
  };

  const handleRecoverMissing = async () => {
    triggerConfirm({
      title: `ស្តាររឿង ${title} ដែលបាត់បង់ (Emergency Recover)`,
      message: 'តើអ្នកចង់ស្តាររឿង និងភាគទាំងអស់ដែលបានបម្រុងទុកមកវិញមែនទេ? ប្រព័ន្ធនឹងបញ្ចូលរឿងដែលបាត់បង់ដោយសុវត្ថិភាព (Safe Merge)។',
      confirmText: 'ស្តារឡើងវិញភ្លាមៗ (Recover)',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsRecovering(true);
          const res = await api.post('/admin/backup/recover-missing');
          setToastMessage(`បានស្តាររឿងដែលបាត់បង់មកវិញជោគជ័យ! (+${res.data.added_counts?.anime || 0} រឿង, +${res.data.added_counts?.episodes || 0} ភាគ)`);
          fetchItems();
          setTimeout(() => setToastMessage(null), 5000);
        } catch {
          setToastMessage('បរាជ័យក្នុងការស្តារទិន្នន័យ');
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
      <div className="space-y-5">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-slide-down shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Action Header & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`ស្វែងរក ${title}...`}
                className={`${INPUT_CLASS} pl-10 py-2 text-xs md:text-sm`}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className={`${INPUT_CLASS} py-2 px-3 text-xs md:text-sm sm:w-48 shrink-0`}
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
              type="button"
              onClick={toggleVisibleAnimeSelection}
              disabled={!filtered.length || isDeletingSelected}
              className="rounded-xl text-xs py-2 px-3 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              {filtered.length > 0 && filtered.every((item) => selectedAnimeIds.includes(item.id)) ? 'Clear selection' : 'Select visible'}
            </button>
            {selectedAnimeIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={isDeletingSelected}
                className="rounded-xl text-xs py-2 px-3 flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingSelected ? 'Deleting…' : `Delete selected (${selectedAnimeIds.length})`}
              </button>
            )}
            <button
              onClick={handleSaveBackup}
              disabled={isSavingBackup}
              className="rounded-xl text-xs py-2 px-3 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="រក្សាទុកទិន្នន័យរឿងទាំងអស់ជាប់រហូត"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSavingBackup ? 'animate-spin' : ''}`} />
              <span>{isSavingBackup ? 'កំពុងរក្សា...' : 'Save Data'}</span>
            </button>

            <button
              onClick={handleRecoverMissing}
              disabled={isRecovering}
              className="rounded-xl text-xs py-2 px-3 flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="ស្តាររឿងដែលបាត់បង់មកវិញ"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
              <span>{isRecovering ? 'កំពុងស្តារ...' : 'ស្តាររឿង'}</span>
            </button>

            <button
              onClick={openCreate}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm py-2 px-4 shadow-xs col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> បន្ថែម {title} ថ្មី
            </button>
          </div>
        </div>

        <AdminSeriesDownloader items={filtered} />

        {/* Catalog Container */}
        <div className="overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          {/* ── MOBILE VIEW: Touch-friendly cards for phones (md:hidden) ── */}
          <div className="block md:hidden p-3 space-y-3 divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-8"><SkeletonTable rows={4} /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-slate-500 py-12 text-xs">រកមិនឃើញរឿងឡើយ</p>
            ) : (
              filtered.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAnimeIds.includes(item.id)}
                      onChange={() => toggleAnimeSelection(item.id)}
                      aria-label={`Select ${item.title}`}
                      className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                    />
                    <img
                      src={item.poster_url || ''}
                      alt=""
                      className="w-16 h-22 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                    />
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.title}</h4>
                          <button
                            onClick={() => togglePublish(item)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 cursor-pointer ${
                              item.is_published
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {item.is_published ? 'Live' : 'Draft'}
                          </button>
                        </div>
                        {item.alt_title && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.alt_title}</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          {item.studio || 'Studio'} · {item.year || 2024} · {item.airing_day || 'Weekly'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs pt-1.5 border-t border-slate-200/80 text-slate-500">
                        <span className="font-bold text-blue-600 font-mono text-[11px]">{item.episode_count} ភាគ</span>
                        <span>·</span>
                        <span className="text-amber-600 font-bold text-[11px] flex items-center gap-0.5">
                          <Flame className="w-3 h-3 fill-current" /> {item.heat_score?.toLocaleString() || 85000}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                    <Link
                      to={`/${item.type === 'ANIME' ? 'anime' : item.type === 'MOVIE' ? 'movie' : item.type === 'DRAMA' ? 'drama' : 'donghua'}/${item.slug}`}
                      target="_blank"
                      className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1"
                    >
                      <span>មើលលើ Web</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleBroadcastAnimeTelegram(item)}
                        disabled={broadcastingAnimeId === item.id}
                        className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/60 text-blue-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="ផ្សាយដំណឹងរឿងនេះលើ Telegram"
                      >
                        <Send className={`w-3.5 h-3.5 ${broadcastingAnimeId === item.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> កែប្រែ
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/60 text-rose-600 text-xs cursor-pointer"
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
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-left">
                  <th className="px-3 py-3.5">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((item) => selectedAnimeIds.includes(item.id))}
                      onChange={toggleVisibleAnimeSelection}
                      aria-label="Select all visible series"
                      className="h-4 w-4 accent-blue-600"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-slate-500 font-semibold text-xs">Series</th>
                  <th className="px-4 py-3.5 text-slate-500 font-semibold text-xs hidden md:table-cell">Airing Day</th>
                  <th className="px-4 py-3.5 text-slate-500 font-semibold text-xs hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3.5 text-slate-500 font-semibold text-xs hidden lg:table-cell">Heat / Views</th>
                  <th className="px-4 py-3.5 text-slate-500 font-semibold text-xs hidden lg:table-cell">Episodes</th>
                  <th className="px-4 py-3.5 text-slate-500 font-semibold text-xs">State</th>
                  <th className="px-4 py-3.5 text-slate-500 font-semibold text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8">
                      <SkeletonTable rows={8} />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-xs">
                      {search ? `រកមិនឃើញ "${search}" ឡើយ` : `មិនទាន់មានទិន្នន័យ ${title} នៅឡើយទេ`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedAnimeIds.includes(item.id)}
                          onChange={() => toggleAnimeSelection(item.id)}
                          aria-label={`Select ${item.title}`}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.poster_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100'}
                            alt={item.title}
                            className="w-9 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate max-w-xs">{item.title}</p>
                            {item.alt_title && (
                              <p className="text-[11px] text-slate-500 truncate max-w-xs">{item.alt_title}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium text-xs hidden md:table-cell">
                        {item.airing_day || 'N/A'}
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'ONGOING'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'COMPLETED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.status === 'UPCOMING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <div className="text-xs">
                          <p className="text-amber-600 font-bold flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-current" /> {item.heat_score?.toLocaleString() || 85000}
                          </p>
                          <p className="text-slate-500 text-[11px]">{item.view_count.toLocaleString()} views</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-bold text-xs hidden lg:table-cell">
                        {item.episode_count} eps
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => togglePublish(item)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${
                            item.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                          title="Click to toggle publish status"
                        >
                          {item.is_published ? 'Live' : 'Draft'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleBroadcastAnimeTelegram(item)}
                            disabled={broadcastingAnimeId === item.id}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="ផ្សាយដំណឹងរឿងនេះលើ Telegram"
                          >
                            <Send className={`w-4 h-4 ${broadcastingAnimeId === item.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Series"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
            <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40">
              <span>Showing {filtered.length} of {total} series</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={items.length < 15}
                  className="rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm overflow-y-auto py-8 px-4 animate-fade-in">
          <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-3xl shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200/80 bg-slate-50/70">
              <div>
                <h2 className="font-display font-bold text-xl text-slate-900">
                  {editItem ? `Edit: ${editItem.title}` : `Create New ${title}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Configure series details, airing days, and cover media</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>Title (English / Main) *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({
                      ...f, title: e.target.value,
                      slug: editItem ? f.slug : generateSlug(e.target.value),
                    }))}
                    required className={INPUT_CLASS} placeholder="Renegade Immortal"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Slug *</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    required className={INPUT_CLASS} placeholder="renegade-immortal"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Chinese / Alternative Title</label>
                  <input
                    type="text"
                    value={form.alt_title}
                    onChange={(e) => setForm((f) => ({ ...f, alt_title: e.target.value }))}
                    className={INPUT_CLASS}
                    placeholder="仙逆 (Xian Ni)"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Animation Studio</label>
                  <input
                    type="text"
                    value={form.studio}
                    onChange={(e) => setForm((f) => ({ ...f, studio: e.target.value }))}
                    className={INPUT_CLASS}
                    placeholder="Foch Film / Tencent"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>ថ្ងៃចាក់ផ្សាយប្រចាំសប្តាហ៍ (Weekly Airing Day)</label>
                  <select
                    value={form.airing_day}
                    onChange={(e) => setForm((f) => ({ ...f, airing_day: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>កម្រិតកម្តៅទស្សនា (Heat Score)</label>
                  <input
                    type="number"
                    value={form.heat_score}
                    onChange={(e) => setForm((f) => ({ ...f, heat_score: parseInt(e.target.value) || 0 }))}
                    className={INPUT_CLASS}
                    min="0"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>ឆ្នាំចេញផ្សាយ (Release Year)</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) || 2024 }))}
                    className={INPUT_CLASS}
                    min="1990" max="2030"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>ប្រភេទរឿង (Content Type) *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnimeType }))}
                    className={INPUT_CLASS}
                  >
                    <option value="DONGHUA">រឿងចិន 3D (Donghua)</option>
                    <option value="DRAMA">រឿងភាគ (Drama)</option>
                    <option value="MOVIE">ភាពយន្តដុំ (Movie)</option>
                    <option value="ANIME">រឿងជប៉ុន (Anime)</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>ស្ថានភាពរឿង (Status) *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                    className={INPUT_CLASS}
                  >
                    <option value="ONGOING">កំពុងចាក់ផ្សាយ (Ongoing)</option>
                    <option value="COMPLETED">ចប់ជាស្ថាពរ (Completed)</option>
                    <option value="UPCOMING">នឹងចេញឆាប់ៗ (Upcoming)</option>
                    <option value="HIATUS">ផ្អាកបណ្ដោះអាសន្ន (Hiatus)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>Synopsis / Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className={`${INPUT_CLASS} resize-none`}
                  placeholder="Enter the cultivation storyline synopsis..."
                />
              </div>

              {/* Media URLs & Live Previews */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ── POSTER IMAGE ── */}
                <div>
                  <label className={`${LABEL_CLASS} flex items-center gap-1.5`}>
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    Poster Image URL
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={form.poster_url}
                      onChange={(e) => setForm((f) => ({ ...f, poster_url: e.target.value }))}
                      className={`${INPUT_CLASS} flex-1 min-w-0`}
                      placeholder="https://... or import a file below"
                    />
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
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-60"
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
                  {form.poster_url && (
                    <div className="relative group w-20 h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
                      <img src={form.poster_url} alt="Poster preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, poster_url: '' }))}
                          className="p-1.5 rounded-full bg-rose-600 text-white cursor-pointer"
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
                      className="w-20 h-28 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Upload</span>
                    </button>
                  )}
                </div>

                {/* ── BANNER IMAGE ── */}
                <div>
                  <label className={`${LABEL_CLASS} flex items-center gap-1.5`}>
                    <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                    Banner Landscape URL
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={form.banner_url}
                      onChange={(e) => setForm((f) => ({ ...f, banner_url: e.target.value }))}
                      className={`${INPUT_CLASS} flex-1 min-w-0`}
                      placeholder="https://... or import a file below"
                    />
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
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-60"
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
                  {form.banner_url && (
                    <div className="relative group w-full h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
                      <img src={form.banner_url} alt="Banner preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, banner_url: '' }))}
                          className="p-1.5 rounded-full bg-rose-600 text-white cursor-pointer"
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
                      className="w-full h-28 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Upload Banner</span>
                    </button>
                  )}
                </div>

                {/* Trailer Video URL */}
                <div className="col-span-full">
                  <label className={`${LABEL_CLASS} flex items-center justify-between`}>
                    <span>TRAILER VIDEO URL (YouTube / Direct MP4)</span>
                    <span className="text-[10px] text-slate-400 font-normal normal-case">ឧទាហរណ៍៖ https://www.youtube.com/watch?v=...</span>
                  </label>
                  <input
                    type="url"
                    value={form.trailer_url}
                    onChange={(e) => setForm((f) => ({ ...f, trailer_url: e.target.value }))}
                    className={INPUT_CLASS}
                    placeholder="https://www.youtube.com/watch?v=... ឬ https://.../trailer.mp4"
                  />
                </div>
              </div>

              {/* Genre Multi-select */}
              <div>
                <label className={LABEL_CLASS}>Genre & Cultivation Realms</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-32 overflow-y-auto">
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
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
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
                  { key: 'is_free', label: 'Free to Watch / មើលឥតគិតថ្លៃ (No VIP Needed)' },
                  { key: 'is_featured', label: 'Feature on Hero Carousel' },
                  { key: 'is_trending', label: 'Mark as Trending' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form as any)[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-700">{label}</span>
                  </label>
                ))}
              </div>

              {error && <p className="text-rose-600 text-xs font-medium">{error}</p>}

              <div className="flex gap-3 pt-4 border-t border-slate-200/80">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving Changes...' : editItem ? 'Update Series' : 'Publish Series'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all cursor-pointer"
                >
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
