import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit3, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { triggerConfirm } from '../../store/confirmStore';
import api from '../../services/api';
import type { Banner, Anime } from '../../types';

const INPUT_CLASS =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all';
const LABEL_CLASS =
  'block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5';

export function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState({
    title: '', subtitle: '', image_url: '', link_url: '', anime_id: 0, is_active: true, order_index: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBanners = useCallback(async () => {
    try {
      const [bannersRes, animeRes] = await Promise.all([
        api.get('/admin/banners'),
        api.get('/anime?per_page=100&sort=az'),
      ]);
      setBanners(bannersRes.data);
      setAnimeList(animeRes.data.items);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const openCreate = () => {
    setEditBanner(null);
    setForm({
      title: '', subtitle: '', image_url: '', link_url: '', anime_id: 0, is_active: true, order_index: banners.length,
    });
    setError('');
    setShowModal(true);
  };

  const openEdit = (b: Banner) => {
    setEditBanner(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle || '',
      image_url: b.image_url,
      link_url: b.link_url || '',
      anime_id: b.anime_id || 0,
      is_active: b.is_active,
      order_index: b.order_index,
    });
    setError('');
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    triggerConfirm({
      title: 'Delete Featured Banner',
      message: 'Are you sure you want to remove this banner slide from the homepage carousel?',
      confirmText: 'Delete Banner',
      variant: 'danger',
      onConfirm: async () => {
        await api.delete(`/admin/banners/${id}`);
        fetchBanners();
      },
    });
  };

  const toggleActive = async (b: Banner) => {
    await api.put(`/admin/banners/${b.id}`, { is_active: !b.is_active });
    fetchBanners();
  };

  const handleAnimeSelect = (animeId: number) => {
    const selected = animeList.find((a) => a.id === animeId);
    if (selected) {
      setForm((f) => ({
        ...f,
        anime_id: selected.id,
        title: selected.title,
        subtitle: selected.alt_title || '',
        image_url: selected.banner_url || selected.poster_url || '',
        link_url: `/anime/${selected.slug}`,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editBanner) {
        await api.put(`/admin/banners/${editBanner.id}`, form);
      } else {
        await api.post('/admin/banners', form);
      }
      setShowModal(false);
      fetchBanners();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="ផ្ទាំងបដាផ្សាយ (Banners)">
      <div className="space-y-4 sm:space-y-6">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">Homepage Hero Slides</h2>
            <p className="text-xs text-slate-500 mt-0.5">ផ្ទាំងបដារំកិលធំនៅទំព័រដើម Website</p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> បន្ថែមផ្ទាំងបដាថ្មី
          </button>
        </div>

        {/* Banners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {banners.map((b) => (
            <div
              key={b.id}
              className="group overflow-hidden bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl transition-all duration-300 shadow-xs flex flex-col"
            >
              {/* Banner Image Preview */}
              <div className="relative aspect-video bg-slate-100 overflow-hidden">
                <img
                  src={b.image_url}
                  alt={b.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs ${
                    b.is_active
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white'
                  }`}>
                    {b.is_active ? 'Active on Carousel' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Banner Title & Subtitle */}
              <div className="p-4 flex-1">
                <h3 className="font-display font-bold text-slate-900 text-base truncate">{b.title}</h3>
                {b.subtitle ? (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{b.subtitle}</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">No subtitle</p>
                )}
              </div>

              {/* Card Controls */}
              <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/60">
                <span className="text-[11px] text-slate-500 font-mono">Order: #{b.order_index}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(b)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    title={b.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {b.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    title="Edit Slide"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Banner Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200/80 bg-slate-50/70">
              <h2 className="font-display font-bold text-lg text-slate-900">
                {editBanner ? 'Edit Banner Slide' : 'Create Banner Slide'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={LABEL_CLASS}>Auto-Fill from Series (Optional)</label>
                <select
                  onChange={(e) => handleAnimeSelect(parseInt(e.target.value))}
                  className={`${INPUT_CLASS} text-xs`}
                >
                  <option value="">— Select a series to auto-fill —</option>
                  {animeList.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL_CLASS}>Banner Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required className={INPUT_CLASS} placeholder="Renegade Immortal"
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>Subtitle</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  className={INPUT_CLASS} placeholder="Defying the Heavens"
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>Banner Landscape Image URL *</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  required className={INPUT_CLASS} placeholder="https://images.unsplash.com/..."
                />
                {form.image_url && (
                  <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mt-2">
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className={LABEL_CLASS}>Link URL (When Clicked)</label>
                <input
                  type="text"
                  value={form.link_url}
                  onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                  className={INPUT_CLASS} placeholder="/anime/renegade-immortal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>Display Order</label>
                  <input
                    type="number"
                    value={form.order_index}
                    onChange={(e) => setForm((f) => ({ ...f, order_index: parseInt(e.target.value) || 0 }))}
                    className={INPUT_CLASS} min="0"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-700">Active Slide</span>
                  </label>
                </div>
              </div>

              {error && <p className="text-rose-600 text-xs font-medium">{error}</p>}

              <div className="flex gap-3 pt-4 border-t border-slate-200/80">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editBanner ? 'Update Slide' : 'Save Banner Slide'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition cursor-pointer"
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
