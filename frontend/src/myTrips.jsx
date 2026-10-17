import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Download, MapPin, Minus, Users
} from "lucide-react";
import { apiFetch, assetUrl } from "./api";
import { SEO, EmptyState } from "./components";
import { MediaFallback } from "./mediaFallback";
import { money, tripDates, durationOf } from "./trips";

/* ============================================================
   My Trips — the devotee's trip area
   ------------------------------------------------------------
   Only trips with an active TripAccess record appear here, and
   access is only ever granted server-side when an admin
   approves a booking.
   ============================================================ */

const MyTripCard = ({ entry }) => {
  const trip = entry.pilgrimage || {};
  const booking = entry.booking || {};
  const [failed, setFailed] = useState(false);
  const src = trip.image ? assetUrl(trip.image) : "";

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm sm:flex-row">
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-soft sm:h-auto sm:w-56">
        {failed || !src ? <MediaFallback /> : <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[20px] font-bold text-ink">{trip.title}</h2>
            {trip.destination && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <MapPin size={12} /> {trip.destination}
              </p>
            )}
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
            Confirmed
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-body">
          {tripDates(trip.startDate, trip.endDate) && (
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} className="text-primary" /> {tripDates(trip.startDate, trip.endDate)}</span>
          )}
          {durationOf(trip) && (
            <span className="inline-flex items-center gap-1.5"><Clock size={12} className="text-primary" /> {durationOf(trip)}</span>
          )}
          {booking.travellerCount && (
            <span className="inline-flex items-center gap-1.5"><Users size={12} className="text-primary" /> {booking.travellerCount} traveller{booking.travellerCount > 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="flex-1" />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
          <span className="font-mono text-[11px] uppercase tracking-wide text-primary">{booking.bookingRef}</span>
          <Link
            to={`/student/my-trips/${trip.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-black text-white transition hover:bg-primary-hover"
          >
            View Trip <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export const StudentTripsPage = () => {
  const [state, setState] = useState({ items: [], loading: true });

  useEffect(() => {
    apiFetch("/my-trips")
      .then((d) => setState({ items: d.items || [], loading: false }))
      .catch(() => setState({ items: [], loading: false }));
  }, []);

  return (
    <>
      <SEO title="My Trips" />
      <div className="mb-6 border-b border-black/5 pb-4">
        <h1 className="text-3xl font-black">My Trips</h1>
        <p className="mt-1 text-sm text-muted">Journeys you are confirmed on. Open one for its itinerary and guide.</p>
      </div>

      {state.loading && <p className="text-sm text-muted">Loading your trips...</p>}

      {!state.loading && state.items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
          <h2 className="text-xl font-black text-ink">You haven't booked a journey yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Once a booking is confirmed by our team, the trip appears here with its full itinerary and guide.
          </p>
          <Link to="/trips" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-white">
            Explore Trips <ArrowRight size={15} />
          </Link>
        </div>
      )}

      <div className="grid gap-4">
        {state.items.map((entry) => <MyTripCard key={entry._id} entry={entry} />)}
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */

export const StudentTripDetailPage = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guideBusy, setGuideBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/my-trips/${slug}`)
      .then(setData)
      .catch((err) => setError(err.message || "This trip is not available."))
      .finally(() => setLoading(false));
  }, [slug]);

  const downloadGuide = async () => {
    setGuideBusy(true);
    try {
      const res = await apiFetch(`/trips/${slug}/guide`);
      window.open(assetUrl(res.url), "_blank", "noopener");
    } catch (err) {
      setError(err.message || "Could not open the trip guide.");
    } finally {
      setGuideBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-muted">Loading trip...</p>;

  if (error || !data?.item) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
        <h1 className="text-xl font-black text-ink">Trip unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{error || "This trip unlocks once your booking is confirmed."}</p>
        <Link to="/student/my-trips" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-white">
          <ArrowLeft size={15} /> Back to My Trips
        </Link>
      </div>
    );
  }

  const trip = data.item;
  const booking = data.booking || {};
  const itinerary = (trip.itinerary || []).slice().sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0));
  const gallery = (trip.gallery || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <>
      <SEO title={`${trip.title} - My Trip`} />

      <Link to="/student/my-trips" className="mb-5 inline-flex items-center gap-1.5 text-xs font-black text-muted transition hover:text-primary">
        <ArrowLeft size={14} /> My Trips
      </Link>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="relative h-52 w-full overflow-hidden bg-soft sm:h-64">
          {trip.image ? <img src={assetUrl(trip.image)} alt="" className="h-full w-full object-cover" /> : <MediaFallback />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <h1 className="font-display text-[26px] font-bold leading-tight text-white sm:text-[32px]">{trip.title}</h1>
            <p className="mt-1 text-sm text-white/85">{trip.destination}</p>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-4 sm:p-6">
          {[
            ["Booking", booking.bookingRef],
            ["Dates", tripDates(trip.startDate, trip.endDate)],
            ["Duration", durationOf(trip)],
            ["Travellers", booking.travellerCount ? String(booking.travellerCount) : ""]
          ].filter(([, v]) => v).map(([label, v]) => (
            <div key={label} className="rounded-xl bg-soft/50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted">{label}</p>
              <p className="mt-1 text-sm font-black text-ink">{v}</p>
            </div>
          ))}
        </div>

        {trip.hasPdf && (
          <div className="border-t border-black/5 px-5 pb-5 sm:px-6">
            <button onClick={downloadGuide} disabled={guideBusy} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-xs font-black text-white transition hover:bg-ink/90 disabled:opacity-60">
              <Download size={15} /> {guideBusy ? "Opening..." : "Download complete trip guide"}
            </button>
          </div>
        )}
      </div>

      {trip.meetingPoint && (
        <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-ink">Meeting point</h2>
          <p className="mt-2 text-sm leading-6 text-body">{trip.meetingPoint}</p>
        </div>
      )}

      {itinerary.length > 0 && (
        <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-ink">Itinerary</h2>
          <ol className="mt-4 space-y-4">
            {itinerary.map((day) => (
              <li key={day.dayNumber} className="rounded-xl bg-soft/40 p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-primary">Day {String(day.dayNumber).padStart(2, "0")}</p>
                {day.title && <h3 className="mt-1 font-display text-[17px] font-bold text-ink">{day.title}</h3>}
                {day.description && <p className="mt-1.5 text-sm leading-6 text-body">{day.description}</p>}
                {(day.morning || day.afternoon || day.evening) && (
                  <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                    {[["Morning", day.morning], ["Afternoon", day.afternoon], ["Evening", day.evening]].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-white p-3">
                        <dt className="text-[10px] font-black uppercase tracking-wide text-primary">{l}</dt>
                        <dd className="mt-1 text-xs leading-5 text-body">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {trip.importantInfo && (
        <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-ink">Important information</h2>
          <div className="mt-2 space-y-3 text-sm leading-6 text-body">
            {trip.importantInfo.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      )}

      {gallery.length > 0 && (
        <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-ink">Gallery</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((g, i) => (
              <a key={i} href={assetUrl(g.imageUrl)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl">
                <img src={assetUrl(g.imageUrl)} alt={g.altText || ""} loading="lazy" className="aspect-square w-full object-cover transition hover:scale-105" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-ink">Your booking</h2>
        <dl className="mt-3 grid gap-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Reference</dt><dd className="font-mono font-bold text-ink">{booking.bookingRef}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Travellers</dt><dd className="font-bold text-ink">{(booking.travellers || []).map((t) => t.name).join(", ")}</dd></div>
          {booking.totalAmount != null && (
            <div className="flex justify-between border-t border-black/10 pt-2"><dt className="font-black text-ink">Paid</dt><dd className="font-black text-primary">{money(booking.totalAmount)}</dd></div>
          )}
        </dl>
        <p className="mt-4 text-xs text-muted">
          Questions about this journey? Use the support chat, or write to us from the Contact page.
        </p>
      </div>
    </>
  );
};

export default StudentTripsPage;
