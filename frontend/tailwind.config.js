/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#ff4d6d',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        surface: {
          50:  '#1a2540',
          100: '#111e35',
          200: '#0d1526',
          300: '#0a0f1e',
        },
        dark: {
          bg:        '#080d1a',
          surface:   '#0a0f1e',
          card:      '#0d1526',
          cardHover: '#111e35',
          border:    '#1a2845',
          muted:     '#111e35',
          subtle:    '#1a2845',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Kantumruy Pro', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'Kantumruy Pro', 'sans-serif'],
        khmer: ['Kantumruy Pro', 'Outfit', 'sans-serif'],
      },
      animation: {
        'fade-in':     'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up':    'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down':  'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in':    'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer':     'shimmer 2s infinite linear',
        'scale-in':    'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow':  'pulseGlow 2.5s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'float':       'float 4s ease-in-out infinite',
        'badge-shine': 'badgeShine 3s ease-in-out infinite',
        'border-flow': 'borderFlow 4s ease infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideIn:   { from: { transform: 'translateX(-24px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        scaleIn:   { from: { transform: 'scale(0.92)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124,58,237,0.25)', borderColor: 'rgba(124,58,237,0.4)' },
          '50%':      { boxShadow: '0 0 45px rgba(239,68,68,0.4)', borderColor: 'rgba(239,68,68,0.6)' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.85' },
          '50%':      { opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' }
        },
        badgeShine: {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%':      { filter: 'brightness(1.3) drop-shadow(0 0 8px rgba(139,92,246,0.6))' }
        },
        borderFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        logoSpin: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        flipIn3d: {
          '0%':   { transform: 'perspective(600px) rotateY(-90deg) scale(0.8)', opacity: '0' },
          '60%':  { transform: 'perspective(600px) rotateY(10deg) scale(1.03)', opacity: '1' },
          '100%': { transform: 'perspective(600px) rotateY(0deg) scale(1)', opacity: '1' },
        },
        zoomIn3d: {
          '0%':   { transform: 'perspective(800px) scale3d(0.6,0.6,0.6) translateZ(-120px)', opacity: '0' },
          '100%': { transform: 'perspective(800px) scale3d(1,1,1) translateZ(0)', opacity: '1' },
        },
        holoShimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        floatGlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient':   'linear-gradient(135deg, #07070b 0%, #12121c 50%, #161626 100%)',
        'card-gradient':   'linear-gradient(180deg, transparent 0%, rgba(7,7,11,0.85) 60%, #07070b 100%)',
        'purple-glow':     'radial-gradient(ellipse at center, rgba(124,58,237,0.2) 0%, transparent 70%)',
        'mystic-glow':     'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.15) 0%, rgba(124,58,237,0.15) 40%, transparent 75%)',
      },
    },
  },
  plugins: [],
}
