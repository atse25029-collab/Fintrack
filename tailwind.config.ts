import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f4f4f5", // Clean grey background
        surface: "#ffffff",    // Crisp white card surface
        "surface-muted": "#ececee", // Slightly darker grey for nested cards
        border: "#e4e4e7",     // Subtle divider
        foreground: "#09090b", // Stark black text & icons
        muted: "#71717a",      // Muted zinc grey text
        primary: "#000000",    // Stark black primary buttons
        "primary-hover": "#27272a",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
