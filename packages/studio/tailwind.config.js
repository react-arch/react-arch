/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark professional surfaces (CAD-style)…
        panel: "#15171c",
        panel2: "#1a1d23",
        edge: "#262a32",
        // …with the React Arch brand accent.
        accent: "#2563eb",
        "accent-soft": "#93b5ff",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
