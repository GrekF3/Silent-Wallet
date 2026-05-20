"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
};

export function Skeleton({ width = "100%", height = 14, radius = 8, style }: SkeletonProps) {
  return (
    <motion.div
      aria-hidden="true"
      animate={{ opacity: [0.22, 0.46, 0.22] }}
      transition={{ duration: 1.65, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.055), rgba(255,255,255,0.105), rgba(255,255,255,0.055))",
        backgroundSize: "220% 100%",
        border: "1px solid rgba(255,255,255,0.035)",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 2, widths = ["72%", "48%"] }: { lines?: number; widths?: Array<number | string> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} width={widths[index] ?? widths[widths.length - 1] ?? "60%"} height={11} radius={6} />
      ))}
    </div>
  );
}

export function SkeletonRow({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: compact ? "12px 0" : "15px 18px" }}>
      <Skeleton width={40} height={40} radius={13} />
      <div style={{ flex: 1 }}>
        <SkeletonText lines={2} widths={["34%", "62%"]} />
      </div>
      <div style={{ width: 92, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <Skeleton width="78%" height={12} radius={6} />
        <Skeleton width="52%" height={10} radius={6} />
      </div>
    </div>
  );
}

export function SkeletonPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Skeleton width="35%" height={18} radius={8} />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} width="100%" height={index === 0 ? 54 : 44} radius={14} />
      ))}
    </div>
  );
}
