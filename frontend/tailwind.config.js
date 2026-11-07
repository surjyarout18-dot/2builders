/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cad: {
          dark: '#0a0d14',
          panel: '#111622',
          surface: '#182030',
          border: '#243048',
          accent: '#38bdf8',
          accentHover: '#0ea5e9',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}

