import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
  X
} from "lucide-react";
import { apiFetch, assetUrl } from "./api";
import { useAuth } from "./AuthContext";
import { BookPaymentPanel } from "./bookPaymentPanel";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const STEPS = [
  { n: 1, label: "Delivery Address" },
  { n: 2, label: "Order Summary" },
  { n: 3, label: "Payment Proof" },
  { n: 4, label: "Confirmation" }
];

export const BuyModal = ({ book, open, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const minQty = book?.minBuyQty || 1;
  const maxQty = book?.maxBuyQty || 100;
  const pricePerBook = book?.pricePerBook || 150;
  const gstPercent = book?.gstPercent || 0;

  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState(minQty);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: ""
  });
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [paymentPhotoUrl, setPaymentPhotoUrl] = useState("");
  const [payerName, setPayerName] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Background lock and Escape
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

  // Prefill user data
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setQuantity(minQty);
    setError("");
    setPaymentPhotoUrl("");
    setConfirmedOrder(null);
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || user.mobile || ""
      }));
      setPayerName(user.name || "");
    }
  }, [open, minQty, user]);

  const updateQuantity = (newVal) => {
    const n = Math.max(minQty, Math.min(newVal, maxQty));
    setQuantity(n);
  };

  const subtotal = quantity * pricePerBook;
  const gstAmount = Math.round((subtotal * gstPercent) / 100);
  const shippingFee = paymentInfo?.shippingFeeEnabled ? (paymentInfo.shippingFeeAmount || 0) : 0;
  const totalAmount = subtotal + gstAmount + shippingFee;

  const validateStep1 = () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      return "Please provide your full name, email and phone number.";
    }
    if (!form.line1.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      return "Please fill in all required delivery address fields (line 1, city, state, pincode).";
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      return "Pincode must be a 6-digit Indian postal code.";
    }
    return "";
  };

  const nextStep = () => {
    setError("");
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      sessionStorage.setItem("book_pending_action", JSON.stringify({
        action: "buy",
        bookSlug: book.slug,
        quantity,
        form
      }));
      navigate("/login");
      return;
    }

    if (!paymentPhotoUrl) {
      setError("Please upload your payment screenshot proof before completing the order.");
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
          orderType: "BUY",
          quantity,
          contactName: form.fullName,
          contactPhone: form.phone,
          contactEmail: form.email,
          deliveryAddress: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            landmark: form.landmark
          }
        }
      });

      const createdOrder = orderRes.order;

      // 2. Submit payment proof
      const paymentRes = await apiFetch(`/book-orders/${createdOrder._id}/payment`, {
        method: "POST",
        body: {
          paymentPhotoUrl,
          payerName,
          transactionReference
        }
      });

      setConfirmedOrder(paymentRes.order || createdOrder);
      setStep(4);
    } catch (err) {
      setError(err.message || "Failed to create buy order.");
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
        aria-labelledby="buy-modal-title"
        className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-fade-in"
      >
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
                <Truck size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Book Order & Delivery</span>
              </div>
              <h2 id="buy-modal-title" className="font-display text-xl font-bold text-ink leading-tight">
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

        {/* Stepper Dots */}
        {step < 4 && (
          <div className="my-5 flex items-center justify-between border-b border-black/5 pb-3">
            {STEPS.slice(0, 3).map((s) => (
              <div key={s.n} className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition ${
                    step === s.n
                      ? "bg-primary text-white"
                      : step > s.n
                      ? "bg-emerald-600 text-white"
                      : "bg-black/10 text-muted"
                  }`}
                >
                  {step > s.n ? "✓" : s.n}
                </span>
                <span className={`text-xs font-bold ${step === s.n ? "text-ink" : "text-muted"}`}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Details & Address */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-soft/40 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted">Select Copies</p>
                <p className="font-bold text-ink">{money(pricePerBook)} per copy</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white p-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(quantity - 1)}
                  disabled={quantity <= minQty}
                  className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-soft disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold text-ink">{quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(quantity + 1)}
                  disabled={quantity >= maxQty}
                  className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-soft disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted">Devotee Contact</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Full Name *"
                  className="rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                />
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone / Mobile *"
                  className="rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email Address *"
                  className="sm:col-span-2 rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs font-black uppercase tracking-wider text-muted">Postal Delivery Address</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  required
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  placeholder="Flat / House / Street Address *"
                  className="sm:col-span-2 rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                />
                <input
                  value={form.line2}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  placeholder="Area / Sector / Apartment (Optional)"
                  className="sm:col-span-2 rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                />
                <input
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City / Town *"
                  className="rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                />
                <input
                  required
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="State *"
                  className="rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                />
                <input
                  required
                  maxLength={6}
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })}
                  placeholder="6-digit Pincode *"
                  className="rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                />
                <input
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  placeholder="Landmark (Optional)"
                  className="rounded-xl border border-black/10 px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {error && <p className="rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-800">{error}</p>}

            <button
              type="button"
              onClick={nextStep}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 mt-2"
            >
              Continue to Order Summary <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Order Summary */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-soft/40 p-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-muted">Order Details</p>
              <div className="flex justify-between text-xs text-muted">
                <span>{book.title} ({quantity} copies):</span>
                <span className="font-bold text-ink">{money(subtotal)}</span>
              </div>
              {gstPercent > 0 && (
                <div className="flex justify-between text-xs text-muted">
                  <span>GST ({gstPercent}%):</span>
                  <span className="font-bold text-ink">{money(gstAmount)}</span>
                </div>
              )}
              {shippingFee > 0 && (
                <div className="flex justify-between text-xs text-muted">
                  <span>Shipping & Handling:</span>
                  <span className="font-bold text-ink">{money(shippingFee)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-black/10 pt-2 text-sm font-black">
                <span className="text-ink">Total to Pay</span>
                <span className="font-display text-xl text-primary">{money(totalAmount)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-soft/20 p-4 text-xs space-y-1">
              <p className="font-black uppercase tracking-wider text-muted text-[10px]">Deliver To:</p>
              <p className="font-bold text-ink">{form.fullName} · {form.phone}</p>
              <p className="text-muted">{form.line1}{form.line2 ? `, ${form.line2}` : ""}, {form.city}, {form.state} - {form.pincode}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center justify-center gap-1.5 rounded-full border border-black/10 px-5 py-3 text-xs font-bold text-ink hover:bg-soft"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                Proceed to Payment <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Panel */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {error && <p className="rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-800">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center justify-center gap-1.5 rounded-full border border-black/10 px-5 py-3 text-xs font-bold text-ink hover:bg-soft"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="submit"
                disabled={submitting || !paymentPhotoUrl}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting Payment Proof...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Submit Payment Proof
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && confirmedOrder && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink">Thank You For Your Order!</h2>
            <p className="text-sm text-muted max-w-sm mx-auto">
              Your book order for <span className="font-bold text-ink">{confirmedOrder.quantity} copies</span> of{" "}
              <span className="font-bold text-ink">{book.title}</span> has been received.
            </p>
            <div className="rounded-2xl border border-black/10 bg-soft/40 p-4 max-w-sm mx-auto text-xs space-y-1">
              <p><span className="text-muted">Order Reference: </span><span className="font-mono font-bold text-primary">{confirmedOrder.orderNumber}</span></p>
              <p><span className="text-muted">Total Paid: </span><span className="font-bold text-ink">{money(confirmedOrder.totalAmount)}</span></p>
              <p><span className="text-muted">Status: </span><span className="font-semibold text-amber-700">Payment Verification Pending</span></p>
            </div>
            <p className="text-xs text-muted">Our team will verify your receipt and dispatch your books soon.</p>
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
        )}
      </div>
    </div>
  );
};
