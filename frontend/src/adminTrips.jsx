import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp, ArrowDown, Download, ExternalLink, Eye, FileText, Image as ImageIcon,
  Loader2, Plus, Save, Trash2, X
} from "lucide-react";
import { apiFetch, assetUrl, uploadFile } from "./api";
import { SEO } from "./components";
import { money, tripDates } from "./trips";

/* ============================================================
   Admin — Trips
   ------------------------------------------------------------
   The generic AdminCrud form cannot express repeating groups
   (itinerary days, gallery images, FAQs), so trips get their
   own builder. Everything still goes through the existing
   /api/admin/pilgrimages CRUD and the shared upload endpoint.
   ============================================================ */

const input = "w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-primary";
const label = "block text-[10px] font-black uppercase tracking-wide text-muted";

const Field = ({ title, children, wide = false }) => (
  <label className={`grid gap-1.5 ${wide ? "md:col-span-2" : ""}`}>
    <span className={label}>{title}</span>
    {children}
  </label>
);

const Card = ({ title, subtitle, children, actions }) => (
  <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

/* ---------- small uploader used by gallery / itinerary / pdf ---------- */
const useUpload = (folder) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const send = async (file, { maxMb = 5, accept = [".jpg", ".jpeg", ".png", ".webp"] } = {}) => {
    setError("");
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (accept.length && !accept.includes(ext)) {
      setError(`Allowed formats: ${accept.join(", ")}`);
      return null;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setError(`File is too large. Maximum ${maxMb}MB.`);
      return null;
    }
    setBusy(true);
    try {
      return await uploadFile(file, folder);
    } catch (e) {
      setError(e.message || "Upload failed");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { send, busy, error, setError };
};

/* ---------- repeating-row helpers ---------- */
const move = (list, from, to) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((x, i) => ({ ...x, sortOrder: i + 1 }));
};

const RowControls = ({ index, total, onMove, onRemove }) => (
  <div className="flex shrink-0 items-center gap-1">
    <button type="button" onClick={() => onMove(index, index - 1)} disabled={index === 0} className="rounded-lg p-1.5 text-muted transition hover:bg-soft hover:text-ink disabled:opacity-30" aria-label="Move up"><ArrowUp size={14} /></button>
    <button type="button" onClick={() => onMove(index, index + 1)} disabled={index === total - 1} className="rounded-lg p-1.5 text-muted transition hover:bg-soft hover:text-ink disabled:opacity-30" aria-label="Move down"><ArrowDown size={14} /></button>
    <button type="button" onClick={() => onRemove(index)} className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50" aria-label="Remove"><Trash2 size={14} /></button>
  </div>
);

/* ---------- simple string list (inclusions / exclusions / whoFor) ---------- */
const SimpleList = ({ items, onChange, placeholder, addLabel, valueKey = "title" }) => (
  <div className="grid gap-2">
    {items.map((item, i) => (
      <div key={i} className="flex items-center gap-2">
        <input
          value={valueKey ? item[valueKey] || "" : item}
          onChange={(e) => {
            const next = [...items];
            next[i] = valueKey ? { ...next[i], [valueKey]: e.target.value } : e.target.value;
            onChange(next);
          }}
          placeholder={placeholder}
          className={input}
        />
        <RowControls index={i} total={items.length} onMove={(a, b) => onChange(move(items, a, b))} onRemove={(idx) => onChange(items.filter((_, n) => n !== idx))} />
      </div>
    ))}
    <button type="button" onClick={() => onChange([...items, valueKey ? { [valueKey]: "", sortOrder: items.length + 1 } : ""])} className="inline-flex w-fit items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-xs font-black text-ink transition hover:border-primary hover:text-primary">
      <Plus size={14} /> {addLabel}
    </button>
  </div>
);

/* ------------------------------------------------------------------ */

const BLANK = {
  title: "", slug: "", badge: "FEATURED PILGRIMAGE", image: "", destination: "",
  tripType: "Spiritual Pilgrimage", durationLabel: "", days: "", nights: "",
  startDate: "", endDate: "", bookingOpenDate: "", bookingCloseDate: "",
  pricePerPerson: "", discountPrice: "", maxTravellers: 20,
  ageGroup: "", accommodation: "", transport: "", departurePoint: "", meetingPoint: "",
  shortDescription: "", description: "", importantInfo: "",
  paymentInstructions: "", paymentQrImage: "",
  upiId: "", bankAccountName: "", bankAccountNumber: "", bankIfsc: "", bankName: "", bankBranch: "",
  paymentContactName: "", paymentContactNumber: "",
  gallery: [], itinerary: [], inclusions: [], exclusions: [], whoFor: [], faqs: [],
  pdfUrl: "", pdfName: "", pdfSize: 0,
  featured: false, featuredOrder: 0, showOnHomepage: false, bookingEnabled: true,
  status: "active", tripStatus: "draft", sortOrder: 0,
  seoTitle: "", seoDescription: ""
};

const dateValue = (v) => (v ? String(v).slice(0, 10) : "");

export const AdminTripsPage = () => {
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const mainUpload = useUpload("trips");
  const galleryUpload = useUpload("trips-gallery");
  const dayUpload = useUpload("trips-itinerary");
  const pdfUpload = useUpload("trips-guides");
  const qrUpload = useUpload("trips-payment");
  const galleryInput = useRef(null);
  const pdfInput = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        apiFetch("/admin/trips-overview"),
        apiFetch("/admin/trip-stats").catch(() => null)
      ]);
      setTrips(t.items || []);
      if (s) setStats(s.stats);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const startEdit = (trip) => {
    setEditing(trip._id);
    setForm({
      ...BLANK,
      ...trip,
      startDate: dateValue(trip.startDate),
      endDate: dateValue(trip.endDate),
      bookingOpenDate: dateValue(trip.bookingOpenDate),
      bookingCloseDate: dateValue(trip.bookingCloseDate),
      gallery: trip.gallery || [],
      itinerary: trip.itinerary || [],
      inclusions: trip.inclusions || [],
      exclusions: trip.exclusions || [],
      whoFor: trip.whoFor || [],
      faqs: trip.faqs || []
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setEditing(null);
    setForm(BLANK);
  };

  const save = async (tripStatus) => {
    if (!form.title.trim()) {
      setNotice("A trip needs a title.");
      return;
    }
    setSaving(true);
    setNotice("");
    const payload = {
      ...form,
      tripStatus: tripStatus || form.tripStatus,
      days: Number(form.days) || 0,
      nights: Number(form.nights) || 0,
      pricePerPerson: Number(form.pricePerPerson) || 0,
      discountPrice: form.discountPrice === "" ? undefined : Number(form.discountPrice),
      maxTravellers: Number(form.maxTravellers) || 1,
      featuredOrder: Number(form.featuredOrder) || 0,
      sortOrder: Number(form.sortOrder) || 0,
      whoFor: (form.whoFor || []).filter(Boolean),
      inclusions: (form.inclusions || []).filter((x) => x.title?.trim()),
      exclusions: (form.exclusions || []).filter((x) => x.title?.trim()),
      faqs: (form.faqs || []).filter((x) => x.question?.trim()),
      itinerary: (form.itinerary || []).map((d, i) => ({ ...d, dayNumber: Number(d.dayNumber) || i + 1, sortOrder: i + 1 })),
      gallery: (form.gallery || []).map((g, i) => ({ ...g, sortOrder: i + 1 }))
    };
    try {
      if (editing) await apiFetch(`/admin/pilgrimages/${editing}`, { method: "PUT", body: payload });
      else await apiFetch("/admin/pilgrimages", { method: "POST", body: payload });
      setNotice(editing ? "Trip saved." : "Trip created.");
      reset();
      load();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (trip) => {
    if (!confirm(`Delete "${trip.title}"? Bookings already made are not deleted.`)) return;
    try {
      await apiFetch(`/admin/pilgrimages/${trip._id}`, { method: "DELETE" });
      setNotice("Trip deleted.");
      load();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const togglePublish = async (trip) => {
    try {
      await apiFetch(`/admin/pilgrimages/${trip._id}`, {
        method: "PUT",
        body: { ...trip, tripStatus: trip.tripStatus === "published" ? "unpublished" : "published" }
      });
      load();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const duplicate = async (trip) => {
    const { _id, createdAt, updatedAt, __v, seatsTaken, seatsLeft, isFull, bookingState, canBook, ...rest } = trip;
    try {
      await apiFetch("/admin/pilgrimages", {
        method: "POST",
        body: { ...rest, title: `${trip.title} (copy)`, slug: `${trip.slug}-copy-${Date.now().toString(36)}`, tripStatus: "draft", showOnHomepage: false }
      });
      setNotice("Trip duplicated as a draft.");
      load();
    } catch (err) {
      setNotice(err.message);
    }
  };

  /* ---------- itinerary / gallery / faq handlers ---------- */
  const addDay = () =>
    set("itinerary", [...form.itinerary, { dayNumber: form.itinerary.length + 1, title: "", description: "", morning: "", afternoon: "", evening: "", imageUrl: "", sortOrder: form.itinerary.length + 1 }]);
  const setDay = (i, key, value) => set("itinerary", form.itinerary.map((d, n) => (n === i ? { ...d, [key]: value } : d)));

  const addGallery = async (files) => {
    for (const file of Array.from(files || [])) {
      const up = await galleryUpload.send(file);
      if (up) setForm((f) => ({ ...f, gallery: [...f.gallery, { imageUrl: up.url, altText: "", sortOrder: f.gallery.length + 1 }] }));
    }
  };

  return (
    <div>
      <SEO title="Trips - Admin" />

      {/* Metrics */}
      {stats && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total trips", stats.totalTrips],
            ["Published", stats.publishedTrips],
            ["Upcoming", stats.upcomingTrips],
            ["Pending bookings", stats.pendingBookings],
            ["Approved bookings", stats.approvedBookings],
            ["Participants", stats.upcomingParticipants],
            ["Revenue", money(stats.revenue)],
            ["Total bookings", stats.totalBookings]
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted">{l}</p>
              <p className="mt-1 text-2xl font-black text-ink">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">{editing ? "Edit Trip" : "Create Trip"}</h1>
        {editing && (
          <div className="flex gap-2">
            <Link to={`/trips/${form.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-xs font-black text-ink transition hover:border-primary hover:text-primary">
              <Eye size={14} /> Preview
            </Link>
            <button onClick={reset} className="rounded-full px-4 py-2 text-xs font-black text-primary">Cancel edit</button>
          </div>
        )}
      </div>

      {notice && <p className="mb-5 rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary">{notice}</p>}

      <div className="grid gap-5">
        {/* Basics */}
        <Card title="Basic information">
          <div className="grid gap-4 md:grid-cols-2">
            <Field title="Trip title"><input value={form.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Vrindavan Spiritual Journey" /></Field>
            <Field title="Slug (leave blank to generate)"><input value={form.slug} onChange={(e) => set("slug", e.target.value)} className={input} placeholder="vrindavan-spiritual-journey" /></Field>
            <Field title="Destination"><input value={form.destination} onChange={(e) => set("destination", e.target.value)} className={input} placeholder="Vrindavan, Uttar Pradesh" /></Field>
            <Field title="Trip type"><input value={form.tripType} onChange={(e) => set("tripType", e.target.value)} className={input} placeholder="Spiritual Pilgrimage" /></Field>
            <Field title="Duration label"><input value={form.durationLabel} onChange={(e) => set("durationLabel", e.target.value)} className={input} placeholder="4 Days / 3 Nights" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field title="Days"><input type="number" min="0" value={form.days} onChange={(e) => set("days", e.target.value)} className={input} /></Field>
              <Field title="Nights"><input type="number" min="0" value={form.nights} onChange={(e) => set("nights", e.target.value)} className={input} /></Field>
            </div>
            <Field title="Short description" wide><textarea rows="2" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={input} placeholder="One or two lines for the trip card." /></Field>
            <Field title="Full description" wide><textarea rows="7" value={form.description} onChange={(e) => set("description", e.target.value)} className={input} placeholder="What this journey is. Blank lines separate paragraphs." /></Field>
          </div>
        </Card>

        {/* Main image */}
        <Card title="Main image" subtitle="Used on the trip card, the listing and the detail hero.">
          <div className="flex flex-wrap items-start gap-4">
            {form.image && <img src={assetUrl(form.image)} alt="" className="h-28 w-44 rounded-xl border border-black/10 object-cover" />}
            <div className="grid gap-2">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={async (e) => { const up = await mainUpload.send(e.target.files?.[0]); if (up) set("image", up.url); }} className="text-sm" />
              <input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="or paste a URL" className={input} />
              {mainUpload.busy && <p className="text-xs text-muted">Uploading…</p>}
              {mainUpload.error && <p className="text-xs font-bold text-rose-600">{mainUpload.error}</p>}
            </div>
          </div>
        </Card>

        {/* Dates, price, capacity */}
        <Card title="Dates, pricing and capacity">
          <div className="grid gap-4 md:grid-cols-4">
            <Field title="Start date"><input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={input} /></Field>
            <Field title="End date"><input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={input} /></Field>
            <Field title="Booking opens"><input type="date" value={form.bookingOpenDate} onChange={(e) => set("bookingOpenDate", e.target.value)} className={input} /></Field>
            <Field title="Booking closes"><input type="date" value={form.bookingCloseDate} onChange={(e) => set("bookingCloseDate", e.target.value)} className={input} /></Field>
            <Field title="Price per person (₹)"><input type="number" min="0" value={form.pricePerPerson} onChange={(e) => set("pricePerPerson", e.target.value)} className={input} /></Field>
            <Field title="Discounted price (optional)"><input type="number" min="0" value={form.discountPrice} onChange={(e) => set("discountPrice", e.target.value)} className={input} /></Field>
            <Field title="Capacity (max participants)"><input type="number" min="1" value={form.maxTravellers} onChange={(e) => set("maxTravellers", e.target.value)} className={input} /></Field>
            <Field title="Age group"><input value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)} className={input} placeholder="18+" /></Field>
          </div>
          <p className="mt-3 text-xs text-muted">Seats left are calculated automatically from approved bookings — there is nothing to maintain here.</p>
        </Card>

        {/* Quick info */}
        <Card title="At a glance">
          <div className="grid gap-4 md:grid-cols-2">
            <Field title="Accommodation"><input value={form.accommodation} onChange={(e) => set("accommodation", e.target.value)} className={input} placeholder="Included" /></Field>
            <Field title="Transport"><input value={form.transport} onChange={(e) => set("transport", e.target.value)} className={input} placeholder="Included" /></Field>
            <Field title="Departs from"><input value={form.departurePoint} onChange={(e) => set("departurePoint", e.target.value)} className={input} placeholder="ISKCON Juhu, Mumbai" /></Field>
            <Field title="Meeting point"><input value={form.meetingPoint} onChange={(e) => set("meetingPoint", e.target.value)} className={input} placeholder="Main gate, 5:30 AM" /></Field>
          </div>
        </Card>

        {/* Itinerary builder */}
        <Card
          title="Itinerary"
          subtitle="Add as many days as the journey needs."
          actions={<button type="button" onClick={addDay} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-white"><Plus size={14} /> Add day</button>}
        >
          {form.itinerary.length === 0 && <p className="text-sm text-muted">No days added yet.</p>}
          <div className="grid gap-4">
            {form.itinerary.map((day, i) => (
              <div key={i} className="rounded-2xl border border-black/10 bg-soft/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-wide text-primary">Day {i + 1}</span>
                  <RowControls index={i} total={form.itinerary.length} onMove={(a, b) => set("itinerary", move(form.itinerary, a, b))} onRemove={(idx) => set("itinerary", form.itinerary.filter((_, n) => n !== idx))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field title="Day title"><input value={day.title || ""} onChange={(e) => setDay(i, "title", e.target.value)} className={input} placeholder="Arrival & Orientation" /></Field>
                  <Field title="Day number"><input type="number" min="1" value={day.dayNumber || i + 1} onChange={(e) => setDay(i, "dayNumber", e.target.value)} className={input} /></Field>
                  <Field title="Description" wide><textarea rows="2" value={day.description || ""} onChange={(e) => setDay(i, "description", e.target.value)} className={input} /></Field>
                  <Field title="Morning"><textarea rows="2" value={day.morning || ""} onChange={(e) => setDay(i, "morning", e.target.value)} className={input} /></Field>
                  <Field title="Afternoon"><textarea rows="2" value={day.afternoon || ""} onChange={(e) => setDay(i, "afternoon", e.target.value)} className={input} /></Field>
                  <Field title="Evening"><textarea rows="2" value={day.evening || ""} onChange={(e) => setDay(i, "evening", e.target.value)} className={input} /></Field>
                  <Field title="Day image (optional)">
                    <div className="flex items-center gap-2">
                      {day.imageUrl && <img src={assetUrl(day.imageUrl)} alt="" className="h-11 w-16 rounded-lg object-cover" />}
                      <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={async (e) => { const up = await dayUpload.send(e.target.files?.[0]); if (up) setDay(i, "imageUrl", up.url); }} className="text-xs" />
                    </div>
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gallery */}
        <Card
          title="Gallery"
          subtitle="Shown on the trip detail page. Drag order with the arrows."
          actions={
            <>
              <input ref={galleryInput} type="file" multiple accept=".jpg,.jpeg,.png,.webp" onChange={(e) => addGallery(e.target.files)} className="hidden" />
              <button type="button" onClick={() => galleryInput.current?.click()} disabled={galleryUpload.busy} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-white disabled:opacity-60">
                {galleryUpload.busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add images
              </button>
            </>
          }
        >
          {galleryUpload.error && <p className="mb-3 text-xs font-bold text-rose-600">{galleryUpload.error}</p>}
          {form.gallery.length === 0 && <p className="text-sm text-muted">No gallery images yet.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.gallery.map((g, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-black/10">
                <img src={assetUrl(g.imageUrl)} alt="" className="aspect-[4/3] w-full object-cover" />
                <div className="grid gap-2 p-2.5">
                  <input value={g.altText || ""} onChange={(e) => set("gallery", form.gallery.map((x, n) => (n === i ? { ...x, altText: e.target.value } : x)))} placeholder="Alt text" className="w-full rounded-lg border border-black/10 px-3 py-2 text-xs outline-none focus:border-primary" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wide text-muted">{i === 0 ? "Lead image" : `#${i + 1}`}</span>
                    <RowControls index={i} total={form.gallery.length} onMove={(a, b) => set("gallery", move(form.gallery, a, b))} onRemove={(idx) => set("gallery", form.gallery.filter((_, n) => n !== idx))} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Inclusions / exclusions / audience */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="What's included">
            <SimpleList items={form.inclusions} onChange={(v) => set("inclusions", v)} placeholder="Daily breakfast and prasadam" addLabel="Add inclusion" />
          </Card>
          <Card title="What's not included">
            <SimpleList items={form.exclusions} onChange={(v) => set("exclusions", v)} placeholder="Travel insurance" addLabel="Add exclusion" />
          </Card>
        </div>

        <Card title="Who this is for">
          <SimpleList items={form.whoFor} onChange={(v) => set("whoFor", v)} placeholder="Students" addLabel="Add audience" valueKey={null} />
        </Card>

        <Card title="Important information" subtitle="Reporting time, dress code, ID, cancellation rules.">
          <textarea rows="8" value={form.importantInfo} onChange={(e) => set("importantInfo", e.target.value)} className={input} placeholder="One point per paragraph." />
        </Card>

        {/* FAQs */}
        <Card
          title="FAQs"
          actions={<button type="button" onClick={() => set("faqs", [...form.faqs, { question: "", answer: "", sortOrder: form.faqs.length + 1 }])} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-white"><Plus size={14} /> Add FAQ</button>}
        >
          {form.faqs.length === 0 && <p className="text-sm text-muted">No FAQs yet.</p>}
          <div className="grid gap-3">
            {form.faqs.map((f, i) => (
              <div key={i} className="rounded-2xl border border-black/10 bg-soft/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wide text-primary">FAQ {i + 1}</span>
                  <RowControls index={i} total={form.faqs.length} onMove={(a, b) => set("faqs", move(form.faqs, a, b))} onRemove={(idx) => set("faqs", form.faqs.filter((_, n) => n !== idx))} />
                </div>
                <input value={f.question} onChange={(e) => set("faqs", form.faqs.map((x, n) => (n === i ? { ...x, question: e.target.value } : x)))} placeholder="Question" className={`${input} mb-2`} />
                <textarea rows="3" value={f.answer || ""} onChange={(e) => set("faqs", form.faqs.map((x, n) => (n === i ? { ...x, answer: e.target.value } : x)))} placeholder="Answer" className={input} />
              </div>
            ))}
          </div>
        </Card>

        {/* Payment + PDF */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Payment details" subtitle="Shown to the devotee on the payment step. Leave a section blank to hide it.">
            {/* UPI */}
            <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-primary">Pay by UPI</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="UPI ID"><input value={form.upiId} onChange={(e) => set("upiId", e.target.value)} className={input} placeholder="iskconjuhu@okaxis" /></Field>
              <div className="flex items-end gap-3">
                {form.paymentQrImage && <img src={assetUrl(form.paymentQrImage)} alt="" className="h-20 w-20 shrink-0 rounded-lg border border-black/10 object-contain" />}
                <label className="grid flex-1 gap-1.5">
                  <span className={label}>Payment QR image</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={async (e) => { const up = await qrUpload.send(e.target.files?.[0]); if (up) set("paymentQrImage", up.url); }} className="text-xs" />
                  {form.paymentQrImage && (
                    <button type="button" onClick={() => set("paymentQrImage", "")} className="w-fit text-[11px] font-black text-rose-600">Remove QR</button>
                  )}
                </label>
              </div>
            </div>
            {qrUpload.error && <p className="mt-1.5 text-xs font-bold text-rose-600">{qrUpload.error}</p>}

            {/* Bank */}
            <p className="mb-2 mt-5 text-[10px] font-black uppercase tracking-wide text-primary">Bank transfer</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Account holder name"><input value={form.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} className={input} placeholder="ISKCON Juhu" /></Field>
              <Field title="Account number"><input value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} className={input} placeholder="000000000000" /></Field>
              <Field title="IFSC code"><input value={form.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value.toUpperCase())} className={input} placeholder="XXXX0000000" /></Field>
              <Field title="Bank name"><input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} className={input} placeholder="State Bank of India" /></Field>
              <Field title="Branch (optional)" wide><input value={form.bankBranch} onChange={(e) => set("bankBranch", e.target.value)} className={input} placeholder="Juhu, Mumbai" /></Field>
            </div>

            {/* Help contact */}
            <p className="mb-2 mt-5 text-[10px] font-black uppercase tracking-wide text-primary">Help with payment</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field title="Contact person"><input value={form.paymentContactName} onChange={(e) => set("paymentContactName", e.target.value)} className={input} placeholder="Youth office" /></Field>
              <Field title="Contact number"><input value={form.paymentContactNumber} onChange={(e) => set("paymentContactNumber", e.target.value)} className={input} placeholder="+91 22 2620 6860" /></Field>
            </div>

            {/* Extra note */}
            <p className="mb-2 mt-5 text-[10px] font-black uppercase tracking-wide text-primary">Extra note (optional)</p>
            <textarea rows="3" value={form.paymentInstructions} onChange={(e) => set("paymentInstructions", e.target.value)} className={input} placeholder="Anything else the devotee should know before paying." />
          </Card>

          <Card title="Trip guide PDF" subtitle="Unlocks for devotees once their booking is confirmed.">
            <input ref={pdfInput} type="file" accept=".pdf" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const up = await pdfUpload.send(file, { maxMb: 15, accept: [".pdf"] }); if (up) setForm((f) => ({ ...f, pdfUrl: up.url, pdfName: file.name, pdfSize: file.size, pdfUploadedAt: new Date().toISOString() })); }} className="hidden" />
            {form.pdfUrl ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 p-3">
                <FileText size={20} className="text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-ink">{form.pdfName || "trip-guide.pdf"}</p>
                  <p className="text-xs text-muted">{form.pdfSize ? `${(form.pdfSize / 1024 / 1024).toFixed(1)} MB` : ""}</p>
                </div>
                <a href={assetUrl(form.pdfUrl)} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-muted transition hover:bg-soft hover:text-ink" aria-label="Open"><ExternalLink size={15} /></a>
                <button type="button" onClick={() => pdfInput.current?.click()} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-black text-ink">Replace</button>
                <button type="button" onClick={() => setForm((f) => ({ ...f, pdfUrl: "", pdfName: "", pdfSize: 0 }))} className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50" aria-label="Remove"><Trash2 size={15} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => pdfInput.current?.click()} disabled={pdfUpload.busy} className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-black/15 px-4 py-6 text-sm font-black text-muted transition hover:border-primary hover:text-primary disabled:opacity-60">
                {pdfUpload.busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Upload trip guide PDF
              </button>
            )}
            {pdfUpload.error && <p className="mt-2 text-xs font-bold text-rose-600">{pdfUpload.error}</p>}
          </Card>
        </div>

        {/* Publishing */}
        <Card title="Publishing">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">
              <input type="checkbox" checked={form.showOnHomepage} onChange={(e) => set("showOnHomepage", e.target.checked)} /> Featured on homepage
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">
              <input type="checkbox" checked={form.bookingEnabled} onChange={(e) => set("bookingEnabled", e.target.checked)} /> Booking enabled
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Mark as featured
            </label>
            <Field title="Featured order"><input type="number" value={form.featuredOrder} onChange={(e) => set("featuredOrder", e.target.value)} className={input} /></Field>
            <Field title="SEO title"><input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className={input} /></Field>
            <Field title="SEO description"><input value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} className={input} /></Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => save("draft")} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-black/10 px-6 py-3 text-sm font-black text-ink disabled:opacity-50">
              <Save size={15} /> Save as draft
            </button>
            <button onClick={() => save("published")} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-white disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Publish trip
            </button>
          </div>
        </Card>
      </div>

      {/* Trip table */}
      <h2 className="mb-4 mt-10 text-2xl font-black">All trips</h2>
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Booked</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="px-4 py-10 text-center text-muted">Loading trips...</td></tr>}
            {!loading && trips.length === 0 && <tr><td colSpan="6" className="px-4 py-10 text-center text-muted">No trips created yet.</td></tr>}
            {!loading && trips.map((t) => (
              <tr key={t._id} className="border-t border-black/5 transition hover:bg-soft/20">
                <td className="px-4 py-3">
                  <span className="block font-black text-ink">{t.title}</span>
                  <span className="block text-xs text-muted">{t.destination}</span>
                  {t.showOnHomepage && <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary">Homepage</span>}
                </td>
                <td className="px-4 py-3 text-xs text-body">{tripDates(t.startDate, t.endDate) || "—"}</td>
                <td className="px-4 py-3 text-xs font-black text-ink">{money(t.pricePerPerson)}</td>
                <td className="px-4 py-3 text-xs">
                  <span className="font-black text-ink">{t.seatsTaken}</span>
                  <span className="text-muted"> / {t.maxTravellers}</span>
                  {t.isFull && <span className="ml-1.5 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase text-rose-700">Full</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${t.tripStatus === "published" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>{t.tripStatus}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <button onClick={() => startEdit(t)} className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black text-ink transition hover:border-primary hover:text-primary">Edit</button>
                    <button onClick={() => togglePublish(t)} className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black text-ink transition hover:border-primary hover:text-primary">{t.tripStatus === "published" ? "Unpublish" : "Publish"}</button>
                    <button onClick={() => duplicate(t)} className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black text-ink transition hover:border-primary hover:text-primary">Duplicate</button>
                    <Link to="/admin/pilgrimage-bookings" className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black text-ink transition hover:border-primary hover:text-primary">Bookings</Link>
                    <button onClick={() => remove(t)} className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50" aria-label="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTripsPage;
