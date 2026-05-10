"use client";
import { motion } from "framer-motion";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Icons }       from "@/components/ui/Icon";
import { CryptoIcon }  from "@/components/ui/CryptoIcon";
import { useWalletStore } from "@/lib/store";
import { useChainData }   from "@/lib/useChainData";
import { formatUSD, formatCrypto, formatDate } from "@/lib/utils";

type Filter = "all" | "send" | "receive";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",     label: "All"      },
  { id: "receive", label: "Received" },
  { id: "send",    label: "Sent"     },
];

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function Bone({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return (
    <motion.div animate={{ opacity: [0.25, 0.5, 0.25] }} transition={{ duration: 1.8, repeat: Infinity }}
      style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
  );
}

export function HistoryView() {
  const { transactions, historyFilter, setFilter, loading } = useWalletStore();
  const { refresh } = useChainData();

  const filtered = historyFilter === "all"
    ? transactions
    : transactions.filter((t) => t.type === historyFilter);

  const grouped = filtered.reduce<Record<string, typeof transactions>>((acc, tx) => {
    const key = formatDate(tx.date);
    (acc[key] ??= []).push(tx);
    return acc;
  }, {});

  const T = {
    label: { fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)", marginBottom: 10, display: "block" } as React.CSSProperties,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      style={{ padding: "36px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 680 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <span style={T.label}>Activity</span>
          <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.015em", color: "#fff" }}>History</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.24)" }}>{filtered.length} transactions</span>
          <button
            onClick={() => refresh()}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", cursor: loading ? "default" : "pointer", color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "inherit", fontWeight: 500, transition: "all 0.15s" }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget.style.background = "rgba(255,255,255,0.09)"); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          >
            <motion.div animate={loading ? { rotate: 360 } : { rotate: 0 }} transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}>
              <Icons.swap size={12} color="rgba(255,255,255,0.45)" />
            </motion.div>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", padding: 3, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", alignSelf: "flex-start" }}>
        {FILTERS.map((f) => {
          const active = historyFilter === f.id;
          return (
            <div key={f.id} style={{ position: "relative" }}>
              {active && (
                <motion.div
                  layoutId="filter-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  style={{ position: "absolute", inset: 0, borderRadius: 10, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)", borderTop: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)" }}
                />
              )}
              <button
                onClick={() => setFilter(f.id)}
                style={{ position: "relative", zIndex: 1, padding: "6px 14px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit", color: active ? "#fff" : "rgba(255,255,255,0.32)", transition: "color 0.15s" }}
              >
                {f.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {loading && transactions.length === 0 ? (
        <GlassCard elevated style={{ overflow: "hidden" }}>
          {[0,1,2,3].map((i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px" }}>
                <Bone w={40} h={40} r={13} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Bone w={80}  h={13} />
                  <Bone w={150} h={11} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <Bone w={90} h={13} />
                  <Bone w={60} h={11} />
                </div>
              </div>
              {i < 3 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 18px" }} />}
            </div>
          ))}
        </GlassCard>
      ) : Object.entries(grouped).length === 0 ? (
        /* Empty state */
        <div style={{ textAlign: "center", padding: "56px 0", color: "rgba(255,255,255,0.22)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Icons.clock size={24} color="rgba(255,255,255,0.18)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>No transactions yet</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.20)", marginBottom: 24 }}>
            Transactions appear here after indexing.<br />Try refreshing or check back in a moment.
          </div>
          <GlassButton variant="default" size="md" onClick={() => refresh()}>
            <Icons.swap size={13} /> Refresh now
          </GlassButton>
        </div>
      ) : (
        /* Transaction groups */
        Object.entries(grouped).map(([date, txs], gi) => (
          <motion.div key={date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.055, duration: 0.26 }}>
            <span style={T.label}>{date}</span>
            <GlassCard elevated style={{ overflow: "hidden" }}>
              {txs.map((tx, idx) => (
                <div key={tx.hash + idx}>
                  <motion.div
                    whileHover={{ background: "rgba(255,255,255,0.025)" }}
                    transition={{ duration: 0.12 }}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", cursor: "pointer" }}
                  >
                    {/* Coin icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: tx.type === "receive" ? "rgba(120,220,90,0.07)" : "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)", borderTop: "1px solid rgba(255,255,255,0.17)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
                    }}>
                      <CryptoIcon symbol={tx.asset} size={20} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#fff", textTransform: "capitalize" }}>
                          {tx.type === "receive" ? "Received" : "Sent"}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>{tx.asset}</span>
                        {tx.status === "pending" && (
                          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)", color: "rgba(251,191,36,0.80)", fontWeight: 500 }}>Pending</span>
                        )}
                        {tx.status === "failed" && (
                          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.18)", color: "rgba(255,100,100,0.80)", fontWeight: 500 }}>Failed</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.22)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.type === "receive"
                          ? `From ${tx.from.slice(0,8)}…${tx.from.slice(-6)}`
                          : `To ${tx.to.slice(0,8)}…${tx.to.slice(-6)}`
                        }
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginBottom: 3, lineHeight: 1, color: tx.type === "receive" ? "rgba(120,220,90,0.90)" : "rgba(255,255,255,0.60)" }}>
                        {tx.type === "receive" ? "+" : "−"}{formatCrypto(tx.amount, 6)} {tx.asset}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.24)", fontVariantNumeric: "tabular-nums" }}>
                        {tx.amountUSD > 0.001 ? formatUSD(tx.amountUSD) : formatTime(tx.date)}
                      </div>
                    </div>
                  </motion.div>
                  {idx < txs.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 18px" }} />}
                </div>
              ))}
            </GlassCard>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}
