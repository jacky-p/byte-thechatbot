import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        byteblue: "#1E63FF",
        byteblueDark: "#0A3FBA",
        byteyellow: "#FFE94A",
      },
      keyframes: {
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px 6px #FFE94A, 0 0 40px 12px rgba(255, 233, 74, 0.6)" },
          "50%": { boxShadow: "0 0 36px 14px #FFE94A, 0 0 60px 20px rgba(255, 233, 74, 0.8)" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        blink: {
          "0%, 92%, 100%": { transform: "scaleY(1)" },
          "95%": { transform: "scaleY(0.05)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        talk: {
          "0%, 100%": { transform: "scaleY(0.08)" },
          "50%": { transform: "scaleY(1)" },
        },
        chomp: {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(0.4)" },
        },
        spinslow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        spinslowrev: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-12px) rotate(8deg)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.9)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
      },
      animation: {
        glow: "glow 1.6s ease-in-out infinite",
        bob: "bob 3s ease-in-out infinite",
        blink: "blink 4s ease-in-out infinite",
        wiggle: "wiggle 0.6s ease-in-out infinite",
        talk: "talk 0.36s ease-in-out infinite",
        chomp: "chomp 0.22s ease-in-out infinite",
        spinslow: "spinslow 18s linear infinite",
        spinslowrev: "spinslowrev 22s linear infinite",
        floaty: "floaty 6s ease-in-out infinite",
        twinkle: "twinkle 2.4s ease-in-out infinite",
      },
      fontFamily: {
        display: ['"Comic Sans MS"', '"Chalkboard SE"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
