/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefcf6',
          100: '#d5f7e8',
          200: '#aff0d1',
          300: '#78e3b2',
          400: '#3ecc8b',
          500: '#2ba56e',
          600: '#228a5a',
          700: '#1b6e49',
          800: '#18573c',
          900: '#144833',
        },
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};