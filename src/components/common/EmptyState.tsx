"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { Icons } from "@/components/ui/Icon";

export function EmptyState({
  icon = "info",
  title,
  body,
  action,
}: {
  icon?: keyof typeof Icons;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void; icon?: keyof typeof Icons };
}) {
  const Icon = Icons[icon];
  const ActionIcon = action?.icon ? Icons[action.icon] : null;

  return (
    <div style={{ textAlign: "center", padding: "44px 18px", color: "rgba(255,255,255,0.28)" }}>
      <div style={{ width: 54, height: 54, borderRadius: 18, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Icon size={22} color="rgba(255,255,255,0.24)" />
      </div>
      <div style={{ fontSize: 15, fontWeight: 650, color: "rgba(255,255,255,0.58)", marginBottom: 6 }}>{title}</div>
      {body && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", lineHeight: 1.55, maxWidth: 320, margin: "0 auto" }}>{body}</div>}
      {action && (
        <GlassButton variant="default" size="md" onClick={action.onClick} style={{ marginTop: 18 }}>
          {ActionIcon && <ActionIcon size={13} />} {action.label}
        </GlassButton>
      )}
    </div>
  );
}
