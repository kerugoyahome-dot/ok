/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f2',
          100: '#fce7e7',
          200: '#f8d1d1',
          300: '#f2a8a8',
          400: '#e97777',
          500: '#dc4c4c',
          600: '#c93232',
          700: '#a82626',
          800: '#8b0000', // Primary red
          900: '#7f1d1d',
        },
        secondary: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#000000', // Black
        },
        accent: {
          50: '#fffdf2',
          100: '#fffce5',
          200: '#fff7cc',
          300: '#ffed99',
          400: '#ffe066',
          500: '#FFD700', // Gold
          600: '#e6c200',
          700: '#cc9900',
          800: '#b38700',
          900: '#996600',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}