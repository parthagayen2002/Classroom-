/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          red: '#EF4444',
          redBright: '#F87171',
          redDark: '#DC2626',
          redDeep: '#7F1D1D',
          // Legacy utility aliases keep the existing component markup stable.
          cyan: '#FF2D95',
          cyanBright: '#FF4FB3',
          violet: '#9B5CFF',
          violetBright: '#B98CFF',
        },
        dark: {
          bg: '#020205',
          bgElevated: '#08080D',
          card: '#0A080D',
          border: '#211826',
          borderHover: '#FF2D95',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#D5D5DD',
          muted: '#A6A6B3',
          accent: '#FF2D95',
        }
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['clamp(2.5rem, 6vw, 4.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-xl': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.3', letterSpacing: '0.02em', fontWeight: '600' }],
        'heading-lg': ['clamp(1.25rem, 2.5vw, 1.75rem)', { lineHeight: '1.3', letterSpacing: '0.02em', fontWeight: '600' }],
        'heading-md': ['1.125rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.7', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6', fontWeight: '400' }],
        'label': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.1em', fontWeight: '500', textTransform: 'uppercase' }],
        'label-sm': ['0.6875rem', { lineHeight: '1.5', letterSpacing: '0.1em', fontWeight: '500', textTransform: 'uppercase' }],
        'mono-lg': ['1rem', { lineHeight: '1.6', fontFamily: 'JetBrains Mono', fontWeight: '400' }],
        'mono': ['0.875rem', { lineHeight: '1.6', fontFamily: 'JetBrains Mono', fontWeight: '400' }],
        'mono-sm': ['0.75rem', { lineHeight: '1.5', fontFamily: 'JetBrains Mono', fontWeight: '400' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'rotate-slow': 'rotate 20s linear infinite',
        'scan': 'scan 2s linear infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 45, 149, 0.16)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 45, 149, 0.28), 0 0 60px rgba(155, 92, 255, 0.14)' },
        },
        rotate: {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
