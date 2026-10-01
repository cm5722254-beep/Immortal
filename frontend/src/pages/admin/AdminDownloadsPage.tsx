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
        <section className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,.17),transparent_48%),linear-gradient(115deg,#101923,#0d1117_58%,#101b19)] p-5 sm:p-7">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Admin media tools</div>
              <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white sm:text-3xl"><FolderDown className="h-7 w-7 text-emerald-400" /> Video downloads</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Choose series, then save available video files straight into organized folders on this computer.</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300/90"><ShieldCheck className="h-4 w-4" /> Your browser asks you to choose where files are saved.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
              <div className="rounded-2xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2 text-xs font-medium text-slate-400"><Film className="h-4 w-4 text-emerald-400" /> Series in library</div><div className="mt-2 text-2xl font-black text-white">{loading ? '—' : items.length}</div></div>
              <div className="rounded-2xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center gap-2 text-xs font-medium text-slate-400"><Layers3 className="h-4 w-4 text-sky-400" /> Episodes listed</div><div className="mt-2 text-2xl font-black text-white">{loading ? '—' : episodeCount.toLocaleString()}</div></div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#11151c] p-12 text-sm text-gray-300"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading library…</div>
        ) : error ? (
          <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-950/20 p-5 text-sm text-red-200"><AlertCircle className="h-5 w-5 shrink-0" />{String(error)}</div>
        ) : items.length ? (
          <AdminSeriesDownloader items={items} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#11151c] p-10 text-center text-sm text-gray-400"><Download className="mx-auto mb-3 h-8 w-8" />No series are available to download.</div>
        )}
      </div>
    </AdminLayout>
  );
}
