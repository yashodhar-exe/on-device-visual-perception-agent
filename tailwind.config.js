/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx,html}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
      colors: {
        bg: '#F4F5F7',
        surface: '#FFFFFF',
        border: '#D9DEE5',
        primary: '#1E293B',
        secondary: '#64748B',
        success: '#15803D',
        warning: '#B45309',
        danger: '#B91C1C',
        accent: '#2563EB',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        lg: '6px',
      },
    },
  },
  plugins: [],
};
