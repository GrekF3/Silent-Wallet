"use client";

import { Icons } from "@/components/ui/Icon";

export function PremiumFeatureList({ features }: { features: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {features.map((feature) => (
        <div key={feature} style={{ display: "flex", alignItems: "center", gap: 9, color: "rgba(255,255,255,0.54)", fontSize: 13 }}>
          <Icons.check size={13} color="rgba(255,255,255,0.58)" />
          {feature}
        </div>
      ))}
    </div>
  );
}
