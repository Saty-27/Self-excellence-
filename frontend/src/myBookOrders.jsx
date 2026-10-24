import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Printer,
  RefreshCw,
  ShoppingBag,
  Heart,
  Truck,
  Upload,
  X,
  AlertCircle,
  Loader2
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
  PENDING_PAYMENT: "Payment Pending",
  PAYMENT_SUBMITTED: "Verification Pending",
  APPROVED: "Approved",
  REJECTED: "Payment Rejected",
  COMPLETED: "Completed / Dispatched",
  CANCELLED: "Cancelled"
};

export const MyBookOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reuploading, setReuploading] = useState(false);
  const [newProofUrl, setNewProofUrl] = useState("");
  const [newUtr, setNewUtr] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/book-orders/mine");
      setOrders(data.items || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile(file, "books-payments");
      setNewProofUrl(res.url);
    } catch (err) {
      setNotice(err.message || "Failed to upload receipt.");
    } finally {
      setBusy(false);
    }
  };

  const handleReuploadSubmit = async () => {
    if (!newProofUrl) {
      setNotice("Please upload a new payment receipt before submitting.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`/book-orders/${selectedOrder._id}/payment`, {
        method: "POST",
        body: {
          paymentPhotoUrl: newProofUrl,
          transactionReference: newUtr
        }
      });
      setNotice("New payment proof submitted successfully. Our team will verify it shortly.");
      setReuploading(false);
      setNewProofUrl("");
      setNewUtr("");
      setSelectedOrder(res.order);
      loadOrders();
    } catch (err) {
      setNotice(err.message || "Failed to update payment proof.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#FFFDF9] min-h-screen py-10 md:py-16">
      <SEO title="My Book Orders — ISKCON Juhu Self-Excellence" />

      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink">My Book Orders</h1>
          <p className="mt-1 text-sm text-muted">
            Track your personal book purchases, view shipment status, and check your sponsored distribution seva history.
          </p>
        </div>

        {notice && (
          <div className="mb-6 rounded-xl bg-primary/10 px-4 py-3 text-xs font-bold text-primary flex justify-between items-center">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}><X size={16} /></button>
          </div>
        )}

        {/* Orders Table */}
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink text-white">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-muted">Loading your book orders...</td></tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-muted">
                    <p className="font-bold text-ink mb-1">No book orders yet</p>
                    <p className="text-xs">Browse our sacred books to order a copy or sponsor distribution seva.</p>
                    <Link to="/books" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-xs font-bold text-white">
                      Explore Sacred Books
                    </Link>
                  </td>
                </tr>
              )}
              {!loading && orders.map((o) => (
                <tr key={o._id} className="border-t border-black/5 hover:bg-soft/30 transition">
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-bold text-primary">{o.orderNumber}</span>
                    <span className="block text-[11px] text-muted">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-ink">
                    {o.bookTitleSnapshot || o.book?.title}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${o.orderType === "BUY" ? "bg-amber-100 text-amber-800" : "bg-purple-100 text-purple-800"}`}>
                      {o.orderType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-ink">
                    {o.quantity} {o.quantity === 1 ? "copy" : "copies"}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-ink">
                    {money(o.totalAmount)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[o.status] || ""}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="rounded-full border border-black/10 px-3.5 py-1 text-xs font-bold text-ink hover:border-primary hover:text-primary transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order Details Drawer / Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => { setSelectedOrder(null); setReuploading(false); }}>
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl print:shadow-none print:max-h-none print:w-full" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-ink">{selectedOrder.orderNumber}</h2>
                    <span className={`rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[selectedOrder.status]}`}>
                      {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrint} className="rounded-full p-2 text-muted hover:bg-soft hover:text-ink print:hidden" title="Print Receipt">
                    <Printer size={18} />
                  </button>
                  <button onClick={() => { setSelectedOrder(null); setReuploading(false); }} className="rounded-full p-2 text-muted hover:bg-soft hover:text-ink print:hidden">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Book & Type */}
                <div className="rounded-2xl border border-black/5 bg-soft/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted">Book & Order Details</p>
                  <p className="mt-1 font-display text-lg font-bold text-ink">{selectedOrder.bookTitleSnapshot || selectedOrder.book?.title}</p>
                  <p className="text-xs text-muted">
                    {selectedOrder.quantity} copies × {money(selectedOrder.unitPriceSnapshot)} ({selectedOrder.orderType === "BUY" ? "Personal Home Delivery" : "Sponsored Seva Distribution"})
                  </p>
                </div>

                {/* Delivery Address or Dedication */}
                {selectedOrder.orderType === "BUY" && selectedOrder.deliveryAddress && (
                  <div className="rounded-2xl border border-black/5 bg-soft/30 p-4 text-xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted mb-1">Delivery Address</p>
                    <p className="font-bold text-ink">{selectedOrder.contactName} · {selectedOrder.contactPhone}</p>
                    <p className="text-muted">{selectedOrder.deliveryAddress.line1}{selectedOrder.deliveryAddress.line2 ? `, ${selectedOrder.deliveryAddress.line2}` : ""}</p>
                    <p className="text-muted font-semibold">{selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} - {selectedOrder.deliveryAddress.pincode}</p>
                  </div>
                )}

                {selectedOrder.orderType === "DISTRIBUTE" && (
                  <div className="rounded-2xl border border-black/5 bg-soft/30 p-4 text-xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted mb-1">Seva Sponsorship Dedication</p>
                    <p className="font-bold text-ink">In the name of: {selectedOrder.dedicationName || "Anonymous Devotee"}</p>
                    {selectedOrder.dedicationMessage && <p className="italic text-muted mt-0.5">"{selectedOrder.dedicationMessage}"</p>}
                  </div>
                )}

                {/* Tracking info if dispatched */}
                {selectedOrder.trackingInfo && (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-purple-900">
                    <p className="font-bold flex items-center gap-1.5"><Truck size={14} /> Dispatch & Courier Tracking</p>
                    <p className="mt-1 font-mono font-semibold">{selectedOrder.trackingInfo}</p>
                  </div>
                )}

                {/* Rejection notice and Re-upload */}
                {selectedOrder.status === "REJECTED" && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-2">
                    <p className="font-bold flex items-center gap-1.5"><AlertCircle size={14} /> Payment Proof Not Verified</p>
                    <p>{selectedOrder.rejectionReason || "The receipt was unclear or amount could not be confirmed."}</p>
                    <p className="text-[11px] text-rose-700">Please upload a clear screenshot of your transaction receipt to re-submit.</p>
                    
                    {!reuploading ? (
                      <button
                        onClick={() => setReuploading(true)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-800"
                      >
                        <Upload size={14} /> Upload New Screenshot
                      </button>
                    ) : (
                      <div className="rounded-xl border border-rose-200 bg-white p-3 space-y-3 mt-3">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files[0])}
                        />
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs font-bold text-ink hover:bg-soft"
                        >
                          <Upload size={14} /> {newProofUrl ? "Replace File" : "Choose Screenshot"}
                        </button>
                        {newProofUrl && <p className="text-[11px] text-emerald-600 font-bold">New receipt attached</p>}
                        <input
                          value={newUtr}
                          onChange={(e) => setNewUtr(e.target.value)}
                          placeholder="Updated UTR / Reference (Optional)"
                          className="w-full rounded-lg border border-black/10 px-3 py-1.5 text-xs outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={!newProofUrl || busy}
                            onClick={handleReuploadSubmit}
                            className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {busy ? "Submitting..." : "Submit New Proof"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReuploading(false)}
                            className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount Summary */}
                <div className="rounded-2xl border border-black/10 bg-soft/40 p-4 text-xs space-y-1">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span className="font-bold text-ink">{money(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.gstAmount > 0 && (
                    <div className="flex justify-between text-muted">
                      <span>GST:</span>
                      <span className="font-bold text-ink">{money(selectedOrder.gstAmount)}</span>
                    </div>
                  )}
                  {selectedOrder.shippingFee > 0 && (
                    <div className="flex justify-between text-muted">
                      <span>Shipping:</span>
                      <span className="font-bold text-ink">{money(selectedOrder.shippingFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black/10 pt-2 text-sm font-black text-primary">
                    <span>Total Paid:</span>
                    <span>{money(selectedOrder.totalAmount)}</span>
                  </div>
                </div>

                {/* Receipt View */}
                {selectedOrder.paymentPhotoUrl && (
                  <div className="rounded-2xl border border-black/5 p-4 text-xs print:hidden">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted mb-2">Uploaded Payment Proof</p>
                    <a href={assetUrl(selectedOrder.paymentPhotoUrl)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-black/10 max-h-56">
                      <img src={assetUrl(selectedOrder.paymentPhotoUrl)} alt="Receipt" className="max-h-56 w-full object-contain bg-soft/40" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
