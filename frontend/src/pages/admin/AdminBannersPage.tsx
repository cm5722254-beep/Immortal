import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit3, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { triggerConfirm } from '../../store/confirmStore';
import api from '../../services/api';
import type { Banner, Anime } from '../../types';

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
        <div className="card p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl bg-[#181818] border border-white/10 rounded-2xl">
          <div>
            <h2 className="font-bold text-white text-sm">Homepage Hero Slides</h2>
            <p className="text-xs text-gray-400">ផ្ទាំងបដារំកិលធំនៅទំព័រដើម Website</p>
          </div>
          <button onClick={openCreate} className="btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/25 cursor-pointer">
            <Plus className="w-4 h-4" /> + បន្ថែមផ្ទាំងបដាថ្មី
          </button>
        </div>

        {/* Banners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((b) => (
            <div key={b.id} className="card group overflow-hidden border border-dark-border hover:border-brand-500/50 transition-all duration-300 shadow-xl">
              {/* Banner Image Preview */}
              <div className="relative aspect-video bg-dark-muted overflow-hidden">
                <img
                  src={b.image_url}
                  alt={b.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                <div className="absolute top-3 left-3">
                  <span className={`badge ${b.is_active ? 'badge-ongoing' : 'badge-hiatus'} text-[10px]`}>
                    {b.is_active ? 'Active on Carousel' : 'Inactive'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-display font-bold text-white text-base truncate">{b.title}</h3>
                  {b.subtitle && <p className="text-xs text-gray-300 truncate">{b.subtitle}</p>}
                </div>
              </div>

              {/* Card Controls */}
              <div className="p-3.5 flex items-center justify-between border-t border-dark-border bg-dark-card">
                <span className="text-[11px] text-gray-500 font-mono">Order: #{b.order_index}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(b)}
                    className="btn-icon text-gray-400 hover:text-brand-400"
                    title={b.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {b.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="btn-icon text-gray-400 hover:text-brand-400"
                    title="Edit Slide"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="btn-icon text-gray-400 hover:text-red-400"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-dark-border bg-dark-muted/30">
              <h2 className="font-display font-bold text-lg text-white">
                {editBanner ? 'Edit Banner Slide' : 'Create Banner Slide'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Auto-Fill from Series (Optional)</label>
                <select
                  onChange={(e) => handleAnimeSelect(parseInt(e.target.value))}
                  className="input text-xs"
                >
                  <option value="">— Select a series to auto-fill —</option>
                  {animeList.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Banner Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required className="input" placeholder="Renegade Immortal"
                />
              </div>

              <div>
                <label className="label">Subtitle</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  className="input" placeholder="Defying the Heavens"
                />
              </div>

              <div>
                <label className="label">Banner Landscape Image URL *</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  required className="input" placeholder="https://images.unsplash.com/..."
                />
                {form.image_url && (
                  <div className="h-28 w-full rounded-xl overflow-hidden bg-dark-muted border border-dark-border mt-2">
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="label">Link URL (When Clicked)</label>
                <input
                  type="text"
                  value={form.link_url}
                  onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                  className="input" placeholder="/anime/renegade-immortal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Display Order</label>
                  <input
                    type="number"
                    value={form.order_index}
                    onChange={(e) => setForm((f) => ({ ...f, order_index: parseInt(e.target.value) || 0 }))}
                    className="input" min="0"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 accent-brand-500 rounded"
                    />
                    <span className="text-xs font-semibold text-gray-300">Active Slide</span>
                  </label>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex gap-3 pt-4 border-t border-dark-border">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
                  {saving ? 'Saving...' : editBanner ? 'Update Slide' : 'Save Banner Slide'}
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
