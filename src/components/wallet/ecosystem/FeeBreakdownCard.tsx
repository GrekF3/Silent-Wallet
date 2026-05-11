"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import { bpsToPercent } from "@/lib/ecosystem/fees";
import { formatUSD } from "@/lib/utils";
import type { FeeBreakdown, ProviderFee } from "@/lib/ecosystem/types";

function feeValue(fee: ProviderFee) {
  if (fee.usd !== undefined && fee.usd > 0) return formatUSD(fee.usd);
  if (fee.amount && fee.token) return `${fee.amount} ${fee.token}`;
  if (fee.amount) return fee.amount;
  if (fee.bps !== undefined) return bpsToPercent(fee.bps);
  return "Shown by provider";
}

function Row({ fee }: { fee: ProviderFee }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)" }}>{fee.label}</span>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{feeValue(fee)}</span>
    </div>
  );
}

export function FeeBreakdownCard({ breakdown }: { breakdown?: FeeBreakdown | null }) {
  if (!breakdown) return null;
  const fees = [
    breakdown.silentFee,
    breakdown.integratorFee,
    breakdown.lifiFee,
    breakdown.networkFee,
    ...breakdown.providerFees,
  ].filter((fee): fee is ProviderFee => Boolean(fee));

  return (
    <GlassCard style={{ padding: "13px 16px", borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: fees.length ? 2 : 0 }}>
        <Icons.info size={14} color="rgba(255,255,255,0.48)" />
        <span style={{ fontSize: 12, fontWeight: 650, color: "rgba(255,255,255,0.76)" }}>Fee breakdown</span>
      </div>
      {fees.map((fee, index) => <Row key={`${fee.label}-${index}`} fee={fee} />)}
      {breakdown.notes.map((note) => (
        <div key={note} style={{ marginTop: 9, fontSize: 11, color: "rgba(255,255,255,0.32)", lineHeight: 1.45 }}>
          {note}
        </div>
      ))}
    </GlassCard>
  );
}
