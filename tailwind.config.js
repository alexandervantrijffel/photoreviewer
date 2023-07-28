/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./ src/**/ *.{ js, jsx, ts, tsx }'],
  purge: ['./pages/**/*.tsx', './src/**/*.tsx'],
  darkMode: 'media', // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        blue: {
          light: '#415f80',
          DEFAULT: '#295686',
          dark: '#225082',
        },
        gray: {
          dark: '#6a6a6a',
        },
      },
    },
    fontFamily: {
      roboto: ['Roboto', 'Helvetica'],
      mogra: ['Mogra', 'Helvetica'],
      poppins: ['Poppins', 'Helvetica'],
    },
    backgroundImage: (_theme) => ({
      bg: "url('/img/bg.webp')",
      maincontainer: "url('/img/maincontainer.png')",
    }),
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
