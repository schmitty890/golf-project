/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ember: {
          DEFAULT: '#E86A2A',
          50: '#FDF1E9',
          100: '#FADDC8',
          200: '#F5BB91',
          300: '#F0985A',
          400: '#EC8142',
          500: '#E86A2A',
          600: '#C9551C',
          700: '#9C4216',
          800: '#6F2F10',
          900: '#421C09',
        },
        walnut: {
          DEFAULT: '#4A2F1B',
          50: '#F3EDE8',
          100: '#E3D4C7',
          200: '#C7A98F',
          300: '#A87D57',
          400: '#7A5536',
          500: '#4A2F1B',
          600: '#3D2716',
          700: '#2F1E11',
          800: '#21150C',
          900: '#130C07',
        },
        cream: {
          DEFAULT: '#F4EDE2',
          50: '#FFFFFF',
          100: '#FDFBF8',
          200: '#F4EDE2',
          300: '#E8DBC7',
          400: '#DCC9AC',
        },
      },
      keyframes: {
        // Woody the mascot. Gentle idle bob; one-shot wave + blink when chat opens.
        'woody-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px) rotate(-3deg)' },
        },
        'woody-wave': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-9deg)' },
          '75%': { transform: 'rotate(9deg)' },
        },
        'woody-blink': {
          '0%, 88%, 100%': { transform: 'scaleY(1)' },
          '94%': { transform: 'scaleY(0.1)' },
        },
      },
      animation: {
        'woody-bob': 'woody-bob 2.6s ease-in-out infinite',
        'woody-wave': 'woody-wave 0.7s ease-in-out 1',
        'woody-blink': 'woody-blink 2.8s ease-in-out 1',
      },
    },
  },
  plugins: [],
};
