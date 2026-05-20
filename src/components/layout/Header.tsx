"use client";

import { motion } from "framer-motion";
import { useWalletStore, type View } from "@/lib/store";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AccountSelector } from "@/components/accounts/AccountSelector";

type NavItem = { id: View; label: string };
const NAV: NavItem[] = [
  { id: "dashboard", label: "Overview"  },
  { id: "ecosystem", label: "Web3" },
  { id: "accounts",  label: "Accounts" },
  { id: "transfer",  label: "Transfer"  },
  { id: "history",   label: "History"   },
  { id: "premium",   label: "Pro"       },
  { id: "settings",  label: "Settings"  },
];

export function Header() {
  const { view, setView, addresses, sessionMode } = useWalletStore();
  const activeNav = (view === "asset" ? "dashboard" : view) as View;
  const navItems = sessionMode === "watch" ? NAV.filter((item) => item.id !== "transfer") : NAV;

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
          <AccountSelector compact />
        </div>
      )}
    </header>
  );
}
