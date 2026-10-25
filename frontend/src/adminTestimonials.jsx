import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "./api";
import { StarRating, StarRatingInput } from "./studentTestimonials";
import {
  Star,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  User,
  Globe,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpDown
} from "lucide-react";

export const AdminTestimonialsPage = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    published: 0,
    averageRating: 5.0
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [homepageFilter, setHomepageFilter] = useState("all");

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [reviewingItem, setReviewingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [deletingItem, setDeletingItem] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    userName: "",
    userEmail: "",
    designation: "Student",
    testimonialText: "",
    rating: 5,
    status: "approved",
    showOnHomepage: true,
    isFeatured: false,
    sortOrder: 0,
    rejectionReason: ""
  });
  const [formError, setFormError] = useState("");

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (ratingFilter !== "all") params.append("rating", ratingFilter);
      if (homepageFilter !== "all") params.append("showOnHomepage", homepageFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await apiFetch(`/admin/testimonials?${params.toString()}`);
      if (res && res.success) {
        setItems(res.items || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to fetch admin testimonials", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
    setSelectedIds([]);
  }, [statusFilter, ratingFilter, homepageFilter]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTestimonials();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(items.map((t) => t._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Quick Action Handlers
  const handleApprove = async (id, showOnHomepage = true) => {
    try {
      setBusy(true);
      await apiFetch(`/admin/testimonials/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ showOnHomepage })
      });
      fetchTestimonials();
      if (reviewingItem?._id === id) setReviewingItem(null);
    } catch (err) {
      alert(err.message || "Failed to approve testimonial");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      setBusy(true);
      await apiFetch(`/admin/testimonials/${rejectingItem._id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: rejectionReason })
      });
      setRejectingItem(null);
      setRejectionReason("");
      fetchTestimonials();
      if (reviewingItem?._id === rejectingItem._id) setReviewingItem(null);
    } catch (err) {
      alert(err.message || "Failed to reject testimonial");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleHomepage = async (id) => {
    try {
      setBusy(true);
      await apiFetch(`/admin/testimonials/${id}/toggle-homepage`, { method: "PATCH" });
      fetchTestimonials();
    } catch (err) {
      alert(err.message || "Failed to toggle homepage visibility");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleFeatured = async (id) => {
    try {
      setBusy(true);
      await apiFetch(`/admin/testimonials/${id}/toggle-featured`, { method: "PATCH" });
      fetchTestimonials();
    } catch (err) {
      alert(err.message || "Failed to toggle featured status");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      setBusy(true);
      await apiFetch(`/admin/testimonials/${deletingItem._id}`, { method: "DELETE" });
      setDeletingItem(null);
      fetchTestimonials();
      if (reviewingItem?._id === deletingItem._id) setReviewingItem(null);
    } catch (err) {
      alert(err.message || "Failed to delete testimonial");
    } finally {
      setBusy(false);
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    if (action === "delete") {
      setBulkDeleting(true);
      return;
    }

    try {
      setBusy(true);
      await apiFetch("/admin/testimonials/bulk", {
        method: "POST",
        body: JSON.stringify({ action, ids: selectedIds })
      });
      setSelectedIds([]);
      fetchTestimonials();
    } catch (err) {
      alert(err.message || `Bulk ${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    try {
      setBusy(true);
      await apiFetch("/admin/testimonials/bulk", {
        method: "POST",
        body: JSON.stringify({ action: "delete", ids: selectedIds })
      });
      setSelectedIds([]);
      setBulkDeleting(false);
      fetchTestimonials();
    } catch (err) {
      alert(err.message || "Bulk delete failed");
    } finally {
      setBusy(false);
    }
  };

  // Modal Openers
  const openCreateModal = () => {
    setFormData({
      userName: "",
      userEmail: "",
      designation: "Student",
      testimonialText: "",
      rating: 5,
      status: "approved",
      showOnHomepage: true,
      isFeatured: false,
      sortOrder: 0,
      rejectionReason: ""
    });
    setFormError("");
    setIsCreating(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      userName: item.userName || item.name || "",
      userEmail: item.userEmail || "",
      designation: item.designation || "Student",
      testimonialText: item.testimonialText || item.quote || "",
      rating: item.rating || 5,
      status: item.status === "active" ? "approved" : item.status || "pending",
      showOnHomepage: item.showOnHomepage !== false,
      isFeatured: Boolean(item.isFeatured),
      sortOrder: item.sortOrder || 0,
      rejectionReason: item.rejectionReason || ""
    });
    setFormError("");
  };

  const handleSaveForm = async () => {
    setFormError("");
    if (!formData.userName.trim()) {
      setFormError("Student / User name is required.");
      return;
    }
    if (!formData.testimonialText.trim()) {
      setFormError("Testimonial text is required.");
      return;
    }
    if (formData.testimonialText.trim().length < 20) {
      setFormError("Testimonial text must be at least 20 characters long.");
      return;
    }
    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      setFormError("Please select a rating between 1 and 5 stars.");
      return;
    }

    try {
      setBusy(true);
      if (isCreating) {
        await apiFetch("/admin/testimonials", {
          method: "POST",
          body: JSON.stringify(formData)
        });
        setIsCreating(false);
      } else if (editingItem) {
        await apiFetch(`/admin/testimonials/${editingItem._id}`, {
          method: "PUT",
          body: JSON.stringify(formData)
        });
        setEditingItem(null);
      }
      fetchTestimonials();
    } catch (err) {
      setFormError(err.message || "Failed to save testimonial.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink sm:text-3xl">Testimonials & Reviews</h1>
          <p className="mt-1 text-xs text-muted">
            Manage student reflections, moderate star ratings, and control homepage featured quotes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchTestimonials}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-sm hover:bg-soft transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition"
          >
            <Plus size={15} /> Add Testimonial
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Reviews</p>
          <p className="mt-2 text-2xl font-black text-ink">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Review</p>
            <Clock size={14} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Approved</p>
            <CheckCircle2 size={14} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{stats.approved}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Rejected</p>
            <XCircle size={14} className="text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">{stats.rejected}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">On Homepage</p>
            <Globe size={14} className="text-primary" />
          </div>
          <p className="mt-2 text-2xl font-black text-primary">{stats.published}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Average Rating</p>
            <Star size={14} className="fill-amber-400 stroke-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-ink">{stats.averageRating} <span className="text-xs font-normal text-muted">/ 5</span></p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, email, or reflection content..."
              className="w-full rounded-full border border-black/10 bg-soft py-2.5 pl-10 pr-4 text-xs text-ink placeholder:text-muted focus:border-primary focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-soft focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review ({stats.pending})</option>
              <option value="approved">Approved ({stats.approved})</option>
              <option value="rejected">Rejected ({stats.rejected})</option>
            </select>

            {/* Rating Dropdown */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-soft focus:outline-none"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars ★★★★★</option>
              <option value="4">4 Stars ★★★★☆</option>
              <option value="3">3 Stars ★★★☆☆</option>
              <option value="2">2 Stars ★★☆☆☆</option>
              <option value="1">1 Star ★☆☆☆☆</option>
            </select>

            {/* Homepage Dropdown */}
            <select
              value={homepageFilter}
              onChange={(e) => setHomepageFilter(e.target.value)}
              className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-soft focus:outline-none"
            >
              <option value="all">All Visibility</option>
              <option value="true">Published on Homepage</option>
              <option value="false">Unpublished</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3">
            <span className="text-xs font-bold text-ink">
              {selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkAction("approve")}
                className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                Approve Selected
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("publish")}
                className="rounded-full border border-primary bg-white px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition"
              >
                Publish to Homepage
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("unpublish")}
                className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-bold text-muted hover:text-ink transition"
              >
                Remove from Homepage
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("reject")}
                className="rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
              >
                Reject Selected
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction("delete")}
                className="rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Testimonials Table */}
      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-black/5 bg-soft/60 text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="py-3.5 pl-6 pr-3 w-10">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-black/20 text-primary focus:ring-primary"
                  />
                </th>
                <th className="py-3.5 px-3">Student / User</th>
                <th className="py-3.5 px-3">Testimonial Quote</th>
                <th className="py-3.5 px-3">Rating</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3 text-center">Homepage</th>
                <th className="py-3.5 px-3 text-center">Featured</th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-ink">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted">
                    <Loader2 size={20} className="mx-auto mb-2 animate-spin" /> Loading testimonials...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted">
                    No testimonials matching your filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const status = item.status === "active" ? "approved" : item.status || "pending";
                  const isSelected = selectedIds.includes(item._id);

                  return (
                    <tr key={item._id} className={`transition hover:bg-soft/40 ${isSelected ? "bg-primary/5" : ""}`}>
                      <td className="py-4 pl-6 pr-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item._id)}
                          className="h-4 w-4 rounded border-black/20 text-primary focus:ring-primary"
                        />
                      </td>

                      <td className="py-4 px-3 max-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft font-bold text-ink">
                            {(item.userName || item.name || "U")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-ink truncate">{item.userName || item.name}</p>
                            <p className="text-[11px] text-muted truncate">{item.userEmail || item.designation || "Student"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-3 max-w-sm">
                        <p className="line-clamp-2 text-xs italic text-ink/90">
                          &ldquo;{item.testimonialText || item.quote}&rdquo;
                        </p>
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        <StarRating rating={item.rating} size={13} />
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        {status === "pending" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            <Clock size={10} /> Pending
                          </span>
                        )}
                        {status === "approved" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 size={10} /> Approved
                          </span>
                        )}
                        {status === "rejected" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700" title={item.rejectionReason}>
                            <XCircle size={10} /> Rejected
                          </span>
                        )}
                      </td>

                      {/* Homepage Visibility Toggle */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy || status !== "approved"}
                          onClick={() => handleToggleHomepage(item._id)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                            status !== "approved"
                              ? "opacity-40 cursor-not-allowed bg-soft text-muted"
                              : item.showOnHomepage
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-soft text-muted hover:text-ink hover:bg-black/10"
                          }`}
                          title={status !== "approved" ? "Approve first to publish" : "Toggle Homepage Visibility"}
                        >
                          <Globe size={11} /> {item.showOnHomepage ? "Published" : "Draft"}
                        </button>
                      </td>

                      {/* Featured Toggle */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggleFeatured(item._id)}
                          className={`p-1.5 rounded-full transition ${
                            item.isFeatured ? "text-amber-500 hover:bg-amber-50" : "text-black/20 hover:text-ink hover:bg-soft"
                          }`}
                          title="Toggle Featured"
                        >
                          <Star size={16} className={item.isFeatured ? "fill-amber-400 stroke-amber-500" : ""} />
                        </button>
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap text-muted text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short"
                        })}
                      </td>

                      <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {status === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(item._id, true)}
                                className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingItem(item);
                                  setRejectionReason("");
                                }}
                                className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setReviewingItem(item)}
                            className="rounded-full p-1.5 text-muted hover:text-ink hover:bg-soft transition"
                            title="Review full details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="rounded-full p-1.5 text-muted hover:text-ink hover:bg-soft transition"
                            title="Edit testimonial"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            className="rounded-full p-1.5 text-rose-500 hover:bg-rose-50 transition"
                            title="Delete testimonial"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setReviewingItem(null)}>
          <div className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Testimonial Review</span>
                <h3 className="text-xl font-black text-ink">{reviewingItem.userName || reviewingItem.name}</h3>
                <p className="text-xs text-muted">{reviewingItem.userEmail || "No email provided"} · {reviewingItem.designation || "Student"}</p>
              </div>
              <button onClick={() => setReviewingItem(null)} className="rounded-full p-2 text-muted hover:bg-soft">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <StarRating rating={reviewingItem.rating} size={18} />
                <span className="text-xs font-bold text-muted">({reviewingItem.rating} / 5 Stars)</span>
              </div>

              <div className="rounded-2xl border border-black/10 bg-soft/60 p-4 text-sm italic text-ink leading-relaxed">
                &ldquo;{reviewingItem.testimonialText || reviewingItem.quote}&rdquo;
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-black/5 bg-soft p-3">
                  <p className="text-[10px] uppercase font-bold text-muted">Status</p>
                  <p className="font-bold text-ink mt-0.5 capitalize">{reviewingItem.status}</p>
                </div>
                <div className="rounded-xl border border-black/5 bg-soft p-3">
                  <p className="text-[10px] uppercase font-bold text-muted">Homepage Visibility</p>
                  <p className="font-bold text-ink mt-0.5">{reviewingItem.showOnHomepage ? "Published" : "Not Published"}</p>
                </div>
                <div className="rounded-xl border border-black/5 bg-soft p-3">
                  <p className="text-[10px] uppercase font-bold text-muted">Submitted On</p>
                  <p className="font-bold text-ink mt-0.5">{new Date(reviewingItem.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-xl border border-black/5 bg-soft p-3">
                  <p className="text-[10px] uppercase font-bold text-muted">Featured Quote</p>
                  <p className="font-bold text-ink mt-0.5">{reviewingItem.isFeatured ? "Yes (Priority)" : "No"}</p>
                </div>
              </div>

              {reviewingItem.rejectionReason && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                  <span className="font-bold">Rejection Reason:</span> {reviewingItem.rejectionReason}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5 pt-4 border-t border-black/5">
                {reviewingItem.status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => handleApprove(reviewingItem._id, true)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    <CheckCircle2 size={14} /> Approve & Publish
                  </button>
                )}
                {reviewingItem.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingItem(reviewingItem);
                      setRejectionReason("");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    openEditModal(reviewingItem);
                    setReviewingItem(null);
                  }}
                  className="rounded-full border border-black/10 px-4 py-2.5 text-xs font-bold text-ink hover:bg-soft transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="rounded-full border border-black/10 px-4 py-2.5 text-xs font-bold text-muted hover:text-ink transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setRejectingItem(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-ink">Reject Testimonial</h3>
              <button onClick={() => setRejectingItem(null)} className="rounded-full p-2 text-muted hover:bg-soft">
                ✕
              </button>
            </div>
            <p className="text-xs text-muted mb-4">
              Provide an optional reason explaining why the reflection was not approved. This will be sent as feedback to the student.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Rejection Reason
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Inappropriate content, insufficient detail, or duplicate submission..."
                  className="w-full rounded-2xl border border-black/10 bg-soft px-4 py-3 text-sm text-ink focus:border-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleConfirmReject}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : "Confirm Rejection"}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="rounded-full border border-black/10 px-6 py-3 text-sm font-black text-ink hover:bg-soft"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Testimonial Modal */}
      {(isCreating || editingItem) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => { setIsCreating(false); setEditingItem(null); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-ink">
                  {isCreating ? "Add Testimonial" : "Edit Testimonial"}
                </h3>
                <p className="text-xs text-muted">
                  {isCreating ? "Manually create an approved or pending reflection from events or offline forms." : "Modify testimonial text, rating, or publication settings."}
                </p>
              </div>
              <button onClick={() => { setIsCreating(false); setEditingItem(null); }} className="rounded-full p-2 text-muted hover:bg-soft">
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Student / User Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    placeholder="e.g. Aarav Mehta"
                    className="w-full rounded-xl border border-black/10 bg-soft px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Engineering Student"
                    className="w-full rounded-xl border border-black/10 bg-soft px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.userEmail}
                  onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                  placeholder="e.g. student@example.com"
                  className="w-full rounded-xl border border-black/10 bg-soft px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Rating (1 to 5 Stars) <span className="text-rose-500">*</span>
                </label>
                <StarRatingInput
                  value={formData.rating}
                  onChange={(r) => setFormData({ ...formData, rating: r })}
                  size={26}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                    Testimonial Quote <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs text-muted">{formData.testimonialText.length} / 1000</span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={formData.testimonialText}
                  onChange={(e) => setFormData({ ...formData, testimonialText: e.target.value })}
                  placeholder="Enter the student's reflection or quote..."
                  className="w-full rounded-xl border border-black/10 bg-soft px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Moderation Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-black/10 bg-soft px-3.5 py-2.5 text-xs font-bold text-ink focus:border-primary focus:bg-white focus:outline-none"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Review</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Sort Order (Lower = First)
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-black/10 bg-soft px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-soft/50 p-4 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showOnHomepage}
                    onChange={(e) => setFormData({ ...formData, showOnHomepage: e.target.checked })}
                    className="h-4 w-4 rounded border-black/20 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink">Show on Homepage</span>
                    <p className="text-[11px] text-muted">Displays this quote in the Student Reflections carousel on the public website.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="h-4 w-4 rounded border-black/20 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink">Featured Testimonial</span>
                    <p className="text-[11px] text-muted">Pin this testimonial to appear first in the reflections carousel.</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSaveForm}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : isCreating ? "Create Testimonial" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingItem(null); }}
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
      {deletingItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setDeletingItem(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-ink">Delete Testimonial?</h3>
            <p className="mt-2 text-xs text-muted">
              Are you sure you want to permanently delete this testimonial from <strong>{deletingItem.userName || deletingItem.name}</strong>? This action cannot be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : "Delete Testimonial"}
              </button>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-full border border-black/10 px-6 py-3 text-sm font-black text-ink hover:bg-soft"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setBulkDeleting(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-ink">Bulk Delete Testimonials?</h3>
            <p className="mt-2 text-xs text-muted">
              Are you sure you want to permanently delete <strong>{selectedIds.length}</strong> selected testimonials? This action cannot be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : `Delete ${selectedIds.length} Testimonials`}
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleting(false)}
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

export default AdminTestimonialsPage;
