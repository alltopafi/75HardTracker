/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tokyo: {
          bg: '#24283b',
          card: '#1f2335',
          text: '#c0caf5',
          muted: '#565f89',
          secondary: '#a9b1d6',
          blue: '#7aa2f7',
          purple: '#bb9af7',
          cyan: '#7dcfff',
          green: '#9ece6a',
          red: '#f7768e',
          orange: '#ff9e64',
        }
      }
    },
  },
  plugins: [],
}
