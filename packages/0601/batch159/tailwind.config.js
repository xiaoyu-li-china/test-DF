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
        brand: {
          DEFAULT: "#1e3a5f",
          light: "#2a5080",
          dark: "#152c4a",
        },
        accent: {
          DEFAULT: "#c8956c",
          light: "#ddb08e",
          dark: "#a9784f",
        },
        surface: {
          DEFAULT: "#faf8f5",
          warm: "#f5f0ea",
          card: "#ffffff",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
