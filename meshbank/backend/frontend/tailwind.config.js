import tailwindAnimate from "tailwindcss-animate"

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#EADFD4", // Inverted for Premium Dark Mode
          foreground: "#1a1715",
        },
        secondary: {
          DEFAULT: "#4A3A32",
          foreground: "#EADFD4",
        },
        mocha: {
          50: '#f7f6f5',
          100: '#edeae8',
          200: '#d8cfc9',
          300: '#baaca2',
          400: '#9d877a',
          500: '#876d5f',
          600: '#745a4e',
          700: '#614a41',
          800: '#4A3A32', // Original Mocha
          900: '#2d231e',
          950: '#1a1411',
        },
        cream: {
          50: '#fefdfc',
          100: '#fcfaf7',
          200: '#f7f2ea',
          300: '#f0e6d6',
          400: '#e8d4ba',
          500: '#EADFD4', // Original Cream
          600: '#d1ba9e',
          700: '#b89670',
          800: '#a37e5c',
          900: '#84664c',
          950: '#4a3a2b',
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
        'glow-mocha': '0 0 20px -5px rgba(74, 58, 50, 0.4)',
        'glow-cream': '0 0 20px -5px rgba(234, 223, 212, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out forwards",
      },
    },
  },
  plugins: [tailwindAnimate],
}
