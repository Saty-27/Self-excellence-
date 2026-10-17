import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock, MapPin, UserRound } from "lucide-react";
import { assetUrl } from "./api";

/* ============================================================
   Upcoming Sunday Classes
   ------------------------------------------------------------
   Continues the hero's ivory/ornament language rather than
   resetting to white. All event data comes from the existing
   upcomingclasses records — nothing here invents content.
   ============================================================ */

const TEXTURE = "/hero-mandala-texture.webp";

const SECTION_CONTAINER = "mx-auto w-full max-w-shell px-4 sm:px-6";

/* The data has no explicit format field, so the mode is read off the
   venue rather than invented: anything streamed reads as Online. */
const isOnline = (venue = "") => /online|youtube|zoom|stream|virtual|live on/i.test(venue);

const parseDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ------------------------------------------------------------------ */

export const ClassDateBadge = ({ date }) => {
  if (!date) return null;
  return (
    <div className="absolute left-3.5 top-3.5 flex w-[52px] flex-col items-center rounded-lg bg-[#FFF8F0] px-2 py-1.5 shadow-[0_4px_14px_rgba(60,35,20,0.16)]">
      <span className="font-ui text-[9.5px] font-bold uppercase leading-none tracking-[0.1em] text-[#7A6E66]">
        {date.toLocaleDateString("en-US", { weekday: "short" })}
      </span>
      <span className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-[#1C1410]">
        {String(date.getDate()).padStart(2, "0")}
      </span>
      <span className="font-ui text-[8.5px] font-bold uppercase leading-none tracking-[0.1em] text-[#9B0D18]">
        {date.toLocaleDateString("en-US", { month: "short" })}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const MetaRow = ({ icon: Icon, label, value }) =>
  value ? (
    <li className="flex items-start gap-2">
      <Icon size={13} strokeWidth={1.9} className="mt-[2px] shrink-0 text-[#C1121F]" aria-hidden="true" />
      {label && (
        <span className="mt-[1px] w-[50px] shrink-0 font-ui text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#C1121F]">
          {label}
        </span>
      )}
      <span className="min-w-0 font-ui text-[12.5px] font-medium leading-[1.45] text-[#3D3530]">{value}</span>
    </li>
  ) : null;

/* ------------------------------------------------------------------ */

export const UpcomingClassTile = ({ item, onActionClick, past = false }) => {
  const date = parseDate(item.date);
  const online = isOnline(item.venue);
  const label = item.buttonText || "View Details";

  /* Register is the action; Explore opens the full class page. */
  const registerBtn = onActionClick ? (
    <button
      type="button"
      onClick={() => onActionClick(item)}
      className="group/cta inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#C1121F] font-ui text-[12.5px] font-semibold text-white transition-colors duration-300 hover:bg-[#9B0D18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B0D18]"
    >
      {label}
      <ArrowRight size={14} className="transition-transform duration-300 group-hover/cta:translate-x-0.5" aria-hidden="true" />
    </button>
  ) : (
    <Link
      to={item.buttonLink || "/contact"}
      className="group/cta inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#C1121F] font-ui text-[12.5px] font-semibold text-white transition-colors duration-300 hover:bg-[#9B0D18]"
    >
      {label}
      <ArrowRight size={14} className="transition-transform duration-300 group-hover/cta:translate-x-0.5" aria-hidden="true" />
    </Link>
  );

  const cta = (
    <div className="grid gap-2">
      {!past && registerBtn}
      {item.slug && (
        <Link
          to={`/classes/${item.slug}`}
          className="group/ex inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-[rgba(180,70,45,0.35)] font-ui text-[12.5px] font-semibold text-[#9B0D18] transition-colors duration-300 hover:border-[#C1121F] hover:bg-[#C1121F]/[0.06]"
        >
          Explore
          <ArrowRight size={14} className="transition-transform duration-300 group-hover/ex:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
      {past && (
        <p className="text-center font-ui text-[11.5px] text-[#7A6E66]">This session has taken place</p>
      )}
    </div>
  );

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[rgba(80,50,30,0.08)] bg-white shadow-[0_8px_30px_rgba(60,35,20,0.06)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-[3px] hover:shadow-[0_14px_38px_rgba(60,35,20,0.10)]">
      <div className="relative h-[190px] shrink-0 overflow-hidden bg-[#F0E2D3] lg:h-[196px]">
        <img
          src={assetUrl(item.image)}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
        {/* barely-there warm lift so the photography stays natural */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(60,35,20,0.18)] via-transparent to-transparent" />

        <ClassDateBadge date={date} />

        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,253,248,0.94)] px-2.5 py-1 font-ui text-[10px] font-bold text-[#9B0D18] shadow-[0_2px_10px_rgba(60,35,20,0.12)] backdrop-blur-sm">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-[#3C7DD9]" : "bg-[#C1121F]"}`} aria-hidden="true" />
          {online ? "Online" : "In-Person"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.015em] text-[#1C1410]">
          {item.title}
        </h3>

        {item.shortDescription && (
          <p className="mt-1.5 line-clamp-2 font-ui text-[13.5px] font-normal leading-[1.5] text-[#7A6E66]">
            {item.shortDescription}
          </p>
        )}

        <ul className="mt-5 grid gap-2">
          <MetaRow
            icon={CalendarDays}
            value={
              date
                ? date.toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })
                : null
            }
          />
          <MetaRow icon={Clock} label="Time" value={item.time} />
          <MetaRow icon={MapPin} label="Venue" value={item.venue} />
          <MetaRow icon={UserRound} label="Speaker" value={item.speaker} />
        </ul>

        {/* pushes every CTA onto the same baseline across the row */}
        <div className="flex-1" />
        <div className="mt-5">{cta}</div>
      </div>
    </article>
  );
};

/* ------------------------------------------------------------------ */

export const UpcomingClassesSection = ({
  items = [],
  onActionClick,
  titleLead = "Upcoming",
  titleAccent = "Sunday Classes",
  subtitle = "Join our special Sunday programs with kirtan, class and prasadam.",
  viewAllLabel = "View All Classes",
  viewAllLink = "/classes"
}) => (
  <section
    id="upcoming-classes"
    aria-label="Upcoming Sunday classes"
    className="relative scroll-mt-20 overflow-hidden bg-white lg:scroll-mt-24"
  >
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.04]"
      style={{ backgroundImage: `url(${TEXTURE})`, backgroundSize: "620px auto", backgroundRepeat: "repeat" }}
      aria-hidden="true"
    />

    <div className={`${SECTION_CONTAINER} relative py-14 lg:py-[64px]`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <h2 className="font-display font-semibold leading-[1.0] tracking-[-0.02em] text-[clamp(2.375rem,3.6vw,3.25rem)]">
            <span className="text-[#1C1410]">{titleLead} </span>
            <span className="text-[#9B0D18]">{titleAccent}</span>
          </h2>
          <p className="mt-2.5 max-w-[520px] font-ui text-[14px] font-normal leading-[1.55] text-[#7A6E66] sm:text-[15px]">
            {subtitle}
          </p>
        </div>

        <Link
          to={viewAllLink}
          className="group inline-flex h-[42px] shrink-0 items-center gap-2 self-start rounded-full border border-[#E8590C] bg-[#FFF8F0] px-5 font-ui text-[12.5px] font-semibold text-[#9B0D18] transition-colors duration-300 hover:bg-[#FDF1E4] sm:self-auto"
        >
          {viewAllLabel}
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 grid gap-5 min-[769px]:grid-cols-2 lg:mt-9 lg:grid-cols-3 lg:gap-6">
        {items.map((item) => (
          <UpcomingClassTile key={item._id} item={item} onActionClick={onActionClick} />
        ))}
      </div>
    </div>
  </section>
);

export default UpcomingClassesSection;
