"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Icons }       from "@/components/ui/Icon";
import { CryptoIcon }  from "@/components/ui/CryptoIcon";
import { useWalletStore } from "@/lib/store";
import { refreshWalletData } from "@/lib/walletRefresh";
import { formatUSD, formatCrypto, formatDate, formatDateDay } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { SkeletonRow } from "@/components/common/Skeleton";
import type { ChainTx } from "@/lib/chains";
import { findAddressBookContact } from "@/lib/addressBook/storage";
import { TransactionNotes } from "@/components/transactions/TransactionNotes";
import { useI18n } from "@/lib/i18n";

type Filter = "all" | "send" | "receive";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",     label: "All"      },
  { id: "receive", label: "Received" },
  { id: "send",    label: "Sent"     },
];
const PAGE_SIZE = 20;

const EXPLORERS = {
  mainnet: { ethereum: "https://etherscan.io/tx/", bsc: "https://bscscan.com/tx/", bitcoin: "https://blockstream.info/tx/", solana: "https://solscan.io/tx/" },
  testnet: { ethereum: "https://sepolia.etherscan.io/tx/", bsc: "https://testnet.bscscan.com/tx/", bitcoin: "https://blockstream.info/testnet/tx/", solana: "https://solscan.io/tx/" },
} as const;

function inferNetwork(tx: ChainTx): keyof typeof EXPLORERS.mainnet {
  if (tx.network) return tx.network;
  if (tx.asset === "BTC") return "bitcoin";
  if (tx.asset === "SOL") return "solana";
  if (tx.asset === "BNB" || tx.asset === "USDT" || tx.asset === "BSC-USD") return "bsc";
  return "ethereum";
}

function short(value: string) {
  if (!value) return "Unknown";
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

function DetailRow({ label, value, mono, copyValue }: { label: string; value: string; mono?: boolean; copyValue?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.34)" }}>{t(label)}</span>
      <button
        onClick={() => copyValue && navigator.clipboard.writeText(copyValue).then(() => toast(`${t(label)} ${t("copied")}`))}
        disabled={!copyValue}
        style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, border: "none", background: "transparent", color: "#fff", cursor: copyValue ? "pointer" : "default", fontFamily: mono ? "monospace" : "inherit", fontSize: 12, fontWeight: 500 }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
        {copyValue && <Icons.copy size={12} color="rgba(255,255,255,0.34)" />}
      </button>
    </div>
  );
}

function TxDetailsModal({ tx, onClose }: { tx: ChainTx; onClose: () => void }) {
  const { t } = useI18n();
  const { network } = useWalletStore();
  const chain = inferNetwork(tx);
  const explorer = EXPLORERS[network]?.[chain] ?? "";
  const value = tx.amountUSD > 0.001 ? formatUSD(tx.amountUSD) : t("Value unavailable");
  const fromContact = findAddressBookContact(tx.from, chain);
  const toContact = findAddressBookContact(tx.to, chain);

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(10px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(480px, 100%)" }}
      >
        <GlassCard elevated style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CryptoIcon symbol={tx.asset} image={tx.tokenImage} size={38} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{t(tx.type === "receive" ? "Received" : "Sent")} {tx.asset}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{chain} · {tx.status}</div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>
              <Icons.x size={15} color="rgba(255,255,255,0.55)" />
            </button>
          </div>

          <div style={{ fontSize: 28, fontWeight: 300, color: "#fff", marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
            {tx.type === "receive" ? "+" : "-"}{formatCrypto(tx.amount, 6)} {tx.asset}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.36)", marginBottom: 16 }}>{value}</div>

          <DetailRow label="Date" value={formatDate(tx.date)} />
          <DetailRow label="From" value={fromContact ? `${fromContact.name} (${short(tx.from)})` : short(tx.from)} mono={!fromContact} copyValue={tx.from} />
          <DetailRow label="To" value={toContact ? `${toContact.name} (${short(tx.to)})` : short(tx.to)} mono={!toContact} copyValue={tx.to} />
          {tx.tokenContract && <DetailRow label="Contract" value={short(tx.tokenContract)} mono copyValue={tx.tokenContract} />}
          <DetailRow label="Hash" value={short(tx.hash)} mono copyValue={tx.hash} />
          <TransactionNotes hash={tx.hash} />

          {explorer && (
            <a href={`${explorer}${tx.hash}`} target="_blank" rel="noopener noreferrer" style={{ marginTop: 16, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", color: "#000", background: "#fff", fontSize: 13, fontWeight: 650 }}>
              {t("View on explorer")} <Icons.externalLink size={14} color="#000" />
            </a>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export function HistoryView() {
  const { t } = useI18n();
  const { transactions, historyFilter, setFilter, loadingState } = useWalletStore();
  const [selectedTx, setSelectedTx] = useState<ChainTx | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const historyLoading = loadingState.transactions.status === "loading" || loadingState.transactions.status === "refreshing";

  const filtered = historyFilter === "all"
    ? transactions
    : transactions.filter((t) => t.type === historyFilter);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visible.length < filtered.length;

  const grouped = visible.reduce<Record<string, typeof transactions>>((acc, tx) => {
    const key = formatDateDay(tx.date);
    (acc[key] ??= []).push(tx);
    return acc;
  }, {});

  const T = {
    label: { fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)", marginBottom: 10, display: "block" } as React.CSSProperties,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className="view-shell"
      style={{ padding: "36px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 680 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <span style={T.label}>{t("Activity")}</span>
          <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.015em", color: "#fff" }}>{t("History")}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.24)" }}>
            {filtered.length ? `${visible.length}/${filtered.length}` : "0"} transactions
          </span>
          <button
            onClick={() => refreshWalletData()}
            disabled={historyLoading}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", cursor: historyLoading ? "default" : "pointer", color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "inherit", fontWeight: 500, transition: "all 0.15s" }}
            onMouseEnter={(e) => { if (!historyLoading) (e.currentTarget.style.background = "rgba(255,255,255,0.09)"); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          >
            <motion.div animate={historyLoading ? { rotate: 360 } : { rotate: 0 }} transition={historyLoading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}>
              <Icons.swap size={12} color="rgba(255,255,255,0.45)" />
            </motion.div>
            {t("Refresh")}
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
                onClick={() => { setFilter(f.id); setVisibleCount(PAGE_SIZE); }}
                style={{ position: "relative", zIndex: 1, padding: "6px 14px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit", color: active ? "#fff" : "rgba(255,255,255,0.32)", transition: "color 0.15s" }}
              >
                {t(f.label)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {historyLoading && transactions.length === 0 ? (
        <GlassCard elevated style={{ overflow: "hidden" }}>
          {[0,1,2,3].map((i) => (
            <div key={i}>
              <SkeletonRow />
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
          <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>{t("No transactions yet")}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.20)", marginBottom: 24 }}>
            {t("Transactions appear here after indexing.")}<br />{t("Try refreshing or check back in a moment.")}
          </div>
          <GlassButton variant="default" size="md" onClick={() => refreshWalletData()}>
            <Icons.swap size={13} /> {t("Refresh now")}
          </GlassButton>
        </div>
      ) : (
        /* Transaction groups */
        <>
          {Object.entries(grouped).map(([date, txs], gi) => (
            <motion.div key={date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.055, duration: 0.26 }}>
              <span style={T.label}>{date}</span>
              <GlassCard elevated style={{ overflow: "hidden" }}>
                {txs.map((tx, idx) => (
                  <div key={tx.hash + idx}>
                    <motion.button
                      type="button"
                      aria-label={`${tx.type === "receive" ? "Received" : "Sent"} ${tx.asset} transaction details`}
                      onClick={() => setSelectedTx(tx)}
                      whileHover={{ backgroundColor: "rgba(255,255,255,0.025)" }}
                      transition={{ duration: 0.12 }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", cursor: "pointer", border: "none", backgroundColor: "rgba(255,255,255,0)", fontFamily: "inherit", textAlign: "left" }}
                    >
                      <div style={{
                        width: 42, height: 42, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <CryptoIcon symbol={tx.asset} image={tx.tokenImage} size={32} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "#fff", textTransform: "capitalize" }}>
                            {t(tx.type === "receive" ? "Received" : "Sent")}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>{tx.asset}</span>
                          {tx.status === "pending" && (
                            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)", color: "rgba(251,191,36,0.80)", fontWeight: 500 }}>{t("Pending")}</span>
                          )}
                          {tx.status === "failed" && (
                            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.18)", color: "rgba(255,100,100,0.80)", fontWeight: 500 }}>{t("Failed")}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.22)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tx.type === "receive"
                            ? `From ${tx.from.slice(0,8)}…${tx.from.slice(-6)}`
                            : `To ${tx.to.slice(0,8)}…${tx.to.slice(-6)}`
                          }
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginBottom: 3, lineHeight: 1, color: tx.type === "receive" ? "rgba(120,220,90,0.90)" : "rgba(255,255,255,0.60)" }}>
                          {tx.type === "receive" ? "+" : "−"}{formatCrypto(tx.amount, 6)} {tx.asset}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.24)", fontVariantNumeric: "tabular-nums" }}>
                          {tx.amountUSD > 0.001 ? formatUSD(tx.amountUSD) : formatDate(tx.date)}
                        </div>
                      </div>
                    </motion.button>
                    {idx < txs.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 18px" }} />}
                  </div>
                ))}
              </GlassCard>
            </motion.div>
          ))}
          {hasMore && (
            <GlassButton variant="default" size="md" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} style={{ alignSelf: "center", minWidth: 160 }}>
              {t("Show more")}
            </GlassButton>
          )}
        </>
      )}
      <AnimatePresence>
        {selectedTx && <TxDetailsModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
