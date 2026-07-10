"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Icons }       from "@/components/ui/Icon";
import { useWalletStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { deleteWallet } from "@/lib/storage";
import { PrivacyPanel } from "@/components/privacy/PrivacyPanel";
import { ExportPanel } from "@/components/exports/ExportPanel";
import { PremiumBadge } from "@/components/premium/PremiumBadge";

const T = {
  label: { fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)", marginBottom: 10, display: "block" } as React.CSSProperties,
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <motion.button onClick={onChange} whileTap={{ scale: 0.93 }} style={{
      position: "relative", width: 44, height: 26, borderRadius: 13, cursor: "pointer", flexShrink: 0,
      border: `1px solid ${on ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.10)"}`,
      borderTop: `1px solid ${on ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.18)"}`,
      background: on ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)",
      boxShadow: on ? "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18)" : "0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
      transition: "background .2s, border-color .2s",
    }}>
      <motion.div
        animate={{ left: on ? 21 : 3 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
      />
    </motion.button>
  );
}

/* ── Export phrase modal ─────────────────────────────────────────── */
function PhraseModal({ phrase, onClose }: { phrase: string; onClose: () => void }) {
  const words  = phrase.trim().split(/\s+/);
  const toast  = useToast();
  const [show, setShow] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: "rgba(14,14,14,0.98)", border: "1px solid rgba(255,255,255,0.12)", borderTop: "1px solid rgba(255,255,255,0.20)", borderRadius: 22, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ ...T.label, marginBottom: 4 }}>Backup</span>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#fff" }}>Secret Recovery Phrase</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.40)", display: "flex" }}>
            <Icons.x size={20} />
          </button>
        </div>

        <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.18)", display: "flex", gap: 8 }}>
          <Icons.shield size={14} color="rgba(255,100,100,0.75)" />
          <span style={{ fontSize: 12, color: "rgba(255,100,100,0.80)", lineHeight: 1.5 }}>
            Never share this phrase. Anyone with it has full control of your wallet.
          </span>
        </div>

        {/* Blur overlay until revealed */}
        <div style={{ position: "relative" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))", gap: 8,
            filter: show ? "none" : "blur(10px)",
            transition: "filter 0.3s",
            userSelect: show ? "text" : "none",
          }}>
            {words.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{w}</span>
              </div>
            ))}
          </div>
          {!show && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GlassButton variant="default" size="md" onClick={() => setShow(true)}>
                <Icons.eye size={14} /> Reveal Phrase
              </GlassButton>
            </div>
          )}
        </div>

        {show && (
          <GlassButton variant="ghost" size="md" onClick={() => { navigator.clipboard.writeText(phrase); toast("Phrase copied — keep it safe!"); }}>
            <Icons.copy size={13} /> Copy to clipboard
          </GlassButton>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── Reset confirm modal ─────────────────────────────────────────── */
function ResetModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 380, background: "rgba(14,14,14,0.98)", border: "1px solid rgba(255,80,80,0.22)", borderTop: "1px solid rgba(255,80,80,0.35)", borderRadius: 22, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
      >
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,60,60,0.09)", border: "1px solid rgba(255,80,80,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.shield size={22} color="rgba(255,100,100,0.75)" />
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, color: "#fff" }}>Reset Wallet?</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.6, maxWidth: 300 }}>
            This permanently deletes your encrypted wallet from this device. Make sure you have your secret phrase backed up.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <GlassButton variant="ghost" size="lg" style={{ flex: 1 }} onClick={onClose}>Cancel</GlassButton>
          <GlassButton variant="ghost" size="lg" style={{ flex: 1, color: "rgba(255,100,100,0.80)", border: "1px solid rgba(255,80,80,0.22)" }} onClick={onConfirm}>
            Reset
          </GlassButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

type SettingsSection = "privacy" | "exports" | "security" | null;

function SettingsRow({
  icon,
  title,
  body,
  onClick,
  right,
  danger = false,
}: {
  icon: keyof typeof Icons;
  title: string;
  body?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  const Icon = Icons[icon];
  const content = (
    <>
      <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: danger ? "rgba(255,60,60,0.07)" : "rgba(255,255,255,0.05)", border: `1px solid ${danger ? "rgba(255,80,80,0.18)" : "rgba(255,255,255,0.09)"}`, borderTop: `1px solid ${danger ? "rgba(255,80,80,0.28)" : "rgba(255,255,255,0.16)"}` }}>
        <Icon size={14} color={danger ? "rgba(255,100,100,0.70)" : "rgba(255,255,255,0.40)"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: danger ? "rgba(255,90,90,0.82)" : "rgba(255,255,255,0.85)" }}>{title}</div>
        {body && <div style={{ fontSize: 11, color: danger ? "rgba(255,100,100,0.40)" : "rgba(255,255,255,0.28)", marginTop: 2, lineHeight: 1.45 }}>{body}</div>}
      </div>
      {right ?? (onClick ? <Icons.chevronR size={14} color={danger ? "rgba(255,100,100,0.25)" : "rgba(255,255,255,0.22)"} /> : null)}
    </>
  );
  const rowStyle: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "14px 18px", cursor: onClick ? "pointer" : "default", border: 0, borderBottom: "1px solid rgba(255,255,255,0.05)", background: "transparent", font: "inherit", textAlign: "left" };

  if (!onClick) {
    return (
      <motion.div style={rowStyle}>
        {content}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      whileHover={{ backgroundColor: danger ? "rgba(255,60,60,0.04)" : "rgba(255,255,255,0.025)" }}
      onClick={onClick}
      style={rowStyle}
    >
      {content}
    </motion.button>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <GlassCard elevated style={{ overflow: "hidden", borderRadius: 22 }}>
      {children}
    </GlassCard>
  );
}

function SecurityPanel({
  watchOnly,
  onShowPhrase,
  onShowReset,
}: {
  watchOnly: boolean;
  onShowPhrase: () => void;
  onShowReset: () => void;
}) {
  if (watchOnly) {
    return (
      <GlassCard elevated style={{ padding: 18, borderRadius: 22 }}>
        <div style={{ fontSize: 16, fontWeight: 650, color: "#fff" }}>Observer mode</div>
        <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.5 }}>
          This session can view public activity, but it cannot sign transactions.
        </div>
      </GlassCard>
    );
  }

  return (
    <SectionCard>
      <SettingsRow icon="key" title="Export Secret Phrase" body="View your 12-word recovery phrase." onClick={onShowPhrase} />
      <SettingsRow icon="shield" title="Reset Wallet" body="Delete wallet from this device." onClick={onShowReset} danger />
    </SectionCard>
  );
}

export function SettingsView() {
  const { mnemonic, clearSession, network, setNetwork, sessionMode, hideZeroBalances, setHideZeroBalances, setView } = useWalletStore();
  const watchOnly = sessionMode === "watch";

  const [showPhrase, setShowPhrase] = useState(false);
  const [showReset,  setShowReset]  = useState(false);
  const [section, setSection] = useState<SettingsSection>(null);

  const handleReset = async () => {
    await deleteWallet();
    clearSession();
    setShowReset(false);
  };

  const handleLock = () => clearSession();

  return (
    <>
      <AnimatePresence>
        {showPhrase && mnemonic && <PhraseModal phrase={mnemonic} onClose={() => setShowPhrase(false)} />}
        {showReset  && <ResetModal onConfirm={handleReset} onClose={() => setShowReset(false)} />}
      </AnimatePresence>

      <motion.div
        className="view-shell"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
        style={{ padding: "36px 28px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 560 }}
      >
        <div>
          <span style={T.label}>Account</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.015em", color: "#fff" }}>Settings</div>
            <PremiumBadge />
          </div>
        </div>

        <div>
          <span style={T.label}>Basics</span>
          <SectionCard>
            <SettingsRow
              icon="globe"
              title="Active network"
              body={network === "mainnet" ? "Mainnet assets and activity." : "Testnet mode for safe testing."}
              right={(
              <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {(["mainnet", "testnet"] as const).map((n) => (
                  <button key={n} onClick={() => setNetwork(n)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, background: network === n ? "rgba(255,255,255,0.10)" : "transparent", color: network === n ? "#fff" : "rgba(255,255,255,0.32)", transition: "all 0.15s" }}>
                    {n.charAt(0).toUpperCase() + n.slice(1)}
                  </button>
                ))}
              </div>
              )}
            />
            <SettingsRow icon="eye" title="Hide zero balances" body="Keep asset lists compact." right={<Toggle on={hideZeroBalances} onChange={() => setHideZeroBalances(!hideZeroBalances)} />} />
          </SectionCard>
        </div>

        <div>
          <span style={T.label}>Wallet</span>
          <SectionCard>
            {[
              { view: "accounts" as const, icon: "wallet" as const, title: "Accounts", body: "Accounts, addresses, and separation." },
              { view: "addressBook" as const, icon: "key" as const, title: "Address Book", body: "Local recipient labels." },
              { view: "learn" as const, icon: "help" as const, title: "Academy", body: "Short Web3 explanations." },
              { view: "premium" as const, icon: "lock" as const, title: "Silent Pro", body: "Advanced custody operations." },
            ].map((item) => <SettingsRow key={item.view} icon={item.icon} title={item.title} body={item.body} onClick={() => setView(item.view)} />)}
          </SectionCard>
        </div>

        <div>
          <span style={T.label}>Tools</span>
          <SectionCard>
            <SettingsRow icon="eyeOff" title="Privacy controls" body="Screen privacy, helper mode, and provider notices." onClick={() => setSection(section === "privacy" ? null : "privacy")} />
            <SettingsRow icon="download" title="Exports" body="CSV exports for accounts, contacts, history, and portfolio." onClick={() => setSection(section === "exports" ? null : "exports")} />
            <SettingsRow icon="shield" title={watchOnly ? "Observer security" : "Recovery and reset"} body={watchOnly ? "Signing is disabled in observer mode." : "Secret phrase and device reset."} onClick={() => setSection(section === "security" ? null : "security")} />
          </SectionCard>
        </div>

        <AnimatePresence mode="wait">
          {section && (
            <motion.div key={section} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
              {section === "privacy" && <PrivacyPanel />}
              {section === "exports" && <ExportPanel />}
              {section === "security" && <SecurityPanel watchOnly={watchOnly} onShowPhrase={() => setShowPhrase(true)} onShowReset={() => setShowReset(true)} />}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLock}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 16, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderTop: "1px solid rgba(255,255,255,0.14)", fontFamily: "inherit", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.50)", transition: "background 0.15s" }}
        >
          <Icons.lock size={14} color="rgba(255,255,255,0.40)" />
          {watchOnly ? "Close Observer" : "Lock Wallet"}
        </motion.button>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.14)", textAlign: "center", letterSpacing: "0.04em", paddingBottom: 16 }}>
          Silent Wallet
        </div>
      </motion.div>
    </>
  );
}
