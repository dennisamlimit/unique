import type { Config } from "tailwindcss";

export default {
  content: ["./src/cef/index.html", "./src/cef/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        unique: {
          ink: "rgb(var(--unique-ink-rgb) / <alpha-value>)",
          panel: "rgb(var(--unique-panel-rgb) / <alpha-value>)",
          line: "rgb(var(--unique-line-rgb) / <alpha-value>)",
          bg: "rgb(var(--unique-bg-rgb) / <alpha-value>)",
          deep: "rgb(var(--unique-deep-rgb) / <alpha-value>)",
          teal: "rgb(var(--unique-teal-rgb) / <alpha-value>)",
          gold: "rgb(var(--unique-gold-rgb) / <alpha-value>)",
          danger: "rgb(var(--unique-danger-rgb) / <alpha-value>)"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
