"use client";
import { motion } from "framer-motion";

type SparklineProps = {
  data:    number[];
  width?:  number;
  height?: number;
  positive?: boolean;
};

export function Sparkline({ data, width = 80, height = 32, positive }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const d    = `M ${pts.join(" L ")}`;
  const fill = `M 0,${height} L ${pts.join(" L ")} L ${width},${height} Z`;
  const color = positive === false ? "rgba(255,100,100,0.8)" : "rgba(255,255,255,0.65)";
  const fillC = positive === false ? "rgba(255,100,100,0.08)" : "rgba(255,255,255,0.06)";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <path d={fill} fill={fillC} />
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
      />
    </svg>
  );
}
