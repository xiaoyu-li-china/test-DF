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
        ocean: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc9fc",
          400: "#36aaf8",
          500: "#0c8ee9",
          600: "#0070c7",
          700: "#0B3D6B",
          800: "#0a3358",
          900: "#0e2c4a",
          950: "#091d32",
        },
        tide: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#00B4D8",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        sand: {
          50: "#fefbf3",
          100: "#fdf4e1",
          200: "#fae8c3",
          300: "#f5d699",
          400: "#F5E6CA",
          500: "#e9c876",
          600: "#d9ab4a",
          700: "#b38737",
          800: "#916b32",
          900: "#76582b",
        },
        coral: {
          50: "#fff4ed",
          100: "#ffe4d4",
          200: "#ffc5a8",
          300: "#ff9d70",
          400: "#FF6B35",
          500: "#f54512",
          600: "#e62d09",
          700: "#be210a",
          800: "#971d10",
          900: "#7a1b12",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "sans-serif"],
      },
      boxShadow: {
        "tide-glow": "0 0 20px rgba(0, 180, 216, 0.4)",
        "coral-glow": "0 0 15px rgba(255, 107, 53, 0.5)",
      },
    },
  },
  plugins: [],
};
