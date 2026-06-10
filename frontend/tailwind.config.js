/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f1117",
        surface: {
          DEFAULT: "#1a1d27",
          raised:  "#22263a",
        },
        border:     "#2a2e42",
        foreground: "#e8eaf0",
        muted:      "#7b7f94",
        positive:   "#22c55e",
        negative:   "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
