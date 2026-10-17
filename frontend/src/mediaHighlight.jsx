import { Link } from "react-router-dom";
import { assetUrl } from "./api";

/* ============================================================
   Media Highlight — photo and video gallery previews
   ------------------------------------------------------------
   Presentation only; images, videos and the /gallery routes
   are unchanged.
   ============================================================ */

const C = {
  bg: "#FFFDF8",
  text: "#171513",
  title: "#181614",
  sub: "#6F665D",
  terracotta: "#C84E2C",
  border: "#C94F2D",
  link: "#B94728",
  gold: "#C99A5B",
  cardBorder: "rgba(30, 25, 20, 0.08)"
};

const CONTAINER = "mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10";

const PlayGlyph = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M9 6.5v11a.6.6 0 0 0 .93.5l8.2-5.5a.6.6 0 0 0 0-1l-8.2-5.5A.6.6 0 0 0 9 6.5Z" />
  </svg>
);

const CornerOrnament = (props) => (
  <svg viewBox="0 0 240 240" fill="none" stroke="currentColor" strokeWidth="1" {...props}>
    <circle cx="120" cy="120" r="48" />
    <circle cx="120" cy="120" r="78" />
    {Array.from({ length: 10 }).map((_, i) => {
      const a = (i * 36 * Math.PI) / 180;
      return (
        <path
          key={i}
          d={`M120 120 C ${120 + 36 * Math.cos(a - 0.24)} ${120 + 36 * Math.sin(a - 0.24)}, ${
            120 + 64 * Math.cos(a - 0.1)
          } ${120 + 64 * Math.sin(a - 0.1)}, ${120 + 78 * Math.cos(a)} ${120 + 78 * Math.sin(a)} C ${
            120 + 64 * Math.cos(a + 0.1)
          } ${120 + 64 * Math.sin(a + 0.1)}, ${120 + 36 * Math.cos(a + 0.24)} ${
            120 + 36 * Math.sin(a + 0.24)
          }, 120 120`}
        />
      );
    })}
  </svg>
);

/* ------------------------------------------------------------------ */

const PanelHeading = ({ children, to, linkLabel = "View All" }) => (
  <div className="mb-5 flex items-end justify-between gap-4">
    <h3
      className="font-display text-[24px] font-bold leading-tight tracking-[-0.015em] lg:text-[26px]"
      style={{ color: C.title }}
    >
      {children}
    </h3>
    <Link
      to={to}
      className="group inline-flex shrink-0 items-center gap-1.5 font-ui text-[12.5px] font-bold"
      style={{ color: C.link }}
    >
      {linkLabel}
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
        <path d="M2.5 8h11M9.5 4l4 4-4 4" />
      </svg>
    </Link>
  </div>
);

/* ------------------------------------------------------------------ */

export const MediaHighlightSection = ({
  images = [],
  videos = [],
  titleLead = "Media",
  titleAccent = "Highlight",
  subtitle = "Glimpses of our temple, festivals, and spiritual activities.",
  imageLimit = 4,
  videoLimit = 2
}) => {
  const photos = images.slice(0, imageLimit);
  const clips = videos.slice(0, videoLimit);
  if (!photos.length && !clips.length) return null;

  return (
    <section aria-label="Media highlight" className="relative overflow-hidden" style={{ backgroundColor: C.bg }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <CornerOrnament className="absolute -left-24 -top-24 h-[260px] w-[260px] opacity-[0.05]" style={{ color: C.gold }} />
        <CornerOrnament className="absolute -bottom-24 -right-24 h-[280px] w-[280px] opacity-[0.05]" style={{ color: C.gold }} />
      </div>

      <div className={`${CONTAINER} relative py-16 md:py-20 lg:py-[88px]`}>
        <div className="max-w-[620px]">
          <h2 className="font-display font-bold leading-[1.0] tracking-[-0.02em] text-[34px] sm:text-[40px] md:text-[46px] lg:text-[52px]">
            <span style={{ color: C.text }}>{titleLead} </span>
            <span style={{ color: C.terracotta }}>{titleAccent}</span>
          </h2>
          <p className="mt-2.5 font-ui text-[15px] font-normal leading-[1.55] md:text-[16px]" style={{ color: C.sub }}>
            {subtitle}
          </p>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-2 lg:gap-8">
          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <PanelHeading to="/gallery/images">Photo Gallery</PanelHeading>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {photos.map((item) => (
                  <Link
                    key={item._id}
                    to="/gallery/images"
                    className="group block overflow-hidden rounded-xl border bg-white"
                    style={{ borderColor: C.cardBorder }}
                  >
                    <span className="block aspect-[4/3] w-full overflow-hidden bg-[#F6EDDE]">
                      <img
                        src={assetUrl(item.image)}
                        alt={item.title || ""}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.04]"
                      />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {clips.length > 0 && (
            <div>
              <PanelHeading to="/gallery/videos">Video Gallery</PanelHeading>
              <div className="grid gap-3 sm:gap-4">
                {clips.map((item) => (
                  <Link
                    key={item._id}
                    to="/gallery/videos"
                    className="group relative block overflow-hidden rounded-xl border bg-[#2A211B]"
                    style={{ borderColor: C.cardBorder }}
                  >
                    <span className="block aspect-[16/9] w-full overflow-hidden">
                      <img
                        src={assetUrl(item.thumbnail)}
                        alt={item.title || ""}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="absolute inset-0 bg-black/20" />
                    <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/85 backdrop-blur-sm transition-transform duration-300 ease-out group-hover:scale-[1.08]">
                      <PlayGlyph className="ml-0.5 h-5 w-5" />
                    </span>
                    {item.title && (
                      <span className="absolute inset-x-4 bottom-3 font-ui text-[13px] font-semibold text-white drop-shadow">
                        {item.title}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MediaHighlightSection;
