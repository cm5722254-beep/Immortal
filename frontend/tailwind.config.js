/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MerDonghua iOS 27 Liquid Glass White Theme Tokens
        'bg-base': 'var(--animekh-bg-base, #F8FAFC)',
        'bg-card': 'var(--animekh-bg-card, #FFFFFF)',
        'bg-card-subtle': 'var(--animekh-bg-card-subtle, #F1F5F9)',
        'bg-subtle': 'var(--animekh-bg-card-subtle, #F1F5F9)',
        'accent-primary': 'var(--animekh-accent-primary, #2563EB)',
        'accent-secondary': 'var(--animekh-accent-secondary, #0284C7)',
        'text-primary': 'var(--animekh-text-primary, #0F172A)',
        'text-secondary': 'var(--animekh-text-secondary, #475569)',
        'border-subtle': 'var(--animekh-border-subtle, #E2E8F0)',
        'border-focus': 'var(--md-focus, #3B82F6)',
        bg: {
          base: 'var(--animekh-bg-base, #F8FAFC)',
          card: 'var(--animekh-bg-card, #FFFFFF)',
          'card-subtle': 'var(--animekh-bg-card-subtle, #F1F5F9)',
          subtle: 'var(--animekh-bg-card-subtle, #F1F5F9)',
        },
        text: {
          primary: 'var(--animekh-text-primary, #0F172A)',
          secondary: 'var(--animekh-text-secondary, #475569)',
        },
        border: {
          subtle: 'var(--animekh-border-subtle, #E2E8F0)',
          focus: 'var(--md-focus, #3B82F6)',
        },
        accent: {
          primary: 'var(--animekh-accent-primary, #2563EB)',
          secondary: 'var(--animekh-accent-secondary, #0284C7)',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
        dark: {
          bg: '#f8fafc',
          surface: '#ffffff',
          card: '#ffffff',
          cardHover: '#f8fafc',
          border: '#e2e8f0',
          muted: '#f1f5f9',
          subtle: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Kantumruy Pro', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'Kantumruy Pro', 'sans-serif'],
        khmer: ['Kantumruy Pro', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'xs': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.8s infinite linear',
        'scale-in': 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'badge-shine': 'badgeShine 3s ease-in-out infinite',
        'border-flow': 'borderFlow 4s ease infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-12px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideIn: { from: { transform: 'translateX(-16px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 4px 20px rgba(37,99,235,0.10)', borderColor: 'rgba(37,99,235,0.25)' },
          '50%': { boxShadow: '0 8px 28px rgba(37,99,235,0.18)', borderColor: 'rgba(37,99,235,0.40)' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.88' },
          '50%': { opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        badgeShine: {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.06)' }
        },
        borderFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
        'card-gradient': 'linear-gradient(180deg, transparent 0%, rgba(15,23,42,0.55) 60%, rgba(15,23,42,0.85) 100%)',
        'purple-glow': 'radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, transparent 70%)',
        'mystic-glow': 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.08) 0%, rgba(14,165,233,0.06) 40%, transparent 75%)',
      },
    },
  },
  plugins: [],
}
