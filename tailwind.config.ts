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
          ink: "#111318",
          panel: "#191d24",
          line: "#2f3742",
          teal: "#1db7a6",
          gold: "#f1b84b",
          danger: "#e85d75"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
