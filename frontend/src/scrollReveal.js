/* ============================================================
   Homepage scroll reveal
   ------------------------------------------------------------
   Each top-level <section> inside <main> fades its content up
   the first time it enters the viewport. The class is applied
   from here rather than inside every section file so the
   sections themselves stay purely presentational.

   Anything already on screen when the page loads is marked as
   revealed straight away, so nothing can flash in.
   ============================================================ */

const REVEAL_MARGIN = 120;

export const initScrollReveal = () => {
  const main = document.querySelector("main");
  if (!main) return undefined;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = [];

  main.querySelectorAll(":scope > section, :scope > div > section").forEach((section) => {
    const inner = section.firstElementChild;
    if (!inner || inner.dataset.reveal === "on") return;
    inner.dataset.reveal = "on";
    inner.classList.add("reveal");
    /* Visible on load (or motion turned off) → show it now, no animation. */
    if (reduced || section.getBoundingClientRect().top < window.innerHeight - REVEAL_MARGIN) {
      inner.classList.add("is-in");
      return;
    }
    targets.push(inner);
  });

  if (!targets.length) return undefined;

  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }),
    { rootMargin: `0px 0px -${REVEAL_MARGIN}px 0px`, threshold: 0 }
  );
  targets.forEach((el) => io.observe(el));
  return () => io.disconnect();
};
