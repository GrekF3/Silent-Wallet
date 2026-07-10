"use client";

import { Icons } from "@/components/ui/Icon";
import type { TransactionReviewWarning as Warning } from "@/lib/transactions/review";

export function TransactionWarning({ warning }: { warning: Warning }) {
  const color = warning.tone === "warning" ? "rgba(251,210,120,0.78)" : "rgba(255,255,255,0.50)";
  return (
    <div style={{ display: "flex", gap: 9, padding: "10px 12px", borderRadius: 13, border: `1px solid ${warning.tone === "warning" ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.08)"}`, background: warning.tone === "warning" ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.04)" }}>
      <Icons.info size={14} color={color} />
      <span style={{ fontSize: 12, color, lineHeight: 1.45 }}>{warning.message}</span>
    </div>
  );
}
