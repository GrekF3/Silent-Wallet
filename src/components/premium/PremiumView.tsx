"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import { FREE_FEATURES, SILENT_PRO_FEATURES } from "@/lib/premium/config";
import { usePremium } from "@/lib/premium/entitlements";
import { ExportPanel } from "@/components/exports/ExportPanel";
import { useWalletStore } from "@/lib/store";
import { PremiumBadge } from "./PremiumBadge";
import { PremiumCard } from "./PremiumCard";
import { LicenseKeyModal } from "./LicenseKeyModal";

const OPERATIONS = [
  { icon: "wallet" as const, title: "Account separation", body: "Create purpose-based HD accounts without storing extra secrets." },
  { icon: "eyeOff" as const, title: "Address hygiene", body: "Use different receiving and sending contexts for treasury, operations, and long-term funds." },
  { icon: "key" as const, title: "Trusted transfer workflows", body: "Save trusted recipients and reusable templates for deliberate transfers." },
  { icon: "eye" as const, title: "Watch dashboards", body: "Prepare observer dashboards for public addresses without signing access." },
  { icon: "download" as const, title: "Exports and reporting", body: "Export visible history, contacts, and portfolio snapshots without private material." },
];

export function PremiumView() {
  const premium = usePremium();
  const setView = useWalletStore((state) => state.setView);
  const [licenseOpen, setLicenseOpen] = useState(false);

  const openPurchase = () => {
    if (premium.purchaseUrl) window.open(premium.purchaseUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div className="view-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      style={{ padding: "32px 28px", maxWidth: 780, display: "flex", flexDirection: "column", gap: 22 }}>
      <AnimatePresence>
        {licenseOpen && <LicenseKeyModal onClose={() => setLicenseOpen(false)} />}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <span className="label">Silent Pro</span>
          <div style={{ marginTop: 8, fontSize: 32, fontWeight: 300, color: "#fff", letterSpacing: 0 }}>Separate accounts by purpose. Keep high-value transfers deliberate.</div>
        </div>
        <PremiumBadge />
      </div>

      <GlassCard style={{ padding: 16, borderRadius: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icons.info size={15} color="rgba(255,255,255,0.46)" />
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.42)" }}>
            Silent Wallet is free to use. Silent Pro unlocks advanced custody operations: account separation, privacy hygiene, trusted workflows, watch dashboards, and exports. These tools reduce screen exposure and accidental linkage; they do not make public blockchain transactions anonymous.
          </div>
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 12 }}>
        <PremiumCard title="Free" subtitle="Everything you need to start safely." features={FREE_FEATURES} active={!premium.isPro}>
          <GlassButton variant="default" size="md" disabled style={{ width: "100%" }}>Current baseline</GlassButton>
        </PremiumCard>
        <PremiumCard title="Silent Pro" subtitle="More structure for serious holders managing multiple account contexts." features={SILENT_PRO_FEATURES} active={premium.isPro}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <GlassButton variant="primary" size="md" onClick={premium.purchaseUrl ? openPurchase : undefined} disabled={!premium.purchaseUrl}>
              {premium.purchaseUrl ? "Unlock Silent Pro" : "Coming soon"}
            </GlassButton>
            <GlassButton variant="default" size="md" onClick={() => setLicenseOpen(true)}>Enter license</GlassButton>
          </div>
          {premium.isPro && <GlassButton variant="ghost" size="sm" onClick={premium.removeLicense}>Remove license</GlassButton>}
          {!premium.purchaseUrl && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>Silent Pro purchase page is not configured yet.</div>}
        </PremiumCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
        {OPERATIONS.map((item) => {
          const Icon = Icons[item.icon];
          return (
            <GlassCard key={item.title} style={{ padding: 16, borderRadius: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)", marginBottom: 12 }}>
                <Icon size={16} color="rgba(255,255,255,0.56)" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 750, color: "#fff" }}>{item.title}</div>
              <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.34)" }}>{item.body}</div>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard style={{ padding: 16, borderRadius: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 750, color: "#fff" }}>Accounts are the Pro workspace.</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.34)" }}>Create Treasury, Long Term, Operations, and Watch contexts from one seed phrase.</div>
          </div>
          <GlassButton variant="default" size="md" onClick={() => setView("accounts")}>
            Open Accounts
          </GlassButton>
        </div>
      </GlassCard>

      <ExportPanel />
    </motion.div>
  );
}
