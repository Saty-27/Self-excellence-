import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "./api";
import { VideoBlogTile } from "./videoBlogs";

/* ============================================================
   Latest Video — editorial media block
   ------------------------------------------------------------
   This is the homepage's single video section: the old separate
   "Video Blogs" band was folded in here, because both were
   reading the same /video-blogs records and showing them twice.

   The first record becomes the featured player, the next three
   fill the side column, and anything beyond that falls into a
   tile row underneath (the old Video Blogs card, reused).

   Thumbnails open the player in a modal; titles link through to
   /video-blogs/:slug, so the detail pages stay reachable.
   ============================================================ */

const C = {
  bg: "#FFF8F0",
  text: "#1C1410",
  sub: "#7A6E66",
  meta: "#7A6E66",
  terracotta: "#C1121F",
  border: "#C1121F",
  link: "#9B0D18",
  gold: "#D4A017",
  divider: "rgba(150, 110, 70, 0.15)"
};

const CONTAINER = "mx-auto w-full max-w-shell px-4 sm:px-6";

/* ------------------------------------------------------------------ */
/* YouTube / Vimeo handling — kept local so the section stays portable */

const youtubeId = (url = "") => {
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : "";
};

const vimeoId = (url = "") => {
  const m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : "";
};

const embedUrl = (url = "") => {
  const yt = youtubeId(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`;
  const vm = vimeoId(url);
  if (vm) return `https://player.vimeo.com/video/${vm}?autoplay=1`;
  return url;
};

/* Falls back to YouTube's own still when a record has no thumbnail. */
const posterFor = (video) => {
  if (video?.thumbnail) return assetUrl(video.thumbnail);
  const yt = youtubeId(video?.videoUrl);
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : "";
};

/* Only renders what the record actually carries. */
const channelOf = (v) => v?.channel || v?.speaker || v?.author || v?.category || "";
const durationOf = (v) => v?.duration || "";

/* Unchanged route — the detail pages are reached exactly as before. */
const detailPath = (v) => `/video-blogs/${v?.slug || v?._id}`;

/* ------------------------------------------------------------------ */

const PlayGlyph = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M9 6.5v11a.6.6 0 0 0 .93.5l8.2-5.5a.6.6 0 0 0 0-1l-8.2-5.5A.6.6 0 0 0 9 6.5Z" />
  </svg>
);

const CornerOrnament = (props) => (
  <svg viewBox="0 0 240 240" fill="none" stroke="currentColor" strokeWidth="1" {...props}>
    <circle cx="120" cy="120" r="48" />
    <circle cx="120" cy="120" r="76" />
    <circle cx="120" cy="120" r="102" />
    {Array.from({ length: 10 }).map((_, i) => {
      const a = (i * 36 * Math.PI) / 180;
      return (
        <path
          key={i}
          d={`M120 120 C ${120 + 36 * Math.cos(a - 0.24)} ${120 + 36 * Math.sin(a - 0.24)}, ${
            120 + 82 * Math.cos(a - 0.1)
          } ${120 + 82 * Math.sin(a - 0.1)}, ${120 + 102 * Math.cos(a)} ${120 + 102 * Math.sin(a)} C ${
            120 + 82 * Math.cos(a + 0.1)
          } ${120 + 82 * Math.sin(a + 0.1)}, ${120 + 36 * Math.cos(a + 0.24)} ${
            120 + 36 * Math.sin(a + 0.24)
          }, 120 120`}
        />
      );
    })}
  </svg>
);

/* ------------------------------------------------------------------ */

export const VideoModal = ({ video, onClose }) => {
  /* Hooks run before the early return below, so the key handler and
     scroll lock must be guarded on `video` — otherwise they engage
     while the modal is closed and the page never regains scroll. */
  useEffect(() => {
    if (!video) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-[1040px]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -top-11 right-0 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={embedUrl(video.videoUrl)}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const FeaturedVideo = ({ video, onPlay }) => {
  const poster = posterFor(video);
  const channel = channelOf(video);
  const duration = durationOf(video);

  /* The play button covers the whole frame; the title sits above it as a
     link, so a click plays and a click on the words reads. Nesting the
     two would be invalid markup, hence the sibling layering. */
  return (
    <div className="group relative w-full overflow-hidden rounded-[18px]">
      <div className="aspect-video w-full overflow-hidden bg-[#1C1410]">
        {poster && (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.02]"
          />
        )}
      </div>

      {/* keeps the overlaid title and controls legible */}
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

      <button
        type="button"
        onClick={() => onPlay(video)}
        aria-label={`Play ${video.title}`}
        className="absolute inset-0 z-[1] cursor-pointer"
      />

      {/* custom play button */}
      <span className="pointer-events-none absolute left-1/2 top-[36%] z-[2] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/85 backdrop-blur-sm transition-transform duration-300 ease-out group-hover:scale-[1.08] sm:top-1/2 sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]">
        <PlayGlyph className="ml-1 h-6 w-6 sm:h-7 sm:w-7" />
      </span>

      {video.category && (
        <span className="pointer-events-none absolute left-5 top-5 z-[2] rounded-md bg-white/95 px-2.5 py-1 font-ui text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-[#3D3530] shadow-[0_2px_8px_rgba(60,35,20,0.12)] backdrop-blur-sm sm:left-6 sm:top-6">
          {video.category}
        </span>
      )}

      <h3 className="absolute bottom-14 left-5 z-[2] max-w-[78%] font-display text-[22px] font-bold leading-[1.08] text-white sm:bottom-16 sm:left-6 sm:max-w-[70%] sm:text-[30px] md:text-[34px] lg:bottom-[72px] lg:text-[40px]">
        <Link to={detailPath(video)} className="transition-colors duration-300 hover:text-white/80">
          {video.title}
        </Link>
      </h3>

      <div className="pointer-events-none absolute inset-x-5 bottom-4 z-[2] flex items-end justify-between gap-4 sm:inset-x-6 sm:bottom-5">
        {channel && (
          <span className="font-ui text-[12px] font-semibold text-white/90 sm:text-[13px]">{channel}</span>
        )}
        {duration && (
          <span className="ml-auto rounded-md bg-black/55 px-2 py-0.5 font-ui text-[12px] font-semibold text-white backdrop-blur-sm sm:text-[13px]">
            {duration}
          </span>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const VideoListItem = ({ video, onPlay, withDivider }) => {
  const poster = posterFor(video);
  const channel = channelOf(video);
  const duration = durationOf(video);

  return (
    /* The rule belongs to the stacked desktop column only; in the
       tablet two-column arrangement it would cut across the grid. */
    <li
      className={`group grid grid-cols-[115px_1fr_auto] items-center gap-4 sm:grid-cols-[130px_1fr_auto] min-[1100px]:grid-cols-[170px_1fr_auto] min-[1100px]:gap-5 ${
        withDivider ? "min-[1100px]:border-t min-[1100px]:pt-6" : ""
      }`}
      style={withDivider ? { borderColor: C.divider } : undefined}
    >
      <button
        type="button"
        onClick={() => onPlay(video)}
        aria-label={`Play ${video.title}`}
        className="relative block aspect-video w-full overflow-hidden rounded-[10px] bg-[#1C1410]"
      >
        {poster && (
          <img
            src={poster}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        )}
        <span className="absolute inset-0 bg-black/15" />
        <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/85 backdrop-blur-sm">
          <PlayGlyph className="ml-0.5 h-3 w-3" />
        </span>
      </button>

      <span className="min-w-0">
        <Link
          to={detailPath(video)}
          className="block font-display text-[18px] font-semibold leading-[1.2] transition-colors duration-300 hover:text-[#C1121F] min-[1100px]:text-[20px]"
          style={{ color: C.text }}
        >
          {video.title}
        </Link>
        {channel && (
          <span className="mt-1 block font-ui text-[12px] font-medium" style={{ color: C.meta }}>
            {channel}
          </span>
        )}
      </span>

      {duration && (
        <span className="shrink-0 font-ui text-[12px] font-semibold" style={{ color: C.sub }}>
          {duration}
        </span>
      )}
    </li>
  );
};

/* ------------------------------------------------------------------ */

export const LatestVideoSection = ({
  videos = [],
  titleLead = "Latest",
  titleAccent = "Videos",
  subtitle = "Classes, kirtans and short reflections from ISKCON Juhu.",
  viewAllLabel = "View All Videos",
  viewAllLink = "/video-blogs"
}) => {
  const [active, setActive] = useState(null);
  const close = useCallback(() => setActive(null), []);

  const featured = videos[0];
  const rest = videos.slice(1, 4);
  /* Anything past the featured item and the side column lands in the
     tile row below, so a longer feed still has somewhere to go. */
  const overflow = videos.slice(4);

  if (!featured) return null;

  return (
    <section
      aria-label="Latest video"
      className="relative overflow-hidden"
      style={{ backgroundColor: C.bg }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <CornerOrnament className="absolute -left-24 -top-20 h-[280px] w-[280px] opacity-[0.06]" style={{ color: C.gold }} />
        <CornerOrnament className="absolute -bottom-24 -right-20 h-[300px] w-[300px] opacity-[0.06]" style={{ color: C.gold }} />
      </div>

      <div className={`${CONTAINER} relative py-16 md:py-20 lg:py-[110px]`}>
        {/* Header */}
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-end min-[1100px]:justify-between min-[1100px]:gap-10">
          <div className="min-w-0">
            <h2 className="font-display font-semibold leading-[1.0] tracking-[-0.02em] text-[34px] sm:text-[40px] md:text-[46px] lg:text-[54px]">
              <span style={{ color: C.text }}>{titleLead} </span>
              <span style={{ color: C.terracotta }}>{titleAccent}</span>
            </h2>
            <p className="mt-2.5 font-ui text-[15px] font-normal leading-[1.5] md:text-[17px]" style={{ color: C.sub }}>
              {subtitle}
            </p>
          </div>

          <Link
            to={viewAllLink}
            className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-full border bg-transparent px-6 py-3.5 font-ui text-[14px] font-semibold transition-colors duration-[250ms] hover:bg-[#C1121F]/[0.07]"
            style={{ borderColor: C.border, color: C.link }}
          >
            {viewAllLabel}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform duration-[250ms] group-hover:translate-x-1" aria-hidden="true">
              <path d="M2.5 8h11M9.5 4l4 4-4 4" />
            </svg>
          </Link>
        </div>

        {/* Featured left, three compact items right */}
        <div className="mt-9 grid grid-cols-1 gap-8 min-[1100px]:grid-cols-[1.75fr_1fr] min-[1100px]:gap-[42px] lg:mt-11">
          <FeaturedVideo video={featured} onPlay={setActive} />

          <ul className="grid grid-cols-1 gap-5 self-start md:grid-cols-2 md:gap-6 min-[1100px]:grid-cols-1 min-[1100px]:gap-6">
            {rest.map((video, i) => (
              <VideoListItem
                key={video._id || video.slug || i}
                video={video}
                onPlay={setActive}
                /* rule only between stacked items, never across columns */
                withDivider={i > 0}
              />
            ))}
          </ul>
        </div>

        {/* Overflow from the old Video Blogs band, same card as the
            /video-blogs listing page uses. */}
        {overflow.length > 0 && (
          <div
            className="mt-12 border-t pt-12 lg:mt-14 lg:pt-14"
            style={{ borderColor: C.divider }}
          >
            <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {overflow.map((video) => (
                <VideoBlogTile key={video._id || video.slug} video={video} />
              ))}
            </div>
          </div>
        )}
      </div>

      <VideoModal video={active} onClose={close} />
    </section>
  );
};

export default LatestVideoSection;
