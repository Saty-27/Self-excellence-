import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Loader2, MapPin, UserRound, X } from "lucide-react";
import { apiFetch } from "./api";
import { useAuth } from "./AuthContext";

/* ============================================================
   Sunday class registration
   ------------------------------------------------------------
   Posts through the same /contact endpoint the homepage band
   already uses, with the same classTitle field, so registrations
   keep landing in Admin -> Contact Messages exactly as before.
   ============================================================ */

export const ClassRegistrationModal = ({ item, open, onClose }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNotice("");
    setDone(false);
    setForm((f) => ({
      ...f,
      name: f.name || user?.name || "",
      email: f.email || user?.email || "",
      phone: f.phone || user?.phone || user?.mobile || ""
    }));
  }, [open, user]);

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

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      setNotice("Name, email and phone are required.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await apiFetch("/contact", {
        method: "POST",
        body: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: `Sunday Class Registration: ${item.title}`,
          classTitle: item.title,
          message:
            form.message ||
            `Devotee registered for upcoming class: ${item.title}${item.venue ? ` at ${item.venue}` : ""}${
              item.speaker ? ` conducted by ${item.speaker}` : ""
            }.`
        }
      });
      setDone(true);
    } catch (err) {
      setNotice(err.message || "Could not submit your registration. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open || !item) return null;

  const field = "w-full rounded-xl border border-line px-4 py-3 font-ui text-[14px] text-heading outline-none transition-colors focus:border-primary";
  const when = item.date
    ? new Date(item.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Register for ${item.title}`}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-7 py-5">
          <div className="min-w-0">
            <p className="font-ui text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Sunday Class</p>
            <h2 className="mt-1 font-display text-[21px] font-bold leading-tight text-heading">{item.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full p-2 text-text-muted transition hover:bg-bg-cream hover:text-heading" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="px-7 py-10 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} />
            </span>
            <h3 className="mt-4 font-display text-[22px] font-bold text-heading">Registration confirmed</h3>
            <p className="mx-auto mt-2 max-w-sm font-ui text-[14px] leading-[1.6] text-body">
              We look forward to welcoming you{when ? ` on ${when}` : ""}. Our team will be in touch if anything changes.
            </p>
            <button type="button" onClick={onClose} className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-8 font-ui text-[14px] font-semibold text-white shadow-cta">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-7 py-6">
            <ul className="mb-5 grid gap-2 rounded-2xl bg-bg-cream p-4 font-ui text-[13px] text-body">
              {when && <li className="flex items-center gap-2"><CalendarDays size={14} className="text-primary" /> {when}</li>}
              {item.time && <li className="flex items-center gap-2"><Clock size={14} className="text-primary" /> {item.time}</li>}
              {item.venue && <li className="flex items-center gap-2"><MapPin size={14} className="text-primary" /> {item.venue}</li>}
              {item.speaker && <li className="flex items-center gap-2"><UserRound size={14} className="text-primary" /> {item.speaker}</li>}
            </ul>

            <div className="grid gap-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" required className={field} />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email" required className={field} />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" required className={field} />
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows="3" placeholder="Anything we should know? (optional)" className={field} />
            </div>

            {item.registrationNote && (
              <p className="mt-3 rounded-xl bg-bg-warm px-4 py-3 font-ui text-[12.5px] leading-[1.55] text-body">{item.registrationNote}</p>
            )}

            {notice && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 font-ui text-[13px] font-semibold text-rose-700">{notice}</p>}

            <button type="submit" disabled={busy} className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary font-ui text-[15px] font-semibold text-white shadow-cta transition hover:bg-primary-dark disabled:opacity-50">
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {busy ? "Submitting…" : "Confirm registration"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ClassRegistrationModal;
