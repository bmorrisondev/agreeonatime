/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF6B5C',
          pressed: '#E85A4A',
          on: '#FFFFFF',
        },
        danger: {
          DEFAULT: '#DC2626',
          pressed: '#B91C1C',
          on: '#FFFFFF',
        },
      },
      spacing: {
        'ds-xs': '4px',
        'ds-sm': '8px',
        'ds-md': '12px',
        'ds-lg': '16px',
        'ds-xl': '24px',
        'ds-2xl': '32px',
      },
      borderRadius: {
        'ds-sm': '8px',
        'ds-md': '12px',
        'ds-pill': '9999px',
      },
      fontSize: {
        caption: ['13px', { lineHeight: '18px' }],
        body: ['16px', { lineHeight: '24px' }],
        heading: ['20px', { lineHeight: '28px' }],
        display: ['28px', { lineHeight: '36px' }],
      },
    },
  },
  plugins: [],
};
