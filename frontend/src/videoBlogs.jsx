import { useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "./api";
import { MediaFallback } from "./mediaFallback";

/* ============================================================
   Video Blogs
   ------------------------------------------------------------
   Presentation only. Cards keep linking to /video-blogs/:slug
   so the detail pages and routing are unchanged. Duration and
   speaker render when the record carries them.
   ============================================================ */

const C = {
  bg: "#FFF8F0",
  text: "#1C1410",
  title: "#1C1410",
  body: "#7A6E66",
  sub: "#7A6E66",
  meta: "#7A6E66",
  terracotta: "#C1121F",
  border: "#C1121F",
  link: "#9B0D18",
  gold: "#D4A017",
  cardBorder: "rgba(30, 25, 20, 0.08)"
};

const CONTAINER = "mx-auto w-full max-w-shell px-4 sm:px-6";

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

/* The API sends `posterUrl` already resolved — the admin's thumbnail
   if there is one, otherwise the still from the video. The local
   derivation remains for records that arrive without it. */
export const posterFor = (video) => {
  const fromApi = video?.posterUrl || video?.thumbnail;
  if (fromApi) return fromApi.startsWith("http") ? fromApi : assetUrl(fromApi);
  const m = String(video?.videoUrl || "").match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : "";
};

/* True when the record plays a file from our own server rather than
   an embed, in which case it needs a <video> element, not an iframe. */
export const isUploaded = (video) =>
  Boolean(video?.isUpload || (video?.videoType === "upload" && video?.uploadedVideo));

export const fileSrc = (video) => assetUrl(video?.playbackUrl || video?.uploadedVideo || "");

/* ------------------------------------------------------------------
   Poster
   ------------------------------------------------------------------
   Three cases, in order: the admin's own thumbnail, the still taken
   from a YouTube link, and — for a file uploaded to us, which has no
   still to fetch — a frame from the video itself. Loading only the
   metadata and seeking half a second in makes the browser paint that
   frame, so an uploaded video gets a thumbnail with no server work
   and nothing for the admin to prepare.
   ------------------------------------------------------------------ */

export const VideoPoster = ({ video, className = "", alt = "" }) => {
  const [failed, setFailed] = useState(false);
  const poster = posterFor(video);

  if (!poster && isUploaded(video)) {
    return (
      <video
        src={`${fileSrc(video)}#t=0.5`}
        preload="metadata"
        muted
        playsInline
        tabIndex={-1}
        aria-hidden="true"
        className={className}
      />
    );
  }

  if (failed || !poster) return <MediaFallback />;

  return (
    <img
      src={poster}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

/* ------------------------------------------------------------------ */

const VideoThumb = ({ video }) => {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1C1410]">
      <VideoPoster
        video={video}
        alt={video.title}
        className="h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
      />

      <div className="absolute inset-0 bg-black/15" />

      <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/85 backdrop-blur-sm transition-transform duration-300 ease-out group-hover:scale-[1.08]">
        <PlayGlyph className="ml-0.5 h-5 w-5" />
      </span>

      {video.duration && (
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/65 px-2 py-0.5 font-ui text-[11px] font-semibold text-white backdrop-blur-sm">
          {video.duration}
        </span>
      )}

      {video.category && (
        <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 font-ui text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-[#3D3530] shadow-[0_2px_8px_rgba(60,35,20,0.12)] backdrop-blur-sm">
          {video.category}
        </span>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const VideoBlogTile = ({ video }) => (
  <Link
    to={`/video-blogs/${video.slug || video._id}`}
    className="group flex h-full flex-col overflow-hidden rounded-xl border bg-white transition-[transform,box-shadow] duration-[300ms] ease-out hover:-translate-y-[3px] hover:shadow-[0_14px_34px_rgba(60,35,20,0.10)]"
    style={{ borderColor: C.cardBorder, boxShadow: "0 8px 26px rgba(60, 40, 20, 0.06)" }}
  >
    <VideoThumb video={video} />

    <div className="flex flex-1 flex-col p-5">
      <h3
        className="font-display text-[20px] font-bold leading-[1.18] tracking-[-0.015em] transition-colors duration-300 group-hover:text-[#C1121F] lg:text-[22px]"
        style={{ color: C.title }}
      >
        {video.title}
      </h3>

      {video.speaker && (
        <p className="mt-1.5 font-ui text-[12px] font-semibold" style={{ color: C.meta }}>
          {video.speaker}
        </p>
      )}

      {video.shortDescription && (
        <p
          className="mt-2 line-clamp-2 font-ui text-[13.5px] font-normal leading-[1.55]"
          style={{ color: C.body }}
        >
          {video.shortDescription}
        </p>
      )}

      <div className="flex-1" />

      <span className="mt-4 inline-flex items-center gap-1.5 font-ui text-[12.5px] font-bold" style={{ color: C.link }}>
        Watch Now
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
          <path d="M2.5 8h11M9.5 4l4 4-4 4" />
        </svg>
      </span>
    </div>
  </Link>
);

/* ------------------------------------------------------------------ */

export const VideoBlogTileSkeleton = () => (
  <div
    className="flex h-full flex-col overflow-hidden rounded-xl border bg-white"
    style={{ borderColor: C.cardBorder, boxShadow: "0 8px 26px rgba(60, 40, 20, 0.06)" }}
  >
    <div className="aspect-[16/9] w-full animate-pulse bg-[#F0E2D3]" />
    <div className="flex flex-1 flex-col p-5">
      <div className="h-5 w-4/5 animate-pulse rounded bg-[#F0E2D3]" />
      <div className="mt-3 h-3.5 w-full animate-pulse rounded bg-[#F0E2D3]" />
      <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded bg-[#F0E2D3]" />
      <div className="mt-5 h-3.5 w-24 animate-pulse rounded bg-[#F0E2D3]" />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */

export const VideoBlogsSection = ({
  videos = [],
  loading = false,
  titleLead = "Video",
  titleAccent = "Blogs",
  subtitle = "Short messages, class highlights, and festival reflections.",
  viewAllLabel = "View All Video Blogs",
  viewAllLink = "/video-blogs",
  limit = 3,
  skeletonCount = 3
}) => {
  const items = videos.slice(0, limit);
  if (!loading && !items.length) return null;

  return (
    <section aria-label="Video blogs" className="relative overflow-hidden" style={{ backgroundColor: C.bg }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <CornerOrnament className="absolute -right-24 -top-24 h-[260px] w-[260px] opacity-[0.05]" style={{ color: C.gold }} />
        <CornerOrnament className="absolute -bottom-24 -left-24 h-[280px] w-[280px] opacity-[0.05]" style={{ color: C.gold }} />
      </div>

      <div className={`${CONTAINER} relative py-16 md:py-20 lg:py-[88px]`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
          <div className="min-w-0">
            <h2 className="font-display font-bold leading-[1.0] tracking-[-0.02em] text-[34px] sm:text-[40px] md:text-[46px] lg:text-[52px]">
              <span style={{ color: C.text }}>{titleLead} </span>
              <span style={{ color: C.terracotta }}>{titleAccent}</span>
            </h2>
            <p className="mt-2.5 font-ui text-[15px] font-normal leading-[1.55] md:text-[16px]" style={{ color: C.sub }}>
              {subtitle}
            </p>
          </div>

          <Link
            to={viewAllLink}
            className="group inline-flex w-fit shrink-0 items-center gap-2 self-start rounded-full border bg-transparent px-6 py-3 font-ui text-[12.5px] font-bold transition-colors duration-[250ms] hover:bg-[#C1121F]/[0.07] sm:self-auto"
            style={{ borderColor: C.border, color: C.link }}
          >
            {viewAllLabel}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform duration-[250ms] group-hover:translate-x-1" aria-hidden="true">
              <path d="M2.5 8h11M9.5 4l4 4-4 4" />
            </svg>
          </Link>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-6">
          {loading && !items.length
            ? Array.from({ length: skeletonCount }).map((_, i) => <VideoBlogTileSkeleton key={i} />)
            : items.map((video) => <VideoBlogTile key={video._id || video.slug} video={video} />)}
        </div>
      </div>
    </section>
  );
};

export default VideoBlogsSection;
