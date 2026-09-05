import { useEffect, useState, useCallback } from 'react';
import { Trash2, Flag, Eye, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { triggerConfirm } from '../../store/confirmStore';
import api from '../../services/api';

interface AdminComment {
  id: number;
  content: string;
  is_reported: boolean;
  is_deleted: boolean;
  likes_count: number;
  created_at: string;
  user?: { id: number; username: string };
  anime?: { id: number; title: string; slug: string };
}

export function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [reportedOnly, setReportedOnly] = useState(false);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/comments?page=${page}&reported_only=${reportedOnly}`);
      setComments(res.data.items);
      setTotal(res.data.total);
    } finally {
      setIsLoading(false);
    }
  }, [page, reportedOnly]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const deleteComment = (id: number) => {
    triggerConfirm({
      title: 'Moderate Comment',
      message: 'Permanently remove this comment from community discussion?',
      confirmText: 'Delete Comment',
      variant: 'danger',
      onConfirm: async () => {
        await api.delete(`/admin/comments/${id}`);
        fetchComments();
      },
    });
  };

  return (
    <AdminLayout title="គ្រប់គ្រងមតិ (Comments)">
      <div className="space-y-4 sm:space-y-6">
        {/* Filters */}
        <div className="card p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl bg-[#181818] border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setReportedOnly(false); setPage(1); }}
              className={`btn text-xs py-2 px-3.5 cursor-pointer ${!reportedOnly ? 'btn-primary shadow-md shadow-red-600/20' : 'btn-secondary'}`}
            >
              <Eye className="w-4 h-4" /> All ({total})
            </button>
            <button
              onClick={() => { setReportedOnly(true); setPage(1); }}
              className={`btn text-xs py-2 px-3.5 cursor-pointer ${reportedOnly ? 'btn-danger shadow-md shadow-red-500/20' : 'btn-secondary'}`}
            >
              <Flag className="w-4 h-4 text-red-400" /> Flagged & Reported
            </button>
          </div>

          <span className="text-xs text-gray-400 font-mono">
            {reportedOnly ? 'Showing flagged discussions' : 'Showing all community threads'}
          </span>
        </div>

        {/* Comments Container */}
        <div className="card overflow-hidden shadow-2xl bg-[#181818] border border-white/10 rounded-2xl">
          {/* ── MOBILE VIEW: Touch-Friendly Comments Cards (md:hidden) ── */}
          <div className="block md:hidden p-3 space-y-3 divide-y divide-white/5">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8 text-xs">កំពុងទាញយកមតិ...</p>
            ) : comments.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-xs">គ្មានមតិត្រូវពិនិត្យឡើយ</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className={`pt-3 first:pt-0 bg-[#151515] p-3.5 rounded-2xl border border-white/5 space-y-2.5 shadow-md ${c.is_reported ? 'border-red-500/40 bg-red-950/10' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center text-[10px] font-bold">
                        {c.user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs font-bold text-white">{c.user?.username || 'Anonymous'}</span>
                    </div>
                    {c.is_reported && (
                      <span className="badge bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-bold">
                        Reported
                      </span>
                    )}
                  </div>

                  <p className={`text-xs ${c.is_deleted ? 'text-gray-600 italic line-through' : 'text-gray-200'}`}>
                    {c.content}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-white/5">
                    <span>{new Date(c.created_at).toLocaleString()} · {c.likes_count} likes</span>
                    <div className="flex items-center gap-1">
                      {!c.is_deleted && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                          title="Delete Comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── DESKTOP VIEW: Table (hidden on mobile md:block) ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-muted/40">
                <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs">Comment Content</th>
                <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs hidden md:table-cell">Author</th>
                <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs hidden lg:table-cell">Series</th>
                <th className="px-4 py-3.5 text-left text-gray-400 font-bold text-xs hidden sm:table-cell">Status</th>
                <th className="px-4 py-3.5 text-right text-gray-400 font-bold text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center text-gray-500 py-12">Loading discussions...</td></tr>
              ) : comments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-12">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    No flagged or deleted comments to review.
                  </td>
                </tr>
              ) : (
                comments.map((c) => (
                  <tr key={c.id} className={`border-b border-dark-border/40 hover:bg-white/5 transition-colors ${c.is_reported ? 'bg-red-500/5' : ''}`}>
                    <td className="px-4 py-3.5 max-w-sm">
                      <p className={`text-xs md:text-sm line-clamp-2 ${c.is_deleted ? 'text-gray-600 italic line-through' : 'text-gray-200'}`}>
                        {c.content}
                      </p>
                      <span className="text-[10px] text-gray-500 mt-1 block">
                        {new Date(c.created_at).toLocaleString()} · {c.likes_count} likes
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 font-medium text-xs hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 flex items-center justify-center text-[10px] font-bold">
                          {c.user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span>{c.user?.username || 'Anonymous'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs hidden lg:table-cell">
                      {c.anime ? (
                        <a
                          href={`/anime/${c.anime.slug}`}
                          className="text-brand-400 hover:underline flex items-center gap-1"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {c.anime.title} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <div className="flex flex-col gap-1 items-start">
                        {c.is_reported && (
                          <span className="badge bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Reported
                          </span>
                        )}
                        {c.is_deleted && (
                          <span className="badge bg-gray-500/20 text-gray-400 text-[10px]">Deleted</span>
                        )}
                        {!c.is_reported && !c.is_deleted && (
                          <span className="badge badge-ongoing text-[10px]">Active</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {!c.is_deleted && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="btn-icon text-gray-400 hover:text-red-400"
                          title="Delete Comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>

          {total > 20 && (
            <div className="p-4 border-t border-dark-border flex justify-between text-xs text-gray-400">
              <span>Page {page}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-3 text-xs">Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={comments.length < 20} className="btn-secondary py-1 px-3 text-xs">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
