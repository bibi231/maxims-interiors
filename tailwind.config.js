import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — Maxims Interiors
        "purple-darkest": '#1C0D35',
        "purple-dark": '#2E1660',
        "purple-rich": '#3B1F6B',
        "purple-mid": '#5B35A0',
        "purple-light": '#7B52C0',
        "purple-pale": '#A98FD0',
        "gold-deep": '#A67C2B',
        "gold": '#C9A84C',
        "gold-bright": '#E4C56A',
        "gold-light": '#F0D080',
        "gold-shimmer": '#FFF0C0',
        "cream": 'var(--color-cream)',
        "cream-dark": 'var(--color-cream-dark)',
        "cream-soft": 'var(--color-cream-soft)',
        "charcoal": 'var(--color-charcoal)',
        "charcoal-mid": 'var(--color-charcoal-mid)',
        "charcoal-soft": 'var(--color-charcoal-soft)',
        "charcoal-muted": 'var(--color-charcoal-muted)',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        title: ['Cinzel', 'serif'],
        editorial: ['Playfair Display', 'serif'],
        body: ['Lato', 'sans-serif'],
        sans: ['Lato', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(3.5rem,8vw,7rem)', { lineHeight: '1.05' }],
        'display-lg': ['clamp(2.5rem,5vw,4.5rem)', { lineHeight: '1.1' }],
        'display-md': ['clamp(1.8rem,3.5vw,3rem)', { lineHeight: '1.2' }],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #A67C2B, #C9A84C, #E4C56A)',
        'purple-gradient': 'linear-gradient(135deg, #1C0D35, #3B1F6B)',
        'dark-gradient': 'linear-gradient(135deg, #12111A, #1E1C2C)',
        'radial-gold': 'radial-gradient(ellipse at center, rgba(201,168,76,0.15) 0%, transparent 65%)',
        'radial-purple': 'radial-gradient(ellipse at center, rgba(59,31,107,0.5) 0%, transparent 70%)',
        'hero-overlay': 'radial-gradient(ellipse at 50% 50%, rgba(59,31,107,0.45), rgba(18,17,26,0.7))',
      },
      boxShadow: {
        'gold': '0 0 40px rgba(201,168,76,0.15)',
        'gold-lg': '0 0 60px rgba(201,168,76,0.25)',
        'glow-gold': '0 0 20px rgba(201,168,76,0.3), 0 0 60px rgba(201,168,76,0.1)',
        'deep': '0 20px 60px rgba(18,17,26,0.4)',
        'card': '0 4px 20px rgba(18,17,26,0.08)',
        'card-hover': '0 12px 40px rgba(59,31,107,0.15)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
        'marquee-reverse': 'marqueeReverse 30s linear infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'pulse-gold': 'pulseGold 2.5s ease-in-out infinite',
        'scroll-pulse': 'scrollPulse 2.5s ease infinite',
        'spin-slow': 'spin 20s linear infinite',
        'orbit': 'orbit 15s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        scroll:
          "scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite",
      },
      keyframes: {
        scroll: {
          to: {
            transform: "translate(calc(-50% - 0.5rem))",
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        marqueeReverse: {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(201,168,76,0.15)' },
        },
        scrollPulse: {
          '0%, 100%': { opacity: '0.3', transform: 'scaleY(0.7) translateY(0)' },
          '50%': { opacity: '1', transform: 'scaleY(1.1) translateY(4px)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(120px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(120px) rotate(-360deg)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
