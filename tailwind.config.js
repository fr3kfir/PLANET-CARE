/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Heebo', 'system-ui', 'sans-serif'] },
      colors: {
        forest: '#14532d',
        mint: {
          50: '#eefbf6',
          100: '#d5f3e7',
          200: '#ade6cf',
          500: '#22b57f',
          600: '#1a9a6b',
          700: '#2f6f57',
        },
      },
    },
  },
  plugins: [],
}
