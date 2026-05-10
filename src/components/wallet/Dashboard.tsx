"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { GlassCard }      from "@/components/ui/GlassCard";
import { GlassButton }    from "@/components/ui/GlassButton";
import { Icons }          from "@/components/ui/Icon";
import { Sparkline }      from "@/components/ui/Sparkline";
import { CryptoIcon }     from "@/components/ui/CryptoIcon";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useWalletStore } from "@/lib/store";
import { useChainData }   from "@/lib/useChainData";
import { formatUSD, formatCrypto, shortenAddress } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import type { AssetInfo } from "@/lib/store";
import type { EvmToken } from "@/lib/tokens";
import type { SplToken } from "@/lib/solana";

/* ── Network colours ─────────────────────────────────────────────── */
const NET_BG: Record<string, string> = {
  ethereum: "rgba(98,88,255,0.13)",
  bitcoin:  "rgba(247,147,26,0.13)",
  bsc:      "rgba(240,185,11,0.13)",
  solana:   "rgba(153,69,255,0.13)",
};
const NET_LABEL: Record<string, string> = {
  ethereum: "ETH", bitcoin: "BTC", bsc: "BSC", solana: "SOL",
};

/* ── Skeleton ─────────────────────────────────────────────────────── */
function Bone({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return (
    <motion.div animate={{ opacity: [0.22, 0.48, 0.22] }} transition={{ duration: 1.8, repeat: Infinity }}
      style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
  );
}

/* ── Asset row (native) ───────────────────────────────────────────── */
function NativeRow({ asset }: { asset: AssetInfo }) {
  const { openAsset } = useWalletStore();
  const pos = asset.change24h >= 0;
  return (
    <GlassCard hover onClick={() => openAsset(asset)} style={{ padding: "13px 18px", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: NET_BG[asset.network], border: "1px solid rgba(255,255,255,0.09)", borderTop: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
          <CryptoIcon symbol={asset.symbol} image={asset.image} size={23} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{asset.symbol}</span>
            <span style={{ fontSize: 10, fontWeight: 500, padding: "1px 6px", borderRadius: 5, background: NET_BG[asset.network], color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.07)" }}>{NET_LABEL[asset.network]}</span>
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{formatCrypto(asset.balance, 5)} {asset.symbol}</span>
        </div>
        {asset.spark7d.length > 1 && <Sparkline data={asset.spark7d} width={56} height={26} positive={asset.change7d >= 0} />}
        <div style={{ textAlign: "right", minWidth: 86, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#fff", fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>{formatUSD(asset.balance * asset.priceUSD)}</div>
          <span style={{ fontSize: 11, fontWeight: 500, color: pos ? "rgba(255,255,255,0.55)" : "rgba(255,100,100,0.75)", fontVariantNumeric: "tabular-nums" }}>{pos ? "+" : ""}{asset.change24h.toFixed(2)}%</span>
        </div>
      </div>
    </GlassCard>
  );
}

/* ── Token row (ERC-20 / BEP-20 / SPL) ──────────────────────────── */
function TokenRow({ token, chain, onClick }: { token: EvmToken | SplToken; chain: string; onClick: () => void }) {
  const isEvm   = "contract" in token;
  const symbol  = token.symbol ?? (isEvm ? "?" : (token as SplToken).mint.slice(0, 6));
  const balance = isEvm ? token.balance : (token as SplToken).amount;
  const price   = token.priceUSD ?? 0;
  const change  = token.change24h ?? 0;
  const image   = isEvm ? (token as EvmToken).image : (token as SplToken).logoURI ?? "";
  const value   = balance * price;
  const pos     = change >= 0;

  return (
    <GlassCard hover onClick={onClick} style={{ padding: "11px 18px", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: NET_BG[chain] ?? "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "1px solid rgba(255,255,255,0.16)", boxShadow: "0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)" }}>
          <CryptoIcon symbol={symbol} image={image} size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{symbol}</span>
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: NET_BG[chain] ?? "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.40)", letterSpacing: "0.03em" }}>{NET_LABEL[chain] ?? chain.toUpperCase()}</span>
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.26)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 180 }}>
            {formatCrypto(balance, 4)} {symbol}
          </span>
        </div>
        <div style={{ textAlign: "right", minWidth: 80, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>
            {value > 0.001 ? formatUSD(value) : "—"}
          </div>
          {change !== 0
            ? <span style={{ fontSize: 10, fontWeight: 500, color: pos ? "rgba(255,255,255,0.50)" : "rgba(255,100,100,0.70)", fontVariantNumeric: "tabular-nums" }}>{pos ? "+" : ""}{change.toFixed(2)}%</span>
            : price > 0
              ? <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontVariantNumeric: "tabular-nums" }}>${price.toFixed(4)}</span>
              : <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>no price</span>
          }
        </div>
      </div>
    </GlassCard>
  );
}

/* ── Dashboard ───────────────────────────────────────────────────── */
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } } };
const up: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.30 } } };

export function Dashboard() {
  const { assets, evmTokens, splTokens, addresses, loading, initialLoaded, setView } = useWalletStore();
  const toast = useToast();
  useChainData();

  const [search, setSearch] = useState("");

  const addr  = addresses?.ethereum ?? null;
  const total = assets.reduce((s, a) => s + a.balance * a.priceUSD, 0)
    + evmTokens.reduce((s, t) => s + t.valueUSD, 0)
    + splTokens.reduce((s, t) => s + t.amount * (t.priceUSD ?? 0), 0);
  const totalChange = assets.reduce((s, a) => s + a.balance * a.priceUSD * (a.change24h / 100), 0);
  const pct   = total > 0 ? (totalChange / (total - totalChange)) * 100 : 0;
  const pos   = pct >= 0;

  const q = search.toLowerCase().trim();

  const filteredNative = useMemo(() => assets.filter((a) =>
    !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
  ), [assets, q]);

  const filteredEvm = useMemo(() => evmTokens.filter((t) =>
    !q || (t.symbol?.toLowerCase() ?? "").includes(q) || t.name.toLowerCase().includes(q) || t.contract.toLowerCase().includes(q)
  ), [evmTokens, q]);

  const filteredSpl = useMemo(() => splTokens.filter((t) =>
    !q || (t.symbol?.toLowerCase() ?? "").includes(q) || (t.name?.toLowerCase() ?? "").includes(q) || t.mint.toLowerCase().includes(q)
  ), [splTokens, q]);

  const showSkeleton = !initialLoaded && loading;
  const totalItems = filteredNative.length + filteredEvm.length + filteredSpl.length;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>

      {/* ── Balance header ──────────────────────────────────────── */}
      <motion.div variants={up}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <span style={{ display: "block", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 12 }}>
              Total Portfolio
            </span>
            {showSkeleton ? <Bone w={200} h={44} r={10} /> : (
              <AnimatedNumber value={total} format={formatUSD}
                style={{ fontSize: 44, fontWeight: 300, letterSpacing: "-0.025em", color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              {showSkeleton ? <Bone w={140} h={22} r={11} /> : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 18, background: pos ? "rgba(255,255,255,0.05)" : "rgba(255,60,60,0.07)", border: `1px solid ${pos ? "rgba(255,255,255,0.08)" : "rgba(255,80,80,0.15)"}` }}>
                    {pos ? <Icons.trendUp size={11} color="rgba(255,255,255,0.60)" /> : <Icons.trendDown size={11} color="rgba(255,100,100,0.80)" />}
                    <span style={{ fontSize: 11, fontWeight: 500, color: pos ? "rgba(255,255,255,0.65)" : "rgba(255,100,100,0.80)", fontVariantNumeric: "tabular-nums" }}>
                      {pos ? "+" : ""}{formatUSD(totalChange)} · {pos ? "+" : ""}{pct.toFixed(2)}% 24h
                    </span>
                  </div>
                  {addr && (
                    <button onClick={() => { navigator.clipboard.writeText(addr); toast("Address copied"); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.26)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                      {shortenAddress(addr, 4)} <Icons.copy size={10} color="rgba(255,255,255,0.24)" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 4, flexShrink: 0 }}>
            <GlassButton variant="primary" size="md" onClick={() => setView("transfer")}><Icons.send size={13} color="#000" /> Send</GlassButton>
            <GlassButton variant="default" size="md" onClick={() => setView("transfer")}><Icons.receive size={13} /> Receive</GlassButton>
          </div>
        </div>
      </motion.div>

      {/* ── Search ────────────────────────────────────────────── */}
      <motion.div variants={up}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <Icons.search size={14} color="rgba(255,255,255,0.28)" />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets, tokens, contracts…"
            style={{ width: "100%", height: 42, paddingLeft: 38, paddingRight: 14, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderTop: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.2)", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.30)", display: "flex", padding: 2 }}>
              <Icons.x size={13} color="rgba(255,255,255,0.30)" />
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Asset list ─────────────────────────────────────────── */}
      <motion.div variants={up}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
            Assets {totalItems > 0 && `· ${totalItems}`}
          </span>
          <button onClick={() => setView("history")} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.28)", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}>
            Activity <Icons.chevronR size={12} color="rgba(255,255,255,0.24)" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {showSkeleton ? (
            <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[0,1,2,3].map((i) => (
                <GlassCard key={i} style={{ padding: "13px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                    <Bone w={42} h={42} r={13} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <Bone w={70} h={13} /><Bone w={110} h={10} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7, alignItems: "flex-end" }}>
                      <Bone w={80} h={13} /><Bone w={48} h={10} />
                    </div>
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {/* Native assets */}
              {filteredNative.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, duration: 0.25 }}>
                  <NativeRow asset={a} />
                </motion.div>
              ))}

              {/* ERC-20 / BEP-20 tokens */}
              {filteredEvm.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 2px 4px" }}>
                    <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.06)" }} />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Tokens · {filteredEvm.length}</span>
                    <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.06)" }} />
                  </div>
                  {filteredEvm.map((t, i) => (
                    <motion.div key={t.contract} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.03, duration: 0.22 }}>
                      <TokenRow token={t} chain={t.chain} onClick={() => setView("transfer")} />
                    </motion.div>
                  ))}
                </>
              )}

              {/* Solana SPL tokens */}
              {filteredSpl.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 2px 4px" }}>
                    <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.06)" }} />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Solana Tokens · {filteredSpl.length}</span>
                    <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.06)" }} />
                  </div>
                  {filteredSpl.map((t, i) => (
                    <motion.div key={t.mint} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.03, duration: 0.22 }}>
                      <TokenRow token={t} chain="solana" onClick={() => setView("transfer")} />
                    </motion.div>
                  ))}
                </>
              )}

              {/* Empty */}
              {totalItems === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.20)" }}>
                  <Icons.search size={28} color="rgba(255,255,255,0.12)" />
                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    {search ? `No results for "${search}"` : "No assets found"}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
