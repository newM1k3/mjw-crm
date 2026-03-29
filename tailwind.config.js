/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
        },
        secondary: {
          50: '#FCE4EC',
          100: '#F8BBD9',
          200: '#F48FB1',
          300: '#F06292',
          400: '#EC407A',
          500: '#E91E63',
          600: '#D81B60',
          700: '#C2185B',
          800: '#AD1457',
          900: '#880E4F',
        },
        success: {
          50: '#E8F5E9',
          500: '#4CAF50',
          700: '#388E3C',
        },
        warning: {
          50: '#FFF8E1',
          500: '#FF9800',
          700: '#F57C00',
        },
        error: {
          50: '#FFEBEE',
          500: '#F44336',
          700: '#D32F2F',
        },
        surface: '#FFFFFF',
        background: '#FAFAFA',
        'on-surface': '#212121',
        'on-surface-variant': '#757575',
        outline: '#E0E0E0',
        'outline-variant': '#F5F5F5',
      },
      boxShadow: {
        'md-1': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        'md-2': '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
        'md-3': '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
        'md-4': '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
        'md-5': '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)',
      },
      borderRadius: {
        'md': '4px',
        'md-lg': '8px',
        'md-xl': '12px',
        'md-2xl': '16px',
        'md-full': '28px',
      },
    },
  },
  plugins: [],
};
