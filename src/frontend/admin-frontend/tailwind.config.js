/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5faff',
          100: '#e0f2ff',
          200: '#b9e4ff',
          300: '#7fd0ff',
          400: '#38b6ff',
          500: '#0d99e5',
          600: '#0078b3',
          700: '#005a85',
          800: '#004565',
          900: '#022e42'
        }
      }
    }
  },
  plugins: []
};