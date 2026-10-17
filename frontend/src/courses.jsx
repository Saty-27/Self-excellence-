import { useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "./api";
import { MediaFallback } from "./mediaFallback";

/* ============================================================
   Explore Our Courses
   ------------------------------------------------------------
   Presentation only. Titles, descriptions, images, counts and
   links all come from the existing course records and still
   route to /courses/:slug — no data is duplicated or invented.
   ============================================================ */

/* Palette, kept together so the section reads as one system. */
const C = {
  bg: "#FFF8F0",
  card: "#FFFFFF",
  text: "#1C1410",
  title: "#1C1410",
  body: "#7A6E66",
  sub: "#7A6E66",
  terracotta: "#C1121F",
  accent: "#C1121F",
  gold: "#D4A017",
  border: "rgba(150, 100, 60, 0.12)",
  eyebrow: "#9B0D18",
  icon: "#C1121F"
};

const CONTAINER = "mx-auto w-full max-w-shell px-4 sm:px-6";

/* ------------------------------------------------------------------ */
/* Corner ornament — thin lotus/mandala line art, deliberately faint   */
/* and cropped by the section edge.                                    */

const CornerOrnament = (props) => (
  <svg viewBox="0 0 240 240" fill="none" stroke="currentColor" strokeWidth="1" {...props}>
    <circle cx="120" cy="120" r="46" />
    <circle cx="120" cy="120" r="72" />
    <circle cx="120" cy="120" r="98" />
    {Array.from({ length: 12 }).map((_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      return (
        <path
          key={i}
          d={`M120 120 C ${120 + 34 * Math.cos(a - 0.22)} ${120 + 34 * Math.sin(a - 0.22)}, ${
            120 + 78 * Math.cos(a - 0.1)
          } ${120 + 78 * Math.sin(a - 0.1)}, ${120 + 98 * Math.cos(a)} ${120 + 98 * Math.sin(a)} C ${
            120 + 78 * Math.cos(a + 0.1)
          } ${120 + 78 * Math.sin(a + 0.1)}, ${120 + 34 * Math.cos(a + 0.22)} ${
            120 + 34 * Math.sin(a + 0.22)
          }, 120 120`}
        />
      );
    })}
  </svg>
);

/* ------------------------------------------------------------------ */
/* Module-row icons — one line family, cycled so the row keeps the     */
/* reference's variety without asserting anything about the course.    */

const iconBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

const BookIcon = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M12 7.2C10.3 5.8 7.7 5.4 5 5.7v12c2.7-.3 5.3.1 7 1.5 1.7-1.4 4.3-1.8 7-1.5v-12c-2.7-.3-5.3.1-7 1.5Z" />
    <path d="M12 7.2V19.2" />
  </svg>
);

const CommunityIcon = (props) => (
  <svg {...iconBase} {...props}>
    <circle cx="12" cy="9.5" r="2.6" />
    <path d="M7 19c0-2.8 2.2-4.4 5-4.4s5 1.6 5 4.4" />
    <path d="M4.5 17.5c0-2 1.3-3.1 3.2-3.2M19.5 17.5c0-2-1.3-3.1-3.2-3.2" />
  </svg>
);

const LotusIcon = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M12 17.5c-2-2.3-2-5.4 0-8.4 2 3 2 6.1 0 8.4Z" />
    <path d="M12 17.5c-2.9-.6-5-2.8-5.8-6 2.6.6 4.7 2.6 5.8 6Z" />
    <path d="M12 17.5c2.9-.6 5-2.8 5.8-6-2.6.6-4.7 2.6-5.8 6Z" />
    <path d="M5.5 19.2c2 1.3 11 1.3 13 0" />
  </svg>
);

const PinIcon = (props) => (
  <svg {...iconBase} {...props}>
    <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const MODULE_ICONS = [BookIcon, CommunityIcon, LotusIcon, LotusIcon, PinIcon, BookIcon];

/* ------------------------------------------------------------------ */

const CourseThumb = ({ course }) => {
  const [failed, setFailed] = useState(false);
  const src = assetUrl(course.thumbnail || course.bannerImage);

  if (failed || !src) {
    return (
      <div className="h-[210px] w-full overflow-hidden rounded-t-[10px] md:h-[250px]">
        <MediaFallback />
      </div>
    );
  }

  return (
    <div className="h-[210px] w-full overflow-hidden rounded-t-[10px] md:h-[250px]">
      <img
        src={src}
        alt={course.title}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const CourseTile = ({ course, index = 0, ctaLabel }) => {
  const Icon = MODULE_ICONS[index % MODULE_ICONS.length];
  /* `modules` isn't on the records yet; until it is, show the real
     lesson count with an honest label. */
  const countLabel = course.modules
    ? `${course.modules} Modules`
    : `${course.totalLessons || course.lessons?.length || 0} Lessons`;
  const label = ctaLabel || course.buttonText || "Explore";

  return (
    <Link
      to={`/courses/${course.slug || course._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-white transition-[transform,box-shadow] duration-[400ms] ease-out hover:-translate-y-1"
      style={{ borderColor: C.border, boxShadow: "0 8px 30px rgba(60, 40, 20, 0.06)" }}
    >
      <CourseThumb course={course} />

      <div className="flex flex-1 flex-col p-6">
        <h3
          className="font-display text-[23px] font-bold leading-[1.1] tracking-[-0.3px] md:text-[27px]"
          style={{ color: C.title }}
        >
          {course.title}
        </h3>

        {course.shortDescription && (
          <p
            className="mt-2.5 line-clamp-3 font-ui text-[15px] font-normal leading-[1.55]"
            style={{ color: C.body }}
          >
            {course.shortDescription}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2.5">
          <Icon className="h-[19px] w-[19px] shrink-0" style={{ color: C.icon }} aria-hidden="true" />
          <span className="font-ui text-[14px] font-semibold" style={{ color: C.text }}>
            {countLabel}
          </span>
        </div>

        {/* keeps every CTA on one baseline across the row */}
        <div className="flex-1" />

        <span
          className="mt-[22px] inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] bg-transparent font-ui text-[14px] font-semibold transition-colors duration-300 group-hover:text-white"
          style={{ borderColor: "#C1121F", color: "#C1121F" }}
        >
          <span className="transition-colors duration-300 group-hover:text-white">{label}</span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[3px]"
            aria-hidden="true"
          >
            <path d="M2.5 8h11M9.5 4l4 4-4 4" />
          </svg>
        </span>
      </div>
    </Link>
  );
};

/* ------------------------------------------------------------------ */

export const CourseTileSkeleton = () => (
  <div
    className="flex h-full flex-col overflow-hidden rounded-xl border bg-white"
    style={{ borderColor: C.border, boxShadow: "0 8px 30px rgba(60, 40, 20, 0.06)" }}
  >
    <div className="h-[210px] w-full animate-pulse bg-[#F0E2D3] md:h-[250px]" />
    <div className="flex flex-1 flex-col p-6">
      <div className="h-6 w-4/5 animate-pulse rounded bg-[#F0E2D3]" />
      <div className="mt-3 h-3.5 w-full animate-pulse rounded bg-[#F0E2D3]" />
      <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded bg-[#F0E2D3]" />
      <div className="mt-5 h-4 w-1/3 animate-pulse rounded bg-[#F0E2D3]" />
      <div className="flex-1" />
      <div className="mt-[22px] h-12 w-full animate-pulse rounded-lg bg-[#F0E2D3]" />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */

export const CoursesSection = ({
  courses = [],
  loading = false,
  eyebrow = "Learn • Practice • Transform",
  titleLead = "Explore Our",
  titleAccent = "Courses",
  subtitle = "Structured learning for a meaningful life.",
  viewAllLabel = "View All Courses",
  viewAllLink = "/courses",
  skeletonCount = 6
}) => (
  <section
    aria-label="Explore our courses"
    className="relative overflow-hidden"
    style={{ backgroundColor: C.bg }}
  >
    {/* Faint ornamental corners, cropped by the section edge. */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <CornerOrnament
        className="absolute -left-20 -top-24 h-[300px] w-[300px] opacity-[0.08]"
        style={{ color: "#D4A017" }}
      />
      <CornerOrnament
        className="absolute -right-24 -top-16 h-[260px] w-[260px] opacity-[0.08]"
        style={{ color: "#D4A017" }}
      />
      <CornerOrnament
        className="absolute -bottom-28 -right-20 hidden h-[280px] w-[280px] opacity-[0.06] lg:block"
        style={{ color: "#D4A017" }}
      />
    </div>

    <div className={`${CONTAINER} relative pb-[70px] pt-[60px] md:pb-20 md:pt-20 lg:pb-[110px] lg:pt-[100px]`}>
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0">
          {eyebrow && (
            <p
              className="font-ui text-[12px] font-semibold uppercase leading-none tracking-[3px] md:text-[13px]"
              style={{ color: C.eyebrow }}
            >
              {eyebrow}
            </p>
          )}

          <h2
            className="mt-[18px] font-display font-bold leading-[0.95] tracking-[-2px] text-[36px] min-[420px]:text-[42px] md:text-[52px] min-[1200px]:text-[64px]"
          >
            <span style={{ color: "#1C1410" }}>{titleLead} </span>
            <span style={{ color: C.terracotta }}>{titleAccent}</span>
          </h2>

          <p
            className="mt-4 max-w-[600px] font-ui text-[16px] font-normal leading-[1.6] md:text-[18px]"
            style={{ color: C.sub }}
          >
            {subtitle}
          </p>
        </div>

        <Link
          to={viewAllLink}
          className="group inline-flex h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-lg border-[1.5px] bg-transparent font-ui text-[14px] font-semibold transition-colors duration-300 hover:bg-[#C1121F] hover:text-white sm:w-[190px]"
          style={{ borderColor: "#C1121F", color: C.terracotta }}
        >
          <span className="transition-colors duration-300 group-hover:text-white">{viewAllLabel}</span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-[3px]"
            aria-hidden="true"
          >
            <path d="M2.5 8h11M9.5 4l4 4-4 4" />
          </svg>
        </Link>
      </div>

      {/* 3 × 2 on desktop, 2 on tablet, 1 on mobile */}
      <div className="mt-10 grid grid-cols-1 gap-[22px] md:grid-cols-2 min-[1200px]:grid-cols-3 lg:mt-12">
        {loading && !courses.length
          ? Array.from({ length: skeletonCount }).map((_, i) => <CourseTileSkeleton key={i} />)
          : courses.map((course, i) => <CourseTile key={course._id} course={course} index={i} />)}
      </div>
    </div>
  </section>
);

export default CoursesSection;
