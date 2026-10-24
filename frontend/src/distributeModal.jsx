import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  Heart,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  X
} from "lucide-react";
import { apiFetch, assetUrl } from "./api";
import { useAuth } from "./AuthContext";
import { BookPaymentPanel } from "./bookPaymentPanel";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const DistributeModal = ({ book, open, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const minQty = book?.minDistributeQty || 10;
  const maxQty = book?.maxDistributeQty || 100000;
  const unitPrice = (typeof book?.distributionPricePerBook === "number" && book.distributionPricePerBook > 0)
    ? book.distributionPricePerBook
    : (book?.pricePerBook || 150);
  const gstPercent = book?.gstPercent || 0;

  const [quantity, setQuantity] = useState(minQty);
  const [dedicationName, setDedicationName] = useState("");
  const [dedicationMessage, setDedicationMessage] = useState("");
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [paymentPhotoUrl, setPaymentPhotoUrl] = useState("");
  const [payerName, setPayerName] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState(null);

  // Lock background scroll and handle Escape
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Load payment settings
  useEffect(() => {
    if (!open) return;
    apiFetch("/books/payment-info")
      .then((data) => setPaymentInfo(data.settings))
      .catch(() => {});
  }, [open]);

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return;
    setQuantity(minQty);
    setDedicationName("");
    setDedicationMessage("");
    setPaymentPhotoUrl("");
    setPayerName(user?.name || "");
    setTransactionReference("");
    setError("");
    setSuccessOrder(null);
  }, [open, minQty, user]);

  const updateQuantity = (newVal) => {
    const n = Math.max(minQty, Math.min(newVal, maxQty));
    setQuantity(n);
  };

  const handleInputChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setQuantity(minQty);
      return;
    }
    const val = parseInt(raw, 10);
    if (!isNaN(val)) updateQuantity(val);
  };

  // Immediate calculated totals
  const subtotal = quantity * unitPrice;
  const gstAmount = Math.round((subtotal * gstPercent) / 100);
  const totalAmount = subtotal + gstAmount;

  const presets = book?.distributionPresets?.length
    ? book.distributionPresets
    : [10, 50, 100, 250, 500, 600, 700, 1000];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      // Save state for redirect return
      sessionStorage.setItem("book_pending_action", JSON.stringify({
        action: "distribute",
        bookSlug: book.slug,
        quantity
      }));
      navigate("/login");
      return;
    }

    if (!paymentPhotoUrl) {
      setError("Please upload your payment screenshot proof before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Create order
      const orderRes = await apiFetch("/book-orders", {
        method: "POST",
        body: {
          bookId: book._id,
          orderType: "DISTRIBUTE",
          quantity,
          contactName: user.name,
          contactPhone: user.phone || user.mobile || "N/A",
          contactEmail: user.email,
          dedicationName,
          dedicationMessage
        }
      });

      const createdOrder = orderRes.order;

      // 2. Submit payment screenshot
      const paymentRes = await apiFetch(`/book-orders/${createdOrder._id}/payment`, {
        method: "POST",
        body: {
          paymentPhotoUrl,
          payerName,
          transactionReference
        }
      });

      setSuccessOrder(paymentRes.order || createdOrder);
    } catch (err) {
      setError(err.message || "Failed to submit distribution order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !book) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="distribute-modal-title"
        className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-fade-in"
      >
        {/* Success State */}
        {successOrder ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink">Thank You For Your Sacred Seva!</h2>
            <p className="text-sm text-muted max-w-sm mx-auto">
              Your distribution sponsorship of <span className="font-bold text-ink">{successOrder.quantity} copies</span> of{" "}
              <span className="font-bold text-ink">{book.title}</span> has been received.
            </p>
            <div className="rounded-2xl border border-black/10 bg-soft/40 p-4 max-w-sm mx-auto text-xs space-y-1">
              <p><span className="text-muted">Order Reference: </span><span className="font-mono font-bold text-primary">{successOrder.orderNumber}</span></p>
              <p><span className="text-muted">Amount Submitted: </span><span className="font-bold text-ink">{money(successOrder.totalAmount)}</span></p>
              <p><span className="text-muted">Status: </span><span className="font-semibold text-amber-700">Payment Verification Pending</span></p>
            </div>
            <p className="text-xs text-muted">Our temple desk will verify your payment screenshot shortly.</p>
            <div className="flex flex-col sm:flex-row gap-3 pt-3 justify-center">
              <Link
                to="/student/my-book-orders"
                onClick={onClose}
                className="rounded-full bg-primary px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-primary/90"
              >
                View My Book Orders
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-black/10 px-6 py-3 text-xs font-bold text-ink hover:bg-soft"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-black/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-soft">
                  {book.coverImage && (
                    <img src={assetUrl(book.coverImage)} alt={book.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-primary">
                    <Heart size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Book Distribution Seva</span>
                  </div>
                  <h2 id="distribute-modal-title" className="font-display text-xl font-bold text-ink leading-tight">
                    {book.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-2 text-muted hover:bg-soft hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
              {/* Counter Section */}
              <div className="rounded-2xl border border-black/5 bg-soft/30 p-5 text-center">
                <p className="text-xs font-black uppercase tracking-wider text-muted mb-3">
                  Select Number of Copies to Sponsor
                </p>
                <div className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white p-1.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => updateQuantity(quantity - 10)}
                    disabled={quantity <= minQty}
                    className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-soft disabled:opacity-30 transition"
                  >
                    <Minus size={18} />
                  </button>
                  <input
                    type="text"
                    value={quantity}
                    onChange={handleInputChange}
                    className="w-24 text-center font-display text-2xl font-bold text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(quantity + 10)}
                    disabled={quantity >= maxQty}
                    className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-soft disabled:opacity-30 transition"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateQuantity(preset)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${quantity === preset ? "bg-primary text-white shadow-sm" : "bg-white text-ink border border-black/10 hover:bg-soft"}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Price Summary */}
              <div className="rounded-2xl border border-black/10 bg-soft/50 p-4">
                <div className="flex items-center justify-between text-xs text-muted mb-1">
                  <span>{quantity} copies × {money(unitPrice)} per book</span>
                  <span className="font-bold text-ink">{money(subtotal)}</span>
                </div>
                {gstPercent > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted mb-1">
                    <span>GST ({gstPercent}%)</span>
                    <span className="font-bold text-ink">{money(gstAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-black/10 pt-2 text-base font-black">
                  <span className="text-ink">Total Sponsorship Amount</span>
                  <span className="font-display text-xl text-primary">{money(totalAmount)}</span>
                </div>
              </div>

              {/* Optional Dedication */}
              <div className="space-y-3 rounded-2xl border border-black/5 bg-soft/20 p-4">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted">
                  <Sparkles size={14} className="text-primary" />
                  <span>Sponsorship Dedication (Optional)</span>
                </div>
                <div>
                  <input
                    value={dedicationName}
                    onChange={(e) => setDedicationName(e.target.value)}
                    placeholder="Dedicate this seva in the name of (e.g. In memory of / On behalf of...)"
                    className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={dedicationMessage}
                    onChange={(e) => setDedicationMessage(e.target.value)}
                    placeholder="Optional short prayer or dedication message (max 300 chars)..."
                    className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Shared Payment Panel */}
              <BookPaymentPanel
                paymentInfo={paymentInfo}
                totalAmount={totalAmount}
                paymentPhotoUrl={paymentPhotoUrl}
                setPaymentPhotoUrl={setPaymentPhotoUrl}
                payerName={payerName}
                setPayerName={setPayerName}
                transactionReference={transactionReference}
                setTransactionReference={setTransactionReference}
                error={error}
                setError={setError}
              />

              {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting || !paymentPhotoUrl}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Submitting Sponsorship Proof...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} /> Submit Distribution Payment Proof
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
