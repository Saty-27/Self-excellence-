import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock, MapPin, Search, Users, X } from "lucide-react";
import { apiFetch, assetUrl } from "./api";
import { MediaFallback } from "./mediaFallback";

/* ============================================================
   Trips — shared card, grid and the public listing page
   ------------------------------------------------------------
   Everything here reads the same Pilgrimage records the homepage
   band and the admin panel use. There is no second source of
   trip content anywhere in the app.
   ============================================================ */

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const SHELL = "mx-auto w-full max-w-shell px-4 sm:px-6";

/* "12 Dec – 15 Dec 2026", collapsing the year when it repeats. */
export const tripDates = (start, end) => {
  if (!start) return "";
  const s = new Date(start);
  const fmt = (d, withYear) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
  if (!end) return fmt(s, true);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${fmt(s, !sameYear)} – ${fmt(e, true)}`;
};

export const durationOf = (trip) =>
  trip.durationLabel || (trip.days ? `${trip.days} Days / ${trip.nights || Math.max(trip.days - 1, 0)} Nights` : "");

/* ------------------------------------------------------------------ */

export const TripCard = ({ trip }) => {
  const [failed, setFailed] = useState(false);
  const src = trip.image ? assetUrl(trip.image) : "";
  const dates = tripDates(trip.startDate, trip.endDate);
  const duration = durationOf(trip);
  const price = trip.discountPrice > 0 ? trip.discountPrice : trip.pricePerPerson;

  return (
    <Link
      to={`/trips/${trip.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-cardHover"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-bg-warm">
        {failed || !src ? (
          <MediaFallback />
        ) : (
          <img
            src={src}
            alt={trip.title}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-[450ms] ease-out group-hover:scale-[1.04]"
          />
        )}

        {trip.tripType && (
          <span className="absolute left-3.5 top-3.5 rounded-md bg-white/95 px-2.5 py-1 font-ui text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-primary shadow-[0_2px_8px_rgba(60,35,20,0.12)] backdrop-blur-sm">
            {trip.tripType}
          </span>
        )}

        {trip.isFull ? (
          <span className="absolute right-3.5 top-3.5 rounded-md bg-heading/85 px-2.5 py-1 font-ui text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-white backdrop-blur-sm">
            Fully booked
          </span>
        ) : trip.seatsLeft > 0 && trip.seatsLeft <= 5 ? (
          <span className="absolute right-3.5 top-3.5 rounded-md bg-saffron/95 px-2.5 py-1 font-ui text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-white backdrop-blur-sm">
            {trip.seatsLeft} seat{trip.seatsLeft === 1 ? "" : "s"} left
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[21px] font-bold leading-[1.18] tracking-[-0.015em] text-heading transition-colors duration-300 group-hover:text-primary">
          {trip.title}
        </h3>

        {trip.destination && (
          <p className="mt-1.5 flex items-center gap-1.5 font-ui text-[12.5px] font-medium text-text-muted">
            <MapPin size={13} strokeWidth={2} aria-hidden="true" /> {trip.destination}
          </p>
        )}

        {trip.shortDescription && (
          <p className="mt-2.5 line-clamp-2 font-ui text-[13.5px] leading-[1.6] text-body">{trip.shortDescription}</p>
        )}

        <div className="flex-1" />

        {(dates || duration) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3.5 font-ui text-[12.5px] text-body">
            {dates && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} strokeWidth={2} className="text-primary" aria-hidden="true" /> {dates}
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} strokeWidth={2} className="text-primary" aria-hidden="true" /> {duration}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-end justify-between gap-3">
          <span>
            <span className="block font-ui text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">From</span>
            <span className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display text-[22px] font-extrabold leading-none text-primary">{money(price)}</span>
              {trip.discountPrice > 0 && trip.discountPrice < trip.pricePerPerson && (
                <span className="font-ui text-[13px] text-text-muted line-through">{money(trip.pricePerPerson)}</span>
              )}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-ui text-[13px] font-semibold text-primary">
            View Trip
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export const TripCardSkeleton = () => (
  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
    <div className="aspect-[16/10] w-full animate-pulse bg-line" />
    <div className="flex flex-1 flex-col p-5">
      <div className="h-6 w-4/5 animate-pulse rounded bg-line" />
      <div className="mt-3 h-3.5 w-1/2 animate-pulse rounded bg-line" />
      <div className="mt-4 h-3.5 w-full animate-pulse rounded bg-line" />
      <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded bg-line" />
      <div className="mt-6 h-8 w-1/3 animate-pulse rounded bg-line" />
    </div>
  </div>
);

export const TripGrid = ({ trips = [], loading = false, skeletonCount = 6 }) => (
  <div className="grid grid-cols-1 gap-6 min-[560px]:grid-cols-2 lg:grid-cols-3">
    {loading && !trips.length
      ? Array.from({ length: skeletonCount }).map((_, i) => <TripCardSkeleton key={i} />)
      : trips.map((trip) => <TripCard key={trip._id} trip={trip} />)}
  </div>
);

/* ------------------------------------------------------------------ */

const SORTS = [
  ["upcoming", "Upcoming first"],
  ["popular", "Most popular"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"]
];

export const TripsPage = () => {
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ items: [], loading: true, total: 0 });
  const [filters, setFilters] = useState({ destinations: [], tripTypes: [], priceRange: { min: 0, max: 0 } });
  const [searchDraft, setSearchDraft] = useState(params.get("search") || "");

  const query = params.toString();

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    apiFetch(`/trips${query ? `?${query}` : ""}`)
      .then((data) => !cancelled && setState({ items: data.items || [], loading: false, total: data.total || 0 }))
      .catch(() => !cancelled && setState({ items: [], loading: false, total: 0 }));
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    apiFetch("/trips/filters").then(setFilters).catch(() => {});
  }, []);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const activeCount = ["destination", "tripType", "availability", "search", "sort"].filter((k) => params.get(k)).length;
  const clearAll = () => setParams(new URLSearchParams());

  const control =
    "h-11 rounded-full border border-line bg-white px-4 font-ui text-[13.5px] text-heading outline-none transition-colors focus:border-primary";

  return (
    <>
      {/* Page header */}
      <section className="border-b border-line bg-bg-cream">
        <div className={`${SHELL} py-14 lg:py-20`}>
          <p className="font-ui text-[11px] font-bold uppercase tracking-[0.18em] text-primary">ISKCON Juhu Self-Excellence</p>
          <h1 className="t-h2 mt-3 font-display font-extrabold text-heading">
            Sacred <span className="accent-gradient">Journeys</span>
          </h1>
          <p className="mt-3 max-w-xl font-ui text-[15px] leading-[1.65] text-body md:text-[16.5px]">
            Guided pilgrimages to the places where devotion took root. Travel in a small group, keep early hours, and come
            back with more than photographs.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-[68px] z-30 border-b border-line bg-white/95 backdrop-blur-[12px] lg:top-[84px]">
        {/* Grid, not flex-wrap: four controls of differing text length
            were landing in ragged rows of 1-2-1 at phone width. */}
        <div className={`${SHELL} grid grid-cols-2 gap-2.5 py-4 min-[900px]:flex min-[900px]:flex-wrap min-[900px]:items-center`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              set("search", searchDraft.trim());
            }}
            className="relative col-span-2 min-[900px]:flex-1 min-[900px]:min-w-[200px]"
          >
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search journeys…"
              aria-label="Search journeys"
              className={`${control} w-full pl-10`}
            />
          </form>

          <select value={params.get("destination") || ""} onChange={(e) => set("destination", e.target.value)} aria-label="Destination" className={control}>
            <option value="">Destination</option>
            {filters.destinations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select value={params.get("tripType") || ""} onChange={(e) => set("tripType", e.target.value)} aria-label="Trip type" className={control}>
            <option value="">Trip type</option>
            {filters.tripTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select value={params.get("availability") || ""} onChange={(e) => set("availability", e.target.value)} aria-label="Availability" className={control}>
            <option value="">Availability</option>
            <option value="available">Seats available</option>
          </select>

          <select value={params.get("sort") || ""} onChange={(e) => set("sort", e.target.value)} aria-label="Sort" className={control}>
            <option value="">Sort by</option>
            {SORTS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>

          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-line px-3 font-ui text-[13px] font-semibold text-primary transition-colors hover:bg-primary/5 min-[900px]:col-span-1 min-[900px]:justify-start min-[900px]:border-0">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="bg-white">
        <div className={`${SHELL} py-12 lg:py-16`}>
          {!state.loading && (
            <p className="mb-6 font-ui text-[13.5px] text-text-muted">
              {state.items.length === 0
                ? "No journeys match these filters."
                : `${state.items.length} journey${state.items.length === 1 ? "" : "s"}`}
            </p>
          )}

          {!state.loading && state.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-bg-cream px-8 py-16 text-center">
              <h2 className="font-display text-[22px] font-bold text-heading">
                {activeCount > 0 ? "Nothing matches those filters" : "No upcoming journeys at the moment"}
              </h2>
              <p className="mx-auto mt-2 max-w-md font-ui text-[14px] leading-[1.6] text-body">
                {activeCount > 0
                  ? "Try widening your search — or clear the filters to see every journey."
                  : "New pilgrimages are announced through the year. Check back soon, or write to us to be told first."}
              </p>
              {activeCount > 0 ? (
                <button onClick={clearAll} className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-7 font-ui text-[14px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
                  Clear filters
                </button>
              ) : (
                <Link to="/contact" className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-7 font-ui text-[14px] font-semibold text-white shadow-cta transition hover:bg-primary-dark">
                  Get in touch
                </Link>
              )}
            </div>
          ) : (
            <TripGrid trips={state.items} loading={state.loading} />
          )}
        </div>
      </section>
    </>
  );
};

export default TripsPage;
