"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWalletStore, type View } from "@/lib/store";
import { Icons } from "@/components/ui/Icon";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { shortenAddress } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type NavItem = { id: View; label: string };
const NAV: NavItem[] = [
  { id: "dashboard", label: "Overview"  },
  { id: "ecosystem", label: "Web3" },
  { id: "transfer",  label: "Transfer"  },
  { id: "history",   label: "History"   },
  { id: "settings",  label: "Settings"  },
];

const ADDRESS_LABELS = {
  ethereum: "Ethereum",
  bsc: "BNB Chain",
  bitcoin: "Bitcoin",
  solana: "Solana",
} as const;

const EMPTY_EVM = "0x0000000000000000000000000000000000000000";

export function Header() {
  const { view, setView, addresses, sessionMode, watchName } = useWalletStore();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const activeNav = (view === "asset" ? "dashboard" : view) as View;
  const navItems = sessionMode === "watch" ? NAV.filter((item) => item.id !== "transfer") : NAV;
  const entries = addresses
    ? (Object.entries(ADDRESS_LABELS) as [keyof typeof ADDRESS_LABELS, string][])
      .filter(([key]) => {
        const value = addresses[key];
        return value && value !== EMPTY_EVM;
      })
    : [];
  const primaryEntry = entries.find(([key]) => key === "ethereum") ?? entries[0];
  const primaryAddress = primaryEntry?.[0] === "bsc" ? addresses?.bsc
    : primaryEntry?.[0] === "bitcoin" ? addresses?.bitcoin
    : primaryEntry?.[0] === "solana" ? addresses?.solana
    : addresses?.ethereum;

  const copyAddress = async (address: string, label: string) => {
    await navigator.clipboard.writeText(address);
    toast(`${label} address copied`);
    setOpen(false);
  };

  return (
    <header className="wallet-topbar" style={{
      position:       "sticky",
      top:            0,
      zIndex:         50,
      display:        "flex",
      alignItems:     "center",
      height:         56,
      padding:        "0 20px",
      gap:            14,
      background:     "rgba(6,6,6,0.82)",
      backdropFilter: "blur(48px) saturate(180%)",
      WebkitBackdropFilter: "blur(48px) saturate(180%)",
      borderBottom:   "1px solid rgba(255,255,255,0.07)",
      boxShadow:      "0 1px 0 rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.28)",
    }}>
      <button
        onClick={() => setView("dashboard")}
        className="topbar-brand"
        style={{ display: "flex", alignItems: "center", cursor: "pointer", background: "none", border: "none", flexShrink: 0, padding: 0 }}
        aria-label="Open Silent overview"
      >
        <BrandLogo size={30} label="Silent" />
        {sessionMode === "watch" && (
          <span className="topbar-watch-badge" style={{ marginLeft: 9, padding: "2px 7px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.42)", fontSize: 10, fontWeight: 650 }}>
            Watch
          </span>
        )}
      </button>

      <nav className="desktop-nav" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
        {navItems.map((item) => {
          const active = activeNav === item.id;
          return (
            <div key={item.id} style={{ position: "relative" }}>
              {active && (
                <motion.div
                  layoutId="header-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 36 }}
                  style={{
                    position: "absolute", inset: 0, borderRadius: 10,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.11)",
                    borderTop: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
                  }}
                />
              )}
              <button
                onClick={() => setView(item.id)}
                style={{
                  position: "relative", zIndex: 1,
                  padding: "6px 13px", borderRadius: 10,
                  border: "none", background: "transparent", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                  color: active ? "#fff" : "rgba(255,255,255,0.36)",
                  transition: "color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>

      {addresses && (
        <div className="topbar-actions" style={{ position: "relative", marginLeft: "auto", flexShrink: 0 }}>
          <button
            className="topbar-address"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Wallet addresses"
            aria-expanded={open}
            style={{
              minWidth: 36, height: 36, borderRadius: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 7,
              padding: primaryAddress ? "0 11px" : 0,
              background: open ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.055)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderTop: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.58)",
              fontFamily: "inherit",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            <Icons.wallet size={14} />
            {primaryAddress && (
              <span className="topbar-address-text" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.54)", lineHeight: 1 }}>
                {shortenAddress(primaryAddress, 3)}
              </span>
            )}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="topbar-popover"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 10px)",
                  width: "min(340px, calc(100vw - 24px))",
                  borderRadius: 16,
                  background: "rgba(12,12,12,0.97)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderTop: "1px solid rgba(255,255,255,0.20)",
                  boxShadow: "0 18px 56px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.08)",
                  backdropFilter: "blur(40px)",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 12, fontWeight: 650, color: "#fff" }}>{sessionMode === "watch" ? (watchName ?? "Observer") : "Wallet addresses"}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
                    {sessionMode === "watch" ? "Watch-only address" : "Copy an address for a specific network"}
                  </div>
                </div>
                {entries.map(([key, label]) => {
                  const value = addresses[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => copyAddress(value, label)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        color: "#fff",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                        <Icons.copy size={14} color="rgba(255,255,255,0.44)" />
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.86)" }}>{label}</span>
                        <span style={{ display: "block", marginTop: 2, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.34)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {shortenAddress(value, 7)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </header>
  );
}
