import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          DEFAULT: "#0b6b3a",
          dark: "#064a28",
        },
      },
    },
  },
  plugins: [],
};

export default config;
