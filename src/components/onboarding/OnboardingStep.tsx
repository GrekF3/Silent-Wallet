"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { useI18n } from "@/lib/i18n";

export function OnboardingStep({
  label,
  title,
  body,
  children,
}: {
  label: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <GlassCard elevated style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="label" style={{ marginBottom: 10 }}>{t(label)}</div>
        <div style={{ fontSize: 25, fontWeight: 300, color: "#fff", letterSpacing: 0, lineHeight: 1.12 }}>{t(title)}</div>
        <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.44)" }}>{t(body)}</div>
      </div>
      {children}
    </GlassCard>
  );
}
