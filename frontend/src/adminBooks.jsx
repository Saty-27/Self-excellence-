import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Image as ImageIcon,
  Loader2,
  Lock,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  Smartphone,
  Tag,
  Trash2,
  Upload,
  User,
  Users,
  X,
  AlertCircle
} from "lucide-react";
import { apiFetch, assetUrl, uploadFile } from "./api";
import { SEO } from "./components";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const STATUS_STYLES = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-800 border-amber-200",
  PAYMENT_SUBMITTED: "bg-blue-50 text-blue-800 border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-800 border-rose-200",
  COMPLETED: "bg-purple-50 text-purple-800 border-purple-200",
  CANCELLED: "bg-zinc-100 text-zinc-600 border-zinc-200"
};

const STATUS_LABELS = {
  PENDING_PAYMENT: "Pending Payment",
  PAYMENT_SUBMITTED: "Verification Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

const inputClass = "w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-primary";
const labelClass = "block text-[11px] font-black uppercase tracking-wider text-muted mb-1";

/* ============================================================
   1. ADMIN BOOKS MANAGER (CRUD & Card Builder)
   ============================================================ */
export const AdminBooksPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [editingBook, setEditingBook] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [newPreset, setNewPreset] = useState("");

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/books");
      setBooks(data.items || []);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const emptyBook = () => ({
    title: "",
    slug: "",
    subtitle: "",
    shortDescription: "",
    fullDescription: "",
    authorOrTranslator: "",
    language: "English",
    pages: "",
    binding: "Hardcover",
    publisher: "",
    coverImage: "",
    galleryImages: [],
    highlights: [],
    pricePerBook: 150,
    mrp: 200,
    distributionPricePerBook: "",
    gstPercent: 0,
    allowBuy: true,
    allowDistribute: true,
    minBuyQty: 1,
    maxBuyQty: 100,
    minDistributeQty: 10,
    maxDistributeQty: 100000,
    distributionPresets: [10, 50, 100, 250, 500, 600, 700, 1000],
    trackStock: false,
    stockQuantity: 0,
    isActive: true,
    isFeatured: true,
    displayOrder: books.length
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingBook.title?.trim()) {
      setNotice("Book title is required.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const payload = {
        ...editingBook,
        pricePerBook: Number(editingBook.pricePerBook) || 0,
        mrp: editingBook.mrp ? Number(editingBook.mrp) : undefined,
        distributionPricePerBook: editingBook.distributionPricePerBook ? Number(editingBook.distributionPricePerBook) : null,
        gstPercent: Number(editingBook.gstPercent) || 0,
        minBuyQty: Number(editingBook.minBuyQty) || 1,
        maxBuyQty: Number(editingBook.maxBuyQty) || 100,
        minDistributeQty: Number(editingBook.minDistributeQty) || 1,
        maxDistributeQty: Number(editingBook.maxDistributeQty) || 100000,
        stockQuantity: Number(editingBook.stockQuantity) || 0
      };

      if (editingBook._id) {
        const res = await apiFetch(`/admin/books/${editingBook._id}`, {
          method: "PUT",
          body: payload
        });
        setNotice(res.priceChanged ? "Price updated. Existing orders are not affected." : "Book updated successfully.");
      } else {
        await apiFetch("/admin/books", {
          method: "POST",
          body: payload
        });
        setNotice("New book added successfully.");
      }
      setEditingBook(null);
      loadBooks();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (id) => {
    try {
      await apiFetch(`/admin/books/${id}/toggle-active`, { method: "POST" });
      loadBooks();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await apiFetch(`/admin/books/${id}`, { method: "DELETE" });
      setNotice("Book deleted successfully.");
      loadBooks();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const handleCoverUpload = async (file) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const res = await uploadFile(file, "books");
      setEditingBook((prev) => ({ ...prev, coverImage: res.url }));
    } catch (err) {
      setNotice("Upload failed: " + err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const addPreset = () => {
    const n = parseInt(newPreset, 10);
    if (!isNaN(n) && n > 0 && !editingBook.distributionPresets.includes(n)) {
      const updated = [...editingBook.distributionPresets, n].sort((a, b) => a - b);
      setEditingBook({ ...editingBook, distributionPresets: updated });
      setNewPreset("");
    }
  };

  const removePreset = (val) => {
    setEditingBook({
      ...editingBook,
      distributionPresets: editingBook.distributionPresets.filter((p) => p !== val)
    });
  };

  return (
    <div>
      <SEO title="Books Manager - Admin" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-ink">Books Manager</h1>
          <p className="mt-1 text-sm text-muted">
            Create, edit and manage sacred books for purchase and sponsored distribution seva.
          </p>
        </div>
        <button
          onClick={() => setEditingBook(emptyBook())}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
        >
          <Plus size={16} /> Add Sacred Book
        </button>
      </div>

      {notice && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-primary hover:opacity-75"><X size={16} /></button>
        </div>
      )}

      {/* Books Table */}
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3">Book</th>
              <th className="px-4 py-3">Pricing (INR)</th>
              <th className="px-4 py-3">Actions Allowed</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="6" className="px-4 py-12 text-center text-muted">Loading sacred books...</td></tr>
            )}
            {!loading && books.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-12 text-center text-muted">No books found. Click "Add Sacred Book" to create one.</td></tr>
            )}
            {!loading && books.map((b) => (
              <tr key={b._id} className="border-t border-black/5 transition hover:bg-soft/30">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md border border-black/10 bg-soft">
                      {b.coverImage ? (
                        <img src={assetUrl(b.coverImage)} alt={b.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-muted"><ImageIcon size={14} /></div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-ink">{b.title}</p>
                      <p className="font-mono text-xs text-muted">/{b.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-bold text-ink">{money(b.pricePerBook)}</p>
                  {b.mrp && <p className="text-xs text-muted line-through">{money(b.mrp)}</p>}
                  {b.gstPercent > 0 && <p className="text-[11px] text-muted">GST: {b.gstPercent}%</p>}
                </td>
                <td className="px-4 py-3.5 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className={b.allowBuy ? "font-semibold text-emerald-700" : "text-muted line-through"}>• Buy (Delivery)</span>
                    <span className={b.allowDistribute ? "font-semibold text-purple-700" : "text-muted line-through"}>• Distribute (Seva)</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs">
                  {b.trackStock ? (
                    <span className="font-bold text-ink">{b.stockQuantity} copies</span>
                  ) : (
                    <span className="text-muted">Uncapped</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => toggleActive(b._id)}
                    className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider transition ${b.isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-500"}`}
                  >
                    {b.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingBook({ ...b })}
                      className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-ink transition hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(b._id, b.title)}
                      className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Book Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setEditingBook(null)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-ink">{editingBook._id ? "Edit Sacred Book" : "Add New Sacred Book"}</h2>
                <p className="text-xs text-muted">Configure title, pricing, quantity limits and visibility.</p>
              </div>
              <button onClick={() => setEditingBook(null)} className="rounded-full p-2 text-muted hover:bg-soft hover:text-ink"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Details */}
              <div className="rounded-2xl border border-black/5 bg-soft/30 p-5">
                <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-primary">Basic Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Book Title *</label>
                    <input
                      required
                      value={editingBook.title}
                      onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                      placeholder="e.g. Bhagavad Gita"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>URL Slug (Auto-generated if blank)</label>
                    <input
                      value={editingBook.slug}
                      onChange={(e) => setEditingBook({ ...editingBook, slug: e.target.value })}
                      placeholder="e.g. bhagavad-gita"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Subtitle</label>
                    <input
                      value={editingBook.subtitle}
                      onChange={(e) => setEditingBook({ ...editingBook, subtitle: e.target.value })}
                      placeholder="e.g. As It Is — The Ultimate Guide"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Short Description (Shown on card)</label>
                    <textarea
                      rows={2}
                      value={editingBook.shortDescription}
                      onChange={(e) => setEditingBook({ ...editingBook, shortDescription: e.target.value })}
                      placeholder="Concise overview shown in cards..."
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Full Description</label>
                    <textarea
                      rows={4}
                      value={editingBook.fullDescription}
                      onChange={(e) => setEditingBook({ ...editingBook, fullDescription: e.target.value })}
                      placeholder="Detailed overview for the book detail page..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Author / Translator</label>
                    <input
                      value={editingBook.authorOrTranslator || ""}
                      onChange={(e) => setEditingBook({ ...editingBook, authorOrTranslator: e.target.value })}
                      placeholder="e.g. Srila Prabhupada"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Language</label>
                    <input
                      value={editingBook.language || ""}
                      onChange={(e) => setEditingBook({ ...editingBook, language: e.target.value })}
                      placeholder="e.g. Hindi & English"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Binding</label>
                    <input
                      value={editingBook.binding || ""}
                      onChange={(e) => setEditingBook({ ...editingBook, binding: e.target.value })}
                      placeholder="e.g. Hardcover / Paperback"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Publisher</label>
                    <input
                      value={editingBook.publisher || ""}
                      onChange={(e) => setEditingBook({ ...editingBook, publisher: e.target.value })}
                      placeholder="e.g. Bhaktivedanta Book Trust"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Cover & Gallery Images */}
              <div className="rounded-2xl border border-black/5 bg-soft/30 p-5">
                <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-primary">Cover & Media</h3>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-white">
                    {editingBook.coverImage ? (
                      <img src={assetUrl(editingBook.coverImage)} alt="Cover preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-muted"><ImageIcon size={20} /></div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className={labelClass}>Cover Image URL or File Upload</label>
                    <input
                      value={editingBook.coverImage}
                      onChange={(e) => setEditingBook({ ...editingBook, coverImage: e.target.value })}
                      placeholder="Paste image URL or upload..."
                      className={inputClass}
                    />
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-ink transition hover:bg-soft">
                      <Upload size={14} />
                      {uploadingCover ? "Uploading..." : "Upload Cover Image"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverUpload(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Pricing & GST */}
              <div className="rounded-2xl border border-black/5 bg-soft/30 p-5">
                <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-primary">Pricing & GST</h3>
                <p className="mb-4 text-xs text-muted">
                  GST depends on your organisation and the type of transaction. Confirm the correct percentage with your accountant. Set 0 if no GST applies.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Price Per Book (INR) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="1"
                      value={editingBook.pricePerBook}
                      onChange={(e) => setEditingBook({ ...editingBook, pricePerBook: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>MRP (Strike-through, Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingBook.mrp || ""}
                      onChange={(e) => setEditingBook({ ...editingBook, mrp: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Distribution Price (If different)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingBook.distributionPricePerBook || ""}
                      onChange={(e) => setEditingBook({ ...editingBook, distributionPricePerBook: e.target.value })}
                      placeholder="Same as standard price"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>GST Percentage (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editingBook.gstPercent}
                      onChange={(e) => setEditingBook({ ...editingBook, gstPercent: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center">
                    <div className="rounded-xl bg-white border border-black/5 p-3 w-full text-xs">
                      <span className="font-bold text-ink">Pricing Example: </span>
                      <span className="text-muted">
                        10 books = {money((Number(editingBook.pricePerBook) || 0) * 10)}
                        {editingBook.gstPercent > 0 ? ` + ${editingBook.gstPercent}% GST (${money(((Number(editingBook.pricePerBook) || 0) * 10 * Number(editingBook.gstPercent)) / 100)})` : " (0% GST)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions & Preset Chips */}
              <div className="rounded-2xl border border-black/5 bg-soft/30 p-5">
                <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-primary">Actions & Quantities</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-4 border border-black/5">
                    <label className="flex items-center gap-2 font-bold text-ink mb-3">
                      <input
                        type="checkbox"
                        checked={editingBook.allowBuy}
                        onChange={(e) => setEditingBook({ ...editingBook, allowBuy: e.target.checked })}
                        className="rounded accent-primary"
                      />
                      Allow "Buy This Book" (Delivery)
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className={labelClass}>Min Qty</span>
                        <input
                          type="number"
                          value={editingBook.minBuyQty}
                          onChange={(e) => setEditingBook({ ...editingBook, minBuyQty: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <span className={labelClass}>Max Qty</span>
                        <input
                          type="number"
                          value={editingBook.maxBuyQty}
                          onChange={(e) => setEditingBook({ ...editingBook, maxBuyQty: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-4 border border-black/5">
                    <label className="flex items-center gap-2 font-bold text-ink mb-3">
                      <input
                        type="checkbox"
                        checked={editingBook.allowDistribute}
                        onChange={(e) => setEditingBook({ ...editingBook, allowDistribute: e.target.checked })}
                        className="rounded accent-primary"
                      />
                      Allow "Distribute This Book" (Seva)
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className={labelClass}>Min Qty</span>
                        <input
                          type="number"
                          value={editingBook.minDistributeQty}
                          onChange={(e) => setEditingBook({ ...editingBook, minDistributeQty: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <span className={labelClass}>Max Qty</span>
                        <input
                          type="number"
                          value={editingBook.maxDistributeQty}
                          onChange={(e) => setEditingBook({ ...editingBook, maxDistributeQty: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Distribution Preset Chips</label>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {(editingBook.distributionPresets || []).map((preset) => (
                        <span key={preset} className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-xs font-bold text-ink border border-black/10">
                          {preset}
                          <button type="button" onClick={() => removePreset(preset)} className="text-muted hover:text-rose-600"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 max-w-xs">
                      <input
                        type="number"
                        placeholder="Add preset (e.g. 1000)"
                        value={newPreset}
                        onChange={(e) => setNewPreset(e.target.value)}
                        className={inputClass}
                      />
                      <button type="button" onClick={addPreset} className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white">Add</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock & Display Order */}
              <div className="rounded-2xl border border-black/5 bg-soft/30 p-5">
                <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-primary">Inventory & Visibility</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="trackStock"
                      checked={editingBook.trackStock}
                      onChange={(e) => setEditingBook({ ...editingBook, trackStock: e.target.checked })}
                      className="rounded accent-primary"
                    />
                    <label htmlFor="trackStock" className="text-sm font-bold text-ink">Track Stock for Buy</label>
                  </div>
                  {editingBook.trackStock && (
                    <div>
                      <label className={labelClass}>Stock Quantity</label>
                      <input
                        type="number"
                        min="0"
                        value={editingBook.stockQuantity}
                        onChange={(e) => setEditingBook({ ...editingBook, stockQuantity: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  )}
                  <div>
                    <label className={labelClass}>Display Order</label>
                    <input
                      type="number"
                      value={editingBook.displayOrder}
                      onChange={(e) => setEditingBook({ ...editingBook, displayOrder: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="rounded-full border border-black/10 px-6 py-2.5 text-sm font-bold text-ink hover:bg-soft"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingBook._id ? "Update Book" : "Create Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   2. ADMIN BOOK ORDERS LIST & REVIEW DRAWER
   ============================================================ */
export const AdminBookOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [completing, setCompleting] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const [ordersRes, summaryRes] = await Promise.all([
        apiFetch(`/admin/book-orders?${params.toString()}`),
        apiFetch("/admin/book-orders/summary")
      ]);

      setOrders(ordersRes.items || []);
      setSummary(summaryRes.summary || null);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, typeFilter]);

  const approve = async (id) => {
    if (!confirm("Confirm payment verification and approve this order?")) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/book-orders/${id}/approve`, { method: "POST" });
      setNotice("Payment verified and order approved.");
      setSelectedOrder(null);
      loadData();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/book-orders/${selectedOrder._id}/reject`, {
        method: "POST",
        body: { reason: rejectReason }
      });
      setNotice("Order marked as rejected. Devotee notified.");
      setRejecting(false);
      setRejectReason("");
      setSelectedOrder(null);
      loadData();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    try {
      await apiFetch(`/admin/book-orders/${selectedOrder._id}/complete`, {
        method: "POST",
        body: { trackingInfo: trackingNumber }
      });
      setNotice("Order marked as completed.");
      setCompleting(false);
      setTrackingNumber("");
      setSelectedOrder(null);
      loadData();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    try {
      await apiFetch(`/admin/book-orders/${selectedOrder._id}/note`, {
        method: "POST",
        body: { note: adminNote }
      });
      setNotice("Admin note saved.");
    } catch (err) {
      setNotice(err.message);
    }
  };

  const cancelOrder = async (id) => {
    const note = prompt("Reason for cancelling this order:");
    if (note === null) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/book-orders/${id}/cancel`, {
        method: "POST",
        body: { note }
      });
      setNotice("Order cancelled.");
      setSelectedOrder(null);
      loadData();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SEO title="Book Orders - Admin" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-ink">Book Orders</h1>
          <p className="mt-1 text-sm text-muted">
            Verify manual UPI and bank transfers, approve book shipments, and track sponsored distribution seva.
          </p>
        </div>
        <a
          href="/api/admin/book-orders/export"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-sm transition hover:bg-soft"
        >
          <Download size={16} /> Export Orders CSV
        </a>
      </div>

      {notice && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}><X size={16} /></button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Needs Verification</p>
            <p className="mt-1 text-2xl font-black text-amber-900">{summary.pendingVerifications}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted">Orders Today</p>
            <p className="mt-1 text-2xl font-black text-ink">{summary.ordersToday}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted">Bought (Copies)</p>
            <p className="mt-1 text-2xl font-black text-ink">{summary.totalCopiesBuy}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted">Sponsored (Copies)</p>
            <p className="mt-1 text-2xl font-black text-purple-700">{summary.totalCopiesDistribute}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Verified Amount</p>
            <p className="mt-1 text-2xl font-black text-emerald-900">{money(summary.totalVerifiedAmount)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, devotee, phone, UTR..."
            className="w-full rounded-xl border border-black/10 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="PAYMENT_SUBMITTED">Needs Verification</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
          <option value="APPROVED">Approved</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold outline-none"
        >
          <option value="all">All Types</option>
          <option value="BUY">Buy (Delivery)</option>
          <option value="DISTRIBUTE">Distribute (Seva)</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3">Order Number</th>
              <th className="px-4 py-3">Devotee</th>
              <th className="px-4 py-3">Book</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Total Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="8" className="px-4 py-12 text-center text-muted">Loading book orders...</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan="8" className="px-4 py-12 text-center text-muted">No orders match the current filter.</td></tr>
            )}
            {!loading && orders.map((o) => (
              <tr key={o._id} className="border-t border-black/5 transition hover:bg-soft/30">
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs font-bold text-primary">{o.orderNumber}</span>
                  <span className="block text-[11px] text-muted">
                    {new Date(o.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-bold text-ink">{o.contactName}</p>
                  <p className="text-xs text-muted">{o.contactPhone}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-semibold text-ink">{o.bookTitleSnapshot || o.book?.title}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${o.orderType === "BUY" ? "bg-amber-100 text-amber-800" : "bg-purple-100 text-purple-800"}`}>
                    {o.orderType}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-bold text-ink">
                  {o.quantity} {o.quantity === 1 ? "copy" : "copies"}
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-black text-ink">{money(o.totalAmount)}</p>
                  {o.gstAmount > 0 && <p className="text-[10px] text-muted">incl. {money(o.gstAmount)} GST</p>}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[o.status] || ""}`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() => { setSelectedOrder(o); setAdminNote(o.adminNotes || ""); }}
                    className="rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-bold text-ink transition hover:border-primary hover:text-primary"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-ink">{selectedOrder.orderNumber}</h2>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${STATUS_STYLES[selectedOrder.status]}`}>
                    {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Submitted on {new Date(selectedOrder.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="rounded-full p-2 text-muted hover:bg-soft hover:text-ink"><X size={18} /></button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Order & Devotee Details */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-black/5 bg-soft/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted">Devotee Information</p>
                  <p className="mt-1 font-bold text-ink">{selectedOrder.contactName}</p>
                  <p className="text-xs text-muted">{selectedOrder.contactPhone} · {selectedOrder.contactEmail}</p>
                </div>

                <div className="rounded-2xl border border-black/5 bg-soft/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted">Book & Order Type</p>
                  <p className="mt-1 font-bold text-ink">{selectedOrder.bookTitleSnapshot || selectedOrder.book?.title}</p>
                  <p className="text-xs text-muted">
                    {selectedOrder.quantity} copies × {money(selectedOrder.unitPriceSnapshot)} ({selectedOrder.orderType === "BUY" ? "Delivery" : "Sponsored Seva"})
                  </p>
                </div>

                {selectedOrder.orderType === "BUY" && selectedOrder.deliveryAddress && (
                  <div className="rounded-2xl border border-black/5 bg-soft/30 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">Delivery Address</p>
                    <p className="mt-1 text-xs text-ink">
                      {selectedOrder.deliveryAddress.line1}
                      {selectedOrder.deliveryAddress.line2 ? `, ${selectedOrder.deliveryAddress.line2}` : ""}
                    </p>
                    <p className="text-xs text-ink font-semibold">
                      {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} - {selectedOrder.deliveryAddress.pincode}
                    </p>
                    {selectedOrder.deliveryAddress.landmark && (
                      <p className="text-[11px] text-muted">Landmark: {selectedOrder.deliveryAddress.landmark}</p>
                    )}
                  </div>
                )}

                {selectedOrder.orderType === "DISTRIBUTE" && (
                  <div className="rounded-2xl border border-black/5 bg-soft/30 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">Sponsorship Dedication</p>
                    {selectedOrder.dedicationName ? (
                      <p className="mt-1 text-xs font-bold text-ink">In the name of: {selectedOrder.dedicationName}</p>
                    ) : (
                      <p className="mt-1 text-xs text-muted">Anonymous Seva</p>
                    )}
                    {selectedOrder.dedicationMessage && (
                      <p className="mt-1 text-xs italic text-muted">"{selectedOrder.dedicationMessage}"</p>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-black/5 bg-soft/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted">Financial Breakdown</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-muted">
                      <span>Subtotal ({selectedOrder.quantity} copies):</span>
                      <span className="font-semibold text-ink">{money(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.gstAmount > 0 && (
                      <div className="flex justify-between text-muted">
                        <span>GST ({selectedOrder.gstPercentSnapshot}%):</span>
                        <span className="font-semibold text-ink">{money(selectedOrder.gstAmount)}</span>
                      </div>
                    )}
                    {selectedOrder.shippingFee > 0 && (
                      <div className="flex justify-between text-muted">
                        <span>Shipping Fee:</span>
                        <span className="font-semibold text-ink">{money(selectedOrder.shippingFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-black/10 pt-2 text-sm font-black text-primary">
                      <span>Total to Verify:</span>
                      <span>{money(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Internal Admin Notes */}
                <div className="rounded-2xl border border-black/5 p-4">
                  <label className={labelClass}>Internal Admin Notes</label>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Staff notes (private to admin)..."
                    className={inputClass}
                  />
                  <button
                    onClick={saveNote}
                    className="mt-2 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-black"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Right Column: Payment Proof Screenshot & Actions */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-black/5 bg-soft/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted mb-2">Payment Verification Proof</p>
                  {selectedOrder.payerName && (
                    <p className="text-xs text-muted mb-1">Payer Account Name: <span className="font-bold text-ink">{selectedOrder.payerName}</span></p>
                  )}
                  {selectedOrder.transactionReference && (
                    <p className="text-xs text-muted mb-2">UTR / Reference #: <span className="font-mono font-bold text-primary">{selectedOrder.transactionReference}</span></p>
                  )}

                  {selectedOrder.paymentPhotoUrl ? (
                    <a
                      href={assetUrl(selectedOrder.paymentPhotoUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block overflow-hidden rounded-xl border border-black/10 bg-white"
                    >
                      <img
                        src={assetUrl(selectedOrder.paymentPhotoUrl)}
                        alt="Payment Receipt"
                        className="max-h-80 w-full object-contain p-2 transition group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-lg">Open Original Screenshot</span>
                      </div>
                    </a>
                  ) : (
                    <div className="grid h-48 place-items-center rounded-xl border border-dashed border-black/15 bg-white text-muted text-xs">
                      No screenshot receipt uploaded yet.
                    </div>
                  )}

                  {selectedOrder.rejectionReason && (
                    <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
                      <span className="font-bold">Rejection Reason:</span> {selectedOrder.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Workflow Action Bar */}
                <div className="rounded-2xl border border-black/5 p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted">Admin Actions</p>
                  
                  {selectedOrder.status === "PAYMENT_SUBMITTED" && (
                    <div className="flex flex-col gap-2">
                      <button
                        disabled={busy}
                        onClick={() => approve(selectedOrder._id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} /> Approve & Verify Payment
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setRejecting(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Reject Payment Proof
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === "APPROVED" && (
                    <button
                      disabled={busy}
                      onClick={() => setCompleting(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      {selectedOrder.orderType === "BUY" ? "Dispatch & Mark Completed" : "Mark Seva Completed"}
                    </button>
                  )}

                  {["PENDING_PAYMENT", "PAYMENT_SUBMITTED", "APPROVED"].includes(selectedOrder.status) && (
                    <button
                      onClick={() => cancelOrder(selectedOrder._id)}
                      className="text-xs font-bold text-muted hover:text-rose-600 transition pt-1"
                    >
                      Cancel this order
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Reject Modal */}
            {rejecting && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                  <h3 className="text-lg font-black text-ink">Reject Payment Proof?</h3>
                  <p className="mt-1 text-xs text-muted">The devotee will be notified and asked to re-upload.</p>
                  <div className="my-3 flex flex-wrap gap-1.5">
                    {["Amount mismatch", "Screenshot unclear / blurry", "Duplicate transaction reference", "Payment not received in account"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRejectReason(s)}
                        className="rounded-full bg-soft px-3 py-1 text-[11px] font-semibold text-ink border border-black/10 hover:bg-black/5"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    className={inputClass}
                  />
                  <div className="mt-4 flex gap-3">
                    <button
                      disabled={!rejectReason.trim() || busy}
                      onClick={reject}
                      className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => { setRejecting(false); setRejectReason(""); }}
                      className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-bold text-ink"
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Complete Modal (Tracking info) */}
            {completing && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                  <h3 className="text-lg font-black text-ink">
                    {selectedOrder.orderType === "BUY" ? "Dispatch Order" : "Complete Seva"}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {selectedOrder.orderType === "BUY"
                      ? "Enter courier tracking info to notify devotee of shipment."
                      : "Confirm that sponsored copies have been distributed."}
                  </p>
                  {selectedOrder.orderType === "BUY" && (
                    <div className="mt-4">
                      <label className={labelClass}>Courier Tracking Info (Optional)</label>
                      <input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. BlueDart / DTDC Tracking #12345678"
                        className={inputClass}
                      />
                    </div>
                  )}
                  <div className="mt-5 flex gap-3">
                    <button
                      disabled={busy}
                      onClick={complete}
                      className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-bold text-white hover:bg-purple-700"
                    >
                      Confirm Completion
                    </button>
                    <button
                      onClick={() => { setCompleting(false); setTrackingNumber(""); }}
                      className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-bold text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   3. ADMIN BOOK PAYMENT SETTINGS PAGE
   ============================================================ */
export const AdminBookPaymentSettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    apiFetch("/admin/book-payment-settings")
      .then((data) => setSettings(data.settings))
      .catch((err) => setNotice(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      await apiFetch("/admin/book-payment-settings", {
        method: "PUT",
        body: settings
      });
      setNotice("Payment settings updated successfully.");
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQrUpload = async (file) => {
    if (!file) return;
    setUploadingQr(true);
    try {
      const res = await uploadFile(file, "books");
      setSettings((prev) => ({ ...prev, qrCodeImage: res.url }));
    } catch (err) {
      setNotice("QR upload failed: " + err.message);
    } finally {
      setUploadingQr(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted">Loading book payment settings...</div>;
  }

  const isConfigured = Boolean(settings?.upiId || settings?.bankAccountNumber);

  return (
    <div>
      <SEO title="Book Payment Settings - Admin" />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-ink">Book Payment Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Configure UPI receiving ID, QR code image, bank transfer details, default GST, and shipping charges for books.
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Payment Details Missing</p>
            <p className="mt-0.5 text-xs">Payment details are not configured. Users will be unable to complete book orders until UPI or Bank details are added.</p>
          </div>
        </div>
      )}

      {notice && (
        <div className="mb-6 rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
          {notice}
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Trip settings fallback toggle */}
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.useTripPaymentDetails}
                onChange={(e) => setSettings({ ...settings, useTripPaymentDetails: e.target.checked })}
                className="h-4 w-4 rounded accent-primary"
              />
              <div>
                <span className="font-bold text-ink text-sm">Use the same payment details as Trips/Courses</span>
                <p className="text-xs text-muted">If enabled, blank fields will automatically inherit UPI and Bank details from active pilgrimage journeys.</p>
              </div>
            </label>
          </div>

          {/* UPI & QR Code */}
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-primary">UPI & QR Code</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>UPI ID (VPA)</label>
                <input
                  value={settings.upiId || ""}
                  onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                  placeholder="e.g. iskconjuhu@sbi"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payee Name (Shown in UPI apps)</label>
                <input
                  value={settings.upiPayeeName || ""}
                  onChange={(e) => setSettings({ ...settings, upiPayeeName: e.target.value })}
                  placeholder="e.g. ISKCON Juhu"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>QR Code Image</label>
                <div className="flex items-center gap-4">
                  {settings.qrCodeImage && (
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-soft p-1">
                      <img src={assetUrl(settings.qrCodeImage)} alt="QR Code" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      value={settings.qrCodeImage || ""}
                      onChange={(e) => setSettings({ ...settings, qrCodeImage: e.target.value })}
                      placeholder="Paste QR image URL or upload below..."
                      className={inputClass}
                    />
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-soft">
                      <Upload size={14} />
                      {uploadingQr ? "Uploading..." : "Upload QR Code Image"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQrUpload(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-primary">Bank Transfer Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Account Holder Name</label>
                <input
                  value={settings.bankAccountHolder || ""}
                  onChange={(e) => setSettings({ ...settings, bankAccountHolder: e.target.value })}
                  placeholder="e.g. ISKCON Juhu"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Account Number</label>
                <input
                  value={settings.bankAccountNumber || ""}
                  onChange={(e) => setSettings({ ...settings, bankAccountNumber: e.target.value })}
                  placeholder="e.g. 1029384756"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>IFSC Code</label>
                <input
                  value={settings.bankIfsc || ""}
                  onChange={(e) => setSettings({ ...settings, bankIfsc: e.target.value })}
                  placeholder="e.g. SBIN0001234"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Bank Name</label>
                <input
                  value={settings.bankName || ""}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Branch</label>
                <input
                  value={settings.bankBranch || ""}
                  onChange={(e) => setSettings({ ...settings, bankBranch: e.target.value })}
                  placeholder="e.g. Juhu Vile Parle Branch"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Taxes & Shipping Fees */}
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-primary">Default GST & Shipping Fees</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Default GST Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settings.defaultGstPercent || 0}
                  onChange={(e) => setSettings({ ...settings, defaultGstPercent: Number(e.target.value) })}
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-muted">Applied to books where specific GST is not overridden.</p>
              </div>

              <div>
                <label className={labelClass}>Flat Shipping Fee for Buy Orders (INR)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="shippingFeeEnabled"
                    checked={settings.shippingFeeEnabled}
                    onChange={(e) => setSettings({ ...settings, shippingFeeEnabled: e.target.checked })}
                    className="rounded accent-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={!settings.shippingFeeEnabled}
                    value={settings.shippingFeeAmount || 0}
                    onChange={(e) => setSettings({ ...settings, shippingFeeAmount: Number(e.target.value) })}
                    className={`${inputClass} ${!settings.shippingFeeEnabled ? "opacity-40" : ""}`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Payment Support Phone</label>
                <input
                  value={settings.contactPhone || ""}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  placeholder="e.g. +91 90000 00001"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payment Support Email</label>
                <input
                  value={settings.contactEmail || ""}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  placeholder="e.g. books@iskconjuhu.com"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Extra Payment Instructions</label>
                <textarea
                  rows={2}
                  value={settings.extraInstructions || ""}
                  onChange={(e) => setSettings({ ...settings, extraInstructions: e.target.value })}
                  placeholder="e.g. Please mention your name in the payment description."
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Payment Settings
          </button>
        </div>

        {/* Live Preview Panel */}
        <div>
          <div className="sticky top-24 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-3">Devotee Payment Preview</h3>
            <div className="rounded-2xl border border-black/10 bg-soft/50 p-4 text-center">
              <p className="text-xs font-bold text-muted uppercase">Sample Pay Total: ₹1,500</p>
              {settings.qrCodeImage ? (
                <div className="mx-auto my-3 h-32 w-32 rounded-xl bg-white p-2 border border-black/10">
                  <img src={assetUrl(settings.qrCodeImage)} alt="QR" className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="mx-auto my-3 grid h-32 w-32 place-items-center rounded-xl bg-white border border-dashed border-black/20 text-muted">
                  <QrCode size={36} />
                </div>
              )}
              <div className="rounded-xl bg-white p-2.5 border border-black/5 text-xs text-left space-y-1">
                <p><span className="text-muted">UPI ID: </span><span className="font-bold text-ink">{settings.upiId || "Not set"}</span></p>
                <p><span className="text-muted">Payee: </span><span className="font-bold text-ink">{settings.upiPayeeName || "ISKCON Juhu"}</span></p>
                {settings.bankAccountNumber && (
                  <>
                    <p><span className="text-muted">Bank: </span><span className="font-bold text-ink">{settings.bankName}</span></p>
                    <p><span className="text-muted">A/C: </span><span className="font-bold text-ink">{settings.bankAccountNumber}</span></p>
                    <p><span className="text-muted">IFSC: </span><span className="font-bold text-ink">{settings.bankIfsc}</span></p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
