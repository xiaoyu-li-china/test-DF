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
        navy: {
          50: '#E8EBF0',
          100: '#C5CBD8',
          200: '#8B96B1',
          300: '#51618A',
          400: '#2D3F65',
          500: '#1B2A4A',
          600: '#162240',
          700: '#111A33',
          800: '#0C1226',
          900: '#070B19',
        },
        gold: {
          50: '#FDF8ED',
          100: '#F9EDCC',
          200: '#F0D699',
          300: '#E8C06E',
          400: '#C8A96E',
          500: '#B8944A',
          600: '#9A7A3C',
          700: '#7C612F',
          800: '#5E4A23',
          900: '#403218',
        },
        ivory: {
          50: '#FEFDFB',
          100: '#FAF8F5',
          200: '#F5F0E8',
          300: '#EDE5D8',
          400: '#E0D4C2',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
