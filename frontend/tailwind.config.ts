import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: "#09090B",
        "surface-1": "#111113",
        "surface-2": "#18181B",
        "surface-raised": "#1E1E22",
        primary: {
          DEFAULT: "#0A2FFF",
          hover: "#2850FF",
        },
        accent: {
          DEFAULT: "#00F0D4",
          hover: "#33F5DF",
        },
        "text-primary": "#FAFAFA",
        "text-secondary": "#A1A1AA",
        "text-tertiary": "#71717A",
        "border-subtle": "#27272A",
        "border-default": "#3F3F46",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        button: "0.5rem",
        input: "0.5rem",
        card: "1rem",
      },
      boxShadow: {
        glow: "0 0 20px rgba(10, 47, 255, 0.3)",
        "glow-accent": "0 0 20px rgba(0, 240, 212, 0.2)",
      },
      maxWidth: {
        content: "1280px",
      },
      spacing: {
        "section-desktop": "6rem",
        "section-tablet": "4rem",
        "section-mobile": "3rem",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
