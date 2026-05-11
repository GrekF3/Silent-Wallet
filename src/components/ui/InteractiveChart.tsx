"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";
import { motion } from "framer-motion";
import { formatUSD } from "@/lib/utils";

export type ChartPoint = {
  value: number;
  timestamp?: number;
};

type InteractiveChartProps = {
  points: ChartPoint[];
  height?: number;
  positive?: boolean;
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
};

function formatPointTime(timestamp?: number) {
  if (!timestamp) return "7D point";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function InteractiveChart({
  points,
  height = 156,
  positive = true,
  valueFormatter = formatUSD,
  emptyLabel = "No chart data yet",
}: InteractiveChartProps) {
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 620;
  const pad = 14;

  const chart = useMemo(() => {
    const clean = points.filter((point) => Number.isFinite(point.value) && point.value > 0);
    if (clean.length < 2) return null;

    const min = Math.min(...clean.map((point) => point.value));
    const max = Math.max(...clean.map((point) => point.value));
    const range = max - min || Math.max(max, 1);
    const w = width - pad * 2;
    const h = height - pad * 2;
    const plotted = clean.map((point, index) => {
      const x = pad + (index / (clean.length - 1)) * w;
      const y = pad + h - ((point.value - min) / range) * h;
      return { ...point, x, y };
    });
    const line = `M ${plotted.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" L ")}`;
    const fill = `M ${pad},${pad + h} L ${plotted.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" L ")} L ${pad + w},${pad + h} Z`;
    return { plotted, line, fill, base: `M ${pad} ${pad + h} L ${pad + w} ${pad + h}` };
  }, [height, points]);

  if (!chart) {
    const mid = Math.round(height / 2);
    return (
      <div style={{ position: "relative", width: "100%", height }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
          <path d={`M ${pad} ${mid} L ${width - pad} ${mid}`} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="4 7" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(255,255,255,0.28)" }}>
          {emptyLabel}
        </div>
      </div>
    );
  }

  const color = positive ? "rgba(255,255,255,0.72)" : "rgba(255,100,100,0.82)";
  const fillColor = positive ? "rgba(255,255,255,0.08)" : "rgba(255,100,100,0.10)";
  const activePoint = hoverIndex === null ? null : chart.plotted[hoverIndex] ?? null;
  const tooltipX = activePoint ? (activePoint.x / width) * 100 : 0;
  const tooltipAlign = tooltipX > 72 ? "translate(-100%, -8px)" : tooltipX < 28 ? "translate(0, -8px)" : "translate(-50%, -8px)";

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const index = Math.round((x / rect.width) * (chart.plotted.length - 1));
    setHoverIndex(index);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverIndex(null)}
      style={{ position: "relative", width: "100%", height, cursor: "crosshair", touchAction: "none" }}
    >
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <path d={chart.base} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <path d={chart.fill} fill={`url(#${gradientId})`} />
        <motion.path
          d={chart.line}
          fill="none"
          stroke={color}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.72, ease: "easeOut" }}
        />
        {activePoint && (
          <>
            <path d={`M ${activePoint.x.toFixed(1)} ${pad} L ${activePoint.x.toFixed(1)} ${height - pad}`} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx={activePoint.x} cy={activePoint.y} r="4.2" fill="#080808" stroke={color} strokeWidth="2" />
          </>
        )}
      </svg>

      {activePoint && (
        <div
          style={{
            position: "absolute",
            left: `${tooltipX}%`,
            top: 8,
            transform: tooltipAlign,
            minWidth: 112,
            padding: "8px 10px",
            borderRadius: 11,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(9,9,9,0.86)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 650, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
            {valueFormatter(activePoint.value)}
          </div>
          <div style={{ marginTop: 3, fontSize: 10, color: "rgba(255,255,255,0.36)", whiteSpace: "nowrap" }}>
            {formatPointTime(activePoint.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
}
