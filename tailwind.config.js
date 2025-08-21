/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Noto Sans', 'Inter', 'sans-serif'],
        'inter': ['Noto Sans', 'Inter', 'sans-serif'],
        'noto': ['Noto Sans', 'sans-serif']
      }
    },
  },
  plugins: [],
}