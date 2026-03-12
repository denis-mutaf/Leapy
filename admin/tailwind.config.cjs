/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter-tight)', 'system-ui', 'sans-serif'],
      },
      colors: {
        page: '#FFFFFF',
        text: '#242424',
        section: '#F8F8F8',
        border: '#E5E5E5',
        status: {
          ready: { bg: '#ECFDF5', text: '#059669' },
          processing: { bg: '#FFFBEB', text: '#D97706' },
          error: { bg: '#FEF2F2', text: '#DC2626' },
        },
      },
      borderRadius: {
        card: '16px',
        button: '12px',
        input: '8px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease',
      },
    },
  },
  plugins: [],
};
