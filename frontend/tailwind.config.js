/** @type {import('tailwindcss').Config} */

function withOpacity(varName) {
  return ({ opacityValue }) =>
    opacityValue !== undefined
      ? `rgba(var(${varName}), ${opacityValue})`
      : `rgb(var(${varName}))`;
}

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background:  withOpacity("--color-background"),
        surface: {
          DEFAULT: withOpacity("--color-surface"),
          raised:  withOpacity("--color-surface-raised"),
        },
        border:     withOpacity("--color-border"),
        foreground: withOpacity("--color-foreground"),
        muted:      withOpacity("--color-muted"),
        positive:   withOpacity("--color-positive"),
        negative:   withOpacity("--color-negative"),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
