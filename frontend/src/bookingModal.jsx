import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Check, Copy, Minus, Phone, Plus, QrCode, Smartphone, Upload, X, CheckCircle2, Loader2 } from "lucide-react";
import { apiFetch, assetUrl, uploadFile } from "./api";
import { useAuth } from "./AuthContext";

/* ============================================================
   Pilgrimage booking modal
   ------------------------------------------------------------
   Mirrors the course enrollment flow: the devotee fills in who
   is travelling, uploads a payment screenshot, and an admin
   confirms it from the panel. No payment gateway is involved
   yet — when the API arrives it slots in where the receipt
   upload currently sits.

   The price shown here is quoted by the server (so the browser
   and the stored booking can never disagree) and re-quoted
   whenever the traveller count changes.
   ============================================================ */

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const emptyTraveller = () => ({ name: "", age: "", gender: "" });

/* One line of payment detail with a copy button — devotees are
   typing these into a banking app, so getting it exactly right
   matters more than it looking clever. */
const CopyRow = ({ label, value, mono = false }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the value is on screen to read anyway */
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="font-ui text-[12.5px] text-text-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className={`truncate font-ui text-[13.5px] font-semibold text-heading ${mono ? "tabular-nums tracking-wide" : ""}`}>
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-warm hover:text-primary"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
      </span>
    </div>
  );
};

const STEPS = [
  { n: 1, label: "Booking details" },
  { n: 2, label: "Payment" },
  { n: 3, label: "Upload proof" },
  { n: 4, label: "Confirm" }
];

export const PilgrimageBookingModal = ({ pilgrimage, open, onClose }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", message: "" });
  const [travellers, setTravellers] = useState([emptyTraveller()]);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [paymentPhotoUrl, setPaymentPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [step, setStep] = useState(1);
  const [payTab, setPayTab] = useState("upi");
  const fileRef = useRef(null);

  const maxTravellers = pilgrimage?.maxTravellers || 10;
  const isPaid = (pilgrimage?.pricePerPerson || 0) > 0;

  /* Each payment route only shows if the admin actually filled it in. */
  const hasUpi = Boolean(pilgrimage?.upiId || pilgrimage?.paymentQrImage);
  const hasBank = Boolean(pilgrimage?.bankAccountNumber && pilgrimage?.bankIfsc);

  /* Standard UPI deep link, so tapping it on a phone opens the
     banking app with payee and amount already filled in. */
  const upiLink = pilgrimage?.upiId
    ? `upi://pay?pa=${encodeURIComponent(pilgrimage.upiId)}&pn=${encodeURIComponent(
        pilgrimage.bankAccountName || "ISKCON Juhu"
      )}&am=${quote?.totalAmount ?? ""}&cu=INR&tn=${encodeURIComponent(pilgrimage.title || "Trip booking")}`
    : "";

  /* Prefill from the signed-in account; they can still edit it. */
  useEffect(() => {
    if (!open || !user) return;
    setForm((f) => ({
      ...f,
      fullName: f.fullName || user.name || "",
      email: f.email || user.email || "",
      phone: f.phone || user.phone || user.mobile || ""
    }));
    setTravellers((t) => (t.length === 1 && !t[0].name ? [{ ...t[0], name: user.name || "" }] : t));
  }, [open, user]);

  /* Reset everything when the modal closes. */
  useEffect(() => {
    if (open) return;
    setError("");
    setDone(null);
    setSubmitting(false);
    setStep(1);
  }, [open]);

  /* Choose the default payment tab when the modal opens, by which
     point the trip (and so its payment details) has actually loaded. */
  useEffect(() => {
    if (!open) return;
    setPayTab(hasUpi ? "upi" : "bank");
  }, [open, hasUpi]);

  /* Lock the page behind the modal. */
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

  /* Re-price whenever the party size changes. */
  useEffect(() => {
    if (!open || !pilgrimage?._id || !user) return undefined;
    let cancelled = false;
    setQuoting(true);
    apiFetch("/pilgrimage-bookings/quote", {
      method: "POST",
      body: { pilgrimageId: pilgrimage._id, travellerCount: travellers.length }
    })
      .then((data) => !cancelled && setQuote(data.quote))
      .catch(() => {})
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [open, pilgrimage?._id, travellers.length, user]);

  const setCount = (next) => {
    const n = Math.max(1, Math.min(next, maxTravellers));
    setTravellers((list) => {
      if (n === list.length) return list;
      if (n < list.length) return list.slice(0, n);
      return [...list, ...Array.from({ length: n - list.length }, emptyTraveller)];
    });
  };

  const updateTraveller = (index, key, value) =>
    setTravellers((list) => list.map((t, i) => (i === index ? { ...t, [key]: value } : t)));

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(ext)) {
      setError("Receipt must be a .jpg, .png, .webp or .pdf file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt is too large. Maximum size is 5MB.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, "pilgrimage-payments");
      setPaymentPhotoUrl(uploaded.url);
    } catch {
      setError("Could not upload the receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const namedTravellers = travellers.filter((t) => t.name.trim());
  const seatsLeft = typeof pilgrimage?.seatsLeft === "number" ? pilgrimage.seatsLeft : null;

  /* Each step only lets you past once its own fields are good, so the
     final submit can never be the first time a problem is reported. */
  const stepError = () => {
    if (step === 1) {
      if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) return "Please fill in your name, email and phone.";
      if (namedTravellers.length !== travellers.length) return "Please enter a name for every traveller.";
      if (seatsLeft != null && travellers.length > seatsLeft) {
        return `Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left on this journey.`;
      }
    }
    if (step === 3 && isPaid && !paymentPhotoUrl) return "Please upload your payment receipt to continue.";
    return "";
  };

  const next = () => {
    const problem = stepError();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setStep((v) => Math.min(v + 1, 4));
  };

  const canSubmit =
    form.fullName.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    namedTravellers.length === travellers.length &&
    (!isPaid || paymentPhotoUrl) &&
    !submitting &&
    !uploading;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (namedTravellers.length !== travellers.length) {
      setError("Please enter a name for every traveller.");
      return;
    }
    if (isPaid && !paymentPhotoUrl) {
      setError("Please upload your payment receipt to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiFetch("/pilgrimage-bookings", {
        method: "POST",
        body: {
          pilgrimageId: pilgrimage._id,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          message: form.message,
          travellers: travellers.map((t) => ({ name: t.name.trim(), age: t.age, gender: t.gender })),
          paymentPhotoUrl
        }
      });
      setDone(data.booking);
    } catch (err) {
      setError(err.message || "Could not submit the booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !pilgrimage) return null;

  const field = "w-full rounded-xl border border-black/10 px-4 py-3 font-ui text-[14px] text-heading outline-none transition-colors focus:border-primary";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Book ${pilgrimage.title}`}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-7 py-5">
          <div className="min-w-0">
            <p className="font-ui text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              {pilgrimage.badge || "Featured Pilgrimage"}
            </p>
            <h2 className="mt-1 truncate font-display text-[22px] font-bold text-heading">{pilgrimage.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full p-2 text-text-muted transition hover:bg-bg-cream hover:text-heading" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* ---- Signed out ---- */}
        {!user && (
          <div className="px-7 py-10 text-center">
            <h3 className="font-display text-[22px] font-bold text-heading">Please sign in to book</h3>
            <p className="mx-auto mt-2 max-w-sm font-ui text-[14px] leading-[1.6] text-body">
              Bookings are tied to your account so you can track confirmation and travel details.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-ui text-[14px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
                Login <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-primary px-7 font-ui text-[14px] font-semibold text-primary transition hover:bg-primary hover:text-white">
                Create an account
              </Link>
            </div>
          </div>
        )}

        {/* ---- Confirmation ---- */}
        {user && done && (
          <div className="px-7 py-10 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} />
            </span>
            <h3 className="mt-4 font-display text-[22px] font-bold text-heading">Booking submitted</h3>
            <p className="mx-auto mt-2 max-w-md font-ui text-[14px] leading-[1.6] text-body">
              Your reference is <span className="font-mono font-semibold text-primary">{done.bookingRef}</span>. Our team will
              verify your payment and confirm shortly — you will get a notification.
            </p>
            <dl className="mx-auto mt-5 max-w-xs rounded-2xl bg-bg-cream p-4 text-left">
              <div className="flex justify-between font-ui text-[13px]"><dt className="text-text-muted">Travellers</dt><dd className="font-semibold text-heading">{done.travellerCount}</dd></div>
              <div className="mt-1.5 flex justify-between font-ui text-[13px]"><dt className="text-text-muted">Total paid</dt><dd className="font-semibold text-heading">{money(done.totalAmount)}</dd></div>
            </dl>
            <button type="button" onClick={onClose} className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-8 font-ui text-[14px] font-semibold text-white shadow-cta">
              Done
            </button>
          </div>
        )}

        {/* ---- Booking wizard ---- */}
        {user && !done && (
          <form onSubmit={submit} className="px-7 py-6">
            {/* Step rail */}
            <ol className="mb-6 flex items-center gap-2" aria-label="Booking steps">
              {STEPS.map(({ n, label }) => (
                <li key={n} className="flex flex-1 items-center gap-2">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-ui text-[12px] font-bold transition-colors ${
                      step > n ? "bg-emerald-600 text-white" : step === n ? "bg-primary text-white" : "bg-bg-warm text-text-muted"
                    }`}
                    aria-current={step === n ? "step" : undefined}
                  >
                    {step > n ? <CheckCircle2 size={14} /> : n}
                  </span>
                  <span className={`hidden flex-1 font-ui text-[11.5px] font-semibold sm:block ${step === n ? "text-heading" : "text-text-muted"}`}>
                    {label}
                  </span>
                  {n < STEPS.length && <span className={`hidden h-px flex-1 sm:block ${step > n ? "bg-emerald-600" : "bg-line"}`} />}
                </li>
              ))}
            </ol>

            {/* ===== Step 1 — who is travelling ===== */}
            {step === 1 && (
              <>
                <fieldset>
                  <legend className="font-ui text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">Your details</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full name" required className={field} />
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" required className={field} />
                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email" required className={`${field} sm:col-span-2`} />
                  </div>
                </fieldset>

                <fieldset className="mt-6">
                  <div className="flex items-center justify-between gap-4">
                    <legend className="font-ui text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">Travellers</legend>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setCount(travellers.length - 1)} disabled={travellers.length <= 1} className="grid h-9 w-9 place-items-center rounded-full border border-line text-heading transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40" aria-label="One traveller fewer">
                        <Minus size={16} />
                      </button>
                      <span className="min-w-[2ch] text-center font-display text-[18px] font-bold text-heading">{travellers.length}</span>
                      <button type="button" onClick={() => setCount(travellers.length + 1)} disabled={travellers.length >= maxTravellers} className="grid h-9 w-9 place-items-center rounded-full border border-line text-heading transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40" aria-label="One traveller more">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 font-ui text-[12px] text-text-muted">
                    {seatsLeft != null ? `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left on this journey.` : `Up to ${maxTravellers} travellers per booking.`}
                  </p>

                  <div className="mt-3 grid gap-2.5">
                    {travellers.map((t, i) => (
                      <div key={i} className="grid gap-2.5 rounded-2xl bg-bg-cream p-3 sm:grid-cols-[1fr_90px_120px]">
                        <input value={t.name} onChange={(e) => updateTraveller(i, "name", e.target.value)} placeholder={`Traveller ${i + 1} name`} required className={field} />
                        <input value={t.age} onChange={(e) => updateTraveller(i, "age", e.target.value)} type="number" min="0" max="120" placeholder="Age" className={field} />
                        <select value={t.gender} onChange={(e) => updateTraveller(i, "gender", e.target.value)} className={field}>
                          <option value="">Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows="3" placeholder="Anything we should know? (optional)" className={`${field} mt-5`} />
              </>
            )}

            {/* ===== Step 2 — what it costs and how to pay ===== */}
            {step === 2 && (
              <>
                <div className="rounded-2xl border border-line p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-ui text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">Booking summary</p>
                    {quoting && <Loader2 size={14} className="animate-spin text-text-muted" aria-label="Updating price" />}
                  </div>
                  <dl className="mt-3 grid gap-1.5 font-ui text-[14px]">
                    <div className="flex justify-between">
                      <dt className="text-body">{money(quote?.pricePerPerson ?? pilgrimage.pricePerPerson)} × {travellers.length}</dt>
                      <dd className="font-semibold text-heading">{money(quote?.subtotal ?? (pilgrimage.pricePerPerson || 0) * travellers.length)}</dd>
                    </div>
                    {(quote?.taxBreakdown || []).map((t, i) => (
                      <div key={i} className="flex justify-between">
                        <dt className="text-body">{t.label}{t.type === "percent" ? ` (${t.value}%)` : ""}</dt>
                        <dd className="font-semibold text-heading">{money(t.amount)}</dd>
                      </div>
                    ))}
                    <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2.5">
                      <dt className="font-ui text-[15px] font-semibold text-heading">Amount to pay</dt>
                      <dd className="font-display text-[24px] font-extrabold text-primary">{money(quote?.totalAmount ?? 0)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6">
                  <p className="font-ui text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">How to pay</p>

                  {hasUpi || hasBank ? (
                    <>
                      {/* Toggle only appears when both options are configured. */}
                      {hasUpi && hasBank && (
                        <div className="mt-3 flex rounded-full bg-bg-cream p-1">
                          {[["upi", "Pay by UPI", Smartphone], ["bank", "Bank transfer", Building2]].map(([key, text, Icon]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setPayTab(key)}
                              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 font-ui text-[13px] font-semibold transition-colors ${
                                payTab === key ? "bg-white text-heading shadow-sm" : "text-text-muted hover:text-heading"
                              }`}
                            >
                              <Icon size={15} /> {text}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* ---- UPI ---- */}
                      {hasUpi && (!hasBank || payTab === "upi") && (
                        <div className="mt-3 rounded-2xl border border-line p-4">
                          {pilgrimage.paymentQrImage && (
                            <figure className="flex flex-col items-center">
                              <img
                                src={assetUrl(pilgrimage.paymentQrImage)}
                                alt="Payment QR code"
                                className="h-48 w-48 rounded-xl border border-line bg-white object-contain p-2"
                              />
                              <figcaption className="mt-2.5 flex items-center gap-1.5 font-ui text-[12.5px] font-semibold text-body">
                                <QrCode size={14} className="text-primary" /> Scan this QR to pay {money(quote?.totalAmount ?? 0)}
                              </figcaption>
                            </figure>
                          )}

                          {pilgrimage.upiId && (
                            <div className={pilgrimage.paymentQrImage ? "mt-4 border-t border-line pt-1" : ""}>
                              <CopyRow label="UPI ID" value={pilgrimage.upiId} mono />
                              {/* Opens the devotee's UPI app with the amount already filled in. */}
                              <a
                                href={upiLink}
                                className="mt-2 flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-ui text-[14px] font-semibold text-white shadow-cta transition hover:bg-primary-dark sm:hidden"
                              >
                                <Smartphone size={16} /> Open UPI app
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ---- Bank ---- */}
                      {hasBank && (!hasUpi || payTab === "bank") && (
                        <div className="mt-3 rounded-2xl border border-line p-4">
                          <div className="divide-y divide-line">
                            <CopyRow label="Account name" value={pilgrimage.bankAccountName} />
                            <CopyRow label="Account number" value={pilgrimage.bankAccountNumber} mono />
                            <CopyRow label="IFSC code" value={pilgrimage.bankIfsc} mono />
                            <CopyRow label="Bank" value={pilgrimage.bankName} />
                            <CopyRow label="Branch" value={pilgrimage.bankBranch} />
                          </div>
                          <p className="mt-3 rounded-xl bg-bg-warm px-3.5 py-2.5 font-ui text-[12.5px] leading-[1.55] text-body">
                            Transfer exactly <span className="font-semibold text-heading">{money(quote?.totalAmount ?? 0)}</span>, then
                            keep the receipt — you will upload it on the next step.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 rounded-xl bg-bg-warm px-4 py-3.5 font-ui text-[14px] leading-[1.65] text-body">
                      Please transfer the amount above using the details shared by the ISKCON Juhu office, then upload your
                      receipt on the next step.
                    </p>
                  )}

                  {pilgrimage.paymentInstructions && (
                    <p className="mt-3 whitespace-pre-line rounded-xl bg-bg-warm px-4 py-3.5 font-ui text-[13.5px] leading-[1.65] text-body">
                      {pilgrimage.paymentInstructions}
                    </p>
                  )}

                  {pilgrimage.paymentContactNumber && (
                    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line px-4 py-3 font-ui text-[13px] text-body">
                      <Phone size={14} className="text-primary" aria-hidden="true" />
                      Trouble paying? Call
                      {pilgrimage.paymentContactName && <span className="font-semibold text-heading">{pilgrimage.paymentContactName}</span>}
                      <a href={`tel:${String(pilgrimage.paymentContactNumber).replace(/\s+/g, "")}`} className="font-semibold text-primary underline">
                        {pilgrimage.paymentContactNumber}
                      </a>
                    </p>
                  )}

                  {/* What happens next — set expectations before they pay. */}
                  <ol className="mt-4 grid gap-2 rounded-2xl bg-bg-cream p-4">
                    {[
                      hasUpi || hasBank
                        ? "Pay using the QR, UPI ID or bank details above."
                        : "Pay the amount above using the details the office shares with you.",
                      "Upload the payment screenshot on the next step.",
                      "Our team verifies it, usually within two working days.",
                      "Once approved the trip appears under My Trips with the full guide."
                    ].map((text, i) => (
                      <li key={i} className="flex gap-2.5 font-ui text-[13px] leading-[1.55] text-body">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 font-ui text-[11px] font-bold text-primary">
                          {i + 1}
                        </span>
                        {text}
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {/* ===== Step 3 — proof of payment ===== */}
            {step === 3 && (
              <fieldset>
                <legend className="font-ui text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">Payment receipt</legend>
                <p className="mt-2 font-ui text-[13.5px] leading-[1.6] text-body">
                  Upload a screenshot or PDF of your payment of{" "}
                  <span className="font-semibold text-heading">{money(quote?.totalAmount ?? 0)}</span>. Our team checks it by hand.
                </p>

                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line px-4 py-6 font-ui text-[13.5px] font-semibold text-body transition hover:border-primary hover:text-primary disabled:opacity-60">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? "Uploading…" : paymentPhotoUrl ? "Replace receipt" : "Upload payment screenshot"}
                </button>

                {paymentPhotoUrl && (
                  <div className="mt-4 rounded-xl border border-line p-3">
                    <p className="flex items-center gap-2 font-ui text-[12.5px] font-semibold text-emerald-700">
                      <CheckCircle2 size={14} /> Receipt attached
                    </p>
                    {/\.(png|jpe?g|webp)$/i.test(paymentPhotoUrl) ? (
                      <img src={assetUrl(paymentPhotoUrl)} alt="Payment receipt preview" className="mt-2 max-h-56 w-full rounded-lg object-contain" />
                    ) : (
                      <a href={assetUrl(paymentPhotoUrl)} target="_blank" rel="noreferrer" className="mt-1 inline-block font-ui text-[13px] text-primary underline">
                        Open uploaded file
                      </a>
                    )}
                  </div>
                )}
              </fieldset>
            )}

            {/* ===== Step 4 — confirm ===== */}
            {step === 4 && (
              <div className="grid gap-4">
                <div className="rounded-2xl border border-line p-4">
                  <p className="font-ui text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">Review your booking</p>
                  <dl className="mt-3 grid gap-2 font-ui text-[14px]">
                    <div className="flex justify-between gap-4"><dt className="text-text-muted">Journey</dt><dd className="text-right font-semibold text-heading">{pilgrimage.title}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-text-muted">Booked by</dt><dd className="text-right font-semibold text-heading">{form.fullName}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-text-muted">Contact</dt><dd className="text-right font-semibold text-heading">{form.phone}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-text-muted">Travellers</dt><dd className="text-right font-semibold text-heading">{travellers.map((t) => t.name).filter(Boolean).join(", ")}</dd></div>
                    <div className="flex justify-between gap-4 border-t border-line pt-2"><dt className="font-semibold text-heading">Total</dt><dd className="text-right font-display text-[20px] font-extrabold text-primary">{money(quote?.totalAmount ?? 0)}</dd></div>
                  </dl>
                </div>
                <p className="rounded-xl bg-bg-warm px-4 py-3 font-ui text-[13px] leading-[1.6] text-body">
                  Submitting sends this to our team for payment verification. You will be notified once it is confirmed —
                  the trip does not unlock before then.
                </p>
              </div>
            )}

            {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 font-ui text-[13px] font-semibold text-rose-700">{error}</p>}

            {/* Step controls */}
            <div className="mt-6 flex items-center gap-3">
              {step > 1 && (
                <button type="button" onClick={() => { setError(""); setStep(step - 1); }} className="inline-flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-line px-6 font-ui text-[14.5px] font-semibold text-heading transition hover:border-primary hover:text-primary">
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              {step < 4 ? (
                <button type="button" onClick={next} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-primary font-ui text-[15px] font-semibold text-white shadow-cta transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50" disabled={uploading}>
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button type="submit" disabled={!canSubmit} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-primary font-ui text-[15px] font-semibold text-white shadow-cta transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
                  {submitting ? "Submitting…" : "Submit booking"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PilgrimageBookingModal;
