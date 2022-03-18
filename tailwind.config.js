module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    fontSize: {
      xxxs: "var(--step--4)",
      xxs: "var(--step--3)",
      xs: "var(--step--2)",
      sm: "var(--step--1)",
      md: "var(--step-0)",
      lg: "var(--step-1)",
      xl: "var(--step-2)",
      "2xl": "var(--step-3)",
      "3xl": "var(--step-4)",
    },
    colors: {
      transparent: "transparent",
      current: "currentColor",
    },
    backgroundColor: (theme) => ({
      ...theme("colors"),
      primary: "var(--color-bg-primary)",
      secondary: "var(--color-bg-secondary)",
      "action-primary": "var(--color-bg-action-primary)",
      "action-tertiary": "var(--color-bg-action-tertiary)",
      "action-tertiary-hover": "var(--color-bg-action-tertiary-hover)",
      "input-primary": "var(--color-bg-input-primary)",
      "input-primary-hover": "var(--color-bg-input-primary-hover)",
    }),
    borderColor: (theme) => ({
      ...theme("colors"),
      primary: "var(--color-border-primary)",
      secondary: "var(--color-border-secondary)",
      accent: "var(--color-border-accent)",
      "action-tertiary": "var(--color-border-action-tertiary)",
      "action-tertiary-hover": "var(--color-border-action-tertiary-hover)",
    }),
    textColor: (theme) => ({
      ...theme("colors"),
      primary: "var(--color-text-primary)",
      secondary: "var(--color-text-secondary)",
      tertiary: "var(--color-text-tertiary)",
      accent: "var(--color-text-accent)",
      success: "var(--color-text-success)",
      "action-primary": "var(--color-text-action-primary)",
      "action-tertiary": "var(--color-text-action-tertiary)",
      "input-primary": "var(--color-text-input-primary)",
      "input-placeholder": "var(--color-text-input-placeholder)",
    }),
    extend: {
      boxShadow: {
        lg: "0 3px 15px -3px rgb(0 0 0 / 0.2), 0 1px 6px -4px rgb(0 0 0 / 0.3)",
        "input-focus":
          "0 0 0 1px rgba(50, 151, 211, 0.3), 0 1px 1px 0 rgba(0, 0, 0, 0.07), 0 0 0 4px rgba(0, 120, 255, 0.2)",
      },
      gridColumn: {
        "span-16": "span 16 / span 16",
        "span-18": "span 18 / span 18",
        "span-20": "span 20 / span 20",
        "span-22": "span 22 / span 22",
        "span-24": "span 24 / span 24",
        "span-26": "span 26 / span 26",
        "span-28": "span 28 / span 28",
        "span-30": "span 30 / span 30",
        "span-32": "span 32 / span 32",
      },
      gridTemplateColumns: {
        "32x8": "repeat(32, 8px)",
        "1fr-min": "1fr min-content",
        "min-1fr": "min-content 1fr",
        "min-1fr-min": "min-content 1fr min-content",
      },
      gridTemplateRows: {
        "1fr-min": "1fr min-content",
        "min-1fr": "min-content 1fr",
        9: "2.5rem",
        auto: "auto",
      },
      keyframes: {
        ants: {
          to: { "stroke-dashoffset": "1000" },
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
