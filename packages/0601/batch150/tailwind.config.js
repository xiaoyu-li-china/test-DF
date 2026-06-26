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
        champagne: {
          50: '#FFFDF8',
          100: '#FFF8F0',
          200: '#F5E6D3',
          300: '#E8D4B8',
          400: '#D9BE9A',
          500: '#C9A96E',
          600: '#B8956A',
          700: '#A07E54',
          800: '#7D6341',
          900: '#5C4A31',
        },
        espresso: {
          50: '#F7F5F3',
          100: '#EBE6E1',
          200: '#D4C8BC',
          300: '#B8A695',
          400: '#9A8470',
          500: '#7D6652',
          600: '#5C4A3D',
          700: '#4A3B30',
          800: '#3D2B1F',
          900: '#2A1D14',
        },
        rose: {
          50: '#FFF5F7',
          100: '#FFE4E8',
          200: '#FECDD6',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#E8A0BF',
          600: '#DB6B97',
          700: '#BE4F84',
          800: '#9D3C6E',
          900: '#831843',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'pulse-border': 'pulse-border 1.5s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'fade-in': 'fade-in 0.5s ease-out',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
          '50%': { boxShadow: '0 0 0 8px rgba(239, 68, 68, 0)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
