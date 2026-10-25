import { useState, useEffect } from "react";
import { apiFetch } from "./api";
import {
  Star,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Loader2,
  Sparkles,
  Info,
  AlertCircle
} from "lucide-react";

const RATING_LABELS = {
  1: "1 Star — Needs Improvement",
  2: "2 Stars — Fair",
  3: "3 Stars — Good",
  4: "4 Stars — Very Good",
  5: "5 Stars — Outstanding & Transformative"
};

/* Interactive Star Rating Selector */
export const StarRatingInput = ({ value = 0, onChange, disabled = false, size = 32 }) => {
  const [hoverValue, setHoverValue] = useState(0);

  const activeValue = hoverValue || value;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= activeValue;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverValue(star)}
              onMouseLeave={() => setHoverValue(0)}
              className="p-1 text-amber-400 transition hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-60 focus:outline-none"
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                size={size}
                className={filled ? "fill-amber-400 stroke-amber-500" : "fill-slate-100 stroke-slate-300"}
              />
            </button>
          );
        })}
      </div>
      <p className="text-xs font-semibold text-muted min-h-[18px]">
        {RATING_LABELS[activeValue] || "Please select a rating from 1 to 5 stars."}
      </p>
    </div>
  );
};

/* Read-only Star Display */
export const StarRating = ({ rating = 5, size = 16, className = "" }) => {
  const safeRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${safeRating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= safeRating ? "fill-amber-400 stroke-amber-500" : "fill-slate-100 stroke-slate-300"}
        />
      ))}
    </span>
  );
};

export const StudentTestimonialsPage = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete modal state
  const [deletingId, setDeletingId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMyTestimonials = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/testimonials/my");
      if (res && res.items) {
        setTestimonials(res.items);
      }
    } catch (err) {
      console.error("Failed to fetch testimonials", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTestimonials();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!rating || rating < 1 || rating > 5) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Testimonial text is required.");
      return;
    }
    if (trimmed.length < 20) {
      setError("Testimonial must be at least 20 characters long.");
      return;
    }
    if (trimmed.length > 1000) {
      setError("Testimonial cannot exceed 1000 characters.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch("/testimonials", {
        method: "POST",
        body: JSON.stringify({ rating, testimonialText: trimmed })
      });
      if (res && res.success) {
        setSuccess(res.message || "Thank you for sharing your experience. Your testimonial has been submitted and is awaiting review.");
        setText("");
        setRating(5);
        fetchMyTestimonials();
      } else {
        setError(res?.message || "Failed to submit testimonial. Please try again.");
      }
    } catch (err) {
      setError(err?.message || "Failed to submit testimonial. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditRating(item.rating || 5);
    setEditText(item.testimonialText || item.quote || "");
    setEditError("");
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    setEditError("");

    if (!editRating || editRating < 1 || editRating > 5) {
      setEditError("Please select a rating from 1 to 5 stars.");
      return;
    }
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditError("Testimonial text is required.");
      return;
    }
    if (trimmed.length < 20) {
      setEditError("Testimonial must be at least 20 characters long.");
      return;
    }
    if (trimmed.length > 1000) {
      setEditError("Testimonial cannot exceed 1000 characters.");
      return;
    }

    try {
      setUpdating(true);
      const res = await apiFetch(`/testimonials/${editingItem._id}`, {
        method: "PUT",
        body: JSON.stringify({ rating: editRating, testimonialText: trimmed })
      });
      if (res && res.success) {
        setEditingItem(null);
        fetchMyTestimonials();
      } else {
        setEditError(res?.message || "Failed to update testimonial.");
      }
    } catch (err) {
      setEditError(err?.message || "Failed to update testimonial.");
    } finally {
      setUpdating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setDeleting(true);
      await apiFetch(`/testimonials/${deletingId}`, { method: "DELETE" });
      setDeletingId(null);
      fetchMyTestimonials();
    } catch (err) {
      console.error("Failed to delete testimonial", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-amber-500/5 to-soft p-6 sm:p-8 border border-primary/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles size={13} /> Student Reflections
            </span>
            <h1 className="mt-2 text-2xl font-black text-ink sm:text-3xl">My Testimonials & Reflections</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Share your spiritual experiences and feedback. Approved testimonials inspire devotees and students across our community.
            </p>
          </div>
        </div>
      </div>

      {/* Submission Form Card */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquare size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-ink">Share Your Experience</h2>
            <p className="text-xs text-muted">How was your learning or spiritual journey with ISKCON Self-Excellence?</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-medium">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">
              <p className="font-bold">Submission Received!</p>
              <p className="text-xs text-emerald-700 mt-0.5">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-sm font-medium">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
            <p className="text-xs">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Your Star Rating <span className="text-rose-500">*</span>
            </label>
            <StarRatingInput value={rating} onChange={setRating} disabled={submitting} size={34} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="student-testimonial-text" className="block text-xs font-bold uppercase tracking-wider text-muted">
                Your Testimonial / Reflection <span className="text-rose-500">*</span>
              </label>
              <span className={`text-xs font-semibold ${text.length > 1000 ? "text-rose-500" : text.length >= 20 ? "text-emerald-600" : "text-muted"}`}>
                {text.length} / 1000 chars (min. 20)
              </span>
            </div>
            <textarea
              id="student-testimonial-text"
              rows={4}
              required
              disabled={submitting}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write about your experience with our courses, Sunday classes, teachers, meditation habits, or spiritual transformation..."
              className="w-full rounded-2xl border border-black/10 bg-soft px-4 py-3 text-sm text-ink placeholder:text-muted/60 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted flex items-center gap-1.5">
              <Info size={14} /> Submissions are reviewed by the team before appearing on the website.
            </p>
            <button
              type="submit"
              disabled={submitting || text.trim().length < 20 || text.trim().length > 1000}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Submit Testimonial
            </button>
          </div>
        </form>
      </div>

      {/* Submissions List */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-ink">My Submitted Testimonials</h2>
            <p className="text-xs text-muted">Track the review status of your reflections.</p>
          </div>
          <span className="rounded-full bg-soft px-3 py-1 text-xs font-bold text-ink">
            {testimonials.length} Submission{testimonials.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading your reflections...
          </div>
        ) : testimonials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-soft/50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquare size={24} />
            </div>
            <h3 className="mt-3 text-sm font-bold text-ink">You haven&apos;t submitted a testimonial yet</h3>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
              Share your personal experience with ISKCON Self-Excellence above to inspire others.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {testimonials.map((item) => {
              const status = item.status === "active" ? "approved" : item.status || "pending";
              return (
                <div key={item._id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StarRating rating={item.rating} size={15} />
                        <span className="text-xs text-muted">·</span>
                        {status === "pending" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                            <Clock size={11} /> Pending Review
                          </span>
                        )}
                        {status === "approved" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 size={11} /> Approved
                          </span>
                        )}
                        {status === "rejected" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                            <XCircle size={11} /> Rejected
                          </span>
                        )}
                        {item.showOnHomepage && status === "approved" && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            Published on Homepage
                          </span>
                        )}
                        <span className="text-xs text-muted">
                          {new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </div>

                      <blockquote className="text-sm font-medium text-ink italic leading-relaxed">
                        &ldquo;{item.testimonialText || item.quote}&rdquo;
                      </blockquote>

                      {status === "rejected" && item.rejectionReason && (
                        <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                          <span className="font-bold">Feedback from team:</span> {item.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:pt-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-ink hover:bg-soft transition"
                        title="Edit reflection"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(item._id)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 transition"
                        title="Delete reflection"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Testimonial Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setEditingItem(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-ink">Edit Testimonial</h3>
              <button onClick={() => setEditingItem(null)} className="rounded-full p-2 text-muted hover:bg-soft">
                ✕
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <p>
                <strong>Moderation Notice:</strong> Modifying your testimonial will return its status to <strong>Pending Review</strong> so our team can verify the changes.
              </p>
            </div>

            {editError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Rating</label>
                <StarRatingInput value={editRating} onChange={setEditRating} size={30} disabled={updating} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted">Testimonial</label>
                  <span className="text-xs text-muted">{editText.length} / 1000</span>
                </div>
                <textarea
                  rows={4}
                  value={editText}
                  disabled={updating}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-soft px-4 py-3 text-sm text-ink focus:border-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={updating || editText.trim().length < 20 || editText.trim().length > 1000}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {updating ? <Loader2 size={16} className="animate-spin" /> : "Save & Resubmit"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-full border border-black/10 px-6 py-3 text-sm font-black text-ink hover:bg-soft"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setDeletingId(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-ink">Delete Testimonial?</h3>
            <p className="mt-2 text-xs text-muted">
              Are you sure you want to delete this testimonial? It will be permanently removed from your dashboard and from the website if previously published.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : "Delete Testimonial"}
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-full border border-black/10 px-6 py-3 text-sm font-black text-ink hover:bg-soft"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTestimonialsPage;
