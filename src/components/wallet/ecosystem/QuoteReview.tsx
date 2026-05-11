"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import type { ExecutionWarning, FeeBreakdown } from "@/lib/ecosystem/types";
import { FeeBreakdownCard } from "./FeeBreakdownCard";

export function QuoteReview({
  title,
  rows,
  fees,
  warnings,
  children,
}: {
  title: string;
  rows: { label: string; value: string }[];
  fees?: FeeBreakdown | null;
  warnings?: ExecutionWarning[];
  children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <GlassCard elevated style={{ padding: "13px 16px", borderRadius: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icons.check size={14} color="rgba(255,255,255,0.62)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{title}</span>
        </div>
        {rows.map((row, index) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: index === rows.length - 1 ? "none" : "1px solid rgba(255,255,255,0.055)" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.34)" }}>{row.label}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.74)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.value}</span>
          </div>
        ))}
      </GlassCard>
      <FeeBreakdownCard breakdown={fees} />
      {warnings?.map((warning) => (
        <div key={warning.code} style={{ display: "flex", gap: 8, padding: "10px 12px", borderRadius: 13, border: `1px solid ${warning.severity === "error" ? "rgba(255,80,80,0.20)" : "rgba(251,191,36,0.18)"}`, background: warning.severity === "error" ? "rgba(255,60,60,0.06)" : "rgba(251,191,36,0.06)" }}>
          <Icons.info size={14} color={warning.severity === "error" ? "rgba(255,100,100,0.82)" : "rgba(251,191,36,0.78)"} />
          <span style={{ fontSize: 12, color: warning.severity === "error" ? "rgba(255,130,130,0.82)" : "rgba(251,210,120,0.74)" }}>{warning.message}</span>
        </div>
      ))}
      {children}
    </div>
  );
}
