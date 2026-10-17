import { ArrowRight } from "lucide-react";

/* ============================================================
   Embark on a Sacred Journey — pilgrimage banner
   ------------------------------------------------------------
   UI only. All copy lives in the `journey` object below and is
   passed in as a prop, so a later API response with the same
   shape drops straight in without touching the markup.
   ============================================================ */

const HERO = "/assets/pilgrimage-hero.webp";
const POSTCARD_1 = "/assets/pilgrimage-kashi-postcard-01.webp";
const POSTCARD_2 = "/assets/pilgrimage-kashi-postcard-02.webp";

export const featuredJourney = {
  badge: "FEATURED PILGRIMAGE",
  title: "5-Day Sacred Journey to Vrindavana",
  route: "ISKCON Juhu → Vrindavana → ISKCON Juhu",
  duration: "5 Days",
  nights: "4 Nights",
  routeDetail: "Mumbai → Vrindavana → Mumbai",
  visits: "Temple Visits",
  visitDetail: "ISKCON Vrindavan, Banke Bihari, Prem Mandir",
  guidedBy: "Guided by",
  guideDetail: "Senior Devotees",
  price: "₹18,500",
  priceLabel: "per person",
  cta: "Book Now"
};

/* ------------------------------------------------------------------ */
/* Line icons in the same family used by the impact strip.            */

const svgBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

const DurationIcon = (props) => (
  <svg {...svgBase} {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

const RouteIcon = (props) => (
  <svg {...svgBase} {...props}>
    <circle cx="6" cy="7" r="2.5" />
    <circle cx="18" cy="17" r="2.5" />
    <path d="M8.5 7h5a3 3 0 0 1 0 6h-3a3 3 0 0 0 0 6h4" />
  </svg>
);

const TempleIcon = (props) => (
  <svg {...svgBase} {...props}>
    <path d="M4 20V11l8-7 8 7v9" />
    <path d="M9.5 20v-4.5a2.5 2.5 0 0 1 5 0V20" />
    <path d="M2.5 20h19" />
  </svg>
);

const GuideIcon = (props) => (
  <svg {...svgBase} {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 19c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5" />
    <path d="M16 6.5a3 3 0 0 1 0 5.8M17.5 14.6c2.1.5 3.5 1.8 3.5 4.4" />
  </svg>
);

/* ------------------------------------------------------------------ */

const InfoBlock = ({ icon: Icon, primary, secondary }) => (
  <li className="flex items-start gap-2">
    <Icon className="mt-[1px] h-[18px] w-[18px] shrink-0 text-[#D4A017]" aria-hidden="true" />
    <div className="min-w-0">
      <p className="font-ui text-[11.5px] font-bold leading-tight text-[#1C1410]">{primary}</p>
      <p className="mt-0.5 font-ui text-[10.5px] font-medium leading-tight text-[#3D3530]">{secondary}</p>
    </div>
  </li>
);

/* ------------------------------------------------------------------ */

export const PilgrimageCard = ({ journey, onBook }) => (
  <div className="rounded-xl border border-white/65 bg-white/[0.88] p-4 shadow-[0_15px_40px_rgba(70,40,20,0.12)] backdrop-blur-[8px] sm:p-[18px]">
    <span className="inline-flex rounded-full bg-[#E8590C] px-2.5 py-1 font-ui text-[9.5px] font-extrabold uppercase leading-none tracking-[0.12em] text-white">
      {journey.badge}
    </span>

    <h3 className="mt-2.5 font-display text-[25px] font-bold leading-[1.02] tracking-[-0.02em] text-[#1C1410] sm:text-[27px] lg:text-[29px]">
      {journey.title}
    </h3>

    <p className="mt-1 font-ui text-[12.5px] font-semibold leading-tight text-[#3D3530] sm:text-[13px]">
      {journey.route}
    </p>

    <ul className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4 lg:gap-x-5">
      <InfoBlock icon={DurationIcon} primary={journey.duration} secondary={journey.nights} />
      <InfoBlock icon={RouteIcon} primary={journey.routeDetail} secondary="" />
      <InfoBlock icon={TempleIcon} primary={journey.visits} secondary={journey.visitDetail} />
      <InfoBlock icon={GuideIcon} primary={journey.guidedBy} secondary={journey.guideDetail} />
    </ul>

    <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="shrink-0">
        <p className="font-ui text-[22px] font-extrabold leading-none tracking-[-0.01em] text-[#9B0D18] sm:text-[25px]">
          {journey.price}
        </p>
        <p className="mt-1 font-ui text-[10.5px] font-medium leading-none text-[#7A6E66]">
          {journey.priceLabel}
        </p>
      </div>

      <button
        type="button"
        onClick={onBook}
        className="group inline-flex h-[41px] min-w-[130px] items-center justify-center gap-1.5 rounded-full bg-[#C1121F] px-5 font-ui text-[12px] font-bold text-white transition-all duration-300 ease-out hover:-translate-y-px hover:bg-[#9B0D18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B0D18] max-[420px]:w-full"
      >
        {journey.cta}
        <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
      </button>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */

const Postcard = ({ src, className, style }) => (
  <figure
    className={`overflow-hidden rounded-[3px] border-[7px] border-white bg-white shadow-[0_12px_28px_rgba(40,25,15,0.22)] lg:border-8 ${className}`}
    style={style}
  >
    <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
  </figure>
);

/* ------------------------------------------------------------------ */

export const PilgrimageSection = ({
  journey = featuredJourney,
  heading = { lead: "Embark on a", accent: "Sacred Journey" },
  description = "Travel. Discover. Serve. Experience Krishna Consciousness.",
  viewAllLabel = "View All Journeys",
  onBook,
  onViewAll
}) => {
  const handleBook = onBook || (() => {});

  return (
    <section aria-label="Embark on a sacred journey" className="relative w-full overflow-hidden">
      {/* Cinematic temple riverfront at golden hour, kept bright. */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={HERO}
          alt=""
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
                src={POSTCARD_1}
                className="absolute bottom-3 right-[118px] h-[198px] w-[158px]"
                style={{ transform: "rotate(-5deg)" }}
              />
              <Postcard
                src={POSTCARD_2}
                className="absolute bottom-7 right-0 z-10 h-[198px] w-[158px]"
                style={{ transform: "rotate(7deg)" }}
              />
            </div>
          </div>

          {/* Below lg the postcards move under the card so nothing collides. */}
          <div className="mt-7 flex justify-center lg:hidden" aria-hidden="true">
            <div className="relative h-[176px] w-[248px]">
              <Postcard
                src={POSTCARD_1}
                className="absolute bottom-2 left-0 h-[164px] w-[130px]"
                style={{ transform: "rotate(-5deg)" }}
              />
              <Postcard
                src={POSTCARD_2}
                className="absolute bottom-5 right-0 z-10 h-[164px] w-[130px]"
                style={{ transform: "rotate(7deg)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PilgrimageSection;
