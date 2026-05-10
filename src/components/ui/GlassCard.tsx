"use client";
import { motion, type HTMLMotionProps } from "framer-motion";

type GlassCardProps = HTMLMotionProps<"div"> & {
  hover?: boolean;
  elevated?: boolean;
};

export function GlassCard({ hover = false, elevated = false, style, children, ...props }: GlassCardProps) {
  const shadow = elevated
    ? [
        "0 0 0 1px rgba(255,255,255,0.07)",
        "0 2px 8px rgba(0,0,0,0.65)",
        "0 12px 40px rgba(0,0,0,0.60)",
        "0 36px 80px rgba(0,0,0,0.50)",
        "inset 0 1px 0 rgba(255,255,255,0.14)",
        "inset 0 -1px 0 rgba(0,0,0,0.20)",
      ].join(", ")
    : [
        "0 1px 3px rgba(0,0,0,0.55)",
        "0 4px 16px rgba(0,0,0,0.50)",
        "0 16px 48px rgba(0,0,0,0.40)",
        "inset 0 1px 0 rgba(255,255,255,0.11)",
        "inset 0 -1px 0 rgba(0,0,0,0.16)",
      ].join(", ");

  return (
    <motion.div
      style={{
        background:           "rgba(255,255,255,0.055)",
        border:               "1px solid rgba(255,255,255,0.11)",
        borderTopColor:       "rgba(255,255,255,0.22)",
        borderRadius:         20,
        backdropFilter:       "blur(32px) saturate(160%)",
        WebkitBackdropFilter: "blur(32px) saturate(160%)",
        boxShadow:            shadow,
        position:             "relative",
        overflow:             "hidden",
        ...style,
      }}
      /* fix: only animate `background`, never borderColor (Framer can't animate shorthand with mixed values) */
      whileHover={hover ? { background: "rgba(255,255,255,0.082)" } : undefined}
      transition={{ duration: 0.18 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
