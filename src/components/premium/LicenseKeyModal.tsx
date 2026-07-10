"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassInput } from "@/components/ui/GlassInput";
import { Skeleton } from "@/components/common/Skeleton";
import { Icons } from "@/components/ui/Icon";
import { usePremium } from "@/lib/premium/entitlements";

export function LicenseKeyModal({ onClose }: { onClose: () => void }) {
  const premium = usePremium();
  const [licenseKey, setLicenseKey] = useState("");

  const submit = async () => {
    const ok = await premium.validateLicense(licenseKey);
    if (ok) setTimeout(onClose, 500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.68)", backdropFilter: "blur(10px)" }}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} onClick={(event) => event.stopPropagation()} style={{ width: "min(430px, 100%)" }}>
        <GlassCard elevated style={{ padding: 22, borderRadius: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Silent Pro</div>
              <div style={{ fontSize: 21, fontWeight: 650, color: "#fff" }}>Enter license key</div>
            </div>
            <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.x size={15} color="rgba(255,255,255,0.52)" />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <GlassInput label="License key" value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)} placeholder="SW-PRO-XXXX-XXXX" />
            {premium.message && (
              <div style={{ fontSize: 13, color: premium.isPro ? "rgba(255,255,255,0.60)" : "rgba(255,130,130,0.82)", padding: "10px 12px", borderRadius: 12, background: premium.isPro ? "rgba(255,255,255,0.05)" : "rgba(255,60,60,0.07)", border: `1px solid ${premium.isPro ? "rgba(255,255,255,0.09)" : "rgba(255,80,80,0.18)"}` }}>
                {premium.message}
              </div>
            )}
            {premium.validating && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Skeleton width="46%" height={10} radius={6} />
                <Skeleton width="100%" height={9} radius={6} />
              </div>
            )}
            <GlassButton variant="primary" size="lg" onClick={submit} disabled={!licenseKey.trim() || premium.validating}>
              Verify license
            </GlassButton>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
