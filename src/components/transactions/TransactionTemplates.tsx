"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { Icons } from "@/components/ui/Icon";
import { usePremium } from "@/lib/premium/entitlements";
import { addTransactionTemplate, deleteTransactionTemplate, useTransactionTemplates } from "@/lib/transactionNotes/storage";
import { LockedFeature } from "@/components/premium/LockedFeature";

export function TransactionTemplates({
  recipient,
  assetSymbol,
  network,
  onUse,
}: {
  recipient: string;
  assetSymbol: string;
  network: string;
  onUse: (recipient: string) => void;
}) {
  const premium = usePremium();
  const templates = useTransactionTemplates();

  if (!premium.hasEntitlement("pro.transactions.templates")) {
    return <LockedFeature entitlement="pro.transactions.templates" title="Transaction templates" description="Save trusted recipient, asset, and network combinations." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span className="label">Templates</span>
        <GlassButton
          variant="ghost"
          size="sm"
          disabled={!recipient}
          onClick={() => addTransactionTemplate({ name: `${assetSymbol} transfer`, recipient, assetSymbol, network })}
        >
          <Icons.plus size={12} /> Save
        </GlassButton>
      </div>
      {templates.slice(0, 3).map((template) => (
        <div key={template.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: "9px 10px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <button type="button" onClick={() => onUse(template.recipient)} style={{ minWidth: 0, border: "none", background: "transparent", color: "rgba(255,255,255,0.58)", font: "inherit", fontSize: 12, textAlign: "left", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {template.name}
          </button>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.26)" }}>{template.network}</span>
          <button type="button" onClick={() => deleteTransactionTemplate(template.id)} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.30)", cursor: "pointer" }}>
            <Icons.x size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
