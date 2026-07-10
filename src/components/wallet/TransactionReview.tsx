"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { TransactionWarning } from "./TransactionWarning";
import type { TransactionReviewWarning } from "@/lib/transactions/review";

function Row({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <span style={{ minWidth: 0, textAlign: "right", fontSize: 13, color: "#fff", fontWeight: 500, fontFamily: mono ? "monospace" : "inherit", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </div>
  );
}

export function TransactionReview({
  amount,
  asset,
  value,
  recipient,
  network,
  sourceAccount,
  fee,
  total,
  contactName,
  warnings,
}: {
  amount: string;
  asset: string;
  value?: string;
  recipient: string;
  network: string;
  sourceAccount?: string;
  fee: string;
  total?: string;
  contactName?: string;
  warnings: TransactionReviewWarning[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <GlassCard elevated style={{ padding: "4px 20px", borderRadius: 20 }}>
        <Row label="You are sending" value={`${amount} ${asset}`} />
        {value && <Row label="Value" value={value} />}
        {sourceAccount && <Row label="Source account" value={sourceAccount} />}
        <Row label="Recipient" value={contactName ? `${contactName} (${recipient.slice(0, 8)}...${recipient.slice(-6)})` : `${recipient.slice(0, 10)}...${recipient.slice(-8)}`} mono={!contactName} />
        <Row label="Network" value={network} />
        <Row label="Estimated network fee" value={fee} />
        {total && <Row label="Total" value={total} last />}
        {!total && <Row label="Total" value="Amount plus network fee" last />}
      </GlassCard>
      {warnings.map((warning) => <TransactionWarning key={warning.id} warning={warning} />)}
    </div>
  );
}
