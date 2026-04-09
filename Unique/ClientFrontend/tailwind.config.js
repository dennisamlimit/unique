export default {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
        display: ["ChaletComprime", "Impact", "Arial Narrow", "sans-serif"]
      },
      boxShadow: {
        panel: "0 16px 44px rgba(0, 0, 0, 0.34)",
        glow: "0 0 24px rgba(20, 184, 166, 0.26)"
      },
      animation: {
        "soft-pulse": "softPulse 3.2s ease-in-out infinite"
      },
      keyframes: {
        softPulse: {
          "0%, 100%": { opacity: "0.72" },
          "50%": { opacity: "1" }
        }
      }
    }
  },
  plugins: []
};
