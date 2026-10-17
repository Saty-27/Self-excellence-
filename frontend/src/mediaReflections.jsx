import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "./api";

/* ============================================================
   Photo & Video Gallery → Student Reflections → Newsletter
   ------------------------------------------------------------
   One editorial composition on a single warm ivory field,
   closing with the vermilion newsletter and temple skyline.
   All media, testimonial and subscribe data comes from the
   caller — nothing here is hardcoded content.
   ============================================================ */

const TEMPLE = "/assets/temple-skyline.webp";

const C = {
  ivory: "#FFFFFF",
  dark: "#1C1410",
  quote: "#1C1410",
  sub: "#3D3530",
  terracotta: "#C1121F",
  orange: "#E8590C",
  gold: "#D4A017",
  star: "#E8590C",
  red: "#C1121F",
  cardBorder: "rgba(100, 70, 40, 0.08)"
};

const CONTAINER = "mx-auto w-full max-w-shell px-4 sm:px-6";

/* ------------------------------------------------------------------ */

const PlayGlyph = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M9 6.5v11a.6.6 0 0 0 .93.5l8.2-5.5a.6.6 0 0 0 0-1l-8.2-5.5A.6.6 0 0 0 9 6.5Z" />
  </svg>
);

const Chevron = ({ dir = "right", className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={dir === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"} />
  </svg>
);

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

const Stars = ({ count = 5 }) => (
  <span className="flex gap-1" aria-label={`${count} out of 5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <svg key={i} viewBox="0 0 20 20" className="h-[17px] w-[17px]" fill={i < count ? C.star : "#F0E2D3"} aria-hidden="true">
        <path d="M10 1.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L2.2 7.5l5.4-.8L10 1.8Z" />
      </svg>
    ))}
  </span>
);

/* Two-tone editorial heading used by both blocks. */
const SplitHeading = ({ lead, accent, className = "" }) => (
  <h2 className={`font-display font-bold leading-[0.98] tracking-[-0.025em] ${className}`}>
    <span style={{ color: C.dark }}>{lead} </span>
    <span style={{ color: C.terracotta }}>{accent}</span>
  </h2>
);

/* ------------------------------------------------------------------ */
/* Horizontal strip with the arrows sitting outside the rail.          */

const useRail = () => {
  const ref = useRef(null);
  const [state, setState] = useState({ canLeft: false, canRight: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setState({
      canLeft: el.scrollLeft > 4,
      canRight: el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return undefined;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const scrollBy = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.75, 200), behavior: "smooth" });
  };

  return { ref, ...state, scrollBy, measure };
};

const RailButton = ({ dir, onClick, disabled, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={`absolute top-1/2 z-[2] hidden h-[42px] w-[42px] -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_6px_18px_rgba(60,40,20,0.14)] transition-opacity duration-200 sm:grid ${
      dir === "left" ? "-left-3 lg:-left-[52px]" : "-right-3 lg:-right-[52px]"
    } ${disabled ? "cursor-default opacity-35" : "opacity-100 hover:bg-[#FFF8F0]"}`}
    style={{ color: C.dark }}
  >
    <Chevron dir={dir} className="h-4 w-4" />
  </button>
);

/* ------------------------------------------------------------------ */

const MediaThumb = ({ item, isVideo }) => (
  <Link
    to={isVideo ? "/gallery/videos" : "/gallery/images"}
    className="group relative block w-[260px] shrink-0 snap-start overflow-hidden rounded-xl bg-[#1C1410] shadow-[0_10px_30px_rgba(60,40,20,0.10)] transition-shadow duration-300 hover:shadow-[0_16px_40px_rgba(60,40,20,0.16)] sm:w-[300px] lg:w-[340px] xl:w-[370px]"
  >
    <span className="block aspect-[1.45/1] w-full overflow-hidden">
      <img
        src={assetUrl(isVideo ? item.thumbnail : item.image)}
        alt={item.title || ""}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.04]"
      />
    </span>

    {isVideo && (
      <>
        <span className="absolute inset-0 bg-black/15" />
        <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 backdrop-blur-sm transition-transform duration-300 group-hover:scale-[1.08]">
          <PlayGlyph className="ml-0.5 h-5 w-5" />
        </span>
      </>
    )}

    {item.title && (
      <>
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 line-clamp-2 block p-4 font-ui text-[14.5px] font-semibold leading-[1.3] text-white lg:p-5 lg:text-[16px]">
          {item.title}
        </span>
      </>
    )}
  </Link>
);

/* ------------------------------------------------------------------ */

export const MediaReflectionsSection = ({
  images = [],
  videos = [],
  testimonials = [],
  email = "",
  setEmail = () => {},
  onSubscribe,
  notice = "",
  mediaTitleLead = "Photo & Video",
  mediaTitleAccent = "Gallery",
  mediaSubtitle = "Moments from our classes, festivals and pilgrimages.",
  reflectionsTitleLead = "Student",
  reflectionsTitleAccent = "Reflections",
  reflectionsSubtitle = "Real stories. Real transformation.",
  newsletterTitle = "Stay Connected on Your Spiritual Journey",
  newsletterSubtitle = "Get updates on classes, events, blogs and pilgrimages."
}) => {
  const [tab, setTab] = useState("photos");
  const media = tab === "photos" ? images : videos;

  const mediaRail = useRail();
  const quoteRail = useRail();

  /* re-measure when the tab swaps the rail's contents */
  useEffect(() => {
    const t = setTimeout(mediaRail.measure, 60);
    return () => clearTimeout(t);
  }, [tab, media.length, mediaRail]);

  return (
    <>
      {/* ---------- Ivory: gallery + reflections ---------- */}
      <section
        aria-label="Photo and video gallery and student reflections"
        className="relative overflow-hidden"
        style={{ backgroundColor: C.ivory }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <Ornament className="absolute -left-28 -top-28 h-[300px] w-[300px] opacity-[0.06]" style={{ color: C.gold }} />
          <Ornament className="absolute -right-28 top-[18%] h-[280px] w-[280px] opacity-[0.05]" style={{ color: C.gold }} />
          <Ornament className="absolute -left-24 bottom-[6%] h-[260px] w-[260px] opacity-[0.05]" style={{ color: C.gold }} />
          <Ornament className="absolute -right-24 -bottom-24 h-[300px] w-[300px] opacity-[0.06]" style={{ color: C.gold }} />
        </div>

        <div className={`${CONTAINER} relative pb-16 pt-14 md:pb-20 md:pt-[70px] lg:pb-[88px] lg:pt-[86px]`}>
          {/* ----- Gallery header ----- */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="min-w-0 lg:w-[58%]">
              <SplitHeading
                lead={mediaTitleLead}
                accent={mediaTitleAccent}
                className="text-[34px] sm:text-[42px] md:text-[48px] lg:text-[56px]"
              />
              <p className="mt-3 font-ui text-[15px] font-normal leading-[1.5] md:text-[17px]" style={{ color: C.sub }}>
                {mediaSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 lg:justify-end lg:pt-2">
              {[
                ["photos", "Photos"],
                ["videos", "Videos"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  aria-pressed={tab === key}
                  className={`h-11 rounded-full px-6 font-ui text-[14px] font-semibold transition-colors duration-200 ${
                    tab === key ? "bg-[#C1121F] text-white" : "bg-[rgba(30,30,30,0.05)] text-[#3D3530] hover:bg-[rgba(30,30,30,0.09)]"
                  }`}
                >
                  {label}
                </button>
              ))}

              <Link
                to={tab === "videos" ? "/gallery/videos" : "/gallery/images"}
                className="group inline-flex h-11 items-center gap-2 rounded-full border bg-transparent px-[22px] font-ui text-[14px] font-semibold transition-colors duration-200 hover:bg-[#C1121F]/[0.07]"
                style={{ borderColor: C.orange, color: C.terracotta }}
              >
                View Gallery
                <Arrow className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* ----- Gallery rail ----- */}
          <div className="relative mt-8 lg:mt-9">
            <RailButton dir="left" label="Previous media" onClick={() => mediaRail.scrollBy(-1)} disabled={!mediaRail.canLeft} />
            <div
              ref={mediaRail.ref}
              className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 lg:gap-5"
            >
              {media.map((item) => (
                <MediaThumb key={item._id} item={item} isVideo={tab === "videos"} />
              ))}
            </div>
            <RailButton dir="right" label="Next media" onClick={() => mediaRail.scrollBy(1)} disabled={!mediaRail.canRight} />
          </div>

          {/* ----- Student Reflections ----- */}
          {testimonials.length > 0 && (
            <div className="mt-[72px] lg:mt-[96px]">
              <SplitHeading
                lead={reflectionsTitleLead}
                accent={reflectionsTitleAccent}
                className="text-[34px] sm:text-[42px] md:text-[48px] lg:text-[54px]"
              />
              <p className="mt-3 font-ui text-[15px] font-normal leading-[1.5] md:text-[17px]" style={{ color: C.sub }}>
                {reflectionsSubtitle}
              </p>

              <div className="relative mt-8 lg:mt-9">
                <RailButton dir="left" label="Previous reflection" onClick={() => quoteRail.scrollBy(-1)} disabled={!quoteRail.canLeft} />
                <div
                  ref={quoteRail.ref}
                  className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-1 lg:gap-6"
                >
                  {testimonials.map((t) => (
                    <figure
                      key={t._id || t.name}
                      className="flex w-[280px] shrink-0 snap-start flex-col rounded-lg border bg-white p-6 shadow-[0_8px_30px_rgba(50,35,20,0.05)] sm:w-[330px] lg:w-[calc((100%-48px)/3)]"
                      style={{ borderColor: C.cardBorder }}
                    >
                      <blockquote
                        className="font-display text-[20px] font-bold leading-[1.3] lg:text-[23px]"
                        style={{ color: C.quote }}
                      >
                        “{t.quote}”
                      </blockquote>
                      <div className="flex-1" />
                      <figcaption className="mt-5">
                        <p className="font-ui text-[15px] font-semibold" style={{ color: C.dark }}>
                          — {t.name}
                        </p>
                        {t.rating > 0 && <div className="mt-2"><Stars count={t.rating} /></div>}
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <RailButton dir="right" label="Next reflection" onClick={() => quoteRail.scrollBy(1)} disabled={!quoteRail.canRight} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Vermilion newsletter with temple skyline ---------- */}
      <section aria-label="Newsletter" className="relative overflow-hidden" style={{ backgroundColor: C.red }}>
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
          <Ornament className="absolute -left-28 -top-24 h-[300px] w-[300px] text-white opacity-[0.06]" />
          <Ornament className="absolute -right-24 -top-28 h-[280px] w-[280px] text-white opacity-[0.05]" />
        </div>

        {/* Temple skyline as a decorative background layer, not a framed
            image: full viewport width, natural height, nothing cropped.
            No fixed height and no object-fit, so the whole skyline scales
            with the width and the transparent sky simply sits behind the
            content. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] select-none"
          aria-hidden="true"
        >
          <img src={TEMPLE} alt="" className="block h-auto w-full max-w-none select-none" />
        </div>

        <div className={`${CONTAINER} relative z-[2] pb-[180px] pt-14 md:pb-[240px] md:pt-[68px] lg:min-h-[400px] lg:pb-[300px] lg:pt-[80px]`}>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,540px)] lg:gap-12">
            <div className="min-w-0">
              <h2 className="font-display font-bold leading-[1.04] tracking-[-0.02em] text-[30px] text-white sm:text-[34px] lg:text-[40px]">
                {newsletterTitle}
              </h2>
              <p className="mt-3.5 max-w-[520px] font-ui text-[15px] font-normal leading-[1.6] text-white/[0.82] md:text-[16px]">
                {newsletterSubtitle}
              </p>
            </div>

            <form
              onSubmit={onSubscribe}
              className="flex w-full flex-col gap-3 xs:h-[62px] xs:flex-row xs:items-center xs:gap-0 xs:rounded-full xs:bg-white xs:py-1.5 xs:pl-6 xs:pr-1.5 xs:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
            >
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                className="h-[56px] min-w-0 flex-1 rounded-full border-0 bg-white px-6 font-ui text-[15px] text-[#1C1410] outline-none placeholder:text-[#7A6E66] xs:h-full xs:rounded-none xs:bg-transparent xs:px-0"
              />
              <button
                type="submit"
                className="group inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#9B0D18] px-7 font-ui text-[14px] font-semibold text-white transition-colors duration-[250ms] hover:bg-[#7A0A12] xs:h-full"
              >
                Subscribe
                <Arrow className="h-3.5 w-3.5 transition-transform duration-[250ms] group-hover:translate-x-1" />
              </button>
            </form>
          </div>

          {notice && <p className="mt-5 font-ui text-[13px] text-white/85">{notice}</p>}
        </div>
      </section>
    </>
  );
};

export default MediaReflectionsSection;
