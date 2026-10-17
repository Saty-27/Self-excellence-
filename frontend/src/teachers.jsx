import { useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "./api";
import { MediaFallback } from "./mediaFallback";

/* ============================================================
   Our Qualified Teachers
   ------------------------------------------------------------
   Presentation only. Every value — type, name, experience,
   designation, bio, image, slug — comes from the existing
   visionary records, and cards still link to /visionaries/:slug.
   ============================================================ */

const C = {
  ivory: "#FFFFFF",
  dark: "#1C1410",
  terracotta: "#C1121F",
  gold: "#D4A017",
  role: "#7A6E66",
  body: "#7A6E66",
  sub: "#7A6E66",
  cardBorder: "rgba(120, 80, 40, 0.10)",
  expBg: "#FDF1E4"
};

const CONTAINER = "mx-auto w-full max-w-shell px-4 sm:px-6";

/* Roles that should read as primary get the terracotta chip. */
const PRIMARY_ROLES = /founder|director|president|head/i;

const Arrow = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M2.5 8h11M9.5 4l4 4-4 4" />
  </svg>
);

const Ornament = (props) => (
  <svg viewBox="0 0 240 240" fill="none" stroke="currentColor" strokeWidth="1" {...props}>
    <circle cx="120" cy="120" r="46" />
    <circle cx="120" cy="120" r="76" />
    <circle cx="120" cy="120" r="104" />
    {Array.from({ length: 12 }).map((_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      return (
        <path
          key={i}
          d={`M120 120 C ${120 + 34 * Math.cos(a - 0.22)} ${120 + 34 * Math.sin(a - 0.22)}, ${
            120 + 80 * Math.cos(a - 0.1)
          } ${120 + 80 * Math.sin(a - 0.1)}, ${120 + 104 * Math.cos(a)} ${120 + 104 * Math.sin(a)} C ${
            120 + 80 * Math.cos(a + 0.1)
          } ${120 + 80 * Math.sin(a + 0.1)}, ${120 + 34 * Math.cos(a + 0.22)} ${
            120 + 34 * Math.sin(a + 0.22)
          }, 120 120`}
        />
      );
    })}
  </svg>
);

/* Small editorial section marker: rule — lotus — rule */
const LotusDivider = () => (
  <div className="flex items-center justify-center gap-3" aria-hidden="true">
    <span className="h-px w-[92px] bg-gradient-to-r from-transparent to-[#C1121F]/45 sm:w-[130px]" />
    <svg viewBox="0 0 40 28" fill="none" stroke="#C1121F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[30px] opacity-70">
      <path d="M20 23c-2.9-3.4-2.9-7.9 0-12.3 2.9 4.4 2.9 8.9 0 12.3Z" />
      <path d="M20 23c-4.2-.8-7.3-4-8.4-8.7 3.8.8 6.8 3.8 8.4 8.7Z" />
      <path d="M20 23c4.2-.8 7.3-4 8.4-8.7-3.8.8-6.8 3.8-8.4 8.7Z" />
      <path d="M10.5 24.6c2.9 1.8 16.1 1.8 19 0" />
    </svg>
    <span className="h-px w-[92px] bg-gradient-to-l from-transparent to-[#C1121F]/45 sm:w-[130px]" />
  </div>
);

/* ------------------------------------------------------------------ */

export const TeacherCard = ({ teacher }) => {
  const primary = PRIMARY_ROLES.test(teacher.type || "");
  const [failed, setFailed] = useState(false);
  const src = assetUrl(teacher.image);

  return (
    <Link
      to={`/visionaries/${teacher.slug || teacher._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[14px] border bg-white transition-[transform,box-shadow] duration-[350ms] ease-out hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(50,35,20,0.10)]"
      style={{ borderColor: C.cardBorder, boxShadow: "0 12px 35px rgba(50, 35, 20, 0.06)" }}
    >
      <div className="relative h-[230px] w-full overflow-hidden bg-[#F0E2D3] lg:h-[270px]">
        {failed || !src ? (
          /* a missing upload should read as a calm placeholder, not alt text */
          <MediaFallback />
        ) : (
          <img
            src={src}
            alt={teacher.name}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.025]"
          />
        )}

        {teacher.type && (
          <span
            className="absolute left-4 top-4 rounded-md px-2.5 py-1.5 font-ui text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-white"
            style={{ backgroundColor: primary ? C.terracotta : C.dark }}
          >
            {teacher.type}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-display text-[21px] font-bold leading-tight tracking-[-0.01em] lg:text-[23px]" style={{ color: C.dark }}>
            {teacher.name}
          </h3>
          {teacher.experience && (
            <span
              className="mt-1 shrink-0 rounded-md px-2.5 py-1 font-ui text-[11px] font-bold uppercase leading-none tracking-[0.04em]"
              style={{ backgroundColor: C.expBg, color: C.terracotta }}
            >
              {teacher.experience}
            </span>
          )}
        </div>

        {teacher.designation && (
          <p className="mt-1.5 font-ui text-[14px] font-medium" style={{ color: C.role }}>
            {teacher.designation}
          </p>
        )}

        {teacher.shortBio && (
          <p className="mt-3.5 line-clamp-3 font-ui text-[14px] font-normal leading-[1.7]" style={{ color: C.body }}>
            {teacher.shortBio}
          </p>
        )}

        <div className="flex-1" />

        <span className="mt-5 inline-flex items-center gap-2 font-ui text-[14px] font-semibold" style={{ color: C.terracotta }}>
          View Details
          <Arrow className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
};

/* ------------------------------------------------------------------ */

export const TeachersSection = ({
  teachers = [],
  titleLead = "Our Qualified",
  titleAccent = "Teachers",
  subtitle = "Experienced Devotees Trained to Lead with Purpose and Purity"
}) => {
  if (!teachers.length) return null;

  return (
    <section aria-label="Our qualified teachers" className="relative overflow-hidden" style={{ backgroundColor: C.ivory }}>
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block" aria-hidden="true">
        <Ornament className="absolute -left-28 -top-24 h-[320px] w-[320px] opacity-[0.055]" style={{ color: C.gold }} />
        <Ornament className="absolute -right-28 -top-16 h-[300px] w-[300px] opacity-[0.05]" style={{ color: C.gold }} />
        <Ornament className="absolute -left-24 -bottom-24 h-[280px] w-[280px] opacity-[0.045]" style={{ color: C.gold }} />
        <Ornament className="absolute -right-24 -bottom-28 h-[300px] w-[300px] opacity-[0.05]" style={{ color: C.gold }} />
      </div>

      <div className={`${CONTAINER} relative py-16 md:py-20 lg:pb-[110px] lg:pt-[100px]`}>
        {/* Header */}
        <div className="mx-auto max-w-[760px] text-center">
          <LotusDivider />
          <h2 className="mt-5 font-display font-bold leading-[1.0] tracking-[-0.025em] text-[34px] sm:text-[42px] md:text-[48px] lg:text-[52px]">
            <span style={{ color: C.dark }}>{titleLead} </span>
            <span style={{ color: C.terracotta }}>{titleAccent}</span>
          </h2>
          <p className="mt-3.5 font-ui text-[15px] font-normal leading-[1.6] md:text-[16px]" style={{ color: C.sub }}>
            {subtitle}
          </p>
        </div>

        {/* Grid */}
        <div className="mt-11 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-[56px] lg:grid-cols-3 lg:gap-7">
          {teachers.map((teacher) => (
            <TeacherCard key={teacher._id || teacher.slug} teacher={teacher} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeachersSection;
