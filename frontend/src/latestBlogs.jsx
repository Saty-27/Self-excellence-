import { useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "./api";
import { MediaFallback } from "./mediaFallback";

/* ============================================================
   Latest Blogs
   ------------------------------------------------------------
   Presentation only — title, category, excerpt, image and slug
   all come from the existing blog records and the card still
   links to /blogs/:slug.
   ============================================================ */

const C = {
  bg: "#FFFFFF",
  text: "#1C1410",
  title: "#1C1410",
  body: "#7A6E66",
  sub: "#7A6E66",
  terracotta: "#C1121F",
  border: "#C1121F",
  link: "#9B0D18",
  gold: "#D4A017",
  cardBorder: "rgba(150, 110, 70, 0.12)"
};

const CONTAINER = "mx-auto w-full max-w-shell px-4 sm:px-6";

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

const BlogThumb = ({ blog }) => {
  const [failed, setFailed] = useState(false);
  const src = assetUrl(blog.image);

  return (
    <div className="relative h-[200px] w-full overflow-hidden bg-[#FDF1E4] sm:h-[220px] lg:h-[232px]">
      {failed || !src ? (
        <MediaFallback />
      ) : (
        <img
          src={src}
          alt={blog.title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
        />
      )}

      {blog.category && (
        <span className="absolute left-[14px] top-[14px] rounded-lg bg-white/[0.94] px-[11px] py-[7px] font-ui text-[10px] font-bold uppercase leading-none tracking-[0.06em] text-[#3D3530] shadow-[0_2px_8px_rgba(60,35,20,0.12)] backdrop-blur-sm">
          {blog.category}
        </span>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */

export const BlogTile = ({ blog }) => (
  <Link
    to={`/blogs/${blog.slug || blog._id}`}
    className="group flex h-full flex-col overflow-hidden rounded-[14px] border bg-[#FFF8F0] transition-[transform,box-shadow] duration-[300ms] ease-out hover:-translate-y-[3px] hover:shadow-[0_14px_38px_rgba(70,45,25,0.11)]"
    style={{ borderColor: C.cardBorder, boxShadow: "0 8px 30px rgba(70, 45, 25, 0.06)" }}
  >
    <BlogThumb blog={blog} />

    <div className="flex flex-1 flex-col p-6">
      <h3
        className="font-display text-[23px] font-bold leading-[1.1] tracking-[-0.01em] transition-colors duration-300 group-hover:text-[#C1121F] sm:text-[25px] lg:text-[27px]"
        style={{ color: C.title }}
      >
        {blog.title}
      </h3>

      {blog.shortDescription && (
        <p
          className="mt-2.5 line-clamp-3 font-ui text-[15px] font-normal leading-[1.55] lg:text-[16px]"
          style={{ color: C.body }}
        >
          {blog.shortDescription}
        </p>
      )}

      <div className="flex-1" />

      <span className="mt-6 inline-flex items-center gap-2 font-ui text-[14px] font-bold" style={{ color: "#C1121F" }}>
        Read More
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        >
          <path d="M2.5 8h11M9.5 4l4 4-4 4" />
        </svg>
      </span>
    </div>
  </Link>
);

/* ------------------------------------------------------------------ */

export const BlogTileSkeleton = () => (
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

export const LatestBlogsSection = ({
  blogs = [],
  loading = false,
  titleLead = "Latest",
  titleAccent = "Blogs",
  subtitle = "Read articles on spirituality, lifestyle and devotion.",
  viewAllLabel = "View All Blogs",
  viewAllLink = "/blogs",
  limit = 3,
  skeletonCount = 3
}) => {
  const items = blogs.slice(0, limit);
  if (!loading && !items.length) return null;

  return (
    <section
      aria-label="Latest blogs"
      className="relative overflow-hidden"
      style={{ backgroundColor: C.bg }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <CornerOrnament className="absolute -left-24 -top-24 h-[260px] w-[260px] opacity-[0.05]" style={{ color: C.gold }} />
        <CornerOrnament className="absolute -bottom-24 -right-24 h-[280px] w-[280px] opacity-[0.05]" style={{ color: C.gold }} />
      </div>

      <div className={`${CONTAINER} relative py-16 md:py-20 lg:py-[110px]`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
          <div className="min-w-0">
            <h2 className="font-display font-bold leading-[0.95] tracking-[-0.025em] text-[38px] sm:text-[44px] md:text-[50px] lg:text-[58px]">
              <span style={{ color: C.text }}>{titleLead} </span>
              <span style={{ color: C.terracotta }}>{titleAccent}</span>
            </h2>
            <p className="mt-3 font-ui text-[16px] font-medium leading-[1.5] md:text-[17px]" style={{ color: C.sub }}>
              {subtitle}
            </p>
          </div>

          <Link
            to={viewAllLink}
            className="group inline-flex w-fit shrink-0 items-center gap-2 self-start rounded-full border-[1.5px] bg-transparent px-[25px] py-[13px] font-ui text-[14px] font-semibold transition-colors duration-[250ms] hover:bg-[#C1121F]/[0.07] sm:self-auto"
            style={{ borderColor: "#C1121F", color: "#C1121F" }}
          >
            {viewAllLabel}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform duration-[250ms] group-hover:translate-x-1" aria-hidden="true">
              <path d="M2.5 8h11M9.5 4l4 4-4 4" />
            </svg>
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-[45px] min-[1100px]:grid-cols-3 lg:gap-7">
          {loading && !items.length
            ? Array.from({ length: skeletonCount }).map((_, i) => <BlogTileSkeleton key={i} />)
            : items.map((blog) => <BlogTile key={blog._id || blog.slug} blog={blog} />)}
        </div>
      </div>
    </section>
  );
};

export default LatestBlogsSection;
