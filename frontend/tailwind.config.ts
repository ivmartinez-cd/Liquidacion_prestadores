import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFFAF4",
          100: "#FEF4E8",
          200: "#FDE4C7",
          300: "#FCD4A5",
          400: "#FAB96C",
          500: "#F8A43F",
          600: "#F7941D",
          700: "#D27E19",
          800: "#AD6814",
          900: "#885110",
        },
        graybrand: {
          DEFAULT: "#58595B",
          light: "#E2E6E6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
