/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        espresso: {
          950: "#0d0907",
          900: "#16110d",
          800: "#221a14",
          700: "#31251d",
        },
        gold: {
          300: "#e6c994",
          400: "#d4af6a",
          500: "#c59b52",
          600: "#a87e38",
        },
        terracotta: {
          500: "#b84a32",
          600: "#983823",
        },
        cream: {
          50: "#fbf8f3",
          100: "#f5efe4",
          200: "#eaddc7",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
