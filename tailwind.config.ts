import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#081428",
          900: "#0A1F3D",
          800: "#123152",
          700: "#1B4066",
          600: "#255380",
        },
        teal: {
          600: "#0B8983",
          500: "#0EA5A0",
          400: "#3FBFB8",
          100: "#E3F5F3",
        },
        ink: "#101828",
        muted: "#5B6472",
        canvas: "#F6F8FA",
      },
      fontFamily: {
        display: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
