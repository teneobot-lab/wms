import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      colors: {
        // Clarity Industrial Design System
        "bg-base": "#F7F6F3",
        "bg-surface": "#FFFFFF",
        "bg-elevated": "#F0EFE9",
        "bg-subtle": "#E8E7E1",
        // Primary slate teal
        "primary-900": "#1A2F3A",
        "primary-700": "#2C4A5A",
        "primary-500": "#3D6678",
        "primary-300": "#7AAEC3",
        "primary-100": "#D6EAF2",
        // Accent amber
        "accent-500": "#D97706",
        "accent-400": "#F59E0B",
        "accent-100": "#FEF3C7",
        // Semantic
        success: "#16A34A",
        warning: "#CA8A04",
        danger: "#DC2626",
        info: "#2563EB",
        // Text
        "text-primary": "#1C1917",
        "text-secondary": "#57534E",
        "text-muted": "#A8A29E",
        "text-inverse": "#FAFAF9",
        // Borders
        border: "#D6D3CE",
        "border-strong": "#A8A29E",
        // Table
        "table-header": "#EAE9E4",
        "table-row-alt": "#F7F6F3",
        "table-hover": "#EDF4F8",
        "table-selected": "#D6EAF2",
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px", letterSpacing: "0.05em" }],
        xs: ["12px", { lineHeight: "18px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "22px" }],
        lg: ["16px", { lineHeight: "24px" }],
        xl: ["18px", { lineHeight: "28px" }],
        "2xl": ["20px", { lineHeight: "30px" }],
      },
      spacing: {
        "toolbar": "40px",
        "navbar": "48px",
        "sidebar": "220px",
        "sidebar-collapsed": "52px",
      },
      height: {
        "row-compact": "32px",
        "row-default": "40px",
        "btn-sm": "30px",
        "btn-default": "34px",
        "input": "32px",
        "select": "28px",
      },
    },
  },
  plugins: [],
};
export default config;