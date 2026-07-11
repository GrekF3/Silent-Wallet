"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import { bpsToPercent } from "@/lib/ecosystem/fees";
import { formatUSD } from "@/lib/utils";
import type { FeeBreakdown, ProviderFee } from "@/lib/ecosystem/types";

export function feeValue(fee: ProviderFee) {
  if (fee.amount && fee.token) {
    const amount = `${fee.amount} ${fee.token}`;
    return fee.usd !== undefined && fee.usd > 0 ? `${amount} ≈ ${formatUSD(fee.usd)}` : amount;
  }
  if (fee.usd !== undefined && fee.usd > 0) return formatUSD(fee.usd);
  if (fee.amount) return fee.amount;
  if (fee.bps !== undefined) return bpsToPercent(fee.bps);
  return "Shown by provider";
}

export function FeeRow({ fee, last = false }: { fee: ProviderFee; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.055)" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)" }}>{fee.label}</span>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{feeValue(fee)}</span>
    </div>
  );
}

export function feeRows(breakdown?: FeeBreakdown | null) {
  if (!breakdown) return [];
  return [
    breakdown.silentFee,
    breakdown.integratorFee,
    breakdown.lifiFee,
    breakdown.networkFee,
    ...breakdown.providerFees,
  ].filter((fee): fee is ProviderFee => Boolean(fee));
}

export function FeeBreakdownCard({ breakdown }: { breakdown?: FeeBreakdown | null }) {
  if (!breakdown) return null;
  const fees = feeRows(breakdown);

  return (
    <GlassCard style={{ padding: "13px 16px", borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: fees.length ? 2 : 0 }}>
        <Icons.info size={14} color="rgba(255,255,255,0.48)" />
        <span style={{ fontSize: 12, fontWeight: 650, color: "rgba(255,255,255,0.76)" }}>Fee breakdown</span>
      </div>
      {fees.map((fee, index) => <FeeRow key={`${fee.label}-${index}`} fee={fee} last={index === fees.length - 1 && breakdown.notes.length === 0} />)}
      {breakdown.notes.map((note) => (
        <div key={note} style={{ marginTop: 9, fontSize: 11, color: "rgba(255,255,255,0.32)", lineHeight: 1.45 }}>
          {note}
        </div>
      ))}
    </GlassCard>
  );
}
