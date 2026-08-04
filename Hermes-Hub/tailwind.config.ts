import type { Config } from 'tailwindcss'

/**
 * The previous config replaced `sky`, `amber` and `navy` with flat strings,
 * which deleted those palettes entirely: bg-sky-500, text-navy-900 and
 * bg-amber-500 produced no CSS at all. Palettes are extended here, never
 * overwritten.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f4f6fb',
          100: '#e4e9f4',
          200: '#c6d0e7',
          300: '#9cadd3',
          400: '#6b83b8',
          500: '#4a63a0',
          600: '#384d82',
          700: '#2b3c66',
          800: '#1f2b4d',
          900: '#161f38',
          950: '#0c1122',
        },
        gold: {
          300: '#f7e0a4',
          400: '#f0cb72',
          500: '#c99c34',
          600: '#a67f22',
          700: '#7c5c14',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Un panneau qui vient du bord droit. `slide-up` faisait monter le
        // volet des alertes depuis le bas, ce qui contredisait le seul geste
        // qu'il devait apprendre - il vient de la droite, il repart a droite.
        'glisse-droite': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'slide-up': 'slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'glisse-droite': 'glisse-droite 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
