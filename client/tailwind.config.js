/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Clash Display', 'Sora', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c2d3ff',
          300: '#93afff',
          400: '#5e83ff',
          500: '#3558f7',
          600: '#2140ed',
          700: '#1a30d4',
          800: '#1a2aab',
          900: '#1b2887',
          950: '#141953',
        },
        surface: {
          0: '#ffffff',
          50: '#f8f9fc',
          100: '#f0f2f8',
          200: '#e3e7f0',
          300: '#c8cfe0',
          400: '#9aa3bc',
          500: '#7d87a4',
          600: '#636d8a',
          700: '#4a5470',
          800: '#1e2235',
          900: '#141728',
          950: '#0d0f1c',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1), 0 12px 32px rgba(0,0,0,0.08)',
        'modal': '0 20px 60px rgba(0,0,0,0.2)',
      }
    }
  },
  plugins: []
}
