import React, { useCallback, useEffect, useState } from 'react';
import {
  Star,
  ShieldCheck,
  Loader2,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function StarRow({ value = 0, size = 'w-4 h-4', className = '' }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${size} ${n <= rounded ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || Number(value) || 0;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          type="button"
          key={n}
          disabled={disabled}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              n <= active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * PropertyReviews
 * Real, verified-boarder ratings for a boarding house.
 *
 * Everyone may read the ratings and reviews. Only a student whose tenancy on
 * this property is (or was) active may submit or update one — the same rule
 * is enforced by RLS in supabase/add-property-reviews.sql.
 */
export default function PropertyReviews({ property, onOpenAuth, onRatingUpdated }) {
  const { user } = useAuth();
  const propertyId = property?.id;

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [canRate, setCanRate] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!propertyId) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const res = await api.getPropertyReviews(propertyId);
      const data = res?.data || {};
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setRating(Number(data.rating) || 0);
      setReviewCount(Number(data.reviewCount) || 0);
      setCanRate(Boolean(data.canRate));
      setMyReview(data.myReview || null);
      setDraftRating(Number(data.myReview?.rating) || 0);
      setDraftComment(data.myReview?.comment || '');
    } catch (err) {
      setError(err.message || 'Could not load student ratings.');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load, user?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!draftRating) {
      setError('Choose a star rating first.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.submitPropertyReview({
        propertyId,
        rating: draftRating,
        comment: draftComment
      });

      const data = res?.data || {};
      if (typeof data.rating === 'number') {
        onRatingUpdated?.(data.rating, Number(data.reviewCount) || 0);
      }
      await load();
      setNotice(res?.message || 'Your rating was saved.');
    } catch (err) {
      setError(err.message || 'Could not save your rating.');
    } finally {
      setSaving(false);
    }
  };

  const hasRating = reviewCount > 0;

  return (
    <section className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-extrabold text-base text-[#0b1a30] flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            Student Ratings
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Ratings for this boarding house from students who actually boarded here.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3 h-3" />
          Verified boarders only
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          Loading student ratings…
        </div>
      ) : (
        <>
          {/* Average */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="text-center shrink-0">
              <p className="text-3xl font-black text-[#0b1a30] leading-none">
                {hasRating ? rating.toFixed(1) : '—'}
              </p>
              <p className="text-[10px] font-bold text-amber-800 mt-1">out of 5</p>
            </div>
            <div className="min-w-0">
              <StarRow value={rating} size="w-4 h-4" />
              <p className="text-[11.5px] font-semibold text-slate-600 mt-1">
                {hasRating
                  ? `${reviewCount} student rating${reviewCount === 1 ? '' : 's'}`
                  : 'No student ratings yet'}
              </p>
            </div>
          </div>

          {/* Who may rate */}
          {!user ? (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-700">Only boarders can rate this property.</p>
                <p className="mt-0.5">Sign in to see whether you are eligible to leave a rating.</p>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-[#0b1a30] text-white text-[11px] font-bold hover:bg-[#152a4d] transition-colors"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          ) : !canRate ? (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-700">You can only see the ratings.</p>
                <p className="mt-0.5">
                  Students who have boarded this boarding house can rate it. Once your tenancy
                  here is approved, the rating form will appear.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {myReview ? 'Update your rating' : 'Rate this boarding house'}
                </p>
                <span className="text-[10px] font-bold text-emerald-700">
                  You boarded here
                </span>
              </div>

              <StarPicker value={draftRating} onChange={setDraftRating} disabled={saving} />

              <textarea
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                rows={3}
                maxLength={1200}
                disabled={saving}
                placeholder="Optional: share what future boarders should know (noise, water, caretaker, internet…)"
                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 resize-none"
              />

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500">
                  {draftComment.length}/1200 characters
                </span>
                <button
                  type="submit"
                  disabled={saving || !draftRating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving…' : myReview ? 'Update rating' : 'Submit rating'}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {/* Reviews */}
          {hasRating && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                What boarders said
              </p>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {reviews.map(review => (
                  <div
                    key={review.id || `${review.userId}-${review.createdAt}`}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#0b1a30] truncate">
                          {review.studentName || 'Verified boarder'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {review.course || 'FSUU Student'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <StarRow value={review.rating} size="w-3 h-3" />
                        <p className="text-[9.5px] text-slate-400 mt-0.5">
                          {formatDate(review.updatedAt || review.createdAt)}
                        </p>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-[11.5px] text-slate-600 leading-relaxed mt-1.5">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
