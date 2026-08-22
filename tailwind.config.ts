import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#22272b",
        ink: "#2e3438",
        emerald: {
          DEFAULT: "#15806e",
          dark: "#0e5f52",
          light: "#e7f2f0",
        },
        mist: "#f4f5f4",
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.25em",
      },
      boxShadow: {
        card: "0 10px 40px -12px rgba(34,39,43,0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
