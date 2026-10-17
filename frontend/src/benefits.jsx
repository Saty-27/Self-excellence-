import { useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "./api";
import { MediaFallback } from "./mediaFallback";

/* ============================================================
   Benefits of Self-Excellence Classes
   ------------------------------------------------------------
   Presentation only. Titles, descriptions, images and links all
   come from the existing benefit records. The heritage artwork
   is a decorative layer sitting behind the content.
   ============================================================ */

const ORNAMENT_TOP = "/assets/ornament-top.webp";
const ORNAMENT_TEMPLES = "/assets/ornament-temples.webp";

const C = {
  ivory: "#FFF8F0",
  dark: "#1C1410",
  terracotta: "#C1121F",
  sub: "#7A6E66",
  body: "#7A6E66",
  cardBorder: "rgba(120, 80, 40, 0.08)"
};

const CONTAINER = "mx-auto w-full max-w-shell px-4 sm:px-6";

/* ------------------------------------------------------------------ */

const iconBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

const MeditationIcon = (p) => (
  <svg {...iconBase} {...p}>
    <circle cx="12" cy="5.4" r="2.1" />
    <path d="M12 9v4.6M6 19.5c0-2.6 2.7-4.2 6-4.2s6 1.6 6 4.2" />
    <path d="M12 13.6 7.6 17M12 13.6 16.4 17" />
  </svg>
);
const BookIcon = (p) => (
  <svg {...iconBase} {...p}>
    <path d="M12 7.4C10.3 6 7.7 5.6 5 5.9v11.7c2.7-.3 5.3.1 7 1.5 1.7-1.4 4.3-1.8 7-1.5V5.9c-2.7-.3-5.3.1-7 1.5Z" />
    <path d="M12 7.4v11.7" />
  </svg>
);
const CommunityIcon = (p) => (
  <svg {...iconBase} {...p}>
    <circle cx="12" cy="9" r="2.5" />
    <path d="M7 19c0-2.7 2.2-4.3 5-4.3s5 1.6 5 4.3" />
    <path d="M4.3 17.4c0-1.9 1.3-3 3.1-3.1M19.7 17.4c0-1.9-1.3-3-3.1-3.1" />
  </svg>
);
const GraduationIcon = (p) => (
  <svg {...iconBase} {...p}>
    <path d="M12 5 2.8 9.4 12 13.8l9.2-4.4L12 5Z" />
    <path d="M6.5 11.4v4.2c0 1.6 2.6 2.9 5.5 2.9s5.5-1.3 5.5-2.9v-4.2" />
  </svg>
);
const TargetIcon = (p) => (
  <svg {...iconBase} {...p}>
    <circle cx="12" cy="12" r="7.4" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);
const ServiceIcon = (p) => (
  <svg {...iconBase} {...p}>
    <path d="M12 9.6s-2.9-2-2.9-3.8a1.7 1.7 0 0 1 2.9-1 1.7 1.7 0 0 1 2.9 1C14.9 7.6 12 9.6 12 9.6Z" />
    <path d="M4.6 13.4c1.6-1.1 3.2-.6 4.4.4l1.6 1.3h2.3a1.3 1.3 0 0 1 0 2.6h-3" />
    <path d="M10.6 17.7h3.6c1.6 0 3-1.5 4.9-2.6" />
    <path d="M3 12.6 6 19" />
  </svg>
);

const ICONS = [MeditationIcon, BookIcon, CommunityIcon, GraduationIcon, TargetIcon, ServiceIcon];

const Arrow = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M2.5 8h11M9.5 4l4 4-4 4" />
  </svg>
);

const LotusDivider = () => (
  <div className="flex items-center justify-center gap-3" aria-hidden="true">
    <span className="h-px w-[110px] bg-gradient-to-r from-transparent to-[#C1121F]/45 sm:w-[165px]" />
    <svg viewBox="0 0 40 28" fill="none" stroke="#C1121F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[30px] opacity-70">
      <path d="M20 23c-2.9-3.4-2.9-7.9 0-12.3 2.9 4.4 2.9 8.9 0 12.3Z" />
      <path d="M20 23c-4.2-.8-7.3-4-8.4-8.7 3.8.8 6.8 3.8 8.4 8.7Z" />
      <path d="M20 23c4.2-.8 7.3-4 8.4-8.7-3.8.8-6.8 3.8-8.4 8.7Z" />
      <path d="M10.5 24.6c2.9 1.8 16.1 1.8 19 0" />
    </svg>
    <span className="h-px w-[110px] bg-gradient-to-l from-transparent to-[#C1121F]/45 sm:w-[165px]" />
  </div>
);

/* ------------------------------------------------------------------ */

export const BenefitCard = ({ benefit, index = 0 }) => {
  const Icon = ICONS[index % ICONS.length];
  const [failed, setFailed] = useState(false);
  const src = assetUrl(benefit.image);

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-white transition-[transform,box-shadow] duration-[350ms] ease-out hover:-translate-y-[3px] hover:shadow-[0_16px_38px_rgba(70,40,20,0.10)]"
      style={{ borderColor: C.cardBorder, boxShadow: "0 10px 30px rgba(70, 40, 20, 0.06)" }}
    >
      <div className="relative h-[180px] w-full shrink-0 overflow-hidden bg-[#F0E2D3]">
        {failed || !src ? (
          <MediaFallback />
        ) : (
          <img
            src={src}
            alt={benefit.title}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover object-center transition-transform duration-[400ms] ease-out group-hover:scale-[1.02]"
          />
        )}

      </div>

      {/* Icon badge straddles the lower edge of the photograph. It lives on
          the card, not the image wrapper, which clips its overflow. */}
      <span
        className="absolute left-6 top-[156px] z-[1] grid h-12 w-12 place-items-center rounded-full border bg-white shadow-[0_4px_14px_rgba(70,40,20,0.12)]"
        style={{ borderColor: "rgba(193,18,31,0.15)", color: C.terracotta }}
      >
        <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
      </span>

      <div className="flex flex-1 flex-col px-6 pb-6 pt-9">
        <h3 className="font-display text-[22px] font-bold leading-tight tracking-[-0.01em] lg:text-[24px]" style={{ color: C.dark }}>
          {benefit.title}
        </h3>

        {benefit.shortDescription && (
          <p className="mt-2 max-w-[95%] font-ui text-[14.5px] font-normal leading-[1.55]" style={{ color: C.body }}>
            {benefit.shortDescription}
          </p>
        )}

        <div className="flex-1" />

        <Link
          to={benefit.buttonLink || "/about"}
          className="group/cta mt-4 inline-flex w-fit items-center gap-1.5 font-ui text-[14px] font-semibold"
          style={{ color: C.terracotta }}
        >
          {benefit.buttonText || "Read More"}
          <Arrow className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-1" />
        </Link>
      </div>
    </article>
  );
};

/* ------------------------------------------------------------------ */

export const BenefitsSection = ({
  benefits = [],
  titleLead = "Benefits of",
  titleAccent = "Self-Excellence Classes",
  subtitle = "Self-Excellence is not just improvement – it is inner transformation."
}) => {
  if (!benefits.length) return null;

  return (
    <section aria-label="Benefits of Self-Excellence classes" className="relative overflow-hidden" style={{ backgroundColor: C.ivory }}>
      {/* Heritage artwork: a background layer belonging to the whole
          section, not an image in a box. Both layers are masked so their
          cut edges dissolve into the ivory and no rectangle is visible,
          and both overscan the width so there is no gap at either side. */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* corner lotus / mandala framing — fades out before the cards */}
        <img
          src={ORNAMENT_TOP}
          alt=""
          className="absolute -left-[2%] top-0 w-[104%] max-w-none select-none opacity-[0.45]"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 42%, rgba(0,0,0,0.35) 72%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 0%, #000 42%, rgba(0,0,0,0.35) 72%, transparent 100%)"
          }}
        />

        {/* temple horizon — rises out of the base rather than sitting in a frame */}
        <img
          src={ORNAMENT_TEMPLES}
          alt=""
          className="absolute -left-[2%] bottom-0 w-[104%] max-w-none select-none opacity-[0.55]"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 22%, rgba(0,0,0,0.7) 48%, #000 70%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 22%, rgba(0,0,0,0.7) 48%, #000 70%)"
          }}
        />
      </div>

      <div className={`${CONTAINER} relative z-[2] pb-[90px] pt-14 md:pt-[70px] lg:pb-[110px] lg:pt-[82px]`}>
        <div className="mx-auto max-w-[820px] text-center">
          <LotusDivider />
          <h2 className="mt-5 font-display font-bold leading-[1.05] tracking-[-0.025em] text-[32px] sm:text-[40px] md:text-[46px] lg:text-[52px]">
            <span style={{ color: C.dark }}>{titleLead} </span>
            <span style={{ color: C.terracotta }}>{titleAccent}</span>
          </h2>
          <p className="mt-3 font-ui text-[15px] font-normal leading-[1.6] md:text-[16.5px]" style={{ color: C.sub }}>
            {subtitle}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:mt-[42px] lg:grid-cols-3">
          {benefits.map((benefit, i) => (
            <BenefitCard key={benefit._id || benefit.title} benefit={benefit} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
