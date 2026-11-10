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
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setReportedOnly(false); setPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold py-2 px-3.5 transition cursor-pointer ${
                !reportedOnly
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Eye className="w-4 h-4" /> All ({total})
            </button>
            <button
              onClick={() => { setReportedOnly(true); setPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold py-2 px-3.5 transition cursor-pointer ${
                reportedOnly
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700'
              }`}
            >
              <Flag className="w-4 h-4" /> Flagged & Reported
            </button>
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {reportedOnly ? 'Showing flagged discussions' : 'Showing all community threads'}
          </span>
        </div>

        {/* Comments Container */}
        <div className="overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          {/* ── MOBILE VIEW: Touch-Friendly Comments Cards (md:hidden) ── */}
          <div className="block md:hidden p-3 space-y-3 divide-y divide-slate-100">
            {isLoading ? (
              <p className="text-center text-slate-500 py-8 text-xs">កំពុងទាញយកមតិ...</p>
            ) : comments.length === 0 ? (
              <p className="text-center text-slate-500 py-12 text-xs">គ្មានមតិត្រូវពិនិត្យឡើយ</p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className={`pt-3 first:pt-0 p-3.5 rounded-2xl border space-y-2.5 ${
                    c.is_reported
                      ? 'border-rose-200 bg-rose-50/40'
                      : 'border-slate-200/80 bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                        {c.user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{c.user?.username || 'Anonymous'}</span>
                    </div>
                    {c.is_reported && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold">
                        Reported
                      </span>
                    )}
                  </div>

                  <p className={`text-xs ${c.is_deleted ? 'text-slate-400 italic line-through' : 'text-slate-700'}`}>
                    {c.content}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/80">
                    <span>{new Date(c.created_at).toLocaleString()} · {c.likes_count} likes</span>
                    <div className="flex items-center gap-1">
                      {!c.is_deleted && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200/60 text-rose-600 cursor-pointer"
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
                <tr className="border-b border-slate-200/80 bg-slate-50/80">
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs">Comment Content</th>
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs hidden md:table-cell">Author</th>
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs hidden lg:table-cell">Series</th>
                  <th className="px-4 py-3.5 text-left text-slate-500 font-semibold text-xs hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3.5 text-right text-slate-500 font-semibold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center text-slate-500 py-12">Loading discussions...</td></tr>
                ) : comments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-500 py-12">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      No flagged or deleted comments to review.
                    </td>
                  </tr>
                ) : (
                  comments.map((c) => (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        c.is_reported ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-4 py-3.5 max-w-sm">
                        <p className={`text-xs md:text-sm line-clamp-2 ${c.is_deleted ? 'text-slate-400 italic line-through' : 'text-slate-800'}`}>
                          {c.content}
                        </p>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          {new Date(c.created_at).toLocaleString()} · {c.likes_count} likes
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium text-xs hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                            {c.user?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span>{c.user?.username || 'Anonymous'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs hidden lg:table-cell">
                        {c.anime ? (
                          <a
                            href={`/anime/${c.anime.slug}`}
                            className="text-blue-600 hover:underline font-medium flex items-center gap-1"
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3" /> Reported
                            </span>
                          )}
                          {c.is_deleted && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                              Deleted
                            </span>
                          )}
                          {!c.is_reported && !c.is_deleted && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {!c.is_deleted && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/40 flex justify-between items-center text-xs text-slate-500">
              <span>Page {page}</span>
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
                  disabled={comments.length < 20}
                  className="rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
