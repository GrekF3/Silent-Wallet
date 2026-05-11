"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import { explorerForChain } from "@/lib/ecosystem/executeEvm";

export type ExecutionState = {
  status: "idle" | "pending" | "success" | "error";
  label?: string;
  txHash?: string;
  chainId?: number;
  error?: string;
};

export function ExecutionStatus({ state }: { state: ExecutionState }) {
  if (state.status === "idle") return null;
  const success = state.status === "success";
  const error = state.status === "error";
  const explorer = state.txHash && state.chainId ? explorerForChain(state.chainId, state.txHash) : "";
  return (
    <GlassCard style={{ padding: "12px 14px", borderRadius: 15 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: error ? "rgba(255,100,100,0.85)" : success ? "rgba(120,220,90,0.90)" : "rgba(251,191,36,0.82)", flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 650, color: error ? "rgba(255,120,120,0.86)" : success ? "rgba(150,230,130,0.86)" : "rgba(251,210,120,0.80)" }}>
          {state.label ?? (error ? "Transaction failed" : success ? "Transaction submitted" : "Waiting for signature")}
        </span>
        {state.txHash && (
          <button type="button" onClick={() => navigator.clipboard.writeText(state.txHash ?? "")} style={{ border: 0, background: "none", color: "rgba(255,255,255,0.38)", cursor: "pointer", display: "flex" }}>
            <Icons.copy size={13} />
          </button>
        )}
        {explorer && (
          <a href={explorer} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.38)", display: "flex" }}>
            <Icons.externalLink size={13} />
          </a>
        )}
      </div>
      {state.error && <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,130,130,0.78)" }}>{state.error}</div>}
      {state.txHash && <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.30)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.txHash}</div>}
    </GlassCard>
  );
}
