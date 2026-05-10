"use client";
import { motion, type HTMLMotionProps } from "framer-motion";

type GlassButtonProps = HTMLMotionProps<"button"> & {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

type StyleSet = { container: React.CSSProperties; text: string };

const VARIANTS: Record<string, StyleSet> = {
  default: {
    container: {
      background:  "rgba(255,255,255,0.07)",
      border:      "1px solid rgba(255,255,255,0.12)",
      borderTop:   "1px solid rgba(255,255,255,0.22)",
      boxShadow:   "0 2px 8px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.14)",
      color:       "rgba(255,255,255,0.80)",
    },
    text: "rgba(255,255,255,0.80)",
  },
  primary: {
    container: {
      background:  "#ffffff",
      border:      "1px solid rgba(255,255,255,0.5)",
      borderTop:   "1px solid rgba(255,255,255,0.9)",
      boxShadow:   "0 2px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.80), inset 0 -1px 0 rgba(0,0,0,0.08)",
      color:       "#000000",
      fontWeight:  600,
    },
    text: "#000",
  },
  ghost: {
    container: {
      background:  "transparent",
      border:      "1px solid transparent",
      color:       "rgba(255,255,255,0.40)",
    },
    text: "rgba(255,255,255,0.40)",
  },
  danger: {
    container: {
      background:  "rgba(255,60,60,0.06)",
      border:      "1px solid rgba(255,60,60,0.20)",
      borderTop:   "1px solid rgba(255,80,80,0.30)",
      boxShadow:   "0 2px 8px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,100,100,0.08)",
      color:       "rgba(255,100,100,0.80)",
    },
    text: "rgba(255,100,100,0.80)",
  },
};

const SIZES: Record<string, React.CSSProperties> = {
  sm: { height: 32,  paddingLeft: 12, paddingRight: 12, fontSize: 13, borderRadius: 10 },
  md: { height: 44,  paddingLeft: 18, paddingRight: 18, fontSize: 14, borderRadius: 14 },
  lg: { height: 52,  paddingLeft: 22, paddingRight: 22, fontSize: 15, borderRadius: 16 },
};

export function GlassButton({
  variant = "default",
  size = "md",
  disabled,
  children,
  style,
  ...props
}: GlassButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <motion.button
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        justifyContent: "center",
        gap:            8,
        cursor:         disabled ? "not-allowed" : "pointer",
        userSelect:     "none",
        fontFamily:     "inherit",
        fontWeight:     500,
        letterSpacing:  "-0.01em",
        opacity:        disabled ? 0.4 : 1,
        transition:     "background 0.15s, color 0.15s",
        ...v.container,
        ...s,
        ...style,
      }}
      whileHover={!disabled ? { scale: 1.018 } : undefined}
      whileTap={!disabled ? { scale: 0.964 } : undefined}
      transition={{ type: "spring", stiffness: 580, damping: 32 }}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
