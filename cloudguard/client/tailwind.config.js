/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
        cg: {
          bg:       'var(--background)',
          surface:  'var(--surface)',
          card:     'var(--card)',
          border:   'var(--border)',
          primary:  '#3B82F6',
          secondary:'#38BDF8',
          success:  '#10B981',
          text:     'var(--foreground)',
          muted:    'var(--muted-foreground)',
        },
        severity: {
          critical:   '#EF4444',
          criticalBg: 'rgba(239, 68, 68, 0.12)',
          high:       '#F97316',
          highBg:     'rgba(249, 115, 22, 0.12)',
          medium:     '#EAB308',
          mediumBg:   'rgba(234, 179, 8, 0.12)',
          low:        '#3B82F6',
          lowBg:      'rgba(59, 130, 246, 0.12)',
          clean:      '#10B981',
          cleanBg:    'rgba(16, 185, 129, 0.12)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Figtree', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'primary-glow':   '0 0 24px -4px rgba(255, 255, 255, 0.15)',
        'secondary-glow': '0 0 24px -4px rgba(59, 130, 246, 0.25)',
        'success-glow':   '0 0 24px -4px rgba(16, 185, 129, 0.25)',
        'danger-glow':    '0 0 24px -4px rgba(239, 68, 68, 0.25)',
        'card':           '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'card-hover':     '0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.45)',
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(255,255,255,0.06) 0%, transparent 65%)',
      },
    },
  },
  plugins: [],
}
