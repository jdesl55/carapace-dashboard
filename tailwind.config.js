/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        carapace: {
          'bg-deep': '#0A0A0B',
          'bg-surface': '#131316',
          'bg-raised': '#1A1A1F',
          'bg-input': '#1E1E24',
          'border': '#2A2A32',
          'border-light': '#3A3A44',
          'text-primary': '#E8E8EC',
          'text-secondary': '#8A8A96',
          'text-dim': '#5A5A66',
          'red': '#DC2626',
          'red-hover': '#EF4444',
          'red-dim': '#7F1D1D',
          'green': '#22C55E',
          'yellow': '#EAB308',
          'red-status': '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'red-glow': '0 0 20px rgba(220, 38, 38, 0.15)',
        'red-glow-lg': '0 0 30px rgba(220, 38, 38, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
