/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
    '!./node_modules/**',
    '!./android/**',
    '!./dist/**',
  ],
  theme: {
    extend: {
          colors: {
        kiddy: {
          base: '#000000',
          surface: '#0a0a0a',
          surfaceElevated: '#121212',
          border: 'rgba(255,255,255,0.08)',
          cherry: '#e6002b',
          cherryDim: 'rgba(230,0,43,0.18)',
          cherryGlow: 'rgba(230,0,43,0.45)',
          text: '#ffffff',
          textSecondary: '#888888',
          textMuted: '#555555',
        },
      },
      fontFamily: {
        sans: ['Manrope Variable', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Unbounded Variable', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono Variable', 'ui-monospace', 'SF Mono', 'Cascadia Code', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-xl': ['var(--type-display-xl)', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '700' }],
        'display-lg': ['var(--type-display-lg)', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-md': ['var(--type-display-md)', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'body-lg': ['var(--type-body-lg)', { lineHeight: '1.5', fontWeight: '500' }],
        body: ['var(--type-body)', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['var(--type-body-sm)', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['var(--type-caption)', { lineHeight: '1.5', fontWeight: '500', letterSpacing: '0.01em' }],
      },
      maxWidth: {
        measure: '66ch',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        island: '0 20px 40px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1) inset',
        premium: '0 10px 30px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
      },
      transitionTimingFunction: {
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
        smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'reveal-up': {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(40px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'bounce-left': {
          '0%': { transform: 'translateX(0)' },
          '30%': { transform: 'translateX(-8px)' },
          '60%': { transform: 'translateX(4px)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'draw-svg': { to: { strokeDashoffset: '0' } },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        'week-slide-in': {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        /** Лупа поиска: только opacity — scale на родителе размывает SVG в Safari */
        'loupe-pulse': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'reveal-up': 'reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slide-in-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'bounce-left': 'bounce-left 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 2.5s ease-in-out infinite',
        'draw-svg': 'draw-svg 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        float: 'float 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'week-slide-in': 'week-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'loupe-pulse': 'loupe-pulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
