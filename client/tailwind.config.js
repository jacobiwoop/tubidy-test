/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#141414",
        "surface-muted": "#1a1a1a",
        border: "#2a2a2a",
        primary: "#ffffff",
        secondary: "#a0a0a0",
        accent: "#ffffff",
        "accent-highlight": "#f5f5f5",
        danger: "#ef4444",
        success: "#10b981",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        headline: ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        full: "9999px",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
