import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        sand: "#f6f1e8",
        clay: "#d7c7a9",
        pine: "#1f4d3a",
        rust: "#a14a2a",
        gold: "#d2a855"
      },
      boxShadow: {
        card: "0 20px 60px rgba(31, 41, 55, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
