import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ml: {
          yellow: "#FFE600",
          blue: "#3483FA",
          dark: "#1A1A2E",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
