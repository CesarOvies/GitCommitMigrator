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
        canvas: '#0D1117',
        surface: '#161B22',
        button: '#21262D',
        buttonHover: '#30363D',
        borderSubtle: '#30363D',
        borderFocus: '#388BFD',
        textPrimary: '#E6EDF3',
        textSecondary: '#8B949E',
        accentGreen: '#238636',
        accentGreenHover: '#2ea043',
        accentGreenBorder: '#3FB950',
        errorRed: '#F85149',
        brandBlue: '#388BFD'
      }
    },
  },
  plugins: [],
}

