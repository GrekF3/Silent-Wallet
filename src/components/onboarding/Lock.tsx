"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput }  from "@/components/ui/GlassInput";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { loadMnemonic, deleteWallet } from "@/lib/storage";
import { deriveAddresses } from "@/lib/wallet";
import { useWalletStore }  from "@/lib/store";
import { useI18n } from "@/lib/i18n";

export function Lock({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useI18n();
  const { setSession } = useWalletStore();
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const unlock = async () => {
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      const mnemonic  = await loadMnemonic(password);
      const addresses = deriveAddresses(mnemonic);
      setSession(mnemonic, addresses);
      onUnlock();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Wrong password"));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (confirm(t("This will delete your wallet. Make sure you have your seed phrase backed up."))) {
      deleteWallet();
      window.location.reload();
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#080808" }}>
      <div aria-hidden style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.013) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 24, position: "relative", zIndex: 1 }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <BrandLogo size={58} label="Silent Wallet" orientation="column" />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>{t("Enter password to unlock")}</div>
          </div>
        </div>

        <GlassCard elevated style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <GlassInput
            label={t("Password")}
            type="password"
            placeholder={t("Your wallet password")}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            autoFocus
          />
          {error && (
            <div style={{ fontSize: 13, color: "rgba(255,100,100,0.80)", padding: "10px 14px", borderRadius: 10, background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.15)" }}>
              {error}
            </div>
          )}
          <GlassButton variant="primary" size="lg" style={{ width: "100%" }} onClick={unlock} disabled={loading || !password}>
            {t(loading ? "Unlocking…" : "Unlock")}
          </GlassButton>
        </GlassCard>

        <button onClick={reset} style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", textAlign: "center", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", transition: "color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,100,100,0.60)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
        >
          {t("Forgot password? Reset wallet")}
        </button>
      </motion.div>
    </div>
  );
}
