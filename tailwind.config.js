/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.hbs",
    "./src/public/**/*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#FF5E00",
        secondary: "#1C1C1F",
        tertiary: "#E49901",
        neutral: "#0A0A0C",
      },
      fontFamily: {
        headings: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        branding: ['"The Nautigal"', 'cursive'],
      },
      borderRadius: {
        'ios': '1rem',
        'ios-lg': '1.5rem',
      }
    },
  },
  plugins: [],
}
