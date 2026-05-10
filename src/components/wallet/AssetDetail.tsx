"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Icons }       from "@/components/ui/Icon";
import { useWalletStore } from "@/lib/store";
import { formatUSD, formatCrypto, formatDate } from "@/lib/utils";
import { CryptoIcon } from "@/components/ui/CryptoIcon";

const NET_COLOR: Record<string, string> = {
  ethereum: "rgba(98,88,255,0.12)", bitcoin: "rgba(247,147,26,0.12)",
  bsc:      "rgba(240,185,11,0.12)", solana:  "rgba(153,69,255,0.12)",
};
const NET_LABEL: Record<string, string> = { ethereum: "ETH", bitcoin: "BTC", bsc: "BSC", solana: "SOL" };

const PERIODS = ["1D","1W","1M","1Y"] as const;
type Period = typeof PERIODS[number];

function BigChart({ data, width = 580, height = 140, positive }: { data: number[]; width?: number; height?: number; positive?: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pad = 12;
  const w = width - pad * 2, h = height - pad * 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d    = `M ${pts.join(" L ")}`;
  const fill = `M ${pad},${pad+h} L ${pts.join(" L ")} L ${pad+w},${pad+h} Z`;
  const color = positive === false ? "rgba(255,100,100,0.8)" : "rgba(255,255,255,0.70)";

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive === false ? "rgba(255,100,100,0.14)" : "rgba(255,255,255,0.10)"} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#chartFill)" />
      <motion.path
        d={d} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      {/* Last point dot */}
      {(() => {
        const last = pts[pts.length - 1].split(",");
        return <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} />;
      })()}
    </svg>
  );
}

export function AssetDetail() {
  const { selectedAsset, closeAsset, setView, transactions } = useWalletStore();
  const [period, setPeriod] = useState<Period>("1W");
  if (!selectedAsset) return null;

  const a   = selectedAsset;
  const pos = a.change24h >= 0;
  const valueLabel = a.priceUSD > 0 ? formatUSD(a.balance * a.priceUSD) : (a.balance > 0 ? "Pricing..." : formatUSD(0));
  const txs = transactions.filter((t) => t.asset === a.symbol).slice(0, 4);

  return (
    <motion.div
      className="view-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{ padding: "28px 28px 48px", display: "flex", flexDirection: "column", gap: 22, maxWidth: 720 }}
    >
      {/* ── Back + Header ──────────────────────────────────────── */}
      <div className="asset-detail-header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={closeAsset}
          style={{
            width: 34, height: 34, borderRadius: 11, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
            borderTop: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.60)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.60)")}
        >
          <Icons.arrowLeft size={16} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 13, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 700, color: "#fff",
            background: NET_COLOR[a.network],
            border: "1px solid rgba(255,255,255,0.09)",
            borderTop: "1px solid rgba(255,255,255,0.20)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.09)",
          }}>
            <CryptoIcon symbol={a.symbol} image={a.image} size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>{a.name}</span>
              <span style={{
                fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 6,
                background: NET_COLOR[a.network], color: "rgba(255,255,255,0.40)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
                {NET_LABEL[a.network]}
              </span>
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>{a.desc}</span>
          </div>
        </div>

        <GlassButton variant="ghost" size="sm" style={{ padding: "0 10px" }}>
          <Icons.externalLink size={14} />
        </GlassButton>
      </div>

      {/* ── Price + chart ──────────────────────────────────────── */}
      <GlassCard elevated style={{ padding: "22px 22px 18px" }}>
        {/* Price row */}
        <div className="responsive-row" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: "clamp(28px, 9vw, 36px)", fontWeight: 300, letterSpacing: "-0.02em", color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {a.priceUSD > 0 ? formatUSD(a.priceUSD) : (a.balance > 0 ? "Pricing..." : "Price unavailable")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              {pos ? <Icons.trendUp size={13} color="rgba(255,255,255,0.60)" /> : <Icons.trendDown size={13} color="rgba(255,100,100,0.75)" />}
              <span style={{ fontSize: 13, fontWeight: 500, color: pos ? "rgba(255,255,255,0.65)" : "rgba(255,100,100,0.80)", fontVariantNumeric: "tabular-nums" }}>
                {pos ? "+" : ""}{a.change24h.toFixed(2)}% 24h
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", marginLeft: 4 }}>
                7d: {a.change7d >= 0 ? "+" : ""}{a.change7d.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Period selector */}
          <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: "4px 10px", borderRadius: 7, cursor: "pointer",
                fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                border: "none",
                background: period === p ? "rgba(255,255,255,0.10)" : "transparent",
                color: period === p ? "#fff" : "rgba(255,255,255,0.32)",
                transition: "all 0.15s",
              }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div style={{ width: "100%", height: 140 }}>
          <BigChart data={a.spark7d} positive={a.change7d >= 0} />
        </div>
      </GlassCard>

      {/* ── Holdings + Stats ───────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {[
          { label: "Your balance",  value: `${formatCrypto(a.balance, 5)} ${a.symbol}` },
          { label: "Value",         value: valueLabel },
          { label: "24h change",    value: `${a.change24h >= 0 ? "+" : ""}${a.change24h.toFixed(2)}%` },
          { label: "7d change",     value: `${a.change7d >= 0 ? "+" : ""}${a.change7d.toFixed(2)}%` },
        ].map((s) => (
          <GlassCard key={s.label} style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
          </GlassCard>
        ))}
      </div>

      {/* ── Actions ────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10 }}>
        <GlassButton variant="primary" size="lg" style={{ flex: 1 }} onClick={() => setView("transfer")}>
          <Icons.send size={15} color="#000" /> Send
        </GlassButton>
        <GlassButton variant="default" size="lg" style={{ flex: 1 }} onClick={() => setView("transfer")}>
          <Icons.receive size={15} /> Receive
        </GlassButton>
      </div>

      {/* ── Recent activity ────────────────────────────────────── */}
      {txs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 12 }}>
            Recent activity
          </div>
          <GlassCard elevated style={{ overflow: "hidden" }}>
            {txs.map((tx, idx) => (
              <div key={tx.hash}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: tx.type === "receive" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)", borderTop: "1px solid rgba(255,255,255,0.16)",
                    color: tx.type === "receive" ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.38)",
                  }}>
                    {tx.type === "receive" ? <Icons.receive size={14} /> : <Icons.send size={14} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", textTransform: "capitalize", marginBottom: 3 }}>{tx.type}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.26)" }}>
                      {tx.type === "receive" ? tx.from : tx.to}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: tx.type === "receive" ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.50)", marginBottom: 3 }}>
                      {tx.type === "receive" ? "+" : "−"}{formatCrypto(tx.amount, 6)} {tx.asset}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.24)", fontVariantNumeric: "tabular-nums" }}>
                      {tx.amountUSD > 0.001 ? formatUSD(tx.amountUSD) : formatDate(tx.date)}
                    </div>
                  </div>
                </div>
                {idx < txs.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 18px" }} />}
              </div>
            ))}
          </GlassCard>
        </div>
      )}
    </motion.div>
  );
}
