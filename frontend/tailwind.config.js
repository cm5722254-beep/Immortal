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
          50:  '#fff3f0',
          100: '#ffe4df',
          200: '#ffccc2',
          300: '#ffa899',
          400: '#ff7761',
          500: '#E8452C',
          600: '#d7341b',
          700: '#b52712',
          800: '#942313',
          900: '#7a2216',
          950: '#430d06',
        },
        surface: {
          50:  '#161F33',
          100: '#111726',
          200: '#0D1220',
          300: '#0A0E17',
        },
        dark: {
          bg:        '#0A0E17',
          surface:   '#0D1220',
          card:      '#111726',
          cardHover: '#161F33',
          border:    '#1E283C',
          muted:     '#161F33',
          subtle:    '#232E45',
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
        }
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
