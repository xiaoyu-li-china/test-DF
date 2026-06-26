/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        mono: ['Source Sans 3', 'monospace'],
      },
      colors: {
        'deep-bg': '#0a0e27',
        'card-bg': '#111633',
        'card-border': '#1a2045',
        'cyber': '#00e5ff',
        'amber-warn': '#ffaa00',
        'alert-red': '#ff3d71',
        'muted': '#7b89b8',
      },
    },
  },
  plugins: [],
};
