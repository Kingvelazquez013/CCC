import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        surface: {
          0: "#09090b",
          1: "#111113",
          2: "#18181b",
          3: "#1f1f23",
          4: "#27272a",
        },
        accent: {
          emerald: "#34d399",
          cyan: "#22d3ee",
          amber: "#fbbf24",
          violet: "#a78bfa",
        },
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        pulse_dot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "pulse-danger": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(239, 68, 68, 0.0)" },
          "50%": { boxShadow: "0 0 16px rgba(239, 68, 68, 0.25)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out forwards",
        "slide-in": "slide-in 0.35s ease-out forwards",
        pulse_dot: "pulse_dot 2s ease-in-out infinite",
        "pulse-danger": "pulse-danger 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
