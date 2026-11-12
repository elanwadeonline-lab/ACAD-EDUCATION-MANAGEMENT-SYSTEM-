import type { Config } from "tailwindcss";

const config: Config = {
  future: { hoverOnlyWhenSupported: true },
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        body:    ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono:    ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Acqad brand palette
        brand: {
          50:  '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',  // --color-primary
          700: '#C2410C',  // --color-primary-dark
          800: '#9A3412',
          900: '#7C2D12',
        },
        // Neutral grays (warm-tinted)
        neutral: {
          50:  '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        // Semantic tokens (map to CSS vars)
        primary:         'var(--color-primary)',
        success:         'var(--color-success)',
        warning:         'var(--color-warning)',
        danger:          'var(--color-danger)',
        info:            'var(--color-info)',
        surface:         'var(--color-surface)',
        'surface-2':     'var(--color-surface-2)',
        'surface-3':     'var(--color-surface-3)',
        border:          'var(--color-border)',
        'border-hover':  'var(--color-border-hover)',
        text:            'var(--color-text)',
        'text-2':        'var(--color-text-2)',
        muted:           'var(--color-muted)',
        'muted-2':       'var(--color-muted-2)',
        // Sidebar
        sidebar: {
          bg:      'var(--sidebar-bg)',
          elevated:'var(--sidebar-elevated)',
          text:    'var(--sidebar-text)',
          active:  'var(--sidebar-text-active)',
        },
      },
      boxShadow: {
        xs:    'var(--shadow-xs)',
        sm:    'var(--shadow-sm)',
        md:    'var(--shadow-md)',
        lg:    'var(--shadow-lg)',
        xl:    'var(--shadow-xl)',
        brand: 'var(--shadow-brand)',
        ring:  'var(--ring)',
      },
      borderRadius: {
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
      },
      spacing: {
        // 4px base grid explicit tokens
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      height: {
        'input-sm': 'var(--h-input-sm)',
        'input':    'var(--h-input)',
        'input-lg': 'var(--h-input-lg)',
        'topbar':   'var(--topbar-h)',
        'nav-item': 'var(--h-nav-item)',
      },
      width: {
        'sidebar': 'var(--sidebar-w)',
      },
      transitionDuration: {
        DEFAULT: 'var(--duration)',
        lg:      'var(--duration-lg)',
      },
      transitionTimingFunction: {
        DEFAULT:  'var(--ease)',
        out:      'var(--ease-out)',
        spring:   'var(--ease-spring)',
        smooth:   'var(--ease-smooth)',
      },
      animation: {
        'fade-in':    'fadeIn 180ms ease',
        'fade-in-up': 'fadeInUp 240ms ease',
        'slide-up':   'slideUp 280ms cubic-bezier(0.175, 0.885, 0.32, 1.05)',
        'spin-slow':  'spin 0.65s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite',
        'pulse-slow': 'pulse 2s ease infinite',
        'shimmer':    'shimmerSkeleton 1.8s ease infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
