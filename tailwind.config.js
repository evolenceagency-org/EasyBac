/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#ffffff',
        accent: {
          green: '#22c55e',
          red: '#ef4444',
          purple: '#8b5cf6'
        }
      },
      boxShadow: {
        card: '0 12px 30px rgba(0, 0, 0, 0.25)'
      }
    }
  },
  plugins: []
}
