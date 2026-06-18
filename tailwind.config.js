/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand tokens (DO NOT CHANGE) ──
        'purple-darkest': '#1C0D35',
        'purple-dark':    '#2E1660',
        'purple-rich':    '#3B1F6B',
        'purple-mid':     '#5B35A0',
        'purple-light':   '#7B52C0',
        'gold':           '#C9A84C',
        'gold-deep':      '#A67C2B',
        'gold-bright':    '#E4C56A',
        'gold-light':     '#F0D080',
        'cream-soft':     '#FAF7F2',
        'cream':          '#F5ECD7',
        'cream-dark':     '#EDE0C4',
        'charcoal':       '#12111A',
        'charcoal-mid':   '#1E1C2C',
      },
      fontFamily: {
        display:   ['"Cormorant Garamond"', 'Georgia', 'serif'],
        title:     ['"Cinzel"', 'Georgia', 'serif'],
        editorial: ['"Playfair Display"', 'Georgia', 'serif'],
        body:      ['"Lato"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.28em',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      boxShadow: {
        'gold':      '0 8px 30px -10px rgba(201,168,76,0.5)',
        'gold-glow': '0 10px 40px -12px rgba(201,168,76,0.45)',
        'lux-card':  '0 24px 60px -28px rgba(28,13,53,0.45)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-700px 0' },
          '100%': { backgroundPosition: '700px 0' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'marquee-x': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.4,0,0.2,1) both',
        'marquee-x': 'marquee-x 28s linear infinite',
      },
    },
  },
  plugins: [],
}
