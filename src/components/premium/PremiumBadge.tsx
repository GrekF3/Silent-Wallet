"use client";

import { usePremium } from "@/lib/premium/entitlements";

export function PremiumBadge() {
  const premium = usePremium();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: premium.isPro ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.045)", color: premium.isPro ? "#fff" : "rgba(255,255,255,0.38)", fontSize: 11, fontWeight: 650 }}>
      {premium.isPro ? "Silent Pro" : "Free"}
    </span>
  );
}
