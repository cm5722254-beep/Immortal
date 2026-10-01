import { useEffect, useState } from 'react';
import { Download, FolderDown, LoaderCircle, ShieldCheck } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { AdminSeriesDownloader } from './AdminSeriesDownloader';
import api from '../../services/api';
import type { Anime, PaginatedResponse } from '../../types';

export function AdminDownloadsPage() {
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const all: Anime[] = [];
        let page = 1;
        let total = Number.POSITIVE_INFINITY;
        while (all.length < total) {
          const response = await api.get(`/anime?page=${page}&per_page=100&sort=latest`);
          const data = response.data as PaginatedResponse<Anime>;
          const batch = Array.isArray(data?.items) ? data.items : [];
          if (!batch.length) break;
          all.push(...batch);
          total = Number(data.total) || all.length;
          page += 1;
        }
        if (!cancelled) setItems(all);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.detail || 'Could not load the video library.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <AdminLayout title="Admin Video Downloads">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 to-[#11151c] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300"><FolderDown className="h-6 w-6" /></div>
            <div>
              <h2 className="text-lg font-bold text-white">Download videos to a computer folder</h2>
              <p className="mt-1 max-w-3xl text-sm text-gray-400">Choose one or more series, select a destination folder, and save available direct video files into separate series folders.</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300"><ShieldCheck className="h-4 w-4" /> Admin tool · Browser will ask you to choose the folder.</p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#11151c] p-12 text-sm text-gray-300"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading library…</div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-200">{String(error)}</div>
        ) : items.length ? (
          <AdminSeriesDownloader items={items} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#11151c] p-10 text-center text-sm text-gray-400"><Download className="mx-auto mb-3 h-8 w-8" />No series are available to download.</div>
        )}
      </div>
    </AdminLayout>
  );
}
