import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight, BedDouble, Bus, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Download, MapPin, Minus, Users, X
} from "lucide-react";
import { apiFetch, assetUrl } from "./api";
import { useAuth } from "./AuthContext";
import { MediaFallback } from "./mediaFallback";
import { money, tripDates, durationOf } from "./trips";
import { SEO } from "./components";

/* ============================================================
   Trip detail — the full page a devotee reads before booking
   ------------------------------------------------------------
   Sections: hero, overview, quick info, itinerary, gallery,
   inclusions / exclusions, who it suits, important information,
   FAQs, and a booking panel that sticks on desktop.
   ============================================================ */

const SHELL = "mx-auto w-full max-w-shell px-4 sm:px-6";

const Section = ({ id, eyebrow, title, children, className = "" }) => (
  <section id={id} className={`scroll-mt-28 ${className}`}>
    {eyebrow && <p className="font-ui text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
    {title && <h2 className="mt-2 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-heading md:text-[34px]">{title}</h2>}
    <div className={title ? "mt-6" : ""}>{children}</div>
  </section>
);

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
    <div role="dialog" aria-modal="true" aria-label="Trip photograph" className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button onClick={onClose} aria-label="Close" className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30">
        <X size={20} />
      </button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onMove(-1); }} aria-label="Previous photograph" className="absolute left-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:left-8">
            <ChevronLeft size={22} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove(1); }} aria-label="Next photograph" className="absolute right-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:right-8">
            <ChevronRight size={22} />
          </button>
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

/* ------------------------------------------------------------------ */

const QuickFact = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="rounded-2xl border border-line bg-white p-4">
      <span className="flex items-center gap-2 font-ui text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
        <Icon size={14} className="text-primary" aria-hidden="true" /> {label}
      </span>
      <p className="mt-1.5 font-ui text-[15px] font-semibold text-heading">{value}</p>
    </div>
  ) : null;

const Faq = ({ faq }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className="font-display text-[17px] font-semibold text-heading md:text-[18px]">{faq.question}</span>
        <ChevronDown size={18} className={`shrink-0 text-primary transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <p className="whitespace-pre-line pb-5 font-ui text-[14.5px] leading-[1.7] text-body">{faq.answer}</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ */

const BOOKING_MESSAGE = {
  disabled: "Bookings are not open for this journey.",
  not_open: "Bookings have not opened yet.",
  closed: "Bookings for this journey have closed.",
  departed: "This journey has already departed.",
  full: "This journey is fully booked."
};

const BookingPanel = ({ trip, onBook, myStatus }) => {
  const price = trip.discountPrice > 0 ? trip.discountPrice : trip.pricePerPerson;
  const dates = tripDates(trip.startDate, trip.endDate);

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <span className="font-ui text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">From</span>
      <p className="mt-1 flex items-baseline gap-2.5">
        <span className="font-display text-[34px] font-extrabold leading-none text-primary">{money(price)}</span>
        {trip.discountPrice > 0 && trip.discountPrice < trip.pricePerPerson && (
          <span className="font-ui text-[15px] text-text-muted line-through">{money(trip.pricePerPerson)}</span>
        )}
      </p>
      <p className="mt-1 font-ui text-[12.5px] text-text-muted">per person</p>

      <dl className="mt-5 grid gap-2.5 border-t border-line pt-5 font-ui text-[13.5px]">
        {dates && <div className="flex justify-between gap-3"><dt className="text-text-muted">Dates</dt><dd className="text-right font-semibold text-heading">{dates}</dd></div>}
        {durationOf(trip) && <div className="flex justify-between gap-3"><dt className="text-text-muted">Duration</dt><dd className="text-right font-semibold text-heading">{durationOf(trip)}</dd></div>}
        {trip.destination && <div className="flex justify-between gap-3"><dt className="text-text-muted">Destination</dt><dd className="text-right font-semibold text-heading">{trip.destination}</dd></div>}
        <div className="flex justify-between gap-3">
          <dt className="text-text-muted">Seats left</dt>
          <dd className={`text-right font-semibold ${trip.isFull ? "text-primary" : "text-heading"}`}>
            {trip.isFull ? "Fully booked" : `${trip.seatsLeft} of ${trip.maxTravellers}`}
          </dd>
        </div>
      </dl>

      {myStatus === "approved" ? (
        <div className="mt-6">
          <p className="rounded-xl bg-emerald-50 px-4 py-3 font-ui text-[13px] font-semibold text-emerald-800">
            You are already booked on this journey.
          </p>
          <Link to="/student/my-trips" className="mt-3 flex h-[52px] items-center justify-center gap-2 rounded-full bg-primary font-ui text-[15px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
            View my trip <ArrowRight size={16} />
          </Link>
        </div>
      ) : myStatus === "pending" ? (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 font-ui text-[13px] font-semibold text-amber-800">
          Your booking is currently under verification.
        </p>
      ) : trip.canBook ? (
        <button type="button" onClick={onBook} className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary font-ui text-[15px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
          Book Now <ArrowRight size={16} />
        </button>
      ) : (
        <p className="mt-6 rounded-xl bg-bg-warm px-4 py-3 text-center font-ui text-[13px] font-semibold text-body">
          {BOOKING_MESSAGE[trip.bookingState] || "Bookings are closed."}
        </p>
      )}

      <p className="mt-3 text-center font-ui text-[11.5px] text-text-muted">
        Confirmed by our team once your payment is verified.
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const TripDetailPage = ({ onBook }) => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState(-1);
  const [myStatus, setMyStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    apiFetch(`/trips/${slug}`)
      .catch(() => apiFetch(`/journeys/${slug}`))
      .then((data) => {
        if (cancelled) return;
        const item = data.item;
        if (item) {
          // Normalize Journey schema fields if fetched from /journeys/:slug
          const normalized = {
            ...item,
            image: item.image || item.mainImage,
            days: item.days || item.durationDays,
            nights: item.nights || item.durationNights,
            pricePerPerson: item.pricePerPerson ?? item.basePrice,
            visitDetail: item.visitDetail || item.templeVisits,
            guideDetail: item.guideDetail || item.guideNames,
            routeDetail: item.routeDetail || item.routeText || item.route
          };
          setTrip(normalized);
        }
      })
      .catch((err) => !cancelled && setError(err.message || "Trip not found"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  /* Has this devotee already booked it? Drives the panel's state. */
  useEffect(() => {
    if (!user || !trip?._id) return;
    apiFetch("/pilgrimage-bookings/my-bookings")
      .then((data) => {
        const mine = (data.items || []).find((b) => String(b.pilgrimage?._id || b.pilgrimage) === String(trip._id));
        if (mine) setMyStatus(["pending", "payment_submitted"].includes(mine.status) ? "pending" : mine.status);
      })
      .catch(() => {});
  }, [user, trip?._id]);

  const handleBook = useCallback(() => {
    if (!user) {
      /* Send them back here once they have signed in. */
      navigate(`/login?next=${encodeURIComponent(`/trips/${slug}`)}`);
      return;
    }
    onBook?.(trip);
  }, [user, navigate, slug, onBook, trip]);

  const gallery = (trip?.gallery || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const itinerary = (trip?.itinerary || []).slice().sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0));
  const inclusions = (trip?.inclusions || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const exclusions = (trip?.exclusions || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const faqs = (trip?.faqs || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  if (loading) {
    return (
      <div className={`${SHELL} py-20`}>
        <div className="h-[320px] w-full animate-pulse rounded-3xl bg-line" />
        <div className="mt-8 h-10 w-2/3 animate-pulse rounded bg-line" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-line" />
        <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-line" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className={`${SHELL} py-24 text-center`}>
        <h1 className="font-display text-[30px] font-bold text-heading">Journey not found</h1>
        <p className="mx-auto mt-3 max-w-md font-ui text-[15px] leading-[1.6] text-body">
          This journey may have been unpublished or the link may be out of date.
        </p>
        <Link to="/trips" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 font-ui text-[14px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
          Browse all journeys <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const dates = tripDates(trip.startDate, trip.endDate);

  return (
    <>
      <SEO
        title={`${trip.title}${trip.destination ? ` · ${trip.destination}` : ""} | ISKCON Juhu Self-Excellence`}
        description={trip.shortDescription || `A guided pilgrimage to ${trip.destination || "a sacred destination"}.`}
      />

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden bg-heading">
        <div className="absolute inset-0" aria-hidden="true">
          {trip.image ? (
            <img src={assetUrl(trip.image)} alt="" className="h-full w-full object-cover opacity-70" />
          ) : (
            <MediaFallback />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-heading/95 via-heading/55 to-heading/25" />
        </div>

        <div className={`${SHELL} relative py-16 lg:py-24`}>
          <nav className="mb-5 font-ui text-[12.5px] text-white/70" aria-label="Breadcrumb">
            <Link to="/trips" className="transition-colors hover:text-white">Trips</Link>
            <span className="mx-2">/</span>
            <span className="text-white">{trip.title}</span>
          </nav>

          {trip.tripType && (
            <span className="inline-block rounded-md bg-white/15 px-3 py-1.5 font-ui text-[10.5px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              {trip.tripType}
            </span>
          )}

          <h1 className="mt-4 max-w-3xl font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.025em] text-white md:text-[48px] lg:text-[56px]">
            {trip.title}
          </h1>

          <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-3 font-ui text-[14px] text-white/90">
            {trip.destination && <li className="inline-flex items-center gap-2"><MapPin size={16} aria-hidden="true" /> {trip.destination}</li>}
            {durationOf(trip) && <li className="inline-flex items-center gap-2"><Clock size={16} aria-hidden="true" /> {durationOf(trip)}</li>}
            {dates && <li className="inline-flex items-center gap-2"><CalendarDays size={16} aria-hidden="true" /> {dates}</li>}
            <li className="inline-flex items-center gap-2">
              <Users size={16} aria-hidden="true" />
              {trip.isFull ? "Fully booked" : `${trip.seatsLeft} of ${trip.maxTravellers} seats left`}
            </li>
          </ul>

          <div className="mt-8 flex flex-col gap-3 xs:flex-row xs:items-center">
            {trip.canBook && myStatus !== "approved" && myStatus !== "pending" && (
              <button type="button" onClick={handleBook} className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-primary px-8 font-ui text-[15px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
                Book Now <ArrowRight size={16} />
              </button>
            )}
            {trip.hasPdf && (
              <Link to={user ? "/student/my-trips" : `/login?next=${encodeURIComponent(`/trips/${slug}`)}`} className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full border-[1.5px] border-white/40 px-8 font-ui text-[15px] font-semibold text-white transition hover:bg-white hover:text-heading">
                <Download size={16} /> Trip guide
              </Link>
            )}
          </div>
          {trip.hasPdf && (
            <p className="mt-2.5 font-ui text-[12px] text-white/60">The complete trip guide unlocks once your booking is confirmed.</p>
          )}
        </div>
      </section>

      {/* ---- Body ---- */}
      <div className="bg-white">
        <div className={`${SHELL} grid gap-12 py-14 lg:grid-cols-[1fr_360px] lg:gap-14 lg:py-20`}>
          <div className="min-w-0 space-y-14">
            {trip.description && (
              <Section eyebrow="About this journey" title="What this journey is">
                <div className="space-y-4 font-ui text-[15.5px] leading-[1.75] text-body">
                  {trip.description.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </Section>
            )}

            <Section title="At a glance">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <QuickFact icon={MapPin} label="Destination" value={trip.destination} />
                <QuickFact icon={Clock} label="Duration" value={durationOf(trip)} />
                <QuickFact icon={CalendarDays} label="Departure" value={trip.startDate ? new Date(trip.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""} />
                <QuickFact icon={CalendarDays} label="Return" value={trip.endDate ? new Date(trip.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""} />
                <QuickFact icon={Users} label="Group size" value={trip.maxTravellers ? `${trip.maxTravellers} participants` : ""} />
                <QuickFact icon={Users} label="Age group" value={trip.ageGroup} />
                <QuickFact icon={BedDouble} label="Accommodation" value={trip.accommodation} />
                <QuickFact icon={Bus} label="Transport" value={trip.transport} />
                <QuickFact icon={MapPin} label="Departs from" value={trip.departurePoint} />
              </div>
            </Section>

            {itinerary.length > 0 && (
              <Section eyebrow="Day by day" title="Itinerary">
                <ol className="space-y-5">
                  {itinerary.map((day) => (
                    <li key={day.dayNumber} className="relative rounded-2xl border border-line bg-bg-cream p-5 sm:p-6">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <span className="font-ui text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                          Day {String(day.dayNumber).padStart(2, "0")}
                        </span>
                        {day.title && <h3 className="font-display text-[20px] font-bold text-heading">{day.title}</h3>}
                      </div>
                      {day.description && <p className="mt-2 font-ui text-[14.5px] leading-[1.65] text-body">{day.description}</p>}

                      {(day.morning || day.afternoon || day.evening) && (
                        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                          {[["Morning", day.morning], ["Afternoon", day.afternoon], ["Evening", day.evening]]
                            .filter(([, v]) => v)
                            .map(([label, v]) => (
                              <div key={label} className="rounded-xl bg-white p-3.5">
                                <dt className="font-ui text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary">{label}</dt>
                                <dd className="mt-1 font-ui text-[13.5px] leading-[1.6] text-body">{v}</dd>
                              </div>
                            ))}
                        </dl>
                      )}

                      {day.imageUrl && (
                        <img src={assetUrl(day.imageUrl)} alt="" loading="lazy" className="mt-4 h-48 w-full rounded-xl object-cover" />
                      )}
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {gallery.length > 0 && (
              <Section eyebrow="Photographs" title="What the journey looks like">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {gallery.map((g, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox(i)}
                      className={`group relative overflow-hidden rounded-xl bg-bg-warm ${i === 0 ? "col-span-2 row-span-2 md:col-span-2" : ""}`}
                      aria-label={`Open photograph ${i + 1}`}
                    >
                      <img src={assetUrl(g.imageUrl)} alt={g.altText || ""} loading="lazy" className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${i === 0 ? "aspect-[4/3]" : "aspect-square"}`} />
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div className="grid gap-8 sm:grid-cols-2">
                {inclusions.length > 0 && (
                  <Section title="What's included">
                    <ul className="space-y-2.5">
                      {inclusions.map((item, i) => (
                        <li key={i} className="flex gap-3 font-ui text-[14.5px] leading-[1.55] text-body">
                          <Check size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                          {item.title}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {exclusions.length > 0 && (
                  <Section title="What's not included">
                    <ul className="space-y-2.5">
                      {exclusions.map((item, i) => (
                        <li key={i} className="flex gap-3 font-ui text-[14.5px] leading-[1.55] text-body">
                          <Minus size={17} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
                          {item.title}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            )}

            {(trip.whoFor || []).length > 0 && (
              <Section title="Who this is for">
                <ul className="flex flex-wrap gap-2.5">
                  {trip.whoFor.map((w) => (
                    <li key={w} className="rounded-full border border-line bg-bg-cream px-4 py-2 font-ui text-[13.5px] font-medium text-body">{w}</li>
                  ))}
                </ul>
              </Section>
            )}

            {trip.importantInfo && (
              <Section eyebrow="Before you book" title="Things to know">
                <div className="space-y-3.5 rounded-2xl border border-line bg-bg-cream p-5 font-ui text-[14.5px] leading-[1.7] text-body sm:p-6">
                  {trip.importantInfo.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </Section>
            )}

            {faqs.length > 0 && (
              <Section title="Questions people ask">
                <div className="border-t border-line">
                  {faqs.map((faq, i) => <Faq key={i} faq={faq} />)}
                </div>
              </Section>
            )}
          </div>

          {/* ---- Booking panel ---- */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <BookingPanel trip={trip} onBook={handleBook} myStatus={myStatus} />
          </aside>
        </div>
      </div>

      {/* Mobile booking bar */}
      {trip.canBook && myStatus !== "approved" && myStatus !== "pending" && (
        <div className="sticky bottom-0 z-40 border-t border-line bg-white/97 px-4 py-3 backdrop-blur-[12px] lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-ui text-[11px] text-text-muted">From</span>
              <span className="font-display text-[20px] font-extrabold leading-none text-primary">
                {money(trip.discountPrice > 0 ? trip.discountPrice : trip.pricePerPerson)}
              </span>
            </span>
            <button type="button" onClick={handleBook} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 font-ui text-[14.5px] font-semibold text-white shadow-cta">
              Book Now <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

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

export default TripDetailPage;
