/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brand (remapped to Turmeric Saffron — replaces all existing brand-* usage)
        brand: {
          50:  "#FAF1DF",
          100: "#F2DDB1",
          200: "#E8C98A",
          300: "#E2B469",
          400: "#D49A4E",
          500: "#C8893A",
          600: "#A8702A",
          700: "#82561E",
          800: "#623F14",
          900: "#4A2F10",
        },
        // GlucoLens anchor tones
        "gl-ink":      "#1A1614",
        "gl-ink-soft": "#2B2622",
        "gl-bg":       "#FBF8F3",
        "gl-bg-elev":  "#FFFDF8",
        "gl-bg-sunk":  "#F4F0E8",
        // Warm stone neutrals
        "gl-stone": {
          50:  "#F1EDE4",
          100: "#E8E2D5",
          200: "#D6CDBB",
          300: "#B8AD96",
          400: "#8E8470",
          500: "#5E5849",
          600: "#3D3930",
        },
        // Full saffron scale
        "gl-saffron": {
          50:  "#FAF1DF",
          100: "#F2DDB1",
          300: "#E2B469",
          500: "#C8893A",
          600: "#A8702A",
          700: "#82561E",
          900: "#4A2F10",
        },
        // Traffic-light (calibrated medical)
        "gl-green":      "#2D5F3F",
        "gl-green-soft": "#D8E4D6",
        "gl-amber":      "#B7791F",
        "gl-amber-soft": "#F2E2BC",
        "gl-red":        "#A33B2A",
        "gl-red-soft":   "#ECCEC4",
        // Data viz accents
        "gl-teal":      "#2D6A6A",
        "gl-teal-soft": "#CFE0DE",
        "gl-plum":      "#6B3F5C",
        "gl-plum-soft": "#E1CFD8",
      },

      fontFamily: {
        display: ['"General Sans"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', '"SFMono-Regular"', 'monospace'],
      },

      fontSize: {
        "display-xl": ["80px", { lineHeight: "1.04", letterSpacing: "-0.02em" }],
        "display-lg": ["64px", { lineHeight: "1.04", letterSpacing: "-0.02em" }],
        "display":    ["48px", { lineHeight: "1.04", letterSpacing: "-0.02em" }],
        "h1":         ["40px", { lineHeight: "1.1",  letterSpacing: "-0.02em" }],
        "h2":         ["32px", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "h3":         ["24px", { lineHeight: "1.25" }],
        "h4":         ["20px", { lineHeight: "1.3"  }],
        "body-lg":    ["18px", { lineHeight: "1.6"  }],
        "body":       ["16px", { lineHeight: "1.55" }],
        "sm":         ["14px", { lineHeight: "1.5"  }],
        "xs":         ["12px", { lineHeight: "1.5"  }],
      },

      borderRadius: {
        sm:   "6px",
        DEFAULT: "10px",
        md:   "14px",
        lg:   "20px",
        xl:   "28px",
        pill: "999px",
      },

      boxShadow: {
        "gl-sm": "0 1px 0 rgba(26,22,20,0.04), 0 1px 2px rgba(26,22,20,0.04)",
        "gl":    "0 2px 0 rgba(26,22,20,0.03), 0 8px 24px -10px rgba(26,22,20,0.10)",
        "gl-lg": "0 4px 0 rgba(26,22,20,0.03), 0 24px 60px -20px rgba(26,22,20,0.18)",
        "saffron": "0 1px 0 #82561E inset, 0 6px 16px -8px rgba(168,112,42,0.6)",
      },

      transitionTimingFunction: {
        "spring-snap":  "cubic-bezier(.2,.9,.3,1.1)",
        "spring-soft":  "cubic-bezier(.34,1.56,.64,1)",
        "ease-gl":      "cubic-bezier(.2,.7,.2,1)",
      },

      transitionDuration: {
        fast: "140ms",
        DEFAULT: "260ms",
        slow: "460ms",
      },

      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        shimmer:  "shimmer 1.4s linear infinite",
        "fade-in":  "fadeIn 260ms cubic-bezier(.2,.7,.2,1) both",
        "scale-in": "scaleIn 260ms cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
}
