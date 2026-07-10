"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import { useWalletStore } from "@/lib/store";
import { usePremium } from "@/lib/premium/entitlements";
import type { PremiumEntitlement } from "@/lib/premium/types";

export function LockedFeature({
  entitlement,
  title,
  description,
}: {
  entitlement: PremiumEntitlement;
  title: string;
  description: string;
}) {
  const premium = usePremium();
  const setView = useWalletStore((state) => state.setView);

  if (premium.hasEntitlement(entitlement)) return null;

  return (
    <GlassCard style={{ padding: 16, borderRadius: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 38, height: 38, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)", flexShrink: 0 }}>
          <Icons.lock size={15} color="rgba(255,255,255,0.42)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 650, color: "#fff" }}>{title}</div>
          <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.34)" }}>{description}</div>
        </div>
        <GlassButton variant="default" size="sm" onClick={() => setView("premium")}>
          {premium.purchaseUrl ? "Unlock Silent Pro" : "Coming soon"}
        </GlassButton>
      </div>
    </GlassCard>
  );
}
