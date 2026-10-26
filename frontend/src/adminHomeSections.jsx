import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Search,
  ExternalLink,
  Layers,
  Power,
  X,
  Edit3,
  Save,
  Loader2,
  HelpCircle,
  Filter,
  Check,
  ArrowRight
} from "lucide-react";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";
import { notifyHomepageSectionsUpdated } from "./useHomepageSections";

export const AdminHomeSectionsPage = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "enabled" | "home_disabled" | "all_disabled"
  const [actionLoading, setActionLoading] = useState(null); // sectionKey or "batch"
  const [toast, setToast] = useState(null);

  // Modals state
  const [disableModalTarget, setDisableModalTarget] = useState(null); // section object
  const [editModalTarget, setEditModalTarget] = useState(null); // section object
  const [editForm, setEditForm] = useState({
    sectionTitle: "",
    sectionSubtitle: "",
    buttonText: "",
    buttonLink: "",
    sortOrder: 1
  });
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Permission check
  const isSuperAdmin = user?.role === "main_admin" || user?.role === "admin";
  const canEdit =
    isSuperAdmin ||
    (user?.rolePermissions?.["home-sections"]?.edit !== false &&
      user?.rolePermissions?.["home-sections"]?.update !== false);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/homepage-sections");
      const list = (res && (res.sections || res.items)) || [];
      if (Array.isArray(list) && list.length > 0) {
        setSections(list);
      }
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load homepage sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Status classification helper
  const getSectionStatus = (s) => {
    if (s.websiteEnabled === false) return "all_disabled";
    if (s.homepageVisible === false) return "home_disabled";
    return "enabled";
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = sections.length;
    let enabledCount = 0;
    let homeDisabledCount = 0;
    let allDisabledCount = 0;

    sections.forEach((s) => {
      const status = getSectionStatus(s);
      if (status === "enabled") enabledCount++;
      else if (status === "home_disabled") homeDisabledCount++;
      else if (status === "all_disabled") allDisabledCount++;
    });

    return { total, enabledCount, homeDisabledCount, allDisabledCount };
  }, [sections]);

  // Filtered sections
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const status = getSectionStatus(s);
      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchName = s.sectionName?.toLowerCase().includes(query);
        const matchKey = s.sectionKey?.toLowerCase().includes(query);
        const matchTitle = s.sectionTitle?.toLowerCase().includes(query);
        const matchRoute = s.routePath?.toLowerCase().includes(query);
        return matchName || matchKey || matchTitle || matchRoute;
      }
      return true;
    });
  }, [sections, statusFilter, search]);

  // Handlers for Enable / Disable
  const handleEnable = async (section) => {
    if (!canEdit) {
      showToast("You do not have permission to modify homepage sections", "error");
      return;
    }

    try {
      setActionLoading(section.sectionKey);
      await apiFetch(`/admin/homepage-sections/${section.sectionKey}/visibility`, {
        method: "PUT",
        body: {
          homepageVisible: true,
          websiteEnabled: true
        }
      });

      // Update local state
      setSections((prev) =>
        prev.map((s) =>
          s.sectionKey === section.sectionKey
            ? { ...s, homepageVisible: true, websiteEnabled: true, status: "active" }
            : s
        )
      );

      notifyHomepageSectionsUpdated();
      showToast(`"${section.sectionName}" is now Enabled Everywhere.`);
    } catch (err) {
      showToast(err?.message || "Failed to update section visibility", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyDisable = async (option) => {
    if (!disableModalTarget) return;
    if (!canEdit) {
      showToast("You do not have permission to modify homepage sections", "error");
      return;
    }

    const key = disableModalTarget.sectionKey;
    const isHomepageOnly = option === "homepage_only";

    const payload = {
      homepageVisible: false,
      websiteEnabled: isHomepageOnly // if homepage only, website remains enabled; if entire website, websiteEnabled is false
    };

    try {
      setActionLoading(key);
      await apiFetch(`/admin/homepage-sections/${key}/visibility`, {
        method: "PUT",
        body: payload
      });

      setSections((prev) =>
        prev.map((s) =>
          s.sectionKey === key
            ? {
                ...s,
                homepageVisible: payload.homepageVisible,
                websiteEnabled: payload.websiteEnabled
              }
            : s
        )
      );

      notifyHomepageSectionsUpdated();
      const msg = isHomepageOnly
        ? `"${disableModalTarget.sectionName}" disabled from Homepage only. (Page remains active via menu)`
        : `"${disableModalTarget.sectionName}" completely disabled from entire website.`;
      showToast(msg, isHomepageOnly ? "warning" : "info");
      setDisableModalTarget(null);
    } catch (err) {
      showToast(err?.message || "Failed to disable section", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // CMS Edit content handlers
  const openEditModal = (section) => {
    setEditModalTarget(section);
    setEditForm({
      sectionTitle: section.sectionTitle || "",
      sectionSubtitle: section.sectionSubtitle || "",
      buttonText: section.buttonText || "",
      buttonLink: section.buttonLink || "",
      sortOrder: section.sortOrder || 1
    });
  };

  const saveEditContent = async () => {
    if (!editModalTarget) return;
    try {
      setActionLoading(editModalTarget.sectionKey);
      await apiFetch(`/admin/homepage-sections/${editModalTarget.sectionKey}/visibility`, {
        method: "PUT",
        body: {
          sectionTitle: editForm.sectionTitle,
          sectionSubtitle: editForm.sectionSubtitle,
          buttonText: editForm.buttonText,
          buttonLink: editForm.buttonLink,
          sortOrder: Number(editForm.sortOrder) || 1
        }
      });

      setSections((prev) =>
        prev.map((s) =>
          s.sectionKey === editModalTarget.sectionKey
            ? {
                ...s,
                sectionTitle: editForm.sectionTitle,
                sectionSubtitle: editForm.sectionSubtitle,
                buttonText: editForm.buttonText,
                buttonLink: editForm.buttonLink,
                sortOrder: Number(editForm.sortOrder) || 1
              }
            : s
        )
      );

      notifyHomepageSectionsUpdated();
      showToast(`Updated text and settings for "${editModalTarget.sectionName}"`);
      setEditModalTarget(null);
    } catch (err) {
      showToast(err?.message || "Failed to update content", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Reset all to enabled everywhere
  const handleResetAll = async () => {
    try {
      setActionLoading("batch");
      await apiFetch("/admin/homepage-sections/reset", {
        method: "POST"
      });
      await fetchSections();
      notifyHomepageSectionsUpdated();
      showToast("All sections have been reset to Enabled Everywhere.");
      setResetConfirmOpen(false);
    } catch (err) {
      showToast(err?.message || "Failed to reset sections", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold shadow-2xl backdrop-blur-md transition-all animate-bounce ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : toast.type === "warning"
              ? "bg-amber-600 text-white"
              : "bg-ink text-white"
          }`}
        >
          {toast.type === "error" ? (
            <XCircle size={20} className="shrink-0" />
          ) : toast.type === "warning" ? (
            <AlertTriangle size={20} className="shrink-0" />
          ) : (
            <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 rounded-full p-1 hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-primary/90 to-primary p-6 text-white shadow-xl lg:p-8">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
              <Layers size={14} /> Dynamic Homepage CMS
            </div>
            <h1 className="mt-2 text-2xl font-black lg:text-3xl">
              Homepage Section Visibility & Enable/Disable
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-white/80">
              Manage every section on your homepage. When disabling, choose between hiding from
              homepage only (keeping it active in Navbar) or disabling from the entire website.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-xs font-black text-white hover:bg-white/30 transition shadow-sm"
            >
              <ExternalLink size={15} /> View Live Homepage
            </Link>
            {canEdit && (
              <button
                onClick={() => setResetConfirmOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-ink px-4 py-2.5 text-xs font-black hover:bg-soft transition shadow-sm"
              >
                <RotateCcw size={15} /> Reset All to Enabled
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted">
              Total Sections
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-soft text-ink">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-ink">{metrics.total}</div>
          <p className="mt-1 text-xs font-medium text-muted">Configurable sections & landing pages</p>
        </div>

        {/* Enabled Everywhere */}
        <div
          onClick={() => setStatusFilter("enabled")}
          className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
            statusFilter === "enabled"
              ? "border-emerald-500 bg-emerald-50/50"
              : "border-black/5 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
              Enabled Everywhere
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-600">{metrics.enabledCount}</div>
          <p className="mt-1 text-xs font-medium text-emerald-700">
            Visible on homepage & Navbar active
          </p>
        </div>

        {/* Homepage Disabled */}
        <div
          onClick={() => setStatusFilter("home_disabled")}
          className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
            statusFilter === "home_disabled"
              ? "border-amber-500 bg-amber-50/50"
              : "border-black/5 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700">
              Homepage Disabled
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-600">
            {metrics.homeDisabledCount}
          </div>
          <p className="mt-1 text-xs font-medium text-amber-700">
            Hidden from homepage, active in menu
          </p>
        </div>

        {/* Completely Disabled */}
        <div
          onClick={() => setStatusFilter("all_disabled")}
          className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
            statusFilter === "all_disabled"
              ? "border-red-500 bg-red-50/50"
              : "border-black/5 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-red-700">
              Completely Disabled
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-red-100 text-red-700">
              <XCircle size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-red-600">
            {metrics.allDisabledCount}
          </div>
          <p className="mt-1 text-xs font-medium text-red-700">
            Hidden everywhere, route blocked 404
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
              statusFilter === "all"
                ? "bg-ink text-white"
                : "bg-soft text-muted hover:bg-black/5"
            }`}
          >
            All ({metrics.total})
          </button>
          <button
            onClick={() => setStatusFilter("enabled")}
            className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
              statusFilter === "enabled"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            Enabled Everywhere ({metrics.enabledCount})
          </button>
          <button
            onClick={() => setStatusFilter("home_disabled")}
            className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
              statusFilter === "home_disabled"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            Homepage Disabled ({metrics.homeDisabledCount})
          </button>
          <button
            onClick={() => setStatusFilter("all_disabled")}
            className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
              statusFilter === "all_disabled"
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-800 hover:bg-red-100"
            }`}
          >
            Completely Disabled ({metrics.allDisabledCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search section name or route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-soft/50 py-2 pl-9 pr-8 text-xs font-bold text-ink outline-none transition focus:border-primary focus:bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted">
            <Loader2 size={32} className="animate-spin text-primary mb-3" />
            <span className="text-sm font-bold">Loading homepage section configurations...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertTriangle size={36} className="text-red-500 mb-2" />
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button
              onClick={fetchSections}
              className="mt-4 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-primary transition"
            >
              Try Again
            </button>
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <p className="text-sm font-bold">No sections match your filter criteria.</p>
            <button
              onClick={() => {
                setStatusFilter("all");
                setSearch("");
              }}
              className="mt-3 text-xs font-bold text-primary underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-soft/60 text-[11px] font-black uppercase tracking-wider text-muted">
                  <th className="py-4 pl-6 pr-3">Section / Page Name</th>
                  <th className="px-3 py-4">Associated Route</th>
                  <th className="px-3 py-4">Current Status</th>
                  <th className="px-3 py-4">Homepage Visibility</th>
                  <th className="px-3 py-4">Website / Page Status</th>
                  <th className="py-4 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredSections.map((section) => {
                  const status = getSectionStatus(section);
                  const isBusy = actionLoading === section.sectionKey;

                  return (
                    <tr
                      key={section.sectionKey}
                      className="group transition-colors hover:bg-soft/30"
                    >
                      {/* Name & description */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-ink">
                              {section.sectionName}
                            </span>
                            <span className="rounded-md bg-black/5 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted">
                              {section.sectionKey}
                            </span>
                          </div>
                          <span className="mt-1 text-xs text-muted max-w-sm line-clamp-1">
                            {section.description || section.sectionTitle || "Homepage module"}
                          </span>
                        </div>
                      </td>

                      {/* Associated Route */}
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={section.routePath || "/"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline"
                          >
                            <span>{section.routePath || "/"}</span>
                            <ExternalLink size={11} className="opacity-70" />
                          </Link>
                          {section.navLabel && (
                            <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">
                              Menu: {section.navLabel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Current Status Badge */}
                      <td className="px-3 py-4">
                        {status === "enabled" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 font-black text-emerald-800">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Enabled Everywhere
                          </span>
                        )}
                        {status === "home_disabled" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-black text-amber-800">
                            <AlertTriangle size={13} className="text-amber-600" />
                            Homepage Disabled
                          </span>
                        )}
                        {status === "all_disabled" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 font-black text-red-800">
                            <XCircle size={13} className="text-red-600" />
                            Completely Disabled
                          </span>
                        )}
                      </td>

                      {/* Homepage Visibility */}
                      <td className="px-3 py-4">
                        {section.homepageVisible !== false && section.websiteEnabled !== false ? (
                          <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                            <Eye size={14} /> Visible
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold text-muted">
                            <EyeOff size={14} /> Hidden
                          </div>
                        )}
                      </td>

                      {/* Website / Page Status */}
                      <td className="px-3 py-4">
                        {section.websiteEnabled !== false ? (
                          <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                            <Globe size={14} /> Active & Accessible
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold text-red-600">
                            <XCircle size={14} /> Disabled (404 Page)
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* CMS Edit Content */}
                          <button
                            onClick={() => openEditModal(section)}
                            disabled={!canEdit || isBusy}
                            title="Edit Section Headings & Text"
                            className="rounded-xl border border-black/10 p-2 text-muted hover:border-black/20 hover:bg-soft hover:text-ink transition disabled:opacity-40"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Enable Button */}
                          {status !== "enabled" ? (
                            <button
                              onClick={() => handleEnable(section)}
                              disabled={!canEdit || isBusy}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 font-black text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Check size={13} />
                              )}
                              <span>Enable Everywhere</span>
                            </button>
                          ) : (
                            <span className="rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}

                          {/* Disable Button */}
                          <button
                            onClick={() => setDisableModalTarget(section)}
                            disabled={!canEdit || isBusy || status === "all_disabled"}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-black transition ${
                              status === "all_disabled"
                                ? "border-black/5 bg-soft text-muted cursor-not-allowed opacity-50"
                                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            <Power size={13} />
                            <span>Disable...</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          DISABLE CONFIRMATION MODAL (Option 1 vs Option 2)
          ========================================================================= */}
      {disableModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-black/10 animate-scale-up sm:p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-ink">
                    Disable: {disableModalTarget.sectionName}
                  </h3>
                  <p className="text-xs font-semibold text-muted">
                    Choose how you want to disable this section from your website:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDisableModalTarget(null)}
                className="rounded-full p-2 text-muted hover:bg-soft hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {/* Option 1: Disable from Homepage Only */}
              <div
                onClick={() => handleApplyDisable("homepage_only")}
                className="group relative cursor-pointer rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-5 transition hover:border-amber-500 hover:bg-amber-50 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-200 text-amber-800">
                      <Home size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-950">
                        1. Disable from Homepage Only
                      </h4>
                      <p className="text-xs font-bold text-amber-800">
                        Hide from homepage, but keep page active & accessible in menu
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-amber-600 transition-transform group-hover:translate-x-1"
                  />
                </div>
                <ul className="mt-3 space-y-1 pl-10 text-xs font-medium text-amber-900/80 list-disc">
                  <li>Removes and hides the section from the Homepage.</li>
                  <li>Keeps the page active and accessible through the Navbar/Menu.</li>
                  <li>
                    The direct page ({disableModalTarget.routePath}) remains fully available to
                    visitors.
                  </li>
                </ul>
              </div>

              {/* Option 2: Disable from Entire Website */}
              <div
                onClick={() => handleApplyDisable("entire_website")}
                className="group relative cursor-pointer rounded-2xl border-2 border-red-200 bg-red-50/50 p-5 transition hover:border-red-500 hover:bg-red-50 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-200 text-red-800">
                      <Globe size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-red-950">
                        2. Disable from Entire Website
                      </h4>
                      <p className="text-xs font-bold text-red-800">
                        Completely disable from homepage, navbar, and block page route
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-red-600 transition-transform group-hover:translate-x-1"
                  />
                </div>
                <ul className="mt-3 space-y-1 pl-10 text-xs font-medium text-red-900/80 list-disc">
                  <li>Removes the section from the Homepage.</li>
                  <li>Removes the link from the Navbar and menus.</li>
                  <li>
                    Disables the page route completely; visiting{" "}
                    <span className="font-mono">{disableModalTarget.routePath}</span> will show a
                    friendly <strong>Page Unavailable / 404</strong> screen.
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setDisableModalTarget(null)}
                className="rounded-xl border border-black/10 px-5 py-2.5 text-xs font-black text-muted hover:bg-soft hover:text-ink transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CMS EDIT HEADINGS MODAL
          ========================================================================= */}
      {editModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-black/10 animate-scale-up sm:p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-ink">
                    Edit: {editModalTarget.sectionName}
                  </h3>
                  <p className="text-xs font-semibold text-muted">
                    Customise titles, subtitles, and button actions for this homepage section
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalTarget(null)}
                className="rounded-full p-2 text-muted hover:bg-soft hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEditContent();
              }}
              className="mt-6 space-y-4 text-xs font-bold"
            >
              <div>
                <label className="block text-muted mb-1 uppercase tracking-wider">
                  Section Title / Heading
                </label>
                <input
                  type="text"
                  value={editForm.sectionTitle}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, sectionTitle: e.target.value }))
                  }
                  placeholder={editModalTarget.sectionTitle || "e.g. Explore All the Courses"}
                  className="w-full rounded-xl border border-black/10 bg-soft/40 px-3.5 py-2.5 text-ink outline-none transition focus:border-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-muted mb-1 uppercase tracking-wider">
                  Section Subtitle / Tagline
                </label>
                <textarea
                  rows={2}
                  value={editForm.sectionSubtitle}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, sectionSubtitle: e.target.value }))
                  }
                  placeholder={editModalTarget.sectionSubtitle || "e.g. Designed by Experts"}
                  className="w-full rounded-xl border border-black/10 bg-soft/40 px-3.5 py-2.5 text-ink outline-none transition focus:border-primary focus:bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted mb-1 uppercase tracking-wider">
                    Button Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.buttonText}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, buttonText: e.target.value }))
                    }
                    placeholder="e.g. View All"
                    className="w-full rounded-xl border border-black/10 bg-soft/40 px-3.5 py-2.5 text-ink outline-none transition focus:border-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-muted mb-1 uppercase tracking-wider">
                    Button Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.buttonLink}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, buttonLink: e.target.value }))
                    }
                    placeholder={editModalTarget.routePath || "/courses"}
                    className="w-full rounded-xl border border-black/10 bg-soft/40 px-3.5 py-2.5 text-ink outline-none transition focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted mb-1 uppercase tracking-wider">
                  Display Order on Homepage
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={editForm.sortOrder}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                  }
                  className="w-24 rounded-xl border border-black/10 bg-soft/40 px-3.5 py-2.5 text-ink outline-none transition focus:border-primary focus:bg-white"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setEditModalTarget(null)}
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-xs font-bold text-muted hover:bg-soft hover:text-ink transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === editModalTarget.sectionKey}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-white hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                >
                  {actionLoading === editModalTarget.sectionKey ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESET ALL CONFIRMATION MODAL
          ========================================================================= */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-black/10 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-ink">Reset All Sections?</h3>
                <p className="text-xs font-semibold text-muted">
                  This will set all 14 homepage sections to Enabled Everywhere.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs font-medium text-muted">
              All hidden sections and disabled pages will be reactivated, restored on the
              homepage, and visible in navigation menus.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="rounded-xl border border-black/10 px-4 py-2 text-xs font-bold text-muted hover:bg-soft hover:text-ink transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                disabled={actionLoading === "batch"}
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-black text-white hover:bg-primary transition disabled:opacity-50"
              >
                {actionLoading === "batch" && <Loader2 size={14} className="animate-spin" />}
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
