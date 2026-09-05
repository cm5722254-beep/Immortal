import { useState } from 'react';
import { Eye, EyeOff, Star, Send, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttributeScore {
  key: string;
  label: string;
  icon: string;
  score: number; // 0 = not rated
}

interface ReviewData {
  id: number;
  username: string;
  avatarLetter: string;
  overall: number;
  attributes: AttributeScore[];
  text: string;
  hasSpoiler: boolean;
  createdAt: string;
}

const ATTRIBUTE_DEFAULTS: AttributeScore[] = [
  { key: 'animation',   label: 'Animation',    icon: '🎨', score: 0 },
  { key: 'story',       label: 'Story',        icon: '📖', score: 0 },
  { key: 'sound',       label: 'Sound Design', icon: '🎵', score: 0 },
  { key: 'pacing',      label: 'Pacing',       icon: '⏱️', score: 0 },
  { key: 'characters',  label: 'Characters',   icon: '👥', score: 0 },
];

// ── Star picker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange, size = 4 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${n} stars`}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-${size} h-${size} transition-colors ${
              n <= (hovered || value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Single Review card ────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: ReviewData }) {
  const [spoilerVisible, setSpoilerVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-4 border border-white/5 space-y-3">
      {/* Author row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shrink-0">
            {review.avatarLetter}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{review.username}</p>
            <p className="text-[10px] text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        {/* Overall score */}
        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2.5 py-1.5">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-black text-yellow-300">{review.overall.toFixed(1)}</span>
        </div>
      </div>

      {/* Attribute scores */}
      {review.attributes.filter(a => a.score > 0).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {review.attributes.filter(a => a.score > 0).map(attr => (
            <div key={attr.key} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
              <span className="text-sm">{attr.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500 truncate">{attr.label}</p>
                <div className="flex gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`w-2.5 h-2.5 ${n <= attr.score ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review text + spoiler */}
      {review.text && (
        <div className="relative">
          {review.hasSpoiler && !spoilerVisible ? (
            <div className="relative rounded-lg overflow-hidden">
              {/* Blurred text */}
              <p className="text-sm text-gray-300 leading-relaxed select-none" style={{ filter: 'blur(5px)' }}>
                {review.text}
              </p>
              {/* Spoiler overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg cursor-pointer"
                onClick={() => setSpoilerVisible(true)}>
                <AlertTriangle className="w-5 h-5 text-yellow-400 mb-1" />
                <p className="text-xs font-bold text-yellow-300">Spoiler Warning</p>
                <button className="mt-2 text-[10px] bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-white transition-colors flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Reveal Spoiler
                </button>
              </div>
            </div>
          ) : (
            <div>
              {review.hasSpoiler && (
                <div className="flex items-center gap-1.5 text-[10px] text-yellow-400/70 mb-1.5">
                  <AlertTriangle className="w-3 h-3" /> Contains spoilers
                  <button onClick={() => setSpoilerVisible(false)} className="hover:text-yellow-300 flex items-center gap-0.5">
                    <EyeOff className="w-3 h-3" /> Hide
                  </button>
                </div>
              )}
              <p className={`text-sm text-gray-300 leading-relaxed ${!expanded && review.text.length > 200 ? 'line-clamp-3' : ''}`}>
                {review.text}
              </p>
              {review.text.length > 200 && (
                <button onClick={() => setExpanded(e => !e)} className="text-[10px] text-orange-400 hover:text-orange-300 mt-1 flex items-center gap-0.5">
                  {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Write Review Form ─────────────────────────────────────────────────────────
interface WriteReviewFormProps {
  animeId: number;
  onSubmitted: () => void;
}

function WriteReviewForm({ animeId, onSubmitted }: WriteReviewFormProps) {
  const [attributes, setAttributes] = useState<AttributeScore[]>(ATTRIBUTE_DEFAULTS.map(a => ({ ...a })));
  const [overall, setOverall] = useState(0);
  const [text, setText] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const setAttrScore = (key: string, score: number) => {
    setAttributes(prev => prev.map(a => a.key === key ? { ...a, score } : a));
  };

  // Auto-compute overall as average of rated attributes
  const ratedAttrs = attributes.filter(a => a.score > 0);
  const computedOverall = ratedAttrs.length > 0
    ? ratedAttrs.reduce((s, a) => s + a.score, 0) / ratedAttrs.length
    : overall;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (computedOverall === 0) { setError('Please rate at least one attribute or set an overall score.'); return; }
    if (!text.trim()) { setError('Please write a review.'); return; }
    setError('');
    setSubmitting(true);

    try {
      // Post overall score to existing /rate endpoint
      await api.post(`/anime/${animeId}/rate`, { score: Math.round(computedOverall) });
      // Post the review text as a comment (tagged with spoiler marker)
      const commentText = hasSpoiler ? `[SPOILER] ${text.trim()}` : text.trim();
      await api.post(`/anime/${animeId}/comments`, { content: commentText });
      onSubmitted();
      setText('');
      setAttributes(ATTRIBUTE_DEFAULTS.map(a => ({ ...a })));
      setOverall(0);
      setHasSpoiler(false);
    } catch {
      setError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 border border-orange-500/20 bg-orange-500/5 space-y-5">
      <h3 className="font-bold text-sm text-white flex items-center gap-2">
        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Write Your Review
      </h3>

      {/* Attribute grid */}
      <div>
        <p className="text-xs text-gray-400 mb-3">Rate each aspect (optional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attributes.map(attr => (
            <div key={attr.key} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
              <span className="text-base w-6 text-center">{attr.icon}</span>
              <span className="text-xs text-gray-300 w-24 shrink-0">{attr.label}</span>
              <StarPicker value={attr.score} onChange={s => setAttrScore(attr.key, s)} />
              {attr.score > 0 && (
                <button type="button" onClick={() => setAttrScore(attr.key, 0)}
                  className="text-gray-600 hover:text-gray-400 text-[10px] ml-auto">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overall fallback */}
      {ratedAttrs.length === 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 shrink-0">Overall Score:</span>
          <StarPicker value={overall} onChange={setOverall} size={5} />
        </div>
      )}
      {ratedAttrs.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          Computed overall: <span className="text-yellow-300 font-bold">{computedOverall.toFixed(1)}/5</span>
        </div>
      )}

      {/* Review text */}
      <div>
        <label className="label">Review</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Share your thoughts on this title..."
          className="input resize-none"
        />
        <div className="flex justify-between mt-1.5">
          {/* Spoiler toggle */}
          <button
            type="button"
            onClick={() => setHasSpoiler(s => !s)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all
              ${hasSpoiler ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {hasSpoiler ? 'Contains Spoilers ✓' : 'Mark as Spoiler'}
          </button>
          <span className="text-[10px] text-gray-600 self-end">{text.length}/1000</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary text-sm w-full disabled:opacity-50">
        {submitting ? 'Submitting…' : <><Send className="w-4 h-4" /> Submit Review</>}
      </button>
    </form>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface GranularReviewProps {
  animeId: number;
  /** Raw comments from the API, we'll format them as reviews */
  comments: Array<{
    id: number;
    content: string;
    user?: { username: string };
    user_id: number;
    created_at: string;
    likes_count: number;
  }>;
  onReviewSubmitted?: () => void;
}

export function GranularReview({ animeId, comments, onReviewSubmitted }: GranularReviewProps) {
  const { isAuthenticated } = useAuthStore();

  // Map existing comments into ReviewData shape
  const reviews: ReviewData[] = comments.slice(0, 10).map(c => {
    const isSpoiler = c.content.startsWith('[SPOILER]');
    const text = isSpoiler ? c.content.replace('[SPOILER] ', '') : c.content;
    return {
      id: c.id,
      username: c.user?.username ?? 'Anonymous',
      avatarLetter: (c.user?.username?.[0] ?? '?').toUpperCase(),
      overall: 0, // We don't store per-review scores in the current schema
      attributes: [],
      text,
      hasSpoiler: isSpoiler,
      createdAt: c.created_at,
    };
  });

  return (
    <div className="space-y-5">
      {/* Write form */}
      {isAuthenticated ? (
        <WriteReviewForm animeId={animeId} onSubmitted={onReviewSubmitted ?? (() => {})} />
      ) : (
        <div className="card p-4 border border-white/5 text-center">
          <p className="text-sm text-gray-400">
            <Link to="/login" className="text-orange-400 hover:underline">Sign in</Link> to write a review.
          </p>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}

      {reviews.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-20" />
          No reviews yet. Be the first to share your take!
        </div>
      )}
    </div>
  );
}
