import { useState, useRef } from "react";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Smartphone,
  Upload,
  X,
  AlertCircle,
  Loader2
} from "lucide-react";
import { assetUrl, uploadFile } from "./api";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const CopyRow = ({ label, value, mono = false }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // fallback
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-black/5 last:border-b-0">
      <span className="font-ui text-[12.5px] text-text-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className={`truncate font-ui text-[13px] font-semibold text-heading ${mono ? "font-mono tabular-nums tracking-wide" : ""}`}>
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="shrink-0 rounded-lg p-1 text-text-muted transition hover:bg-black/5 hover:text-primary"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
      </span>
    </div>
  );
};

export const BookPaymentPanel = ({
  paymentInfo = {},
  totalAmount = 0,
  orderNumber = "",
  paymentPhotoUrl = "",
  setPaymentPhotoUrl,
  payerName = "",
  setPayerName,
  transactionReference = "",
  setTransactionReference,
  error = "",
  setError
}) => {
  const [payTab, setPayTab] = useState("upi");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const hasUpi = Boolean(paymentInfo?.upiId || paymentInfo?.qrCodeImage);
  const hasBank = Boolean(paymentInfo?.bankAccountNumber && paymentInfo?.bankIfsc);
  const isConfigured = hasUpi || hasBank;

  const upiLink = paymentInfo?.upiId
    ? `upi://pay?pa=${encodeURIComponent(paymentInfo.upiId)}&pn=${encodeURIComponent(
        paymentInfo.upiPayeeName || "ISKCON Juhu"
      )}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(orderNumber || "Sacred Book Payment")}`
    : "";

  const handleFileChange = async (file) => {
    if (!file) return;
    setError?.("");
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(ext)) {
      setError?.("Receipt must be a JPG, PNG, WEBP, or PDF file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError?.("Receipt is too large. Maximum file size is 5MB.");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadFile(file, "books-payments");
      setPaymentPhotoUrl?.(res.url);
    } catch (err) {
      setError?.(err.message || "Could not upload payment proof. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-800">
        <AlertCircle size={24} className="mx-auto mb-2 text-rose-600" />
        <p className="font-bold">Payment details are not available right now.</p>
        <p className="mt-1 text-xs text-rose-700">
          Please contact our temple office {paymentInfo?.contactPhone ? `at ${paymentInfo.contactPhone}` : ""} for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-black/10 pb-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-muted">Amount to Pay</h3>
          <p className="font-display text-2xl font-bold text-primary">{money(totalAmount)}</p>
        </div>
        <div className="flex rounded-xl bg-black/5 p-1">
          {hasUpi && (
            <button
              type="button"
              onClick={() => setPayTab("upi")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${payTab === "upi" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              <Smartphone size={14} /> UPI / QR
            </button>
          )}
          {hasBank && (
            <button
              type="button"
              onClick={() => setPayTab("bank")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${payTab === "bank" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              <Building2 size={14} /> Bank Transfer
            </button>
          )}
        </div>
      </div>

      {/* Tab: UPI & QR */}
      {payTab === "upi" && hasUpi && (
        <div className="space-y-3">
          {paymentInfo.qrCodeImage && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-soft/40 p-4 border border-black/5">
              <div className="h-44 w-44 rounded-xl bg-white p-2 border border-black/10 shadow-sm">
                <img src={assetUrl(paymentInfo.qrCodeImage)} alt="UPI QR Code" className="h-full w-full object-contain" />
              </div>
              <p className="mt-2 text-xs font-bold text-muted">Scan with Google Pay, PhonePe, Paytm or any UPI app</p>
            </div>
          )}

          {paymentInfo.upiId && (
            <div className="rounded-xl border border-black/10 bg-white p-3 space-y-1">
              <CopyRow label="UPI ID (VPA)" value={paymentInfo.upiId} mono />
              <CopyRow label="Payee Name" value={paymentInfo.upiPayeeName || "ISKCON Juhu"} />
              
              {/* Deep link button on mobile */}
              {upiLink && (
                <div className="pt-2 sm:hidden">
                  <a
                    href={upiLink}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-sm"
                  >
                    <ExternalLink size={14} /> Pay Using Installed UPI App
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Bank Transfer */}
      {payTab === "bank" && hasBank && (
        <div className="rounded-2xl border border-black/5 bg-soft/30 p-4 space-y-1">
          <CopyRow label="Account Name" value={paymentInfo.bankAccountHolder} />
          <CopyRow label="Account Number" value={paymentInfo.bankAccountNumber} mono />
          <CopyRow label="IFSC Code" value={paymentInfo.bankIfsc} mono />
          <CopyRow label="Bank" value={paymentInfo.bankName} />
          <CopyRow label="Branch" value={paymentInfo.bankBranch} />
        </div>
      )}

      {paymentInfo.extraInstructions && (
        <p className="text-[11px] text-muted italic bg-black/5 p-2.5 rounded-xl">
          {paymentInfo.extraInstructions}
        </p>
      )}

      {/* Payment Proof Upload Area */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 space-y-3">
        <label className="block text-xs font-black uppercase tracking-wider text-muted">
          Upload Payment Proof / Screenshot *
        </label>

        {paymentPhotoUrl ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-lg border border-black/10 bg-white">
                <img src={assetUrl(paymentPhotoUrl)} alt="Receipt" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">Receipt Uploaded Successfully</p>
                <p className="text-[10px] text-emerald-700">Ready to verify</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPaymentPhotoUrl?.("")}
              className="rounded-full p-1 text-muted hover:bg-black/5 hover:text-rose-600"
              title="Remove screenshot"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/15 bg-soft/20 p-5 text-center transition hover:border-primary hover:bg-soft/40"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-1.5 text-primary">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-xs font-bold">Uploading receipt proof...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-muted">
                <Upload size={22} className="text-primary" />
                <span className="text-xs font-bold text-ink">Click to upload payment screenshot</span>
                <span className="text-[10px]">JPG, PNG, WEBP, or PDF (Max 5MB)</span>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1">
              UTR / Transaction Reference (Optional)
            </label>
            <input
              value={transactionReference}
              onChange={(e) => setTransactionReference?.(e.target.value)}
              placeholder="e.g. 12-digit UTR number"
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1">
              Payer Name on Bank / UPI (Optional)
            </label>
            <input
              value={payerName}
              onChange={(e) => setPayerName?.(e.target.value)}
              placeholder="Name on your payment account"
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
