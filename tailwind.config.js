/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      transitionProperty: {
        'transform': 'transform',
      },
      animation: {
        'spin-once': 'spin 0.5s ease-in-out',
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(180deg)' },
        },
      },
    },
  },
  plugins: [],
  safelist: [
    'active:scale-95',
    'active:shadow-inner',
    'active:rotate-180',
    'active:translate-y-0.5',
    'transform',
    'transition-transform',
    'duration-200',
    'duration-500'
  ]
} 