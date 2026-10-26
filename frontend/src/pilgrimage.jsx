import { ArrowRight } from "lucide-react";
import { assetUrl } from "./api";

/* ============================================================
   Embark on a Sacred Journey — Dynamic Featured Pilgrimage Banner
   ------------------------------------------------------------
   Fully admin-controlled upcoming journey section.
   Preserves 100% of the visual design, typography, spacing,
   polaroid postcard tilt styling, and responsiveness.
   Pricing is hidden on the card per specification (shown only
   inside the full journey booking details page).
   ============================================================ */

const DEFAULT_HERO = "/assets/pilgrimage-hero.webp";
const DEFAULT_POSTCARD_1 = "/assets/pilgrimage-kashi-postcard-01.webp";
const DEFAULT_POSTCARD_2 = "/assets/pilgrimage-kashi-postcard-02.webp";

export const featuredJourney = {
  badge: "FEATURED PILGRIMAGE",
  badgeText: "FEATURED PILGRIMAGE",
  badgeEnabled: true,
  title: "5-Day Sacred Journey to Vrindavana",
  route: "ISKCON Juhu → Vrindavana → ISKCON Juhu",
  routeText: "ISKCON Juhu → Vrindavana → ISKCON Juhu",
  duration: "5 Days",
  nights: "4 Nights",
  routeDetail: "Mumbai → Vrindavana → Mumbai",
  visits: "Temple Visits",
  visitDetail: "ISKCON Vrindavan, Banke Bihari, Prem Mandir",
  guidedBy: "Guided by",
  guideDetail: "Senior Devotees",
  cta: "Book Now",
  ctaText: "Book Now",
  informationBlocks: [
    { icon: "duration", primaryText: "5 Days", secondaryText: "4 Nights" },
    { icon: "route", primaryText: "Mumbai → Vrindavana → Mumbai", secondaryText: "" },
    { icon: "temple", primaryText: "Temple Visits", secondaryText: "ISKCON Vrindavan, Banke Bihari, Prem Mandir" },
    { icon: "guide", primaryText: "Guided by", secondaryText: "Senior Devotees" }
  ]
};

/* ------------------------------------------------------------------ */
/* SVG Line Icons matching existing aesthetic                         */
/* ------------------------------------------------------------------ */

const svgBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

export const DurationIcon = (props) => (
  <svg {...svgBase} {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const RouteIcon = (props) => (
  <svg {...svgBase} {...props}>
    <circle cx="6" cy="7" r="2.5" />
    <circle cx="18" cy="17" r="2.5" />
    <path d="M8.5 7h5a3 3 0 0 1 0 6h-3a3 3 0 0 0 0 6h4" />
  </svg>
);

export const TempleIcon = (props) => (
  <svg {...svgBase} {...props}>
    <path d="M4 20V11l8-7 8 7v9" />
    <path d="M9.5 20v-4.5a2.5 2.5 0 0 1 5 0V20" />
    <path d="M2.5 20h19" />
  </svg>
);

export const GuideIcon = (props) => (
  <svg {...svgBase} {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 19c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5" />
    <path d="M16 6.5a3 3 0 0 1 0 5.8M17.5 14.6c2.1.5 3.5 1.8 3.5 4.4" />
  </svg>
);

export const HotelIcon = (props) => (
  <svg {...svgBase} {...props}>
    <path d="M3 21h18M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
  </svg>
);

export const BusIcon = (props) => (
  <svg {...svgBase} {...props}>
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M3 10h18M7 18v2M17 18v2M7 14h.01M17 14h.01" />
  </svg>
);

export const JOURNEY_ICON_MAP = {
  duration: DurationIcon,
  calendar: DurationIcon,
  clock: DurationIcon,
  route: RouteIcon,
  map: RouteIcon,
  location: RouteIcon,
  temple: TempleIcon,
  landmark: TempleIcon,
  monument: TempleIcon,
  guide: GuideIcon,
  user: GuideIcon,
  users: GuideIcon,
  hotel: HotelIcon,
  stay: HotelIcon,
  bus: BusIcon,
  transport: BusIcon
};

export const resolveJourneyIcon = (iconKey) => {
  if (typeof iconKey === "function") return iconKey;
  if (typeof iconKey === "string") {
    const key = iconKey.toLowerCase().trim();
    if (JOURNEY_ICON_MAP[key]) return JOURNEY_ICON_MAP[key];
  }
  return DurationIcon;
};

/* ------------------------------------------------------------------ */

const InfoBlock = ({ icon: Icon, primary, secondary }) => (
  <li className="flex items-start gap-2">
    <Icon className="mt-[1px] h-[18px] w-[18px] shrink-0 text-[#D4A017]" aria-hidden="true" />
    <div className="min-w-0">
      <p className="font-ui text-[11.5px] font-bold leading-tight text-[#1C1410]">{primary}</p>
      {secondary ? (
        <p className="mt-0.5 font-ui text-[10.5px] font-medium leading-tight text-[#3D3530]">{secondary}</p>
      ) : null}
    </div>
  </li>
);

/* ------------------------------------------------------------------ */

export const PilgrimageCard = ({ journey = featuredJourney, onBook }) => {
  const showBadge = journey?.badgeEnabled !== false;
  const badgeText = journey?.badgeText || journey?.badge || "FEATURED PILGRIMAGE";
  const title = journey?.title || "5-Day Sacred Journey to Vrindavana";
  const route = journey?.routeText || journey?.route || (journey?.startingLocation && journey?.endingLocation ? `${journey.startingLocation} → ${journey.endingLocation}` : "");
  const ctaText = journey?.ctaText || journey?.cta || "Book Now";

  // Use dynamic information blocks if configured, else fallback to standard 4 fields
  const blocks = journey?.informationBlocks && journey.informationBlocks.length > 0
    ? journey.informationBlocks
    : [
        { icon: "duration", primaryText: journey?.duration || "5 Days", secondaryText: journey?.nights || "4 Nights" },
        { icon: "route", primaryText: journey?.routeDetail || route || "Mumbai → Vrindavana", secondaryText: "" },
        { icon: "temple", primaryText: journey?.visits || "Temple Visits", secondaryText: journey?.visitDetail || "ISKCON Vrindavan, Banke Bihari, Prem Mandir" },
        { icon: "guide", primaryText: journey?.guidedBy || "Guided by", secondaryText: journey?.guideDetail || "Senior Devotees" }
      ];

  return (
    <div className="rounded-xl border border-white/65 bg-white/[0.88] p-4 shadow-[0_15px_40px_rgba(70,40,20,0.12)] backdrop-blur-[8px] sm:p-[18px]">
      {showBadge && (
        <span className="inline-flex rounded-full bg-[#E8590C] px-2.5 py-1 font-ui text-[9.5px] font-extrabold uppercase leading-none tracking-[0.12em] text-white">
          {badgeText}
        </span>
      )}

      <h3 className="mt-2.5 font-display text-[25px] font-bold leading-[1.02] tracking-[-0.02em] text-[#1C1410] sm:text-[27px] lg:text-[29px]">
        {title}
      </h3>

      {route ? (
        <p className="mt-1 font-ui text-[12.5px] font-semibold leading-tight text-[#3D3530] sm:text-[13px]">
          {route}
        </p>
      ) : null}

      <ul className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4 lg:gap-x-5">
        {blocks.map((b, idx) => {
          const Icon = resolveJourneyIcon(b.icon);
          return (
            <InfoBlock
              key={idx}
              icon={Icon}
              primary={b.primaryText || b.label || ""}
              secondary={b.secondaryText || b.value || ""}
            />
          );
        })}
      </ul>

      {/* Prominent CTA button only — Pricing is intentionally omitted on the homepage teaser */}
      <div className="mt-4 flex items-center justify-start">
        <button
          type="button"
          onClick={onBook}
          className="group inline-flex h-[41px] min-w-[140px] items-center justify-center gap-2 rounded-full bg-[#C1121F] px-6 font-ui text-[12.5px] font-bold text-white transition-all duration-300 ease-out hover:-translate-y-px hover:bg-[#9B0D18] hover:shadow-[0_4px_12px_rgba(193,18,31,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B0D18] max-[420px]:w-full"
        >
          <span>{ctaText}</span>
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const Postcard = ({ src, className, style, alt = "Pilgrimage view" }) => (
  <figure
    className={`overflow-hidden rounded-[3px] border-[7px] border-white bg-white shadow-[0_12px_28px_rgba(40,25,15,0.22)] lg:border-8 ${className}`}
    style={style}
  >
    <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
  </figure>
);

/* ------------------------------------------------------------------ */

export const PilgrimageSkeleton = () => (
  <section className="relative w-full overflow-hidden bg-[#FAF6EE] py-10 lg:min-h-[540px] lg:py-11">
    <div className="relative mx-auto w-full max-w-shell px-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="space-y-2">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-[#E0D8CB]" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-[#E8E1D5]" />
        </div>
      </div>
      <div className="mt-7 lg:mt-10 lg:w-[64%] xl:w-[63%]">
        <div className="rounded-xl border border-white/65 bg-white/70 p-4 shadow-[0_15px_40px_rgba(70,40,20,0.08)] sm:p-[18px]">
          <div className="h-4 w-28 animate-pulse rounded-full bg-[#E0D8CB]" />
          <div className="mt-3 h-7 w-3/4 animate-pulse rounded bg-[#E0D8CB]" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-[#E8E1D5]" />
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-[#EFE8DC]" />
            ))}
          </div>
          <div className="mt-4 h-10 w-36 animate-pulse rounded-full bg-[#C1121F]/30" />
        </div>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */

export const PilgrimageSection = ({
  journey = featuredJourney,
  loading = false,
  heading = { lead: "Embark on a", accent: "Sacred Journey" },
  description = "Travel. Discover. Serve. Experience Krishna Consciousness.",
  viewAllLabel = "View All Journeys",
  onBook,
  onViewAll
}) => {
  if (loading) {
    return <PilgrimageSkeleton />;
  }

  // If no journey is available, return null gracefully
  if (!journey) {
    return null;
  }

  const handleBook = onBook || (() => {});
  const heroImage = assetUrl(journey?.mainImage || journey?.heroImage || DEFAULT_HERO);
  const postcard1 = assetUrl(journey?.floatingImage1 || journey?.postcard1 || DEFAULT_POSTCARD_1);
  const postcard2 = assetUrl(journey?.floatingImage2 || journey?.postcard2 || DEFAULT_POSTCARD_2);

  return (
    <section aria-label="Embark on a sacred journey" className="relative w-full overflow-hidden">
      {/* Cinematic temple riverfront at golden hour, kept bright. */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={heroImage}
          alt={journey?.title || "Pilgrimage banner"}
          className="h-full w-full object-cover object-[70%_center] lg:object-center"
        />
        {/* Left-side readability wash only — no full dark overlay. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,240,0.80)_0%,rgba(255,250,240,0.52)_35%,rgba(255,250,240,0.08)_70%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,250,240,0.55)_0%,transparent_28%)] lg:hidden" />
      </div>

      <div className="relative mx-auto w-full max-w-shell px-4 sm:px-6 py-10 lg:min-h-[540px] lg:py-11">
        {/* Heading row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <h2 className="font-display font-bold leading-[0.98] tracking-[-0.025em] text-[clamp(2.25rem,4vw,3.4rem)]">
              <span className="block text-[#1C1410]">{heading.lead}</span>
              <span className="block text-[#9B0D18]">{heading.accent}</span>
            </h2>
            <p className="mt-2.5 font-ui text-[13px] font-medium leading-[1.5] text-[#3D3530] sm:text-[13.5px]">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onViewAll || (() => {})}
            className="group inline-flex h-[42px] shrink-0 items-center gap-2 self-start rounded-full border border-[rgba(180,70,45,0.35)] bg-[#FFF8F0] px-5 font-ui text-[12px] font-bold text-[#9B0D18] transition-colors duration-300 hover:bg-white"
          >
            {viewAllLabel}
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        </div>

        {/* Card + postcards */}
        <div className="relative mt-7 lg:mt-10">
          <div className="lg:w-[64%] xl:w-[63%]">
            <PilgrimageCard journey={journey} onBook={handleBook} />
          </div>

          {/* Desktop: postcards sit to the right of the card, casually angled. */}
          <div className="pointer-events-none absolute bottom-0 right-0 hidden lg:block" aria-hidden="true">
            <div className="relative h-[210px] w-[300px]">
              <Postcard
                src={postcard1}
                className="absolute bottom-3 right-[118px] h-[198px] w-[158px]"
                style={{ transform: "rotate(-5deg)" }}
                alt="Postcard view 1"
              />
              <Postcard
                src={postcard2}
                className="absolute bottom-7 right-0 z-10 h-[198px] w-[158px]"
                style={{ transform: "rotate(7deg)" }}
                alt="Postcard view 2"
              />
            </div>
          </div>

          {/* Below lg the postcards move under the card so nothing collides. */}
          <div className="mt-7 flex justify-center lg:hidden" aria-hidden="true">
            <div className="relative h-[176px] w-[248px]">
              <Postcard
                src={postcard1}
                className="absolute bottom-2 left-0 h-[164px] w-[130px]"
                style={{ transform: "rotate(-5deg)" }}
                alt="Postcard view 1"
              />
              <Postcard
                src={postcard2}
                className="absolute bottom-5 right-0 z-10 h-[164px] w-[130px]"
                style={{ transform: "rotate(7deg)" }}
                alt="Postcard view 2"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PilgrimageSection;
