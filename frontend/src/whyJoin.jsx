import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/* ============================================================
   Why Join ISKCON Classes?
   ------------------------------------------------------------
   UI only — the four benefits are a plain data array so a
   future content system can supply them unchanged.
   ============================================================ */

const TEXTURE = "/hero-mandala-texture.webp";
const PHOTO = "/assets/why-join-devotee.webp";

const SECTION_CONTAINER = "mx-auto w-full max-w-shell px-4 sm:px-6";

/* ------------------------------------------------------------------ */
/* Custom line icons — one family, rounded caps, 48x48.               */

const iconBase = {
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

/* Scripture — an open book crowned with a lotus. */
const AuthenticTeachingsIcon = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M24 20.5c-3.4-2.7-8.3-3.6-13.5-2.9v19c5.2-.7 10.1.2 13.5 2.9 3.4-2.7 8.3-3.6 13.5-2.9v-19c-5.2-.7-10.1.2-13.5 2.9Z" />
    <path d="M24 20.5v19" />
    <path d="M24 15.5c-1.6-2.1-1.6-4.3 0-6.5 1.6 2.2 1.6 4.4 0 6.5Z" />
    <path d="M24 15.5c-2.5-.5-4.2-1.8-5-4 2.4.1 4.1 1.4 5 4Z" />
    <path d="M24 15.5c2.5-.5 4.2-1.8 5-4-2.4.1-4.1 1.4-5 4Z" />
  </svg>
);

/* A single devotee in robes — the teacher. */
const ExperiencedPreachersIcon = (props) => (
  <svg {...iconBase} {...props}>
    <circle cx="24" cy="14" r="4.6" />
    <path d="M24 9.4V5.5" />
    <path d="M13.5 40c0-7.6 4.7-11.8 10.5-11.8S34.5 32.4 34.5 40Z" />
    <path d="M24 28.2 19 40M24 28.2 29 40" />
  </svg>
);

/* Three figures gathered under a heart — the community. */
const SupportiveCommunityIcon = (props) => (
  <svg {...iconBase} {...props}>
    <circle cx="24" cy="23" r="4" />
    <path d="M16.5 38c0-4.4 3.3-7 7.5-7s7.5 2.6 7.5 7" />
    <circle cx="11.5" cy="26" r="3.2" />
    <path d="M5.5 37c0-3.6 2.6-5.6 6-5.6" />
    <circle cx="36.5" cy="26" r="3.2" />
    <path d="M42.5 37c0-3.6-2.6-5.6-6-5.6" />
    <path d="M24 15.5s-4.3-2.8-4.3-5.5a2.4 2.4 0 0 1 4.3-1.4 2.4 2.4 0 0 1 4.3 1.4c0 2.7-4.3 5.5-4.3 5.5Z" />
  </svg>
);

/* A lotus opening with light — practice bearing fruit. */
const PracticalApplicationIcon = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M24 34c-3.6-4.2-3.6-10 0-15.6 3.6 5.6 3.6 11.4 0 15.6Z" />
    <path d="M24 34c-5.2-1-9.1-5-10.4-10.8 4.7 1 8.5 4.7 10.4 10.8Z" />
    <path d="M24 34c5.2-1 9.1-5 10.4-10.8-4.7 1-8.5 4.7-10.4 10.8Z" />
    <path d="M12 37.5c3.6 2.3 20.4 2.3 24 0" />
    <path d="M24 12.5V7M15 15l-2.6-3.4M33 15l2.6-3.4" />
  </svg>
);

/* ------------------------------------------------------------------ */

export const whyJoinBenefits = [
  {
    icon: AuthenticTeachingsIcon,
    title: "Authentic Teachings",
    description: "Based on Bhagavad Gita and Vaishnava tradition."
  },
  {
    icon: ExperiencedPreachersIcon,
    title: "Experienced Preachers",
    description: "Learn from senior devotees and scholars."
  },
  {
    icon: SupportiveCommunityIcon,
    title: "Supportive Community",
    description: "A loving and spiritual environment."
  },
  {
    icon: PracticalApplicationIcon,
    title: "Practical Application",
    description: "Tools for a happier, more meaningful life."
  }
];

/* ------------------------------------------------------------------ */

const BenefitColumn = ({ icon: Icon, title, description, index }) => (
  <li
    /* Horizontal rules while stacked; vertical rules only once the four
       sit in a single row, as the reference shows. */
    className={`group relative ${
      index > 0 ? "border-t border-[#F0E2D3]/60 pt-7 sm:border-t-0 sm:pt-0" : ""
    } ${index > 0 ? "lg:border-l lg:border-[#F0E2D3]/60 lg:pl-5" : "lg:pl-0"}`}
  >
    <Icon
      className="h-[42px] w-[42px] text-[#E8590C] transition-transform duration-300 ease-out group-hover:-translate-y-[3px] lg:h-[48px] lg:w-[48px]"
      aria-hidden="true"
    />
    <h3 className="mt-4 font-display text-[19px] font-bold leading-[1.15] tracking-[-0.015em] text-[#1C1410] transition-colors duration-300 group-hover:text-[#C1121F] lg:text-[20px]">
      {title}
    </h3>
    <p className="mt-1.5 max-w-[230px] font-ui text-[13px] font-normal leading-[1.55] text-[#7A6E66] lg:text-[13.5px]">
      {description}
    </p>
  </li>
);

/* ------------------------------------------------------------------ */

export const WhyJoinSection = ({
  benefits = whyJoinBenefits,
  eyebrow = "Learn • Practice • Belong • Grow",
  headingLead = "Why Join",
  headingAccent = "ISKCON Classes?",
  subtitle = "More than knowledge — a community, a practice, a transformation.",
  photo = PHOTO,
  photoAlt = "A devotee standing with folded hands in prayer inside a sunlit temple courtyard",
  ctaLabel = "About Us",
  ctaLink = "/about"
}) => (
  <section aria-label="Why join ISKCON classes" className="relative overflow-hidden bg-white">
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.04]"
      style={{ backgroundImage: `url(${TEXTURE})`, backgroundSize: "620px auto", backgroundRepeat: "repeat" }}
      aria-hidden="true"
    />

    {/* Desktop photograph: full height, bleeding to the right edge, its
        left edge dissolved into the ivory so it never reads as a card. */}
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[33%] lg:block xl:w-[32%]">
      <img src={photo} alt="" className="h-full w-full object-cover object-[62%_center]" />
      <div className="absolute inset-y-0 left-0 w-[42%] bg-gradient-to-r from-[#FFF8F0] via-[#FFF8F0]/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#FFF8F0]/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#FFF8F0]/70 to-transparent" />
    </div>

    <div className={`${SECTION_CONTAINER} relative py-16 lg:min-h-[500px] lg:py-[88px]`}>
      <div className="lg:w-[68%] xl:w-[69%]">
        {eyebrow && (
          <p className="font-ui text-[11px] font-bold uppercase tracking-[0.22em] text-[#C1121F] sm:text-[12px]">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-3.5 font-display font-bold leading-[0.98] tracking-[-0.025em] text-[clamp(2.5rem,4.2vw,4rem)]">
          <span className="block text-[#1C1410]">{headingLead}</span>
          <span className="block text-[#C1121F]">{headingAccent}</span>
        </h2>

        <p className="mt-3.5 max-w-[620px] font-ui text-[16px] font-normal leading-[1.55] text-[#7A6E66] lg:text-[18px]">
          {subtitle}
        </p>

        {/* Mobile photograph sits between the subtitle and the benefits. */}
        <div className="relative mt-8 h-[320px] overflow-hidden rounded-lg lg:hidden">
          <img src={photo} alt={photoAlt} className="h-full w-full object-cover object-[62%_center]" loading="lazy" />
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-y-10 lg:mt-12 lg:grid-cols-4 lg:gap-5">
          {benefits.map((benefit, index) => (
            <BenefitColumn key={benefit.title} {...benefit} index={index} />
          ))}
        </ul>

        <Link
          to={ctaLink}
          className="group mt-10 inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#C1121F] px-7 font-ui text-[14px] font-bold text-white shadow-[0_8px_22px_rgba(190,60,40,0.18)] transition-all duration-300 ease-out hover:-translate-y-[2px] hover:bg-[#9B0D18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B0D18] xs:w-auto lg:mt-12"
        >
          {ctaLabel}
          <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>
);

export default WhyJoinSection;
