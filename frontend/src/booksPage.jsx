import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import { apiFetch } from "./api";
import { SEO } from "./components";
import { BookTile, BookTileSkeleton } from "./booksSection";

export const BooksPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/books")
      .then((data) => setBooks(data.items || []))
      .catch((err) => console.error("Failed to load books:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#FFFDF9] min-h-screen py-12 md:py-20">
      <SEO
        title="Sacred Books — ISKCON Juhu Self-Excellence"
        description="Discover, read, purchase, and sponsor the distribution of sacred Vedic scriptures."
      />

      <div className="mx-auto max-w-shell px-4 sm:px-6">
        {/* Page Banner / Header */}
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[3px] text-primary">
            Sacred Vedic Literatures
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold text-ink">
            Sacred Books
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted">
            Delve into timeless Vedic wisdom. Order personal study copies delivered directly to your home, or sponsor mass book distribution seva to share knowledge with the world.
          </p>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <BookTileSkeleton key={i} />)
            : books.map((book) => <BookTile key={book._id || book.slug} book={book} />)}
        </div>

        {!loading && books.length === 0 && (
          <div className="rounded-3xl border border-black/5 bg-white p-12 text-center text-muted">
            <BookOpen size={48} className="mx-auto text-primary/30 mb-3" />
            <h3 className="text-lg font-bold text-ink">No Books Currently Listed</h3>
            <p className="text-xs mt-1">Please check back soon or visit our temple store.</p>
          </div>
        )}
      </div>
    </div>
  );
};
