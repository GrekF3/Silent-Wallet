"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore, type View } from "@/lib/store";
import { Icons } from "@/components/ui/Icon";
import { shortenAddress } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type NavItem = { id: View; label: string };
const NAV: NavItem[] = [
  { id: "dashboard", label: "Overview"  },
  { id: "transfer",  label: "Transfer"  },
  { id: "history",   label: "History"   },
  { id: "settings",  label: "Settings"  },
];

export function Header() {
  const { view, setView, addresses, network, setNetwork, clearSession } = useWalletStore();
  const toast   = useToast();
  const addr    = addresses?.ethereum ?? "";
  const isTest  = network === "testnet";
  const activeNav = (view === "asset" ? "dashboard" : view) as View;

  return (
    <header style={{
      position:       "sticky",
      top:            0,
      zIndex:         50,
      display:        "flex",
      alignItems:     "center",
      height:         56,
      padding:        "0 20px",
      gap:            8,
      background:     "rgba(6,6,6,0.85)",
      backdropFilter: "blur(48px) saturate(180%)",
      WebkitBackdropFilter: "blur(48px) saturate(180%)",
      borderBottom:   "1px solid rgba(255,255,255,0.07)",
      boxShadow:      "0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)",
    }}>
      {/* Logo */}
      <button
        onClick={() => setView("dashboard")}
        style={{ display:"flex", alignItems:"center", gap:9, cursor:"pointer", background:"none", border:"none", flexShrink:0, padding:"0 4px 0 0" }}
      >
        <div style={{
          width:36, height:36, borderRadius:11, background:"#fff", flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 2px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}>
          <span style={{ color:"#000", fontWeight:800, fontSize:15, letterSpacing:"-0.04em" }}>S</span>
        </div>
        <span style={{ fontSize:15, fontWeight:600, color:"rgba(255,255,255,0.85)", letterSpacing:"-0.02em" }}>
          Silent
        </span>
      </button>

      {/* Divider */}
      <div style={{ width:1, height:22, background:"rgba(255,255,255,0.10)", margin:"0 8px", flexShrink:0 }} />

      {/* Nav */}
      <nav style={{ display:"flex", alignItems:"center", gap:2, flex:1 }}>
        {NAV.map((item) => {
          const active = activeNav === item.id;
          return (
            <div key={item.id} style={{ position:"relative" }}>
              {active && (
                <motion.div
                  layoutId="header-pill"
                  transition={{ type:"spring", stiffness:400, damping:36 }}
                  style={{
                    position:"absolute", inset:0, borderRadius:9,
                    background:"rgba(255,255,255,0.09)",
                    border:"1px solid rgba(255,255,255,0.12)",
                    borderTop:"1px solid rgba(255,255,255,0.20)",
                    boxShadow:"inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                />
              )}
              <button
                onClick={() => setView(item.id)}
                style={{
                  position:"relative", zIndex:1,
                  padding:"6px 13px", borderRadius:9,
                  border:"none", background:"transparent", cursor:"pointer",
                  fontSize:13, fontWeight:500, fontFamily:"inherit",
                  color: active ? "#fff" : "rgba(255,255,255,0.38)",
                  transition:"color 0.15s",
                  whiteSpace:"nowrap",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.70)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.38)"; }}
              >
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Right side */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>

        {/* Testnet toggle */}
        <button
          onClick={() => { setNetwork(isTest ? "mainnet" : "testnet"); toast(isTest ? "Switched to Mainnet" : "Switched to Testnet"); }}
          style={{
            display:"flex", alignItems:"center", gap:5,
            padding:"4px 10px", borderRadius:8, cursor:"pointer",
            fontFamily:"inherit", fontSize:11, fontWeight:600,
            letterSpacing:"0.04em", textTransform:"uppercase",
            border:`1px solid ${isTest ? "rgba(251,191,36,0.30)" : "rgba(255,255,255,0.10)"}`,
            background: isTest ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.05)",
            color: isTest ? "rgba(251,191,36,0.85)" : "rgba(255,255,255,0.30)",
            transition:"all 0.15s",
          }}
        >
          <div style={{ width:5, height:5, borderRadius:"50%", background: isTest ? "rgba(251,191,36,0.85)" : "rgba(120,220,90,0.85)" }} />
          {isTest ? "Testnet" : "Mainnet"}
        </button>

        {/* Address */}
        {addr && (
          <button
            onClick={() => { navigator.clipboard.writeText(addr); toast("Address copied"); }}
            style={{
              display:"flex", alignItems:"center", gap:6, padding:"5px 11px", borderRadius:9,
              cursor:"pointer", fontFamily:"monospace", fontSize:12,
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)",
              color:"rgba(255,255,255,0.40)", transition:"color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.70)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.40)")}
          >
            <Icons.wallet size={13} />
            {shortenAddress(addr, 4)}
          </button>
        )}

        {/* Lock */}
        <button
          onClick={() => clearSession()}
          title="Lock wallet"
          style={{
            width:34, height:34, borderRadius:10, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)",
            color:"rgba(255,255,255,0.28)", transition:"all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
        >
          <Icons.lock size={15} />
        </button>
      </div>
    </header>
  );
}
