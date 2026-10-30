import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
        fun: ["Fredoka", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        bubble: {
          child: "hsl(var(--bubble-child))",
          assistant: "hsl(var(--bubble-assistant))",
        },
        parent: {
          bg: "hsl(var(--parent-bg))",
        },
        // Fresh color tokens
        lime: {
          soft: "hsl(var(--lime-soft))",
          medium: "hsl(var(--lime-medium))",
        },
        violet: {
          soft: "hsl(var(--violet-soft))",
          medium: "hsl(var(--violet-medium))",
        },
        neutral: {
          light: "hsl(var(--neutral-light))",
        },
        // Legacy earth colors mapped to new system
        earth: {
          sand: "hsl(var(--neutral-light))",
          sage: "hsl(var(--lime-soft))",
          clay: "hsl(var(--violet-soft))",
          stone: "hsl(var(--muted))",
          wood: "hsl(var(--foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        bubble: "1.25rem",
      },
      boxShadow: {
        soft: "0 2px 12px -2px hsl(240 10% 20% / 0.08)",
        glow: "0 0 24px hsl(var(--primary) / 0.25)",
        "glow-accent": "0 0 24px hsl(var(--accent) / 0.3)",
        clean: "0 1px 2px hsl(240 10% 20% / 0.04), 0 4px 12px hsl(240 10% 20% / 0.06)",
        montessori: "0 1px 2px hsl(240 10% 20% / 0.04), 0 4px 12px hsl(240 10% 20% / 0.06)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
