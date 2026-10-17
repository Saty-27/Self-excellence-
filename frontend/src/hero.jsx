import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, HeartHandshake, Sparkles } from "lucide-react";

/* ============================================================
   Hero + stats strip
   ------------------------------------------------------------
   Section 2.2 / 2.3 of the redesign. The Navbar is fixed and
   transparent at rest, so this section starts at the very top
   of the document and the artwork runs behind the bar.
   ============================================================ */

const HERO_ARTWORK = "/hero-krishna-arjuna.webp";
const HERO_TEXTURE = "/hero-mandala-texture.webp";

const MAHAMANTRA = [
  "हरे कृष्ण हरे कृष्ण",
  "कृष्ण कृष्ण हरे हरे ।",
  "हरे राम हरे राम",
  "राम राम हरे हरे ॥"
];

const MINI_FEATURES = [
  { icon: BookOpen, label: "Learn", text: "Bhagavad Gita" },
  { icon: Sparkles, label: "Practice", text: "Spiritual Habits" },
  { icon: HeartHandshake, label: "Serve", text: "Meaningful Life" }
];

const RAIL_WORDS = ["Chant", "Learn", "Serve", "Travel", "Grow"];

/* ------------------------------------------------------------------ */

/* Reveals a block once it scrolls into view. */
const useReveal = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-in");
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
};

/* Counts a numeric stat up the first time it is seen. */
const useCountUp = (target, enabled) => {
  const ref = useRef(null);
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return undefined;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / 1200, 1);
          setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, enabled]);

  return { ref, value };
};

/* ------------------------------------------------------------------ */

const StatItem = ({ icon: Icon, numeric, target, suffix, lead, label, isLast }) => {
  const { ref, value } = useCountUp(target, numeric);

  return (
    <li
      ref={ref}
      className={`flex items-center gap-4 py-5 lg:py-0 ${
        isLast ? "" : "lg:border-r lg:border-line"
      } ${numeric ? "" : ""} px-0 lg:px-8`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/25 text-primary">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[26px] font-extrabold leading-none text-heading sm:text-[30px]">
          {numeric ? `${value.toLocaleString("en-IN")}${suffix}` : lead}
        </span>
        <span className="mt-1.5 block font-ui text-[13.5px] text-text-muted">{label}</span>
      </span>
    </li>
  );
};

export const HeroStatsStrip = () => (
  <section aria-label="ISKCON Juhu at a glance" className="border-y border-line bg-bg-warm">
    <div className="shell">
      <ul className="grid grid-cols-1 py-2 sm:grid-cols-2 lg:grid-cols-4 lg:py-8">
        <StatItem icon={BookOpen} numeric target={50} suffix="+" label="Weekly Classes" />
        <StatItem icon={HeartHandshake} numeric target={10000} suffix="+" label="Lives Touched" />
        <StatItem icon={Sparkles} lead="Spiritual Journeys" label="Across India" />
        <StatItem icon={ArrowRight} lead="Community" label="A Global Family" isLast />
      </ul>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */

export const ISKCONHero = () => {
  const reveal = useReveal();

  return (
    <>
      <section
        aria-label="Begin your devotional journey"
        className="relative overflow-hidden bg-bg-cream"
      >
        {/* Warm radial wash on the left so the copy always reads. */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(120% 95% at 2% 42%, #FFFDF8 0%, #FFF6E8 38%, rgba(255,248,240,0) 72%)"
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.05]"
          aria-hidden="true"
          style={{ backgroundImage: `url(${HERO_TEXTURE})`, backgroundSize: "620px auto", backgroundRepeat: "repeat" }}
        />

        {/* Artwork: right 55%, full-bleed, left edge dissolved into the wash. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden w-[55%] lg:block" aria-hidden="true">
          <img
            src={HERO_ARTWORK}
            alt=""
            className="hero-drift h-full w-full object-cover object-[86%_center]"
          />
          <div className="absolute inset-y-0 left-0 w-[48%] bg-gradient-to-r from-bg-cream via-bg-cream/80 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-bg-cream/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg-cream to-transparent" />

          {/* Script overlay on the artwork */}
          <span
            className="absolute right-[22%] top-[46%] select-none font-script text-[44px] text-white/90 drop-shadow-[0_2px_10px_rgba(60,30,10,0.35)] xl:text-[56px] 2xl:text-[64px]"
            style={{ transform: "rotate(-8deg)" }}
          >
            Hare Krishna
          </span>
        </div>

        {/* Vertical word rail on the far right edge */}
        <div
          className="pointer-events-none absolute right-5 top-1/2 z-[2] hidden -translate-y-1/2 items-center gap-4 xl:flex xl:flex-col"
          aria-hidden="true"
        >
          <span className="h-10 w-px bg-white/55" />
          <ul className="flex flex-col items-center gap-7 font-ui text-[11px] font-semibold uppercase tracking-[0.3em] text-white drop-shadow-[0_1px_6px_rgba(60,30,10,0.55)]">
            {RAIL_WORDS.map((w) => (
              <li key={w} style={{ writingMode: "vertical-rl" }}>
                {w}
              </li>
            ))}
          </ul>
          <span className="h-10 w-px bg-white/55" />
        </div>

        <div className="shell relative z-[2]">
          <div
            ref={reveal}
            className="reveal flex min-h-[86vh] max-w-[600px] flex-col justify-center py-24 lg:min-h-[92vh] lg:py-28"
          >
            {/* 1 — mahamantra */}
            <div className="font-deva text-[16px] leading-[1.9] text-primary/80 sm:text-[18px]">
              {MAHAMANTRA.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            {/* 2 — headline */}
            <h1 className="t-hero mt-6 font-display font-extrabold text-heading">
              Begin Your
              <span className="accent-gradient block">Devotional Journey</span>
            </h1>

            {/* 3 — intro */}
            <p className="t-sub mt-5 max-w-[520px] font-ui text-body">
              Discover timeless wisdom, transform your life and experience the joy of Krishna
              consciousness.
            </p>

            {/* 4 — mini features */}
            <ul className="mt-9 flex flex-wrap gap-x-9 gap-y-5">
              {MINI_FEATURES.map(({ icon: Icon, label, text }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-bg-warm text-primary">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="t-eyebrow block font-ui font-semibold text-primary">{label}</span>
                    <span className="mt-0.5 block font-ui text-[14.5px] font-medium text-body">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* 5 — actions */}
            <div className="mt-10 flex flex-col gap-3.5 xs:flex-row xs:items-center">
              <Link
                to="/courses"
                className="group inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-primary px-[30px] font-ui font-semibold text-white shadow-cta transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-dark t-btn"
              >
                Explore Courses
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link
                to="/#upcoming-classes"
                className="inline-flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-primary px-[30px] font-ui font-semibold text-primary transition-colors duration-300 hover:bg-primary hover:text-white t-btn"
              >
                Join a Pilgrimage
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile artwork sits under the copy */}
        <div className="relative z-[2] lg:hidden" aria-hidden="true">
          <div className="relative h-[380px] w-full overflow-hidden">
            <img src={HERO_ARTWORK} alt="" className="h-full w-full object-cover object-[76%_36%]" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-bg-cream to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg-cream to-transparent" />
            <span
              className="absolute right-6 top-8 select-none font-script text-[38px] text-white/90 drop-shadow-[0_2px_10px_rgba(60,30,10,0.35)]"
              style={{ transform: "rotate(-8deg)" }}
            >
              Hare Krishna
            </span>
          </div>
        </div>
      </section>

      <HeroStatsStrip />
    </>
  );
};

export default ISKCONHero;
