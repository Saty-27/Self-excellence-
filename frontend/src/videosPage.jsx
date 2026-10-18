import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Play, Search, X } from "lucide-react";
import { apiFetch } from "./api";
import { SEO } from "./components";
import { VideoModal } from "./latestVideo";
import { VideoBlogTile, VideoBlogTileSkeleton, VideoPoster } from "./videoBlogs";

/* ============================================================
   Videos — the full listing
   ------------------------------------------------------------
   Reads the same VideoBlog records the homepage band uses, so a
   video is added once in the admin panel and appears in both.

   The record marked `featured` leads the page in a large player;
   everything else falls into the grid below. Posters come from
   the API as `posterUrl`, which is the admin's own thumbnail when
   they uploaded one and the still from the video when they did not.
   ============================================================ */

const SHELL = "mx-auto w-full max-w-shell px-4 sm:px-6";

const CONTROL =
  "h-11 rounded-full border border-line bg-white px-4 font-ui text-[13.5px] text-heading outline-none transition-colors focus:border-primary";

/* ------------------------------------------------------------------ */

const FeaturedPlayer = ({ video, onPlay }) => (
  <div className="group relative overflow-hidden rounded-2xl bg-heading">
      <div className="aspect-video w-full overflow-hidden">
        <VideoPoster
          video={video}
          className="h-full w-full object-cover transition-transform duration-[450ms] ease-out group-hover:scale-[1.02]"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      <button
        type="button"
        onClick={() => onPlay(video)}
        aria-label={`Play ${video.title}`}
        className="absolute inset-0 z-[1] cursor-pointer"
      />

      <span className="pointer-events-none absolute left-1/2 top-[38%] z-[2] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 backdrop-blur-sm transition-transform duration-300 ease-out group-hover:scale-[1.08] sm:top-1/2 sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]">
        <Play size={26} className="ml-1 fill-current text-heading" aria-hidden="true" />
      </span>

      <div className="pointer-events-none absolute inset-x-5 bottom-5 z-[2] sm:inset-x-7 sm:bottom-7">
        <div className="flex flex-wrap items-center gap-2">
          {video.category && (
            <span className="rounded-md bg-white/95 px-2.5 py-1 font-ui text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-heading">
              {video.category}
            </span>
          )}
          {video.duration && (
            <span className="rounded-md bg-black/55 px-2 py-1 font-ui text-[11px] font-semibold leading-none text-white backdrop-blur-sm">
              {video.duration}
            </span>
          )}
        </div>

        <h2 className="mt-3 max-w-[90%] font-display text-[23px] font-bold leading-[1.1] text-white sm:text-[30px] lg:max-w-[70%] lg:text-[38px]">
          {video.title}
        </h2>

        {video.speaker && (
          <p className="mt-1.5 font-ui text-[13px] font-semibold text-white/90">{video.speaker}</p>
        )}
      </div>
  </div>
);

/* ------------------------------------------------------------------ */

export const VideosPage = () => {
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ items: [], loading: true });
  const [filters, setFilters] = useState({ categories: [], speakers: [] });
  const [searchDraft, setSearchDraft] = useState(params.get("search") || "");
  const [active, setActive] = useState(null);
  const closePlayer = useCallback(() => setActive(null), []);

  const query = params.toString();

  useEffect(() => {
    let cancelled = false;
    setState((old) => ({ ...old, loading: true }));
    apiFetch(`/video-blogs?limit=60${query ? `&${query}` : ""}`)
      .then((d) => !cancelled && setState({ items: d.items || [], loading: false }))
      .catch(() => !cancelled && setState({ items: [], loading: false }));
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    apiFetch("/video-blogs-filters")
      .then((d) => setFilters({ categories: d.categories || [], speakers: d.speakers || [] }))
      .catch(() => {});
  }, []);

  /* Keep the box in step when the URL changes from outside the form. */
  useEffect(() => {
    setSearchDraft(params.get("search") || "");
  }, [params]);

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const activeCount = ["category", "speaker", "search"].filter((k) => params.get(k)).length;
  const clearAll = () => setParams(new URLSearchParams());

  /* Only lead with a featured player on the unfiltered page — once
     someone is searching, every result deserves the same weight. */
  const { lead, grid } = useMemo(() => {
    if (activeCount > 0 || state.items.length === 0) return { lead: null, grid: state.items };
    const [first, ...others] = state.items;
    return { lead: first, grid: others };
  }, [state.items, activeCount]);

  return (
    <>
      <SEO
        title="Videos | ISKCON Juhu Self-Excellence"
        description="Classes, kirtans and short reflections from ISKCON Juhu, free to watch."
      />

      {/* Page header */}
      <section className="border-b border-line bg-bg-cream">
        <div className={`${SHELL} py-14 lg:py-20`}>
          <p className="font-ui text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            ISKCON Juhu Self-Excellence
          </p>
          <h1 className="t-h2 mt-3 font-display font-extrabold text-heading">
            Latest <span className="accent-gradient">Videos</span>
          </h1>
          <p className="mt-3 max-w-xl font-ui text-[15px] leading-[1.65] text-body md:text-[16.5px]">
            Classes, kirtans and short reflections from ISKCON Juhu. Everything here is free to watch, and nothing needs
            an account.
          </p>
        </div>
      </section>

      {/* Filters — a grid at phone width, since controls of differing
          text length otherwise land in ragged rows. */}
      <section className="sticky top-[68px] z-30 border-b border-line bg-white/95 backdrop-blur-[12px] lg:top-[84px]">
        <div className={`${SHELL} grid grid-cols-2 gap-2.5 py-4 min-[900px]:flex min-[900px]:flex-wrap min-[900px]:items-center`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              set("search", searchDraft.trim());
            }}
            className="relative col-span-2 min-[900px]:flex-1 min-[900px]:min-w-[200px]"
          >
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search videos…"
              aria-label="Search videos"
              className={`${CONTROL} w-full pl-10`}
            />
          </form>

          <select
            value={params.get("category") || ""}
            onChange={(e) => set("category", e.target.value)}
            aria-label="Category"
            className={CONTROL}
          >
            <option value="">All categories</option>
            {filters.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={params.get("speaker") || ""}
            onChange={(e) => set("speaker", e.target.value)}
            aria-label="Speaker"
            className={CONTROL}
          >
            <option value="">All speakers</option>
            {filters.speakers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-line px-4 font-ui text-[13px] font-semibold text-body transition-colors hover:border-primary hover:text-primary min-[900px]:col-span-1"
            >
              <X size={14} aria-hidden="true" />
              Clear {activeCount === 1 ? "filter" : "filters"}
            </button>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="bg-white">
        <div className={`${SHELL} py-12 lg:py-16`}>
          {state.loading ? (
            <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <VideoBlogTileSkeleton key={i} />
              ))}
            </div>
          ) : state.items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-display text-[22px] font-bold text-heading">No videos found</p>
              <p className="mt-2 font-ui text-[14.5px] text-body">
                Try a different search, or clear the filters to see everything.
              </p>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-6 font-ui text-[13.5px] font-bold text-white"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {lead && (
                <div className="mb-10 lg:mb-12">
                  <FeaturedPlayer video={lead} onPlay={setActive} />
                </div>
              )}

              <p className="mb-5 font-ui text-[13px] font-semibold text-text-muted">
                {state.items.length} {state.items.length === 1 ? "video" : "videos"}
              </p>

              {grid.length > 0 && (
                <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {grid.map((video) => (
                    <VideoBlogTile key={video._id || video.slug} video={video} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <VideoModal video={active} onClose={closePlayer} />
    </>
  );
};

export default VideosPage;
