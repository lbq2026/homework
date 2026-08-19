/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // ============================================================
        // 设计系统扩展（v2.0 · 亮色乐园 · UI Designer）
        // 命名：bg-{name}  text-{name}  border-{name}  ring-{name}
        // ============================================================

        // 品牌色阶（天蓝）
        brand: {
          50:  "#E0F2FE",   // 浅背景
          100: "#BAE6FD",   // 柔和背景
          200: "#7DD3FC",   // hover 浅色
          300: "#38BDF8",   // 装饰/高亮
          400: "#0EA5E9",   // 次按钮/图标
          500: "#0284C7",   // 主按钮/顶部栏
          600: "#0369A1",   // 按下/深色文字
          700: "#075985",   // 深色装饰
        },

        // 辅助色（高饱和度亮色）
        "accent-yellow": {
          300: "#FDE047",
          400: "#FACC15",
          600: "#CA8A04",
        },
        "accent-green": {
          300: "#86EFAC",
          400: "#4ADE80",
          600: "#16A34A",
        },
        "accent-pink": {
          300: "#F9A8D4",
          400: "#F472B6",
          600: "#DB2777",
        },
        "accent-purple": {
          300: "#D8B4FE",
          400: "#A855F7",
          600: "#7C3AED",
        },
        "accent-orange": {
          300: "#FDBA74",
          400: "#FB923C",
          600: "#EA580C",
        },

        // 中性色（奶油白/暖灰）
        neutral: {
          0:   "#FFFFFF",
          50:  "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
          400: "#A8A29E",
          600: "#57534E",
          800: "#292524",
          900: "#1C1917",
        },

        // 语义色
        semantic: {
          success:      "#16A34A",
          "success-soft": "#DCFCE7",
          warning:      "#D97706",
          "warning-soft": "#FEF3C7",
          danger:       "#DC2626",
          "danger-soft":  "#FEE2E2",
          info:         "#0284C7",
          "info-soft":    "#E0F2FE",
        },

        // 角色专属色
        role: {
          child:       "#EC4899",
          "child-soft": "#FCE7F3",
          parent:      "#0EA5E9",
          "parent-soft": "#E0F2FE",
        },

        // 等级色
        level: {
          bronze:   "#D97706",
          silver:   "#94A3B8",
          gold:     "#FACC15",
          platinum: "#38BDF8",
        },
      },

      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        // 设计系统标准
        pill:    "9999px",
        surface: "24px",
        card:    "20px",
        button:  "14px",
        input:   "12px",
        badge:   "9999px",
      },

      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        // 设计系统语义阴影
        card:          "0 4px 12px rgba(14, 165, 233, 0.08)",
        "card-hover":   "0 8px 20px rgba(14, 165, 233, 0.14)",
        button:        "0 4px 0 #0284C7",
        "button-active": "0 2px 0 #0284C7",
        focus:         "0 0 0 4px rgba(56, 189, 248, 0.35)",
      },

      fontSize: {
        // 设计系统字体规范（儿童友好，字号放大）
        display:   ["32px", { lineHeight: "1.25", fontWeight: "700" }],
        title:     ["22px", { lineHeight: "1.35", fontWeight: "700" }],
        subtitle:  ["18px", { lineHeight: "1.4",  fontWeight: "600" }],
        body:      ["16px", { lineHeight: "1.6",  fontWeight: "500" }],
        caption:   ["14px", { lineHeight: "1.5",  fontWeight: "400" }],
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
