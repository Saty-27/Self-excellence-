/* ============================================================
   Shared image fallback
   ------------------------------------------------------------
   Used wherever a CMS record has no upload yet, or the upload
   404s. A warm gradient with a gold lotus watermark, so a
   missing photograph reads as part of the design rather than
   as a broken grey box.
   ============================================================ */

export const MediaFallback = ({ className = "" }) => (
  <span
    className={`grid h-full w-full place-items-center bg-gradient-to-br from-bg-warm via-bg-cream to-[#F7E2CC] ${className}`}
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 40 28"
      fill="none"
      stroke="#D4A017"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-9 w-12 opacity-60"
    >
      <path d="M20 23c-2.9-3.4-2.9-7.9 0-12.3 2.9 4.4 2.9 8.9 0 12.3Z" />
      <path d="M20 23c-4.2-.8-7.3-4-8.4-8.7 3.8.8 6.8 3.8 8.4 8.7Z" />
      <path d="M20 23c4.2-.8 7.3-4 8.4-8.7-3.8.8-6.8 3.8-8.4 8.7Z" />
      <path d="M10.5 24.6c2.9 1.8 16.1 1.8 19 0" />
    </svg>
  </span>
);

export default MediaFallback;
