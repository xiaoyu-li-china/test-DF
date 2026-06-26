/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'inn-brown': '#8B6F47',
        'inn-brown-dark': '#6B5335',
        'inn-brown-light': '#A08264',
        'inn-cream': '#FAF7F2',
        'inn-cream-dark': '#F0EBE0',
        'inn-dark': '#3D2B1F',
        'inn-gold': '#D4A574',
      },
      fontFamily: {
        'serif-sc': ['"Noto Serif SC"', 'serif'],
      },
    },
  },
  plugins: [],
};
