
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['"Press Start 2P"', 'sans-serif'],
        headline: ['"Press Start 2P"', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'glow': {
          '0%, 100%': {
            textShadow: '0 0 8px hsl(var(--primary) / 0.7)',
          },
          '50%': {
            textShadow: '0 0 16px hsl(var(--primary) / 1)',
          },
        },
        'glow-muted': {
          '0%, 100%': {
            textShadow: '0 0 5px hsl(var(--muted-foreground) / 0.7)',
          },
          '50%': {
            textShadow: '0 0 10px hsl(var(--muted-foreground) / 1)',
          },
        },
        'glow-green': {
            '0%, 100%': {
              boxShadow: '0 0 5px hsl(84 78% 55% / 0.6)',
              backgroundColor: 'hsl(84 78% 55% / 0.1)',
            },
            '50%': {
              boxShadow: '0 0 15px 2px hsl(84 78% 55% / 0.9)',
              backgroundColor: 'hsl(84 78% 55% / 0.2)',
            },
        },
        'glow-border-muted': {
          '0%, 100%': {
            boxShadow: '0 0 10px 0px hsl(var(--foreground) / 0.2)',
          },
          '50%': {
            boxShadow: '0 0 20px 3px hsl(var(--foreground) / 0.4)',
          },
        },
        'glow-border-primary': {
          '0%, 100%': {
            borderColor: 'hsl(var(--primary) / 0.7)',
            boxShadow: '0 0 8px hsl(var(--primary) / 0.5)',
          },
          '50%': {
            borderColor: 'hsl(var(--primary))',
            boxShadow: '0 0 16px 2px hsl(var(--primary))',
          },
        },
        'glow-pink-neon': {
          '0%, 100%': {
            borderColor: 'hsl(310 100% 60% / 0.7)',
            boxShadow: '0 0 8px hsl(310 100% 60% / 0.5)',
          },
          '50%': {
            borderColor: 'hsl(310 100% 60%)',
            boxShadow: '0 0 16px 2px hsl(310 100% 60%)',
          },
        },
        'glow-line': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        'hue-rotate': {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
        'suggestion-fade-in': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'breathing-glow': {
          '0%, 100%': {
            boxShadow: 'inset 0 0 2px hsl(var(--foreground) / 0.1)',
          },
          '50%': {
            boxShadow: 'inset 0 0 8px hsl(var(--foreground) / 0.3)',
          },
        },
        'glow-yellow-text': {
          '0%, 100%': { textShadow: '0 0 6px #facc15' },
          '50%': { textShadow: '0 0 12px #facc15' }
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'glow': 'glow 4s ease-in-out infinite',
        'glow-muted': 'glow-muted 4s ease-in-out infinite',
        'glow-green': 'glow-green 2.5s ease-in-out infinite',
        'glow-border-muted': 'glow-border-muted 4s ease-in-out infinite',
        'glow-border-primary': 'glow-border-primary 2.5s ease-in-out infinite',
        'glow-pink-neon': 'glow-pink-neon 2.5s ease-in-out infinite',
        'glow-line': 'glow-line 4s linear infinite',
        'hue-rotate': 'hue-rotate 5s linear infinite',
        'suggestion-fade-in': 'suggestion-fade-in 0.3s ease-out forwards',
        'breathing-glow': 'breathing-glow 2.5s ease-in-out infinite',
        'glow-yellow-text': 'glow-yellow-text 3s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
