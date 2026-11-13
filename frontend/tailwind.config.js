/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cad: {
          bg: '#0A0D14',
          surface: '#111726',
          card: '#161F33',
          border: '#1F2942',
          accent: '#00F0FF',
          accentHover: '#00D1DF',
          warning: '#F59E0B',
          success: '#10B981',
          danger: '#EF4444',
          text: '#F1F5F9',
          muted: '#94A3B8',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

