import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '990px', // Aktifkan 2-kolom layout untuk tablet landscape & laptop 1024px (meskipun ada scrollbar)
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },
        tea: {
          amber: '#d97706',
          poci: '#b45309',
          leaf: '#15803d',
          clay: '#9a3412',
        }
      },
    },
  },
  plugins: [],
};
export default config;

