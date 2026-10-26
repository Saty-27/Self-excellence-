import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  Check,
  Compass,
  Edit2,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { apiFetch, assetUrl, uploadFile } from "./api";
import { SEO } from "./components";
import { usePermissions } from "./usePermissions";
import {
  PilgrimageCard,
  DurationIcon,
  RouteIcon,
  TempleIcon,
  GuideIcon,
  HotelIcon,
  BusIcon,
  featuredJourney as defaultFallbackJourney
} from "./pilgrimage";

/* ============================================================
   Admin — Upcoming Journeys / Featured Pilgrimage Manager
   ------------------------------------------------------------
   Full dynamic management for homepage journey card, floating
   postcards, route points, information blocks, and booking details.
   ============================================================ */

const inputCls = "w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#C1121F] bg-white";
const labelCls = "block text-[11px] font-black uppercase tracking-wider text-muted mb-1.5";

const AVAILABLE_ICONS = [
  { value: "duration", label: "Duration / Clock", Icon: DurationIcon },
  { value: "route", label: "Route / Map", Icon: RouteIcon },
  { value: "temple", label: "Temple / Holy Place", Icon: TempleIcon },
  { value: "guide", label: "Guide / Devotee", Icon: GuideIcon },
  { value: "hotel", label: "Hotel / Stay", Icon: HotelIcon },
  { value: "bus", label: "Bus / Transport", Icon: BusIcon }
];

const DEFAULT_BLOCKS = [
  { icon: "duration", primaryText: "5 Days", secondaryText: "4 Nights" },
  { icon: "route", primaryText: "Mumbai → Vrindavana → Mumbai", secondaryText: "" },
  { icon: "temple", primaryText: "Temple Visits", secondaryText: "ISKCON Vrindavan, Banke Bihari, Prem Mandir" },
  { icon: "guide", primaryText: "Guided by", secondaryText: "Senior Devotees" }
];

const blankJourney = {
  title: "",
  slug: "",
  subtitle: "",
  badgeEnabled: true,
  badgeText: "FEATURED PILGRIMAGE",
  ctaText: "Book Now",
  ctaLink: "",
  routeText: "ISKCON Juhu → Vrindavana → ISKCON Juhu",
  startingLocation: "ISKCON Juhu, Mumbai",
  destination: "Sri Vrindavana Dhama",
  endingLocation: "ISKCON Juhu, Mumbai",
  durationDays: 5,
  durationNights: 4,
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  templeVisits: "ISKCON Vrindavan, Banke Bihari, Prem Mandir",
  guideNames: "Senior Devotees",
  shortDescription: "",
  description: "",
  mainImage: "/assets/pilgrimage-hero.webp",
  floatingImage1: "/assets/pilgrimage-kashi-postcard-01.webp",
  floatingImage2: "/assets/pilgrimage-kashi-postcard-02.webp",
  informationBlocks: [...DEFAULT_BLOCKS],
  basePrice: 18500,
  discountPrice: 0,
  currency: "INR",
  priceType: "per_person",
  totalSeats: 50,
  paymentQrImage: "",
  upiId: "iskcon.juhu@icici",
  status: "published",
  isFeatured: false,
  isActive: true
};

export const AdminJourneysPage = () => {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Editor states
  const [editingId, setEditingId] = useState(null); // null = list, "new" = create, id = edit
  const [form, setForm] = useState(blankJourney);
  const [uploadingField, setUploadingField] = useState(null);
  const [activeTab, setActiveTab] = useState("general"); // general | images | blocks | pricing | preview

  const heroInputRef = useRef(null);
  const postcard1InputRef = useRef(null);
  const postcard2InputRef = useRef(null);
  const qrInputRef = useRef(null);

  const loadJourneys = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiFetch(`/admin/journeys?${params.toString()}`);
      setJourneys(res.items || []);
    } catch (err) {
      setError(err.message || "Failed to load journeys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJourneys();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadJourneys();
  };

  const handleStartCreate = () => {
    if (!canCreate("journeys")) {
      setError("You do not have permission to create journeys.");
      return;
    }
    setForm({
      ...blankJourney,
      informationBlocks: DEFAULT_BLOCKS.map((b) => ({ ...b }))
    });
    setEditingId("new");
    setActiveTab("general");
    setError("");
    setNotice("");
  };

  const handleStartEdit = (journey) => {
    if (!canEdit("journeys")) {
      setError("You do not have permission to edit journeys.");
      return;
    }
    setForm({
      ...blankJourney,
      ...journey,
      informationBlocks: (journey.informationBlocks && journey.informationBlocks.length > 0)
        ? journey.informationBlocks.map((b) => ({ ...b }))
        : DEFAULT_BLOCKS.map((b) => ({ ...b })),
      startDate: journey.startDate ? String(journey.startDate).slice(0, 10) : "",
      endDate: journey.endDate ? String(journey.endDate).slice(0, 10) : "",
      registrationDeadline: journey.registrationDeadline ? String(journey.registrationDeadline).slice(0, 10) : ""
    });
    setEditingId(journey._id);
    setActiveTab("general");
    setError("");
    setNotice("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(blankJourney);
    setError("");
  };

  const handleToggleFeatured = async (journey) => {
    if (!canEdit("journeys")) {
      setError("You do not have permission to edit journeys.");
      return;
    }
    try {
      setLoading(true);
      const nextFeatured = !journey.isFeatured;
      await apiFetch(`/admin/journeys/${journey._id}/featured`, {
        method: "PATCH",
        body: { isFeatured: nextFeatured }
      });
      setNotice(nextFeatured ? `"${journey.title}" marked as homepage featured!` : "Featured journey removed.");
      loadJourneys();
    } catch (err) {
      setError(err.message || "Failed to update featured journey");
      setLoading(false);
    }
  };

  const handleStatusChange = async (journey, nextStatus) => {
    if (!canEdit("journeys")) {
      setError("You do not have permission to edit journeys.");
      return;
    }
    try {
      await apiFetch(`/admin/journeys/${journey._id}/status`, {
        method: "PATCH",
        body: { status: nextStatus }
      });
      setNotice(`Status updated to "${nextStatus}"`);
      loadJourneys();
    } catch (err) {
      setError(err.message || "Failed to update status");
    }
  };

  const handleDelete = async (journey) => {
    if (!canDelete("journeys")) {
      setError("You do not have permission to delete journeys.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${journey.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await apiFetch(`/admin/journeys/${journey._id}`, { method: "DELETE" });
      setNotice("Journey deleted successfully.");
      loadJourneys();
    } catch (err) {
      setError(err.message || "Failed to delete journey");
    }
  };

  const handleImageUpload = async (file, fieldKey) => {
    if (!file) return;
    try {
      setUploadingField(fieldKey);
      const url = await uploadFile(file);
      setForm((prev) => ({ ...prev, [fieldKey]: url }));
      setNotice("Image uploaded successfully.");
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  const handleBlockChange = (idx, field, value) => {
    setForm((prev) => {
      const nextBlocks = [...prev.informationBlocks];
      nextBlocks[idx] = { ...nextBlocks[idx], [field]: value };
      return { ...prev, informationBlocks: nextBlocks };
    });
  };

  const handleAddBlock = () => {
    setForm((prev) => ({
      ...prev,
      informationBlocks: [
        ...prev.informationBlocks,
        { icon: "temple", primaryText: "New Highlight", secondaryText: "Detail here" }
      ]
    }));
  };

  const handleRemoveBlock = (idx) => {
    setForm((prev) => ({
      ...prev,
      informationBlocks: prev.informationBlocks.filter((_, i) => i !== idx)
    }));
  };

  const handleMoveBlock = (idx, direction) => {
    setForm((prev) => {
      const next = [...prev.informationBlocks];
      const target = idx + direction;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return { ...prev, informationBlocks: next };
    });
  };

  const handleResetBlocks = () => {
    setForm((prev) => ({
      ...prev,
      informationBlocks: DEFAULT_BLOCKS.map((b) => ({ ...b }))
    }));
    setNotice("Reset information blocks to default.");
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (editingId === "new" && !canCreate("journeys")) {
      setError("You do not have permission to create journeys.");
      return;
    }
    if (editingId !== "new" && !canEdit("journeys")) {
      setError("You do not have permission to edit journeys.");
      return;
    }
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        durationDays: Number(form.durationDays || 1),
        durationNights: Number(form.durationNights || 0),
        basePrice: Number(form.basePrice || 0),
        discountPrice: Number(form.discountPrice || 0),
        totalSeats: Number(form.totalSeats || 50),
        informationBlocks: (form.informationBlocks || []).map((b, i) => ({
          ...b,
          sortOrder: i + 1
        }))
      };

      if (editingId === "new") {
        await apiFetch("/admin/journeys", {
          method: "POST",
          body: payload
        });
        setNotice("Journey created successfully!");
      } else {
        await apiFetch(`/admin/journeys/${editingId}`, {
          method: "PUT",
          body: payload
        });
        setNotice("Journey updated successfully!");
      }

      setEditingId(null);
      loadJourneys();
    } catch (err) {
      setError(err.message || "Failed to save journey");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <SEO title="Upcoming Journeys Management | Admin" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-black/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#9B0D18]/10 text-[#9B0D18]">
              <Compass size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-ink">Upcoming Journeys</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Configure the dynamic featured pilgrimage banner on the homepage, floating postcards, route highlights, and booking flow.
          </p>
        </div>

        {editingId === null && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadJourneys}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-soft transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            {canCreate("journeys") && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C1121F] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#9B0D18] transition"
              >
                <Plus size={16} />
                Create Journey
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700 flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}><X size={14} /></button>
        </div>
      )}

      {/* Mode 1: Journey List View */}
      {editingId === null ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-black/5 shadow-sm">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search journeys by title, route, or destination..."
                className="w-full rounded-xl border border-black/10 pl-9 pr-4 py-2 text-xs outline-none focus:border-primary"
              />
            </form>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold bg-white text-ink outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Table / Cards */}
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs font-bold text-muted">Loading upcoming journeys...</p>
            </div>
          ) : journeys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center">
              <Compass size={40} className="mx-auto text-muted/50 mb-3" />
              <h3 className="text-sm font-black text-ink">No journeys found</h3>
              <p className="mt-1 text-xs text-muted">Get started by creating your first pilgrimage or upcoming journey.</p>
              {canCreate("journeys") && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow"
                >
                  <Plus size={14} /> Create Journey
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {journeys.map((j) => (
                <div
                  key={j._id}
                  className={`relative rounded-2xl border bg-white p-4 transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    j.isFeatured ? "border-amber-400/80 bg-amber-50/20 shadow-amber-500/5 ring-1 ring-amber-400/40" : "border-black/5"
                  }`}
                >
                  {/* Left: Thumbnail & Core Details */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-soft">
                      <img
                        src={assetUrl(j.mainImage || "/assets/pilgrimage-hero.webp")}
                        alt={j.title}
                        className="h-full w-full object-cover"
                      />
                      {j.isFeatured && (
                        <span className="absolute top-1 left-1 flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-white shadow">
                          <Star size={9} className="fill-white" /> Featured
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            j.status === "published"
                              ? "bg-emerald-100 text-emerald-800"
                              : j.status === "draft"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {j.status}
                        </span>
                        <span className="text-[11px] font-bold text-muted">
                          {j.durationDays} Days / {j.durationNights} Nights
                        </span>
                        {j.badgeEnabled && j.badgeText && (
                          <span className="rounded bg-[#E8590C]/10 px-1.5 py-0.5 text-[9.5px] font-black uppercase text-[#E8590C]">
                            {j.badgeText}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-ink truncate">{j.title}</h3>
                      <p className="text-xs font-semibold text-muted truncate">
                        {j.routeText || `${j.startingLocation} → ${j.destination}`}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11.5px] text-muted">
                        <span>Price: <strong className="text-ink">₹{Number(j.basePrice || 0).toLocaleString("en-IN")}</strong></span>
                        <span>•</span>
                        <span>Seats: <strong className="text-ink">{j.totalSeats || 50}</strong></span>
                        {j.startDate && (
                          <>
                            <span>•</span>
                            <span>Date: <strong className="text-ink">{new Date(j.startDate).toLocaleDateString()}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                    {/* Featured Star Quick Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(j)}
                      title={j.isFeatured ? "Unfeature this journey" : "Make this the featured homepage journey"}
                      disabled={!canEdit("journeys")}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                        j.isFeatured
                          ? "border-amber-400 bg-amber-500 text-white shadow-sm"
                          : "border-black/10 bg-white text-muted hover:text-amber-600 hover:border-amber-300"
                      }`}
                    >
                      <Star size={13} className={j.isFeatured ? "fill-white" : ""} />
                      {j.isFeatured ? "Homepage Banner" : "Set as Homepage"}
                    </button>

                    {/* Status dropdown quick toggle */}
                    <select
                      value={j.status}
                      disabled={!canEdit("journeys")}
                      onChange={(e) => handleStatusChange(j, e.target.value)}
                      className="rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-xs font-bold text-ink outline-none disabled:opacity-50"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>

                    <Link
                      to={`/journeys/${j.slug}`}
                      target="_blank"
                      className="rounded-xl border border-black/10 p-2 text-muted hover:bg-soft hover:text-ink transition"
                      title="View public details"
                    >
                      <ExternalLink size={15} />
                    </Link>

                    {canEdit("journeys") && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(j)}
                        className="inline-flex items-center gap-1 rounded-xl bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-black transition"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    )}

                    {canDelete("journeys") && (
                      <button
                        type="button"
                        onClick={() => handleDelete(j)}
                        className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 transition"
                        title="Delete journey"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Mode 2: Editor View */
        <div className="space-y-6">
          {/* Editor Header Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-bold text-muted hover:bg-soft transition"
              >
                ← Back to List
              </button>
              <h2 className="text-base font-black text-ink">
                {editingId === "new" ? "Create New Journey" : `Editing: ${form.title || "Journey"}`}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-black/10 px-4 py-2 text-xs font-bold text-ink hover:bg-soft transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C1121F] px-5 py-2 text-xs font-bold text-white shadow hover:bg-[#9B0D18] transition disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Journey
              </button>
            </div>
          </div>

          {/* Editor Tabs */}
          <div className="flex border-b border-black/10 gap-2 overflow-x-auto pb-1">
            {[
              { id: "general", label: "General & Route" },
              { id: "images", label: "Hero & Postcards" },
              { id: "blocks", label: "Information Blocks" },
              { id: "pricing", label: "Pricing & Details" },
              { id: "preview", label: "Live Homepage Preview" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-b-2 border-[#C1121F] bg-white text-[#9B0D18] shadow-sm"
                    : "text-muted hover:text-ink hover:bg-white/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: General & Route */}
          {activeTab === "general" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-ink border-b border-black/5 pb-2">Banner Identity</h3>

                <div>
                  <label className={labelCls}>Journey Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. 5-Day Sacred Journey to Vrindavana"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>Slug / URL Identifier</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="e.g. 5-day-sacred-journey-to-vrindavana"
                    className={inputCls}
                  />
                  <p className="mt-1 text-[10px] text-muted">Leave blank to auto-generate from title.</p>
                </div>

                <div>
                  <label className={labelCls}>Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="e.g. Travel. Discover. Serve. Experience Krishna Consciousness."
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className={inputCls}
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Homepage Featured</label>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                        className="h-4 w-4 rounded text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-bold text-ink">Set as Featured</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-black/5">
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Badge Settings</label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.badgeEnabled}
                        onChange={(e) => setForm({ ...form, badgeEnabled: e.target.checked })}
                        className="h-3.5 w-3.5 rounded text-primary"
                      />
                      Show Badge
                    </label>
                  </div>
                  <input
                    type="text"
                    value={form.badgeText}
                    onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                    disabled={!form.badgeEnabled}
                    placeholder="e.g. FEATURED PILGRIMAGE"
                    className={`${inputCls} disabled:opacity-50`}
                  />
                </div>

                <div>
                  <label className={labelCls}>CTA Button Text</label>
                  <input
                    type="text"
                    value={form.ctaText}
                    onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                    placeholder="e.g. Book Now"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Route & Schedule */}
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-ink border-b border-black/5 pb-2">Route & Schedule</h3>

                <div>
                  <label className={labelCls}>Route Summary Text (Shown under Title)</label>
                  <input
                    type="text"
                    value={form.routeText}
                    onChange={(e) => setForm({ ...form, routeText: e.target.value })}
                    placeholder="e.g. ISKCON Juhu → Vrindavana → ISKCON Juhu"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Starting Location</label>
                    <input
                      type="text"
                      value={form.startingLocation}
                      onChange={(e) => setForm({ ...form, startingLocation: e.target.value })}
                      placeholder="e.g. ISKCON Juhu, Mumbai"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Destination</label>
                    <input
                      type="text"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      placeholder="e.g. Sri Vrindavana Dhama"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.durationDays}
                      onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Duration (Nights)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.durationNights}
                      onChange={(e) => setForm({ ...form, durationNights: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Journey Start Date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Journey End Date</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Temple / Holy Sites Visits</label>
                  <input
                    type="text"
                    value={form.templeVisits}
                    onChange={(e) => setForm({ ...form, templeVisits: e.target.value })}
                    placeholder="e.g. ISKCON Vrindavan, Banke Bihari, Prem Mandir"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Guided By</label>
                  <input
                    type="text"
                    value={form.guideNames}
                    onChange={(e) => setForm({ ...form, guideNames: e.target.value })}
                    placeholder="e.g. Senior Devotees"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Images & Postcards */}
          {activeTab === "images" && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Main Hero Background */}
              <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-ink">Main Hero Banner</h3>
                  <span className="text-[10px] text-muted">1920×800 rec.</span>
                </div>

                <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-black/10 bg-soft relative group">
                  <img
                    src={assetUrl(form.mainImage || "/assets/pilgrimage-hero.webp")}
                    alt="Hero preview"
                    className="h-full w-full object-cover"
                  />
                  {uploadingField === "mainImage" && (
                    <div className="absolute inset-0 bg-black/50 grid place-items-center text-white">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={heroInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0], "mainImage")}
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => heroInputRef.current?.click()}
                    disabled={uploadingField === "mainImage"}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white hover:bg-black transition"
                  >
                    <Upload size={13} /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, mainImage: "/assets/pilgrimage-hero.webp" })}
                    className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold text-muted hover:bg-soft transition"
                    title="Reset to default banner"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <label className={labelCls}>Or Image URL / Path</label>
                  <input
                    type="text"
                    value={form.mainImage}
                    onChange={(e) => setForm({ ...form, mainImage: e.target.value })}
                    placeholder="/assets/pilgrimage-hero.webp"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Floating Postcard 1 */}
              <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-ink">Floating Postcard 1</h3>
                  <span className="text-[10px] text-muted">Tilted -5°</span>
                </div>

                <div className="aspect-[4/5] w-full rounded-xl overflow-hidden border-4 border-white shadow-md bg-soft relative flex items-center justify-center p-2">
                  <img
                    src={assetUrl(form.floatingImage1 || "/assets/pilgrimage-kashi-postcard-01.webp")}
                    alt="Postcard 1 preview"
                    className="h-full w-full object-cover rounded"
                  />
                  {uploadingField === "floatingImage1" && (
                    <div className="absolute inset-0 bg-black/50 grid place-items-center text-white">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={postcard1InputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0], "floatingImage1")}
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => postcard1InputRef.current?.click()}
                    disabled={uploadingField === "floatingImage1"}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white hover:bg-black transition"
                  >
                    <Upload size={13} /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, floatingImage1: "/assets/pilgrimage-kashi-postcard-01.webp" })}
                    className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold text-muted hover:bg-soft transition"
                    title="Reset to default postcard 1"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <label className={labelCls}>Or Image URL / Path</label>
                  <input
                    type="text"
                    value={form.floatingImage1}
                    onChange={(e) => setForm({ ...form, floatingImage1: e.target.value })}
                    placeholder="/assets/pilgrimage-kashi-postcard-01.webp"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Floating Postcard 2 */}
              <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-ink">Floating Postcard 2</h3>
                  <span className="text-[10px] text-muted">Tilted +7°</span>
                </div>

                <div className="aspect-[4/5] w-full rounded-xl overflow-hidden border-4 border-white shadow-md bg-soft relative flex items-center justify-center p-2">
                  <img
                    src={assetUrl(form.floatingImage2 || "/assets/pilgrimage-kashi-postcard-02.webp")}
                    alt="Postcard 2 preview"
                    className="h-full w-full object-cover rounded"
                  />
                  {uploadingField === "floatingImage2" && (
                    <div className="absolute inset-0 bg-black/50 grid place-items-center text-white">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={postcard2InputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0], "floatingImage2")}
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => postcard2InputRef.current?.click()}
                    disabled={uploadingField === "floatingImage2"}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white hover:bg-black transition"
                  >
                    <Upload size={13} /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, floatingImage2: "/assets/pilgrimage-kashi-postcard-02.webp" })}
                    className="rounded-xl border border-black/10 px-3 py-2 text-xs font-bold text-muted hover:bg-soft transition"
                    title="Reset to default postcard 2"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <label className={labelCls}>Or Image URL / Path</label>
                  <input
                    type="text"
                    value={form.floatingImage2}
                    onChange={(e) => setForm({ ...form, floatingImage2: e.target.value })}
                    placeholder="/assets/pilgrimage-kashi-postcard-02.webp"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Information Blocks */}
          {activeTab === "blocks" && (
            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-black/5 pb-4">
                <div>
                  <h3 className="text-sm font-black text-ink">Card Information Blocks</h3>
                  <p className="mt-0.5 text-xs text-muted">
                    These 4 highlight blocks appear directly on the homepage journey card with golden line icons.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetBlocks}
                    className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-bold text-muted hover:bg-soft transition"
                  >
                    Reset to Defaults
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBlock}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition shadow-sm"
                  >
                    <Plus size={14} /> Add Block
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {form.informationBlocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-black/10 bg-soft/30 p-4 transition hover:border-black/20 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                  >
                    {/* Index & Reorder */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-black text-ink border border-black/10">
                        {idx + 1}
                      </span>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleMoveBlock(idx, -1)}
                          disabled={idx === 0}
                          className="text-muted hover:text-ink disabled:opacity-30 p-0.5"
                          title="Move Up"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveBlock(idx, 1)}
                          disabled={idx === form.informationBlocks.length - 1}
                          className="text-muted hover:text-ink disabled:opacity-30 p-0.5"
                          title="Move Down"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Icon Selector */}
                    <div className="w-full sm:w-48 shrink-0">
                      <label className={labelCls}>Icon</label>
                      <select
                        value={block.icon || "duration"}
                        onChange={(e) => handleBlockChange(idx, "icon", e.target.value)}
                        className={inputCls}
                      >
                        {AVAILABLE_ICONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Primary Title */}
                    <div className="flex-1 w-full">
                      <label className={labelCls}>Primary Text / Title</label>
                      <input
                        type="text"
                        value={block.primaryText}
                        onChange={(e) => handleBlockChange(idx, "primaryText", e.target.value)}
                        placeholder="e.g. 5 Days / Temple Visits"
                        className={inputCls}
                      />
                    </div>

                    {/* Secondary Detail */}
                    <div className="flex-1 w-full">
                      <label className={labelCls}>Secondary Text / Detail</label>
                      <input
                        type="text"
                        value={block.secondaryText}
                        onChange={(e) => handleBlockChange(idx, "secondaryText", e.target.value)}
                        placeholder="e.g. 4 Nights / ISKCON Vrindavan"
                        className={inputCls}
                      />
                    </div>

                    {/* Delete */}
                    <div className="self-end sm:self-center shrink-0 pt-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(idx)}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition"
                        title="Delete block"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Pricing & Details */}
          {activeTab === "pricing" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-ink border-b border-black/5 pb-2">Pricing & Booking Rules</h3>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 font-medium">
                  <strong>Notice:</strong> Per design requirement, pricing is hidden on the homepage teaser card and is displayed in the full booking details page when a devotee clicks &quot;Book Now&quot;.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Base Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      value={form.basePrice}
                      onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                      placeholder="18500"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Discounted Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.discountPrice}
                      onChange={(e) => setForm({ ...form, discountPrice: Number(e.target.value) })}
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Price Type</label>
                    <select
                      value={form.priceType}
                      onChange={(e) => setForm({ ...form, priceType: e.target.value })}
                      className={inputCls}
                    >
                      <option value="per_person">Per Person</option>
                      <option value="per_couple">Per Couple</option>
                      <option value="family">Family Package</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Total Capacity / Seats</label>
                    <input
                      type="number"
                      min="1"
                      value={form.totalSeats}
                      onChange={(e) => setForm({ ...form, totalSeats: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>UPI ID for Payment</label>
                  <input
                    type="text"
                    value={form.upiId}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                    placeholder="e.g. iskcon.juhu@icici"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Payment QR Code Image</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.paymentQrImage}
                      onChange={(e) => setForm({ ...form, paymentQrImage: e.target.value })}
                      placeholder="Upload or enter QR image path"
                      className={inputCls}
                    />
                    <input
                      type="file"
                      ref={qrInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0], "paymentQrImage")}
                    />
                    <button
                      type="button"
                      onClick={() => qrInputRef.current?.click()}
                      className="shrink-0 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white hover:bg-black transition"
                    >
                      <Upload size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-ink border-b border-black/5 pb-2">Description & Details</h3>

                <div>
                  <label className={labelCls}>Short Summary</label>
                  <textarea
                    rows="3"
                    value={form.shortDescription}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    placeholder="Brief 1-2 sentence overview for meta tags and previews..."
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Full Journey Description / Itinerary Highlights</label>
                  <textarea
                    rows="8"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide details about the spiritual significance, temple darsanas, parikrama, prasadam arrangements, and packing guidelines..."
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Live Homepage Preview (Req #21) */}
          {activeTab === "preview" && (
            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <div>
                  <h3 className="text-sm font-black text-ink">Homepage Live Preview</h3>
                  <p className="text-xs text-muted">
                    This is an exact replica of how your journey will appear on the homepage.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-800">
                  Interactive Preview
                </span>
              </div>

              {/* Card Container Preview */}
              <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-[#FAF6EE] p-6 lg:p-8">
                {/* Simulated background */}
                <div className="absolute inset-0 opacity-40 pointer-events-none">
                  <img
                    src={assetUrl(form.mainImage || "/assets/pilgrimage-hero.webp")}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="relative z-10 max-w-4xl">
                  <div className="mb-4">
                    <h2 className="font-display font-bold leading-none text-2xl sm:text-3xl">
                      <span className="text-[#1C1410]">Embark on a </span>
                      <span className="text-[#9B0D18]">Sacred Journey</span>
                    </h2>
                    <p className="mt-1 text-xs text-[#3D3530]">
                      {form.subtitle || "Travel. Discover. Serve. Experience Krishna Consciousness."}
                    </p>
                  </div>

                  {/* The PilgrimageCard component */}
                  <div className="lg:w-[75%]">
                    <PilgrimageCard
                      journey={{
                        ...form,
                        route: form.routeText || `${form.startingLocation} → ${form.destination}`
                      }}
                      onBook={() => alert("Devotee clicks Book Now → navigates to full booking page!")}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-3 bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-black/10 px-4 py-2 text-xs font-bold text-ink hover:bg-soft transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#C1121F] px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-[#9B0D18] transition disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Journey
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJourneysPage;
