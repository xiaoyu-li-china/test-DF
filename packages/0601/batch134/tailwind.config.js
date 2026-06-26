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
        rose: {
          gold: '#C9A96E',
        },
        warm: {
          50: '#FEFCFA',
          100: '#FDF9F3',
          200: '#F5F0EB',
          300: '#E8E0D6',
        },
        sage: {
          light: '#D4C5B9',
        },
        blush: {
          light: '#F0D5D5',
        },
        mist: {
          light: '#E5E0DB',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Lato', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'count-bump': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'count-bump': 'count-bump 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
