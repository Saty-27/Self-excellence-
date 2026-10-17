export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      screens: { xs: "480px" },
      colors: {
        /* ---- redesign token layer (single source of truth) ---- */
        primary: "#C1121F",
        "primary-dark": "#9B0D18",
        saffron: "#E8590C",
        gold: "#D4A017",
        heading: "#1C1410",
        body: "#3D3530",
        "text-muted": "#7A6E66",
        "bg-cream": "#FFF8F0",
        "bg-warm": "#FDF1E4",
        line: "#F0E2D3",
        "footer-bg": "#1A1412",

        /* legacy aliases kept so untouched sections keep compiling */
        ink: "#1C1410",
        inkDeep: "#1C1410",
        inkMuted: "#7A6E66",
        muted: "#7A6E66",
        soft: "#FFF8F0",
        saffronDark: "#A8430B",
        "primary-hover": "#9B0D18"
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        ui: ["var(--font-body)"],
        display: ["var(--font-display)"],
        deva: ["var(--font-deva)"],
        script: ["var(--font-script)"]
      },
      maxWidth: { shell: "1320px" },
      boxShadow: {
        card: "0 12px 40px rgba(60, 30, 10, 0.08)",
        cardHover: "0 20px 50px rgba(60, 30, 10, 0.14)",
        cta: "0 10px 25px rgba(193, 18, 31, 0.25)",
        premium: "0 12px 40px rgba(60, 30, 10, 0.08)"
      }
    }
  },
  plugins: []
};
