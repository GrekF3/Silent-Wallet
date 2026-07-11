"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Icons }       from "@/components/ui/Icon";
import { useWalletStore } from "@/lib/store";
import { useToast }    from "@/components/ui/Toast";
import { bitcoinAddressForNetwork } from "@/lib/bitcoin";
import { AccountSelector } from "@/components/accounts/AccountSelector";
import { useI18n } from "@/lib/i18n";

const NETWORKS = [
  { id: "ethereum" as const, label: "Ethereum", symbol: "ETH"   },
  { id: "bitcoin"  as const, label: "Bitcoin",  symbol: "BTC"   },
  { id: "bsc"      as const, label: "BNB Chain",symbol: "BNB"   },
  { id: "solana"   as const, label: "Solana",   symbol: "SOL"   },
];

const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", display: "block", marginBottom: 10 };

function QRGrid({ seed, size = 168 }: { seed: string; size?: number }) {
  const cells = 21, cell = size / cells;
  const bit = (r: number, c: number): boolean => {
    const inF = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    const onF  = (br: number, bc: number) => r === br || r === br+6 || c === bc || c === bc+6 || (r >= br+2 && r <= br+4 && c >= bc+2 && c <= bc+4);
    if (inF(0,0))         return onF(0,0);
    if (inF(0,cells-7))   return onF(0,cells-7);
    if (inF(cells-7,0))   return onF(cells-7,0);
    const i = r*cells+c, ch = seed.charCodeAt(i % seed.length);
    return (ch ^ (r*7) ^ (c*13) ^ i) % 3 !== 0;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({length:cells},(_,r)=>Array.from({length:cells},(_,c)=>
        bit(r,c)?<rect key={`${r}-${c}`} x={c*cell+.5} y={r*cell+.5} width={cell-1} height={cell-1} rx={1.2} fill="white"/>:null
      ))}
    </svg>
  );
}

export function ReceiveView() {
  const { t } = useI18n();
  const { addresses, mnemonic, network: activeNetwork, activeAccountIndex, activeAddressIndexes } = useWalletStore();
  const toast = useToast();
  const [netIdx, setNetIdx] = useState(0);
  const network = NETWORKS[netIdx];
  const btcAddress = addresses
    ? (mnemonic ? bitcoinAddressForNetwork(mnemonic, activeNetwork, activeAccountIndex, activeAddressIndexes.bitcoin) : addresses.bitcoin)
    : "";

  const addressMap: Record<string, string> = {
    ethereum: addresses?.ethereum ?? "",
    bitcoin:  btcAddress,
    bsc:      addresses?.bsc      ?? "",
    solana:   addresses?.solana   ?? "",
  };
  const addr = addressMap[network.id];

  const copy = async () => {
    if (!addr) return;
    await navigator.clipboard.writeText(addr);
    toast(`${network.symbol} address copied`);
  };

  const share = async () => {
    if (!addr) return;
    const text = `${network.label} ${activeNetwork} address: ${addr}`;
    if (navigator.share) {
      await navigator.share({ title: "Silent Wallet address", text }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(addr);
    toast(`${network.symbol} address copied`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      style={{ padding: "36px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 480 }}>
      <div>
        <span style={LABEL}>{t("Deposit")}</span>
        <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.015em", color: "#fff" }}>{t("Receive")}</div>
      </div>
      {mnemonic && (
        <div>
          <span style={LABEL}>{t("Receiving account")}</span>
          <AccountSelector />
        </div>
      )}

      {/* Network selector */}
      <div style={{ display: "flex", padding: 3, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {NETWORKS.map((n, i) => {
          const active = netIdx === i;
          return (
            <div key={n.id} style={{ position: "relative", flex: 1 }}>
              {active && <motion.div layoutId="net-pill" transition={{ type: "spring", stiffness: 420, damping: 36 }} style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)", borderTop: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)" }} />}
              <button onClick={() => setNetIdx(i)} style={{ position: "relative", zIndex: 1, width: "100%", height: 36, borderRadius: 12, border: "none", background: "transparent", fontSize: 13, fontWeight: 500, fontFamily: "inherit", color: active ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer", transition: "color 0.15s" }}>
                {n.symbol}
              </button>
            </div>
          );
        })}
      </div>

      {/* QR Card */}
      <GlassCard elevated>
        <div style={{ padding: "24px 24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <motion.div key={netIdx} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
            style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.10)", borderTop: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)" }}>
            <QRGrid seed={addr || "silent"} size={168} />
          </motion.div>

          <div style={{ textAlign: "center", width: "100%" }}>
            <span style={{ ...LABEL, marginBottom: 8 }}>{activeNetwork} {network.label} address</span>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.50)", wordBreak: "break-all", lineHeight: 1.6 }}>
              {addr || t("Address unavailable")}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <GlassButton variant="default" size="md" style={{ flex: 1 }} onClick={copy} disabled={!addr}>
              <Icons.copy size={13} /> {t("Copy")}
            </GlassButton>
            <GlassButton variant="ghost" size="md" style={{ flex: 1 }} onClick={share} disabled={!addr}>
              <Icons.share size={13} /> {t("Share")}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", textAlign: "center", lineHeight: 1.5 }}>
        {t("Only send")} {network.symbol} {t("assets to this address.")}
      </div>
    </motion.div>
  );
}
