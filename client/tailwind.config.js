/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a0e27',
          900: '#111936',
          800: '#1a1f3d',
          700: '#242b52',
          600: '#2e3567',
        },
        accent: {
          DEFAULT: '#00ff87',
          400: '#00ff87',
          500: '#10b981',
          600: '#059669',
        },
      },
      fontFamily: {
        score: ['Bebas Neue', 'sans-serif'],
        body: ['Sora', 'sans-serif'],
      },
      animation: {
        'pulse-live': 'pulse-live 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'score-flash': 'scoreFlash 0.6s ease-out',
        'wicket-shake': 'wicketShake 0.5s ease-out',
        'glow-green': 'glowGreen 1s ease-out',
        'confetti': 'confetti 1s ease-out forwards',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scoreFlash: {
          '0%': { transform: 'scale(1)', color: '#00ff87' },
          '50%': { transform: 'scale(1.3)', color: '#00ff87' },
          '100%': { transform: 'scale(1)' },
        },
        wicketShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        glowGreen: {
          '0%': { boxShadow: '0 0 0 0 rgba(0, 255, 135, 0.7)' },
          '100%': { boxShadow: '0 0 0 20px rgba(0, 255, 135, 0)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) rotate(720deg)', opacity: '0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
