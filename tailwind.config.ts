import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lulu: {
          magenta: '#EC1E79',
          'magenta-soft': '#F472B6',
          cyan: '#27B9E6',
          'cyan-soft': '#7DD3FC',
          yellow: '#FFD93D',
          'yellow-soft': '#FFE97A',
          purple: '#9B6FD4',
          'purple-soft': '#C9B0EB',
          lavender: '#E8DFFB',
          'lavender-mist': '#F5EFFF',
          'cheek-pink': '#FFB3C1',
          'heart-red': '#FF5A7A',
          mint: '#B8E6C1',
          peach: '#FFD2B0',
          cream: '#FFF6E5',
        },
        ink: {
          DEFAULT: '#3A2A5A',
          soft: '#6B5B8A',
          mute: '#9C8FB3',
        },
        paper: {
          DEFAULT: '#FFFDF8',
          tint: '#FCF7FF',
          sparkle: '#F3E9FF',
        },
        line: '#EADFF5',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        title: ['Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: '8px',
        sm: '14px',
        md: '20px',
        lg: '28px',
        xl: '36px',
      },
      boxShadow: {
        sm: '0 2px 0 rgba(58, 42, 90, 0.08)',
        md: '0 6px 14px rgba(155, 111, 212, 0.18)',
        lg: '0 16px 36px rgba(155, 111, 212, 0.24)',
        sticker: '0 4px 0 rgba(58, 42, 90, 0.18)',
        'sticker-lg': '0 6px 0 rgba(58, 42, 90, 0.22)',
      },
      transitionTimingFunction: {
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
