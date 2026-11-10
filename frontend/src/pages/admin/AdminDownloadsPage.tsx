import { useEffect, useState } from 'react';
import { Download, FolderDown, LoaderCircle, ShieldCheck, Film, Layers3, AlertCircle } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { AdminSeriesDownloader } from './AdminSeriesDownloader';
import api from '../../services/api';
import type { Anime, PaginatedResponse } from '../../types';

export function AdminDownloadsPage() {
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const episodeCount = items.reduce((sum, item) => sum + (Number(item.episode_count) || 0), 0);

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
      <div className="mx-auto max-w-screen-2xl space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
          <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-blue-700">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Admin media tools
              </div>
              <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                <FolderDown className="h-7 w-7 text-blue-600" /> Video downloads
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Choose series, then save available video files straight into organized folders on this computer.
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Your browser asks you to choose where files are saved.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Film className="h-4 w-4 text-blue-600" /> Series in library
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">{loading ? '—' : items.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Layers3 className="h-4 w-4 text-sky-600" /> Episodes listed
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">{loading ? '—' : episodeCount.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-12 text-sm text-slate-600 shadow-xs">
            <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" /> Loading library…
          </div>
        ) : error ? (
          <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />{String(error)}
          </div>
        ) : items.length ? (
          <AdminSeriesDownloader items={items} />
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center text-sm text-slate-500 shadow-xs">
            <Download className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            No series are available to download.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
