"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { PremiumFeatureList } from "./PremiumFeatureList";

export function PremiumCard({
  title,
  subtitle,
  features,
  active,
  children,
}: {
  title: string;
  subtitle: string;
  features: string[];
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <GlassCard elevated={active} style={{ padding: 20, borderRadius: 22, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 650, color: "#fff" }}>{title}</div>
        <div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.38)" }}>{subtitle}</div>
      </div>
      <PremiumFeatureList features={features} />
      {children}
    </GlassCard>
  );
}
