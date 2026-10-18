import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight,
  Clock, Download, FileText, MapPin, UserRound, Users, X
} from "lucide-react";
import { apiFetch, assetUrl } from "./api";
import { SEO } from "./components";
import { MediaFallback } from "./mediaFallback";
import { UpcomingClassTile } from "./upcomingClasses";

/* ============================================================
   Sunday classes — public listing and detail
   ------------------------------------------------------------
   Reads the same UpcomingClass records the homepage band uses,
   so a class is created once in the admin panel and appears in
   both places.
   ============================================================ */

const SHELL = "mx-auto w-full max-w-shell px-4 sm:px-6";

const longDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

/* ------------------------------------------------------------------ */

export const ClassesPage = ({ onRegister }) => {
  const [state, setState] = useState({ items: [], loading: true });

  useEffect(() => {
    apiFetch("/upcoming-classes?limit=50")
      .then((d) => setState({ items: d.items || [], loading: false }))
      .catch(() => setState({ items: [], loading: false }));
  }, []);

  /* A class counts as upcoming from midnight on the day itself. */
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isUpcoming = (c) => !c.date || new Date(c.date) >= startOfToday;
  const upcoming = state.items.filter(isUpcoming);
  const past = state.items.filter((c) => !isUpcoming(c)).reverse();

  return (
    <>
      <SEO
        title="Sunday Classes | ISKCON Juhu Self-Excellence"
        description="Weekly Sunday programs with kirtan, class and prasadam at ISKCON Juhu."
      />

      <section className="border-b border-line bg-bg-cream">
        <div className={`${SHELL} py-14 lg:py-20`}>
          <p className="font-ui text-[11px] font-bold uppercase tracking-[0.18em] text-primary">ISKCON Juhu Self-Excellence</p>
          <h1 className="t-h2 mt-3 font-display font-extrabold text-heading">
            Sunday <span className="accent-gradient">Classes</span>
          </h1>
          <p className="mt-3 max-w-xl font-ui text-[15px] leading-[1.65] text-body md:text-[16.5px]">
            Every Sunday brings kirtan, a class from a senior devotee, and prasadam together. Explore a session to see
            what it covers, then register to save your place.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className={`${SHELL} py-12 lg:py-16`}>
          {state.loading && (
            <div className="grid grid-cols-1 gap-6 min-[560px]:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-line bg-white">
                  <div className="h-[190px] w-full animate-pulse bg-line" />
                  <div className="p-5">
                    <div className="h-6 w-4/5 animate-pulse rounded bg-line" />
                    <div className="mt-3 h-3.5 w-full animate-pulse rounded bg-line" />
                    <div className="mt-6 h-11 w-full animate-pulse rounded-full bg-line" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!state.loading && state.items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-bg-cream px-8 py-16 text-center">
              <h2 className="font-display text-[22px] font-bold text-heading">No classes scheduled right now</h2>
              <p className="mx-auto mt-2 max-w-md font-ui text-[14px] leading-[1.6] text-body">
                New Sunday sessions are announced through the year. Write to us and we will let you know when the next
                one opens.
              </p>
              <Link to="/contact" className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-7 font-ui text-[14px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
                Get in touch
              </Link>
            </div>
          )}

          {!state.loading && state.items.length > 0 && (
            <>
              {upcoming.length > 0 && (
                <>
                  <p className="mb-6 font-ui text-[13.5px] text-text-muted">
                    {upcoming.length} upcoming session{upcoming.length === 1 ? "" : "s"}
                  </p>
                  <div className="grid grid-cols-1 gap-6 min-[560px]:grid-cols-2 lg:grid-cols-3">
                    {upcoming.map((item) => (
                      <UpcomingClassTile key={item._id} item={item} onActionClick={onRegister} />
                    ))}
                  </div>
                </>
              )}

              {upcoming.length === 0 && (
                <div className="mb-12 rounded-2xl border border-dashed border-line bg-bg-cream px-8 py-12 text-center">
                  <h2 className="font-display text-[22px] font-bold text-heading">No sessions scheduled yet</h2>
                  <p className="mx-auto mt-2 max-w-md font-ui text-[14px] leading-[1.6] text-body">
                    The next dates have not been announced. Look through recent sessions below to see what a Sunday
                    evening here involves.
                  </p>
                </div>
              )}

              {past.length > 0 && (
                <section className={upcoming.length > 0 ? "mt-16" : ""}>
                  <h2 className="font-display text-[26px] font-bold text-heading">Recent sessions</h2>
                  <p className="mt-1.5 font-ui text-[13.5px] text-text-muted">
                    These have already taken place. Explore one to see how an evening runs.
                  </p>
                  <div className="mt-6 grid grid-cols-1 gap-6 min-[560px]:grid-cols-2 lg:grid-cols-3">
                    {past.map((item) => (
                      <UpcomingClassTile key={item._id} item={item} onActionClick={onRegister} past />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
};

/* ------------------------------------------------------------------ */

const Lightbox = ({ images, index, onClose, onMove }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onMove]);

  const image = images[index];
  if (!image) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Class photograph" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button onClick={onClose} aria-label="Close" className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30">
        <X size={20} />
      </button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onMove(-1); }} aria-label="Previous" className="absolute left-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:left-8"><ChevronLeft size={22} /></button>
          <button onClick={(e) => { e.stopPropagation(); onMove(1); }} aria-label="Next" className="absolute right-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:right-8"><ChevronRight size={22} /></button>
        </>
      )}
      <figure className="max-h-full" onClick={(e) => e.stopPropagation()}>
        <img src={assetUrl(image.imageUrl)} alt={image.altText || ""} className="max-h-[80vh] w-auto rounded-xl object-contain" />
        <figcaption className="mt-3 text-center font-ui text-[13px] text-white/70">
          {image.altText ? `${image.altText} · ` : ""}{index + 1} of {images.length}
        </figcaption>
      </figure>
    </div>
  );
};

const Fact = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="rounded-2xl border border-line bg-white p-4">
      <span className="flex items-center gap-2 font-ui text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
        <Icon size={14} className="text-primary" aria-hidden="true" /> {label}
      </span>
      <p className="mt-1.5 font-ui text-[15px] font-semibold text-heading">{value}</p>
    </div>
  ) : null;

/* ------------------------------------------------------------------ */

export const ClassDetailPage = ({ onRegister }) => {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState(-1);

  useEffect(() => {
    setLoading(true);
    setError("");
    apiFetch(`/upcoming-classes/${slug}`)
      .then((d) => setItem(d.item))
      .catch((err) => setError(err.message || "Class not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className={`${SHELL} py-20`}>
        <div className="h-[300px] w-full animate-pulse rounded-3xl bg-line" />
        <div className="mt-8 h-10 w-2/3 animate-pulse rounded bg-line" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-line" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className={`${SHELL} py-24 text-center`}>
        <h1 className="font-display text-[30px] font-bold text-heading">Class not found</h1>
        <p className="mx-auto mt-3 max-w-md font-ui text-[15px] leading-[1.6] text-body">
          This session may have passed or the link may be out of date.
        </p>
        <Link to="/classes" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 font-ui text-[14px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
          See all classes <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const gallery = (item.gallery || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const schedule = (item.schedule || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const highlights = (item.highlights || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const register = () => (onRegister ? onRegister(item) : null);

  return (
    <>
      <SEO
        title={`${item.title} | Sunday Classes | ISKCON Juhu Self-Excellence`}
        description={item.shortDescription || "A Sunday program with kirtan, class and prasadam at ISKCON Juhu."}
      />

      {/* Hero
          The artwork for a class is often a portrait poster. Cropping one
          into a wide banner throws most of it away, so the image is used
          twice: blurred behind as atmosphere, and again at its own
          proportions in a panel beside the heading, where the whole
          poster stays readable. Landscape artwork sits in the same panel
          perfectly well. */}
      <section className="relative overflow-hidden bg-heading">
        <div className="absolute inset-0" aria-hidden="true">
          {item.image ? (
            <img
              src={assetUrl(item.image)}
              alt=""
              className="h-full w-full scale-110 object-cover opacity-40 blur-2xl"
            />
          ) : (
            <MediaFallback />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-heading/95 via-heading/70 to-heading/50" />
        </div>

        <div className={`${SHELL} relative grid items-center gap-10 py-16 lg:grid-cols-[1fr_320px] lg:gap-14 lg:py-24`}>
          <div className="min-w-0">
          <nav className="mb-5 font-ui text-[12.5px] text-white/70" aria-label="Breadcrumb">
            <Link to="/classes" className="transition-colors hover:text-white">Sunday Classes</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{item.title}</span>
          </nav>

          <h1 className="max-w-3xl font-display text-[32px] font-extrabold leading-[1.06] tracking-[-0.025em] text-white md:text-[46px]">
            {item.title}
          </h1>

          <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-3 font-ui text-[14px] text-white/90">
            {item.date && <li className="inline-flex items-center gap-2"><CalendarDays size={16} aria-hidden="true" /> {longDate(item.date)}</li>}
            {item.time && <li className="inline-flex items-center gap-2"><Clock size={16} aria-hidden="true" /> {item.time}</li>}
            {item.venue && <li className="inline-flex items-center gap-2"><MapPin size={16} aria-hidden="true" /> {item.venue}</li>}
            {item.speaker && <li className="inline-flex items-center gap-2"><UserRound size={16} aria-hidden="true" /> {item.speaker}</li>}
          </ul>

          <div className="mt-8 flex flex-col gap-3 xs:flex-row xs:items-center">
            <button type="button" onClick={register} className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-primary px-8 font-ui text-[15px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
              {item.buttonText || "Register Now"} <ArrowRight size={16} />
            </button>
            {item.pdfUrl && (
              <a
                href={assetUrl(item.pdfUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full border-[1.5px] border-white/40 px-8 font-ui text-[15px] font-semibold text-white transition hover:bg-white hover:text-heading"
              >
                <Download size={16} /> Download details
              </a>
            )}
          </div>
          </div>

          {/* The poster at its own proportions — nothing cropped away. */}
          {item.image && (
            <div className="order-first w-full max-w-[320px] justify-self-center lg:order-none lg:justify-self-end">
              <div className="overflow-hidden rounded-2xl bg-white/5 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/15 backdrop-blur-sm">
                <img
                  src={assetUrl(item.image)}
                  alt={item.title}
                  className="max-h-[420px] w-full rounded-xl object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Body */}
      <div className="bg-white">
        <div className={`${SHELL} grid gap-12 py-14 lg:grid-cols-[1fr_320px] lg:gap-14 lg:py-20`}>
          <div className="min-w-0 space-y-12">
            {(item.fullDescription || item.shortDescription) && (
              <section>
                <p className="font-ui text-[11px] font-bold uppercase tracking-[0.18em] text-primary">About this class</p>
                <h2 className="mt-2 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-heading md:text-[32px]">
                  What this session is
                </h2>
                <div className="mt-5 space-y-4 font-ui text-[15.5px] leading-[1.75] text-body">
                  {(item.fullDescription || item.shortDescription).split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-display text-[24px] font-bold text-heading md:text-[28px]">At a glance</h2>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Fact icon={CalendarDays} label="Date" value={longDate(item.date)} />
                <Fact icon={Clock} label="Time" value={item.time} />
                <Fact icon={MapPin} label="Venue" value={item.venue} />
                <Fact icon={UserRound} label="Speaker" value={item.speaker} />
                <Fact icon={Users} label="Seats" value={item.seats ? `${item.seats} places` : ""} />
              </div>
            </section>

            {item.whatToExpect && (
              <section>
                <h2 className="font-display text-[24px] font-bold text-heading md:text-[28px]">What to expect</h2>
                <div className="mt-5 space-y-3.5 rounded-2xl border border-line bg-bg-cream p-5 font-ui text-[14.5px] leading-[1.7] text-body sm:p-6">
                  {item.whatToExpect.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </section>
            )}

            {schedule.length > 0 && (
              <section>
                <p className="font-ui text-[11px] font-bold uppercase tracking-[0.18em] text-primary">How the evening runs</p>
                <h2 className="mt-2 font-display text-[24px] font-bold text-heading md:text-[28px]">Running order</h2>
                <ol className="mt-5 space-y-3">
                  {schedule.map((row, i) => (
                    <li key={i} className="flex gap-4 rounded-2xl border border-line bg-white p-4">
                      <span className="w-[84px] shrink-0 font-ui text-[13px] font-bold text-primary">{row.time}</span>
                      <span className="min-w-0">
                        <span className="block font-ui text-[15px] font-semibold text-heading">{row.activity}</span>
                        {row.detail && <span className="mt-1 block font-ui text-[13.5px] leading-[1.6] text-body">{row.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {highlights.length > 0 && (
              <section>
                <h2 className="font-display text-[24px] font-bold text-heading md:text-[28px]">What you take away</h2>
                <ul className="mt-5 space-y-2.5">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex gap-3 font-ui text-[14.5px] leading-[1.55] text-body">
                      <Check size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      {h.title}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(item.whoFor || []).length > 0 && (
              <section>
                <h2 className="font-display text-[24px] font-bold text-heading md:text-[28px]">Who this is for</h2>
                <ul className="mt-5 flex flex-wrap gap-2.5">
                  {item.whoFor.map((w) => (
                    <li key={w} className="rounded-full border border-line bg-bg-cream px-4 py-2 font-ui text-[13.5px] font-medium text-body">{w}</li>
                  ))}
                </ul>
              </section>
            )}

            {gallery.length > 0 && (
              <section>
                <p className="font-ui text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Photographs</p>
                <h2 className="mt-2 font-display text-[24px] font-bold text-heading md:text-[28px]">From previous sessions</h2>
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {gallery.map((g, i) => (
                    <button key={i} type="button" onClick={() => setLightbox(i)} className="group relative overflow-hidden rounded-xl bg-bg-warm" aria-label={`Open photograph ${i + 1}`}>
                      <img src={assetUrl(g.imageUrl)} alt={g.altText || ""} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {item.notes && (
              <section>
                <h2 className="font-display text-[24px] font-bold text-heading md:text-[28px]">Good to know</h2>
                <div className="mt-5 space-y-3 rounded-2xl border border-line bg-bg-cream p-5 font-ui text-[14.5px] leading-[1.7] text-body sm:p-6">
                  {item.notes.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </section>
            )}
          </div>

          {/* Register panel */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="font-display text-[20px] font-bold text-heading">Save your place</h2>
              <dl className="mt-4 grid gap-2.5 border-t border-line pt-4 font-ui text-[13.5px]">
                {item.date && <div className="flex justify-between gap-3"><dt className="text-text-muted">Date</dt><dd className="text-right font-semibold text-heading">{longDate(item.date)}</dd></div>}
                {item.time && <div className="flex justify-between gap-3"><dt className="text-text-muted">Time</dt><dd className="text-right font-semibold text-heading">{item.time}</dd></div>}
                {item.venue && <div className="flex justify-between gap-3"><dt className="text-text-muted">Venue</dt><dd className="text-right font-semibold text-heading">{item.venue}</dd></div>}
              </dl>

              <button type="button" onClick={register} className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary font-ui text-[15px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
                {item.buttonText || "Register Now"} <ArrowRight size={16} />
              </button>

              {item.registrationNote && (
                <p className="mt-3 font-ui text-[12.5px] leading-[1.55] text-text-muted">{item.registrationNote}</p>
              )}

              {item.pdfUrl && (
                <a href={assetUrl(item.pdfUrl)} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-primary">
                  <FileText size={20} className="shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-ui text-[13px] font-semibold text-heading">{item.pdfName || "Class details"}</span>
                    <span className="block font-ui text-[11.5px] text-text-muted">
                      PDF{item.pdfSize ? ` · ${(item.pdfSize / 1024).toFixed(0)} KB` : ""}
                    </span>
                  </span>
                  <Download size={16} className="shrink-0 text-text-muted" />
                </a>
              )}
            </div>

            <Link to="/classes" className="mt-4 inline-flex items-center gap-1.5 font-ui text-[13px] font-semibold text-text-muted transition-colors hover:text-primary">
              <ArrowLeft size={14} /> All Sunday classes
            </Link>
          </aside>
        </div>
      </div>

      {lightbox >= 0 && (
        <Lightbox
          images={gallery}
          index={lightbox}
          onClose={() => setLightbox(-1)}
          onMove={(d) => setLightbox((i) => (i + d + gallery.length) % gallery.length)}
        />
      )}
    </>
  );
};

export default ClassesPage;
