/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        caramel: {
          50: "#FDF8F3",
          100: "#FAEFE3",
          200: "#F5E6D3",
          300: "#EBD5BD",
          400: "#D4A574",
          500: "#C4915C",
          600: "#A67645",
          700: "#8B6914",
        },
        cream: {
          50: "#FFFDF8",
          100: "#FFF8F0",
          200: "#FFF0E0",
        },
        bakery: {
          brown: "#8B6914",
          gold: "#D4A574",
          wheat: "#F5E6D3",
          strawberry: "#E57373",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
        display: ['"Playfair Display"', "serif"],
      },
      keyframes: {
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "count-up": "count-up 0.8s ease-out forwards",
      },
    },
  },
  plugins: [],
};
