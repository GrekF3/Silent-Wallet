"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput }  from "@/components/ui/GlassInput";
import { Icons }       from "@/components/ui/Icon";
import { useWalletStore } from "@/lib/store";
import { formatUSD, formatCrypto } from "@/lib/utils";
import { derivePrivateKey } from "@/lib/wallet";
import { sendEth, sendBnb, estimateGasUSD } from "@/lib/chains";
import { useToast } from "@/components/ui/Toast";

type Step = "form" | "confirm" | "success";

const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", display: "block", marginBottom: 10 };
const TITLE: React.CSSProperties = { fontSize: 28, fontWeight: 300, letterSpacing: "-0.015em", color: "#fff" };
const ROW  : React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" };
const ROW_L: React.CSSProperties = { ...ROW, borderBottom: "none" };

export function SendView() {
  const { assets, mnemonic, network, setView } = useWalletStore();
  const toast = useToast();

  const [step,   setStep]   = useState<Step>("form");
  const [idx,    setIdx]    = useState(0);
  const [amount, setAmount] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [txHash, setTxHash] = useState("");
  const [gasFee, setGasFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const asset     = assets[idx];
  const amountNum = parseFloat(amount) || 0;
  const amountUSD = asset ? amountNum * asset.priceUSD : 0;
  const isEVM     = asset?.network === "ethereum" || asset?.network === "bsc";
  const isValid   = amountNum > 0 && asset && amountNum <= asset.balance && toAddr.length > 10;

  const goConfirm = async () => {
    setError("");
    if (isEVM && asset.network === "ethereum") {
      const fee = await estimateGasUSD(asset.priceUSD, network).catch(() => 1.5);
      setGasFee(fee);
    }
    setStep("confirm");
  };

  const send = async () => {
    if (!mnemonic || !asset) return;
    setLoading(true);
    setError("");
    try {
      const privKey = derivePrivateKey(mnemonic);
      let hash: string;
      if (asset.network === "ethereum") {
        hash = await sendEth({ privateKey: privKey, to: toAddr as `0x${string}`, amount, net: network });
      } else if (asset.network === "bsc") {
        hash = await sendBnb({ privateKey: privKey, to: toAddr as `0x${string}`, amount, net: network });
      } else {
        throw new Error("BTC sending via this app is coming soon");
      }
      setTxHash(hash);
      setStep("success");
      toast("Transaction broadcast!");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  /* ── Success ───────────────────────────────────────────────── */
  if (step === "success") return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 24 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 320, width: "100%" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderTop: "1px solid rgba(255,255,255,0.26)", boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
            <motion.path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.2 }} />
          </svg>
        </div>
        <div style={{ fontSize: 28, fontWeight: 300, color: "#fff", letterSpacing: "-0.015em", marginBottom: 8 }}>Sent</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{amount} {asset.symbol}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.24)", marginBottom: 8, fontVariantNumeric: "tabular-nums" }}>{formatUSD(amountUSD)}</div>
        {txHash && (
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.30)", marginBottom: 32, wordBreak: "break-all", padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {txHash.slice(0, 20)}…{txHash.slice(-10)}
          </div>
        )}
        <GlassButton variant="default" size="lg" style={{ width: "100%" }}
          onClick={() => { setStep("form"); setAmount(""); setToAddr(""); setTxHash(""); setView("dashboard"); }}>
          Back to Wallet
        </GlassButton>
      </motion.div>
    </div>
  );

  /* ── Confirm ───────────────────────────────────────────────── */
  if (step === "confirm") return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <AnimatePresence mode="wait">
        <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          style={{ maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <span style={LABEL}>Review</span>
            <div style={TITLE}>Confirm Send</div>
          </div>

          <GlassCard elevated style={{ padding: "4px 20px" }}>
            {[
              { label: "Asset",   value: `${asset.symbol} · ${asset.name}` },
              { label: "Amount",  value: `${amount} ${asset.symbol}` },
              { label: "Value",   value: formatUSD(amountUSD) },
            ].map((r, i, arr) => (
              <div key={r.label} style={i === arr.length - 1 ? ROW_L : ROW}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{r.label}</span>
                <span style={{ fontSize: 14, color: "#fff", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
              </div>
            ))}
          </GlassCard>

          <GlassCard elevated style={{ padding: "4px 20px" }}>
            {[
              { label: "To",          value: `${toAddr.slice(0,10)}…${toAddr.slice(-8)}`, mono: true },
              { label: "Network fee", value: gasFee ? `≈ ${formatUSD(gasFee)}` : "≈ $1.50",          mono: false },
              { label: "Network",     value: asset.network === "bsc" ? "BSC" : asset.network.charAt(0).toUpperCase() + asset.network.slice(1), mono: false },
            ].map((r, i, arr) => (
              <div key={r.label} style={i === arr.length - 1 ? ROW_L : ROW}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{r.label}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)", fontFamily: r.mono ? "monospace" : "inherit", fontWeight: r.mono ? 400 : 500 }}>{r.value}</span>
              </div>
            ))}
          </GlassCard>

          {error && <div style={{ fontSize: 13, color: "rgba(255,100,100,0.80)", padding: "10px 14px", borderRadius: 10, background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.15)" }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <GlassButton variant="ghost" size="lg" style={{ flex: 1 }} onClick={() => { setStep("form"); setError(""); }} disabled={loading}>Back</GlassButton>
            <GlassButton variant="primary" size="lg" style={{ flex: 1 }} onClick={send} disabled={loading}>
              {loading ? "Broadcasting…" : "Confirm & Send"}
            </GlassButton>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  /* ── Form ──────────────────────────────────────────────────── */
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      style={{ padding: "36px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 540 }}>
      <div>
        <span style={LABEL}>Transfer</span>
        <div style={TITLE}>Send</div>
      </div>

      {/* Asset selector */}
      <div>
        <span style={LABEL}>Asset</span>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${assets.length}, 1fr)`, gap: 8 }}>
          {assets.map((a, i) => {
            const active = idx === i;
            return (
              <motion.button key={a.id} onClick={() => setIdx(i)} whileTap={{ scale: 0.96 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: "12px 8px", borderRadius: 16, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s, border-color 0.15s",
                  background:  active ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)",
                  border:      `1px solid ${active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
                  borderTop:   `1px solid ${active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.13)"}`,
                  boxShadow:   active ? "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)" : "0 2px 6px rgba(0,0,0,0.3)",
                  color: active ? "#fff" : "rgba(255,255,255,0.35)",
                }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{a.symbol}</span>
                <span style={{ fontSize: 10, fontVariantNumeric: "tabular-nums", color: active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.22)" }}>
                  {formatCrypto(a.balance, 4)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <GlassInput label="Recipient address" placeholder={isEVM ? "0x…" : "bc1…"} value={toAddr} onChange={(e) => setToAddr(e.target.value)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <GlassInput label="Amount" placeholder="0.00" type="number" suffix={asset.symbol} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.24)", fontVariantNumeric: "tabular-nums" }}>≈ {formatUSD(amountUSD)}</span>
          <button onClick={() => setAmount(String(asset.balance))} style={{ fontSize: 12, color: "rgba(255,255,255,0.34)", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}>
            Max {formatCrypto(asset.balance, 5)} {asset.symbol}
          </button>
        </div>
      </div>

      {!isEVM && (
        <div style={{ fontSize: 13, color: "rgba(255,200,100,0.70)", padding: "10px 14px", borderRadius: 10, background: "rgba(255,180,0,0.06)", border: "1px solid rgba(255,180,0,0.15)", display: "flex", gap: 8, alignItems: "center" }}>
          <Icons.info size={14} color="rgba(255,200,100,0.70)" /> BTC sending via external signer coming soon.
        </div>
      )}

      <GlassButton variant="primary" size="lg" style={{ width: "100%" }} disabled={!isValid || !isEVM} onClick={goConfirm}>
        Continue <Icons.chevronR size={14} color="#000" />
      </GlassButton>
    </motion.div>
  );
}
