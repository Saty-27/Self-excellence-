import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { apiFetch, assetUrl } from "./api";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const C = {
  bg: "#FFF8F0",
  card: "#FFFFFF",
  title: "#1C1410",
  body: "#7A6E66",
  sub: "#7A6E66",
  terracotta: "#C1121F",
  gold: "#D4A017",
  border: "rgba(150, 100, 60, 0.12)",
  eyebrow: "#9B0D18"
};

const CornerOrnament = (props) => (
  <svg viewBox="0 0 240 240" fill="none" stroke="currentColor" strokeWidth="1" {...props}>
    <circle cx="120" cy="120" r="46" />
    <circle cx="120" cy="120" r="72" />
    <circle cx="120" cy="120" r="98" />
  </svg>
);

export const BookTile = ({ book }) => {
  return (
    <Link
      to={`/books/${book.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: C.border, boxShadow: "0 8px 30px rgba(60, 40, 20, 0.06)" }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F0E2D3]">
        {book.coverImage ? (
          <img
            src={assetUrl(book.coverImage)}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <BookOpen size={40} className="text-primary/40" />
          </div>
        )}
        <div className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black tracking-wide text-primary shadow-sm backdrop-blur-sm">
          {money(book.pricePerBook)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-tight text-ink group-hover:text-primary transition-colors">
          {book.title}
        </h3>

        {book.shortDescription && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
            {book.shortDescription}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="font-display text-base font-bold text-primary">
            {money(book.pricePerBook)}
          </span>
          <span className="text-[11px] text-muted">per copy</span>
          {book.mrp && book.mrp > book.pricePerBook && (
            <span className="text-xs text-muted line-through">
              {money(book.mrp)}
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs font-bold text-primary">
          <span>View Details</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
};

export const BookTileSkeleton = () => (
  <div
    className="flex flex-col overflow-hidden rounded-2xl border bg-white"
    style={{ borderColor: C.border }}
  >
    <div className="aspect-[3/4] w-full animate-pulse bg-[#F0E2D3]" />
    <div className="p-5 space-y-3">
      <div className="h-5 w-3/4 animate-pulse rounded bg-[#F0E2D3]" />
      <div className="h-3.5 w-full animate-pulse rounded bg-[#F0E2D3]" />
      <div className="h-3.5 w-1/2 animate-pulse rounded bg-[#F0E2D3]" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-[#F0E2D3] pt-2" />
    </div>
  </div>
);

export const BooksSection = ({
  eyebrow = "Timeless Wisdom • Buy & Distribute",
  titleLead = "Sacred",
  titleAccent = "Books",
  subtitle = "Read, gift and share the divine teachings of sacred Vedic literatures.",
  viewAllLabel = "View All Books",
  viewAllLink = "/books"
}) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    apiFetch("/books")
      .then((data) => {
        if (alive && data.items) {
          // Take first 4 books by display order
          setBooks(data.items.slice(0, 4));
        }
      })
      .catch((err) => {
        console.error("BooksSection load error:", err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  // Empty state: quietly hide section
  if (!loading && books.length === 0) return null;

  return (
    <section aria-label="Sacred Books" className="relative overflow-hidden" style={{ backgroundColor: C.bg }}>
      {/* Ornamental accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <CornerOrnament className="absolute -left-20 -top-20 h-64 w-64 opacity-[0.06] text-[#D4A017]" />
        <CornerOrnament className="absolute -right-20 -bottom-20 h-64 w-64 opacity-[0.06] text-[#D4A017]" />
      </div>

      <div className="mx-auto w-full max-w-shell px-4 sm:px-6 relative pb-16 pt-14 md:pb-24 md:pt-20">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-10">
          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[3px] text-[#9B0D18]">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-ink">{titleLead} </span>
              <span style={{ color: C.terracotta }}>{titleAccent}</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted max-w-xl">
              {subtitle}
            </p>
          </div>

          <Link
            to={viewAllLink}
            className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border-[1.5px] border-[#C1121F] bg-transparent px-5 text-xs font-bold text-[#C1121F] transition-colors hover:bg-[#C1121F] hover:text-white"
          >
            <span>{viewAllLabel}</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 4 Cards Grid: 4 cols on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <BookTileSkeleton key={i} />)
            : books.map((book) => <BookTile key={book._id || book.slug} book={book} />)}
        </div>
      </div>
    </section>
  );
};
