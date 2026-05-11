"use client";

import { Icons } from "@/components/ui/Icon";
import type { EcosystemProvider } from "@/lib/ecosystem/types";

const LABELS: Record<EcosystemProvider, string> = {
  "0x": "0x",
  lifi: "LI.FI",
  moonpay: "MoonPay",
  transak: "Transak",
};

export function ProviderBadge({ provider, muted = false }: { provider: EcosystemProvider; muted?: boolean }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      height: 24,
      padding: "0 8px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.10)",
      background: muted ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.07)",
      color: muted ? "rgba(255,255,255,0.36)" : "rgba(255,255,255,0.68)",
      fontSize: 11,
      fontWeight: 650,
      flexShrink: 0,
    }}>
      <Icons.externalLink size={11} />
      {LABELS[provider]}
    </span>
  );
}
