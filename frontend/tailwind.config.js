/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        espresso: {
          950: "#0e0a07",
          900: "#17100b",
          800: "#241a12",
          700: "#36271c",
          600: "#4d3829",
        },
        sand: {
          50: "#fdfbf7",
          100: "#f5ebe0",
          200: "#e6ccb2",
          300: "#ddb892",
          400: "#b08968",
          500: "#7f5539",
          600: "#9c6644",
        },
        emerald: {
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        royal: {
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        amber: {
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        }
      },
    },
  },
  plugins: [],
};
