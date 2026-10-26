import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, FileText, Loader2, Plus, Save, Trash2, ExternalLink } from "lucide-react";
import { apiFetch, assetUrl, uploadFile } from "./api";
import { SEO } from "./components";
import { usePermissions } from "./usePermissions";

/* ============================================================
   Admin — Sunday classes
   ------------------------------------------------------------
   The generic CRUD form cannot express the repeating groups a
   class needs (running order, highlights, gallery), so classes
   get their own builder. It still writes through the existing
   /api/admin/upcoming-classes routes and the shared uploader.
   ============================================================ */

const input = "w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-primary";
const label = "block text-[10px] font-black uppercase tracking-wide text-muted";

/* The handout is meant to be a one-pager, so keep it small. */
const PDF_MAX_MB = 1;

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

const move = (list, from, to) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next.map((v, i) => (typeof v === "string" ? v : { ...v, sortOrder: i + 1 }));
};

const RowControls = ({ index, total, onMove, onRemove }) => (
  <div className="flex shrink-0 items-center gap-1">
    <button type="button" onClick={() => onMove(index, index - 1)} disabled={index === 0} className="rounded-lg p-1.5 text-muted transition hover:bg-soft hover:text-ink disabled:opacity-30" aria-label="Move up"><ArrowUp size={14} /></button>
    <button type="button" onClick={() => onMove(index, index + 1)} disabled={index === total - 1} className="rounded-lg p-1.5 text-muted transition hover:bg-soft hover:text-ink disabled:opacity-30" aria-label="Move down"><ArrowDown size={14} /></button>
    <button type="button" onClick={() => onRemove(index)} className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50" aria-label="Remove"><Trash2 size={14} /></button>
  </div>
);

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

const BLANK = {
  title: "", slug: "", image: "", date: "", time: "", venue: "", speaker: "",
  shortDescription: "", fullDescription: "", whatToExpect: "", notes: "",
  schedule: [], highlights: [], whoFor: [], gallery: [],
  pdfUrl: "", pdfName: "", pdfSize: 0,
  registrationNote: "", seats: "",
  videoUrl: "", youtubeUrl: "",
  buttonText: "Register Now", buttonLink: "",
  status: "active", showOnHomepage: true, sortOrder: 0,
  seoTitle: "", seoDescription: ""
};

const dateValue = (v) => (v ? String(v).slice(0, 10) : "");

export const AdminClassesPage = () => {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [uploadError, setUploadError] = useState("");
  const galleryInput = useRef(null);
  const pdfInput = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiFetch("/admin/upcoming-classes?limit=100");
      setItems(d.items || []);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const upload = async (file, folder, { maxMb = 5, accept = [".jpg", ".jpeg", ".png", ".webp"] } = {}) => {
    setUploadError("");
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!accept.includes(ext)) {
      setUploadError(`Allowed formats: ${accept.join(", ")}`);
      return null;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setUploadError(`File is too large. Maximum ${maxMb}MB.`);
      return null;
    }
    setBusy(folder);
    try {
      return await uploadFile(file, folder);
    } catch (e) {
      setUploadError(e.message || "Upload failed");
      return null;
    } finally {
      setBusy("");
    }
  };

  const startEdit = (item) => {
    setEditing(item._id);
    setForm({
      ...BLANK,
      ...item,
      date: dateValue(item.date),
      schedule: item.schedule || [],
      highlights: item.highlights || [],
      whoFor: item.whoFor || [],
      gallery: item.gallery || [],
      seats: item.seats || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setEditing(null);
    setForm(BLANK);
  };

  const save = async () => {
    if (editing && !canEdit("upcoming-classes")) {
      setNotice("You do not have permission to edit classes.");
      return;
    }
    if (!editing && !canCreate("upcoming-classes")) {
      setNotice("You do not have permission to create classes.");
      return;
    }
    if (!form.title.trim()) {
      setNotice("A class needs a title.");
      return;
    }
    setSaving(true);
    setNotice("");
    const payload = {
      ...form,
      seats: Number(form.seats) || 0,
      sortOrder: Number(form.sortOrder) || 0,
      date: form.date || undefined,
      whoFor: (form.whoFor || []).filter(Boolean),
      highlights: (form.highlights || []).filter((x) => x.title?.trim()),
      schedule: (form.schedule || []).filter((x) => x.time?.trim() || x.activity?.trim()).map((x, i) => ({ ...x, sortOrder: i + 1 })),
      gallery: (form.gallery || []).map((g, i) => ({ ...g, sortOrder: i + 1 }))
    };
    try {
      if (editing) await apiFetch(`/admin/upcoming-classes/${editing}`, { method: "PUT", body: payload });
      else await apiFetch("/admin/upcoming-classes", { method: "POST", body: payload });
      setNotice(editing ? "Class saved." : "Class created.");
      reset();
      load();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!canDelete("upcoming-classes")) {
      setNotice("You do not have permission to delete classes.");
      return;
    }
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      await apiFetch(`/admin/upcoming-classes/${item._id}`, { method: "DELETE" });
      setNotice("Class deleted.");
      load();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const addGallery = async (files) => {
    for (const file of Array.from(files || [])) {
      const up = await upload(file, "class-gallery");
      if (up) setForm((f) => ({ ...f, gallery: [...f.gallery, { imageUrl: up.url, altText: "", sortOrder: f.gallery.length + 1 }] }));
    }
  };

  const addDay = () => set("schedule", [...form.schedule, { time: "", activity: "", detail: "", sortOrder: form.schedule.length + 1 }]);
  const setRow = (i, k, v) => set("schedule", form.schedule.map((r, n) => (n === i ? { ...r, [k]: v } : r)));

  return (
    <div>
      <SEO title="Sunday Classes - Admin" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">{editing ? "Edit Class" : "Create Class"}</h1>
        {editing && (
          <div className="flex gap-2">
            {form.slug && (
              <Link to={`/classes/${form.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-xs font-black text-ink transition hover:border-primary hover:text-primary">
                <Eye size={14} /> Preview
              </Link>
            )}
            <button onClick={reset} className="rounded-full px-4 py-2 text-xs font-black text-primary">Cancel edit</button>
          </div>
        )}
      </div>

      {notice && <p className="mb-5 rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary">{notice}</p>}
      {uploadError && <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{uploadError}</p>}

      <div className="grid gap-5">
        <Card title="Class details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field title="Title"><input value={form.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Idol Worship or Divine Connection" /></Field>
            <Field title="Slug (leave blank to generate)"><input value={form.slug} onChange={(e) => set("slug", e.target.value)} className={input} /></Field>
            <Field title="Date"><input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={input} /></Field>
            <Field title="Time"><input value={form.time} onChange={(e) => set("time", e.target.value)} className={input} placeholder="6 PM to 9 PM" /></Field>
            <Field title="Venue"><input value={form.venue} onChange={(e) => set("venue", e.target.value)} className={input} placeholder="ISKCON Juhu Auditorium" /></Field>
            <Field title="Speaker"><input value={form.speaker} onChange={(e) => set("speaker", e.target.value)} className={input} placeholder="HG Radheshyam Das" /></Field>
            <Field title="Seats (0 = unlimited)"><input type="number" min="0" value={form.seats} onChange={(e) => set("seats", e.target.value)} className={input} /></Field>
            <Field title="Register button text"><input value={form.buttonText} onChange={(e) => set("buttonText", e.target.value)} className={input} placeholder="Register Now" /></Field>
            <Field title="Video URL (YouTube or Livestream)" wide><input value={form.videoUrl || form.youtubeUrl || ""} onChange={(e) => { set("videoUrl", e.target.value); set("youtubeUrl", e.target.value); }} className={input} placeholder="e.g. http://www.youtube.com/watch?v=..." /></Field>
            <Field title="Short description (card)" wide><textarea rows="2" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={input} /></Field>
            <Field title="Full description" wide><textarea rows="6" value={form.fullDescription} onChange={(e) => set("fullDescription", e.target.value)} className={input} placeholder="Blank lines separate paragraphs." /></Field>
          </div>
        </Card>

        <Card title="Main image" subtitle="Used on the class card and detail hero.">
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 border border-amber-200/70">
              📐 Recommended: 1200 × 800 px (3:2 ratio) or 1920 × 1080 px (16:9 ratio)
            </span>
          </div>
          <div className="flex flex-wrap items-start gap-4">
            {form.image && <img src={assetUrl(form.image)} alt="" className="h-28 w-44 rounded-xl border border-black/10 object-cover" />}
            <div className="grid gap-2">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={async (e) => { const up = await upload(e.target.files?.[0], "classes"); if (up) set("image", up.url); }} className="text-sm" />
              <input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="or paste a URL" className={input} />
              {busy === "classes" && <p className="text-xs text-muted">Uploading…</p>}
            </div>
          </div>
        </Card>

        <Card title="What to expect" subtitle="What happens in the session, in plain words.">
          <textarea rows="6" value={form.whatToExpect} onChange={(e) => set("whatToExpect", e.target.value)} className={input} placeholder="Blank lines separate paragraphs." />
        </Card>

        <Card
          title="Running order"
          subtitle="The evening hour by hour."
          actions={<button type="button" onClick={addDay} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-white"><Plus size={14} /> Add row</button>}
        >
          {form.schedule.length === 0 && <p className="text-sm text-muted">No rows yet.</p>}
          <div className="grid gap-3">
            {form.schedule.map((row, i) => (
              <div key={i} className="rounded-2xl border border-black/10 bg-soft/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wide text-primary">Row {i + 1}</span>
                  <RowControls index={i} total={form.schedule.length} onMove={(a, b) => set("schedule", move(form.schedule, a, b))} onRemove={(idx) => set("schedule", form.schedule.filter((_, n) => n !== idx))} />
                </div>
                <div className="grid gap-3 md:grid-cols-[140px_1fr]">
                  <Field title="Time"><input value={row.time || ""} onChange={(e) => setRow(i, "time", e.target.value)} className={input} placeholder="6:00 PM" /></Field>
                  <Field title="Activity"><input value={row.activity || ""} onChange={(e) => setRow(i, "activity", e.target.value)} className={input} placeholder="Kirtan" /></Field>
                  <Field title="Detail (optional)" wide><input value={row.detail || ""} onChange={(e) => setRow(i, "detail", e.target.value)} className={input} /></Field>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="What you take away"><SimpleList items={form.highlights} onChange={(v) => set("highlights", v)} placeholder="A practical takeaway" addLabel="Add point" /></Card>
          <Card title="Who this is for"><SimpleList items={form.whoFor} onChange={(v) => set("whoFor", v)} placeholder="Students" addLabel="Add audience" valueKey={null} /></Card>
        </div>

        <Card
          title="Gallery"
          subtitle="Photographs from previous sessions. Recommended: 1200 × 900 px (4:3 ratio) or 1200 × 800 px (3:2 ratio)."
          actions={
            <>
              <input ref={galleryInput} type="file" multiple accept=".jpg,.jpeg,.png,.webp" onChange={(e) => addGallery(e.target.files)} className="hidden" />
              <button type="button" onClick={() => galleryInput.current?.click()} disabled={busy === "class-gallery"} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-white disabled:opacity-60">
                {busy === "class-gallery" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add photos
              </button>
            </>
          }
        >
          {form.gallery.length === 0 && <p className="text-sm text-muted">No photographs yet.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.gallery.map((g, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-black/10">
                <img src={assetUrl(g.imageUrl)} alt="" className="aspect-[4/3] w-full object-cover" />
                <div className="grid gap-2 p-2.5">
                  <input value={g.altText || ""} onChange={(e) => set("gallery", form.gallery.map((x, n) => (n === i ? { ...x, altText: e.target.value } : x)))} placeholder="Alt text" className="w-full rounded-lg border border-black/10 px-3 py-2 text-xs outline-none focus:border-primary" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wide text-muted">#{i + 1}</span>
                    <RowControls index={i} total={form.gallery.length} onMove={(a, b) => set("gallery", move(form.gallery, a, b))} onRemove={(idx) => set("gallery", form.gallery.filter((_, n) => n !== idx))} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Attachment" subtitle={`A handout devotees can download. PDF, up to ${PDF_MAX_MB}MB.`}>
          <input
            ref={pdfInput}
            type="file"
            accept=".pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const up = await upload(file, "class-handouts", { maxMb: PDF_MAX_MB, accept: [".pdf"] });
              if (up) setForm((f) => ({ ...f, pdfUrl: up.url, pdfName: file.name, pdfSize: file.size, pdfUploadedAt: new Date().toISOString() }));
            }}
            className="hidden"
          />
          {form.pdfUrl ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 p-3">
              <FileText size={20} className="text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-ink">{form.pdfName || "handout.pdf"}</p>
                <p className="text-xs text-muted">{form.pdfSize ? `${(form.pdfSize / 1024).toFixed(0)} KB` : ""}</p>
              </div>
              <a href={assetUrl(form.pdfUrl)} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-muted transition hover:bg-soft hover:text-ink" aria-label="Open"><ExternalLink size={15} /></a>
              <button type="button" onClick={() => pdfInput.current?.click()} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-black text-ink">Replace</button>
              <button type="button" onClick={() => setForm((f) => ({ ...f, pdfUrl: "", pdfName: "", pdfSize: 0 }))} className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50" aria-label="Remove"><Trash2 size={15} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => pdfInput.current?.click()} disabled={busy === "class-handouts"} className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-black/15 px-4 py-6 text-sm font-black text-muted transition hover:border-primary hover:text-primary disabled:opacity-60">
              {busy === "class-handouts" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Upload PDF handout
            </button>
          )}
        </Card>

        <Card title="Good to know & publishing">
          <textarea rows="4" value={form.notes} onChange={(e) => set("notes", e.target.value)} className={input} placeholder="Dress code, what to bring, parking..." />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field title="Registration note" wide><input value={form.registrationNote} onChange={(e) => set("registrationNote", e.target.value)} className={input} placeholder="Shown under the register button." /></Field>
            <label className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3 text-sm font-bold">
              <input type="checkbox" checked={form.showOnHomepage} onChange={(e) => set("showOnHomepage", e.target.checked)} /> Show on homepage
            </label>
            <Field title="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={input}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field title="Sort order"><input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} className={input} /></Field>
          </div>
          <button onClick={save} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-white disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {editing ? "Save class" : "Create class"}
          </button>
        </Card>
      </div>

      <h2 className="mb-4 mt-10 text-2xl font-black">All classes</h2>
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-ink text-white">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Speaker</th>
              <th className="px-4 py-3">Extras</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="px-4 py-10 text-center text-muted">Loading classes...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="6" className="px-4 py-10 text-center text-muted">No classes created yet.</td></tr>}
            {!loading && items.map((c) => (
              <tr key={c._id} className="border-t border-black/5 transition hover:bg-soft/20">
                <td className="px-4 py-3">
                  <span className="block font-black text-ink">{c.title}</span>
                  <span className="block text-xs text-muted">{c.venue}</span>
                </td>
                <td className="px-4 py-3 text-xs text-body">{c.date ? new Date(c.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                <td className="px-4 py-3 text-xs text-body">{c.speaker || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted">
                  {(c.gallery || []).length > 0 && <span className="mr-2">{c.gallery.length} photos</span>}
                  {c.pdfUrl && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase text-primary">PDF</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${c.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {canEdit("upcoming-classes") && (
                      <button onClick={() => startEdit(c)} className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black text-ink transition hover:border-primary hover:text-primary">Edit</button>
                    )}
                    {canDelete("upcoming-classes") && (
                      <button onClick={() => remove(c)} className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50" aria-label="Delete"><Trash2 size={14} /></button>
                    )}
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

export default AdminClassesPage;
