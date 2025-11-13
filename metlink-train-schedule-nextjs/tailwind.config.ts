import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-scale': 'fadeInScale 0.6s ease-out',
        'slide-up': 'slideUpFade 0.7s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'fade-in-slide': 'fadeInSlide 0.6s ease-out',
        'pulse-subtle': 'pulseSubtle 0.4s ease-out',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

