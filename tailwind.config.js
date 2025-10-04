/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        'krona': ['KronaOne_400Regular'],
        'jura': ['Jura_400Regular'],
        'jura-light': ['Jura_300Light'],
        'jura-medium': ['Jura_500Medium'],
        'jura-semibold': ['Jura_600SemiBold'],
        'jura-bold': ['Jura_700Bold'],
      },
    },
  },
  plugins: [],
};