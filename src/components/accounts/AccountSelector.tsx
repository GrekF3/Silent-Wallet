"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlassButton } from "@/components/ui/GlassButton";
import { Icons } from "@/components/ui/Icon";
import { useWalletAccounts } from "@/lib/accounts/storage";
import { usePremium } from "@/lib/premium/entitlements";
import { useWalletStore } from "@/lib/store";
import { shortenAddress } from "@/lib/utils";

export function AccountSelector({ compact = false }: { compact?: boolean }) {
  const accounts = useWalletAccounts();
  const premium = usePremium();
  const { addresses, activeAccountIndex, setActiveAccountIndex, sessionMode, watchName, setView } = useWalletStore();
  const [open, setOpen] = useState(false);
  const activeAccount = useMemo(() => accounts.find((account) => account.index === activeAccountIndex) ?? accounts[0], [accounts, activeAccountIndex]);
  const activeAddress = addresses?.ethereum || addresses?.bitcoin || addresses?.solana || "";
  const selectableAccounts = accounts.filter((account) => !account.archived);
  const proAccounts = premium.hasEntitlement("pro.accounts.multiple");

  if (sessionMode === "watch") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: compact ? "0 10px" : "8px 11px", minHeight: compact ? 34 : 40, borderRadius: 13, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.045)", color: "rgba(255,255,255,0.50)" }}>
        <Icons.eye size={14} />
        <span style={{ fontSize: compact ? 12 : 13, fontWeight: 650 }}>{watchName ?? "Observer"}</span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minWidth: compact ? 0 : 190 }}>
      <button
        className="account-selector-button"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{
          width: "100%",
          minHeight: compact ? 34 : 42,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: compact ? "0 10px" : "8px 12px",
          borderRadius: compact ? 12 : 14,
          border: "1px solid rgba(255,255,255,0.10)",
          borderTop: "1px solid rgba(255,255,255,0.18)",
          background: open ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.052)",
          color: "#fff",
          cursor: "pointer",
          font: "inherit",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ width: compact ? 26 : 30, height: compact ? 26 : 30, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Icons.wallet size={compact ? 13 : 14} color="rgba(255,255,255,0.56)" />
        </span>
        <span className="account-selector-copy" style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
          <span style={{ display: "block", fontSize: compact ? 12 : 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeAccount?.name ?? "Main"}</span>
          {!compact && activeAddress && (
            <span style={{ display: "block", marginTop: 1, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.30)" }}>{shortenAddress(activeAddress, 4)}</span>
          )}
        </span>
        <Icons.chevronD className="account-selector-chevron" size={13} color="rgba(255,255,255,0.34)" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 120,
              width: "min(360px, calc(100vw - 24px))",
              padding: 10,
              borderRadius: 18,
              background: "rgba(12,12,12,0.97)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderTop: "1px solid rgba(255,255,255,0.20)",
              boxShadow: "0 18px 56px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.08)",
              backdropFilter: "blur(40px)",
            }}
          >
            <div style={{ padding: "4px 4px 10px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Active account</div>
              <div style={{ marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.30)" }}>Switching accounts changes the visible addresses and signing key.</div>
            </div>
            {selectableAccounts.map((account) => {
              const recovered = account.labels.includes("recovered");
              const locked = account.index !== 0 && !proAccounts && !recovered;
              const active = account.index === activeAccountIndex;
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      setView("premium");
                    } else {
                      setActiveAccountIndex(account.index);
                    }
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 11px",
                    borderRadius: 13,
                    border: active ? "1px solid rgba(255,255,255,0.16)" : "1px solid transparent",
                    background: active ? "rgba(255,255,255,0.08)" : "transparent",
                    color: "#fff",
                    cursor: "pointer",
                    font: "inherit",
                    textAlign: "left",
                  }}
                >
                  <span style={{ width: 30, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                    {locked ? <Icons.lock size={13} color="rgba(255,255,255,0.38)" /> : <Icons.wallet size={13} color="rgba(255,255,255,0.46)" />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.name}</span>
                    <span style={{ display: "block", marginTop: 1, fontSize: 11, color: "rgba(255,255,255,0.30)" }}>{locked ? "Silent Pro" : account.purpose}</span>
                  </span>
                  {active && <Icons.check size={14} color="rgba(255,255,255,0.58)" />}
                </button>
              );
            })}
            <div style={{ padding: "10px 4px 2px" }}>
              <GlassButton variant="default" size="sm" style={{ width: "100%" }} onClick={() => { setOpen(false); setView("accounts"); }}>
                Manage accounts
              </GlassButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
