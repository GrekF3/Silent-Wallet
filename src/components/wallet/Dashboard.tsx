"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { GlassCard }      from "@/components/ui/GlassCard";
import { GlassButton }    from "@/components/ui/GlassButton";
import { Icons }          from "@/components/ui/Icon";
import { Sparkline }      from "@/components/ui/Sparkline";
import { InteractiveChart, type ChartPoint } from "@/components/ui/InteractiveChart";
import { CryptoIcon }     from "@/components/ui/CryptoIcon";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useWalletStore, type AssetInfo, type AssetRef } from "@/lib/store";
import { formatUSD, formatCrypto, shortenAddress, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type WalletNetwork = "ethereum" | "bitcoin" | "bsc" | "solana";
type SortMode = "value" | "name";

const NET_BG: Record<string, string> = {
  ethereum: "rgba(98,88,255,0.13)",
  bitcoin:  "rgba(247,147,26,0.13)",
  bsc:      "rgba(240,185,11,0.13)",
  solana:   "rgba(153,69,255,0.13)",
};

const NET_LABEL: Record<WalletNetwork, string> = {
  ethereum: "Ethereum",
  bitcoin: "Bitcoin",
  bsc: "BNB Chain",
  solana: "Solana",
};

const NET_SHORT: Record<WalletNetwork, string> = {
  ethereum: "ETH",
  bitcoin: "BTC",
  bsc: "BSC",
  solana: "SOL",
};

const EMPTY_EVM = "0x0000000000000000000000000000000000000000";

type DisplayAsset = {
  id: string;
  symbol: string;
  name: string;
  network: WalletNetwork;
  balance: number;
  priceUSD: number;
  valueUSD: number;
  change24h: number;
  change7d: number;
  spark7d: number[];
  spark7dTimestamps: number[];
  image: string;
  kind: "native" | "evm" | "spl";
  assetRef: AssetRef;
  nativeRef?: AssetInfo;
};

const NETWORKS = Object.keys(NET_LABEL) as WalletNetwork[];

function Bone({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return (
    <motion.div animate={{ opacity: [0.22, 0.48, 0.22] }} transition={{ duration: 1.8, repeat: Infinity }}
      style={{ width: w, height: h, borderRadius: r, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
  );
}

function assetValue(asset: DisplayAsset) {
  return asset.balance * asset.priceUSD;
}

function CleanAssetIcon({ symbol, image, size = 31 }: { symbol: string; image: string; size?: number }) {
  return (
    <div
      style={{
        width: 42,
        height: 42,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.48)) drop-shadow(0 0 10px rgba(255,255,255,0.08))",
      }}
    >
      <CryptoIcon symbol={symbol} image={image} size={size} />
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: `1px solid ${on ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.10)"}`,
        background: on ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.06)",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <motion.span
        animate={{ x: on ? 18 : 2 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        style={{ position: "absolute", top: 2, left: 0, width: 18, height: 18, borderRadius: "50%", background: "#fff" }}
      />
    </button>
  );
}

function AssetRow({ asset, privacyMode, onClick }: { asset: DisplayAsset; privacyMode: boolean; onClick: () => void }) {
  const pos = asset.change24h >= 0;
  const needsPrice = asset.balance > 0 && asset.priceUSD <= 0;
  return (
    <GlassCard hover onClick={onClick} style={{ padding: "12px 16px", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <CleanAssetIcon symbol={asset.symbol} image={asset.image} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 650, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.symbol}</span>
            <span style={{ fontSize: 10, fontWeight: 550, padding: "1px 6px", borderRadius: 5, background: NET_BG[asset.network], color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>{NET_SHORT[asset.network]}</span>
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{formatCrypto(asset.balance, 5)} {asset.symbol}</span>
        </div>
        <Sparkline data={asset.spark7d} width={56} height={26} positive={asset.change7d >= 0} />
        <div style={{ textAlign: "right", minWidth: 86, flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 550, color: "#fff", fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>
            {privacyMode ? "••••" : needsPrice ? "Pricing..." : formatUSD(asset.valueUSD)}
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, color: pos ? "rgba(255,255,255,0.55)" : "rgba(255,100,100,0.75)", fontVariantNumeric: "tabular-nums" }}>
            {pos ? "+" : ""}{asset.change24h.toFixed(2)}%
          </span>
        </div>
      </div>
    </GlassCard>
  );
}

function NetworkFilter({
  selected,
  onApply,
}: {
  selected: WalletNetwork[];
  onApply: (networks: WalletNetwork[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WalletNetwork[]>(selected);
  const [query, setQuery] = useState("");
  const filtered = NETWORKS.filter((network) => NET_LABEL[network].toLowerCase().includes(query.toLowerCase()) || NET_SHORT[network].toLowerCase().includes(query.toLowerCase()));

  const toggle = (network: WalletNetwork) => {
    setDraft((prev) => prev.includes(network) ? prev.filter((n) => n !== network) : [...prev, network]);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setDraft(selected); }}
        style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", borderTop: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.58)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        title="Filter networks"
      >
        <Icons.filter size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="dashboard-popover"
          >
            <div className="popover-title">
              <Icons.filter size={14} /> Networks
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search networks"
              className="popover-input"
            />
            <button type="button" className="popover-row" onClick={() => setDraft(NETWORKS)}>
              <Icons.check size={14} /> All networks
            </button>
            {filtered.map((network) => {
              const active = draft.includes(network);
              return (
                <button key={network} type="button" className="popover-row" onClick={() => toggle(network)}>
                  <span style={{ width: 18, height: 18, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${active ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.14)"}`, background: active ? "rgba(255,255,255,0.16)" : "transparent" }}>
                    {active && <Icons.check size={11} />}
                  </span>
                  {NET_LABEL[network]}
                </button>
              );
            })}
            <div className="popover-actions">
              <button type="button" onClick={() => { setDraft(selected); setOpen(false); }}>Cancel</button>
              <button type="button" onClick={() => { onApply(draft.length ? draft : NETWORKS); setOpen(false); }}>Apply</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MoreMenu({
  sortMode,
  setSortMode,
  hideZero,
  setHideZero,
  openManage,
}: {
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  hideZero: boolean;
  setHideZero: (v: boolean) => void;
  openManage: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", borderTop: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.58)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        title="More actions"
      >
        <Icons.more size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="dashboard-popover dashboard-popover-right"
          >
            <div className="popover-title"><Icons.more size={14} /> Actions</div>
            <button type="button" className="popover-row" onClick={() => setSortMode(sortMode === "value" ? "name" : "value")}>
              <Icons.sort size={14} /> Sort by {sortMode === "value" ? "name" : "balance"}
            </button>
            <button type="button" className="popover-row" onClick={() => { setOpen(false); openManage(); }}>
              <Icons.coins size={14} /> Manage coins
            </button>
            <button type="button" className="popover-row" onClick={() => setHideZero(!hideZero)}>
              {hideZero ? <Icons.eyeOff size={14} /> : <Icons.eye size={14} />} Hide 0 balances
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ManageCoinsModal({ assets, onClose }: { assets: DisplayAsset[]; onClose: () => void }) {
  const { hiddenAssetIds, toggleHiddenAsset } = useWalletStore();
  const [query, setQuery] = useState("");
  const filtered = assets.filter((asset) => `${asset.symbol} ${asset.name} ${NET_LABEL[asset.network]}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 160, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, background: "rgba(0,0,0,0.66)", backdropFilter: "blur(10px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(520px, 100%)" }}
      >
        <GlassCard elevated style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <Icons.coins size={17} color="rgba(255,255,255,0.62)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 650, color: "#fff" }}>Manage coins</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.32)" }}>Disabled coins are not shown in the wallet</div>
            </div>
            <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icons.x size={15} color="rgba(255,255,255,0.52)" />
            </button>
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assets" className="popover-input" style={{ marginBottom: 10 }} />
          <div style={{ maxHeight: "min(420px, 58vh)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((asset) => {
              const active = !hiddenAssetIds.includes(asset.id);
              return (
                <div key={asset.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 13, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <CryptoIcon symbol={asset.symbol} image={asset.image} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 650, color: "#fff" }}>{asset.symbol}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{NET_LABEL[asset.network]} · {formatCrypto(asset.balance, 5)}</div>
                  </div>
                  <Toggle on={active} onClick={() => toggleHiddenAsset(asset.id)} />
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } } };
const up: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.30 } } };

export function Dashboard() {
  const {
    assets, evmTokens, splTokens, addresses, loading, initialLoaded, loadingState, lastUpdated, setView, openTransfer, setEcosystemTab, openAsset,
    sessionMode, watchName,
    privacyMode, setPrivacyMode, hideZeroBalances, setHideZeroBalances, hiddenAssetIds,
  } = useWalletStore();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [networks, setNetworks] = useState<WalletNetwork[]>(NETWORKS);
  const [sortMode, setSortMode] = useState<SortMode>("value");
  const [manageOpen, setManageOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);

  const allAssets = useMemo<DisplayAsset[]>(() => [
    ...assets.map((asset) => ({
      id: `native:${asset.id}`,
      symbol: asset.symbol,
      name: asset.name,
      network: asset.network,
      balance: asset.balance,
      priceUSD: asset.priceUSD,
      valueUSD: asset.balance * asset.priceUSD,
      change24h: asset.change24h,
      change7d: asset.change7d,
      spark7d: asset.spark7d,
      spark7dTimestamps: asset.spark7dTimestamps,
      image: asset.image,
      kind: "native" as const,
      assetRef: { kind: "native" as const, id: asset.id, network: asset.network },
      nativeRef: asset,
    })),
    ...evmTokens.map((token) => ({
      id: `evm:${token.chain}:${token.contract.toLowerCase()}`,
      symbol: token.symbol,
      name: token.name,
      network: token.chain === "bsc" ? "bsc" as const : "ethereum" as const,
      balance: token.balance,
      priceUSD: token.priceUSD,
      valueUSD: token.valueUSD,
      change24h: token.change24h,
      change7d: 0,
      spark7d: [],
      spark7dTimestamps: [],
      image: token.image,
      kind: "evm" as const,
      assetRef: { kind: "evm" as const, id: token.contract.toLowerCase(), network: token.chain === "bsc" ? "bsc" as const : "ethereum" as const },
    })),
    ...splTokens.map((token) => ({
      id: `spl:${token.mint}`,
      symbol: token.symbol ?? token.mint.slice(0, 6),
      name: token.name ?? token.mint,
      network: "solana" as const,
      balance: token.amount,
      priceUSD: token.priceUSD ?? 0,
      valueUSD: token.amount * (token.priceUSD ?? 0),
      change24h: token.change24h ?? 0,
      change7d: 0,
      spark7d: [],
      spark7dTimestamps: [],
      image: token.logoURI ?? "",
      kind: "spl" as const,
      assetRef: { kind: "spl" as const, id: token.mint, network: "solana" as const },
    })),
  ], [assets, evmTokens, splTokens]);

  const activeAssets = useMemo(() => allAssets.filter((asset) => !hiddenAssetIds.includes(asset.id)), [allAssets, hiddenAssetIds]);
  const portfolioPoints = useMemo<ChartPoint[]>(() => {
    const sources = activeAssets.filter((asset) => asset.balance > 0 && asset.spark7d.length > 1);
    if (sources.length === 0) return [];

    const length = Math.min(...sources.map((asset) => asset.spark7d.length));
    if (length < 2) return [];

    const timestampSource = sources.find((asset) => asset.spark7dTimestamps.length >= length);

    return Array.from({ length }, (_, index) => ({
      value: sources.reduce((sum, asset) => {
        const offset = asset.spark7d.length - length;
        return sum + asset.spark7d[offset + index] * asset.balance;
      }, 0),
      timestamp: timestampSource?.spark7dTimestamps[timestampSource.spark7dTimestamps.length - length + index],
    }));
  }, [activeAssets]);
  const total = activeAssets.reduce((sum, asset) => sum + asset.valueUSD, 0);
  const totalChange = activeAssets.reduce((sum, asset) => sum + asset.valueUSD * (asset.change24h / 100), 0);
  const pct = total > 0 ? (totalChange / (total - totalChange || total)) * 100 : 0;
  const pos = pct >= 0;
  const q = search.toLowerCase().trim();

  const visibleAssets = useMemo(() => activeAssets
    .filter((asset) => networks.includes(asset.network))
    .filter((asset) => !hideZeroBalances || asset.balance > 0)
    .filter((asset) => !q || asset.symbol.toLowerCase().includes(q) || asset.name.toLowerCase().includes(q))
    .sort((a, b) => sortMode === "value" ? assetValue(b) - assetValue(a) : a.symbol.localeCompare(b.symbol)),
  [activeAssets, hideZeroBalances, networks, q, sortMode]);

  const showSkeleton = !initialLoaded && loading;
  const partialErrors = Object.entries(loadingState)
    .filter(([, state]) => state.status === "partial" || state.status === "error")
    .map(([source]) => source);
  const addr = addresses
    ? addresses.ethereum && addresses.ethereum !== EMPTY_EVM
      ? addresses.ethereum
      : addresses.bitcoin || addresses.solana || null
    : null;
  const watchOnly = sessionMode === "watch";

  return (
    <motion.div className="view-shell" variants={stagger} initial="hidden" animate="show"
      style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
      <AnimatePresence>
        {manageOpen && <ManageCoinsModal assets={[...allAssets].sort((a, b) => assetValue(b) - assetValue(a))} onClose={() => setManageOpen(false)} />}
      </AnimatePresence>

      <motion.div variants={up}>
        <div className="dashboard-hero-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>Total Portfolio</span>
              {watchOnly && (
                <span style={{ fontSize: 10, fontWeight: 650, padding: "2px 7px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.42)" }}>
                  Observer{watchName ? ` · ${watchName}` : ""}
                </span>
              )}
              <button type="button" onClick={() => setPrivacyMode(!privacyMode)} title={privacyMode ? "Show balance" : "Hide balance"} style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.045)", color: "rgba(255,255,255,0.46)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                {privacyMode ? <Icons.eyeOff size={14} /> : <Icons.eye size={14} />}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, minHeight: 48 }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.34)", fontWeight: 600 }}>≈</span>
              {showSkeleton ? <Bone w={200} h={44} r={10} /> : privacyMode ? (
                <span style={{ fontSize: "clamp(34px, 10vw, 44px)", fontWeight: 300, color: "#fff", lineHeight: 1 }}>••••••</span>
              ) : (
                <AnimatedNumber value={total} format={formatUSD}
                  style={{ fontSize: "clamp(34px, 10vw, 44px)", fontWeight: 300, letterSpacing: "-0.025em", color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }} />
              )}
            </div>
            <div style={{ marginTop: 5, fontSize: 11, color: "rgba(255,255,255,0.28)" }}>Approximately</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              {!showSkeleton && !privacyMode && (
                <button
                  type="button"
                  onClick={() => setChartOpen((open) => !open)}
                  aria-expanded={chartOpen}
                  title={chartOpen ? "Hide portfolio chart" : "Show portfolio chart"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 9px",
                    borderRadius: 18,
                    background: pos ? "rgba(255,255,255,0.05)" : "rgba(255,60,60,0.07)",
                    border: `1px solid ${pos ? "rgba(255,255,255,0.08)" : "rgba(255,80,80,0.15)"}`,
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  {pos ? <Icons.trendUp size={11} color="rgba(255,255,255,0.60)" /> : <Icons.trendDown size={11} color="rgba(255,100,100,0.80)" />}
                  <span style={{ fontSize: 11, fontWeight: 500, color: pos ? "rgba(255,255,255,0.65)" : "rgba(255,100,100,0.80)", fontVariantNumeric: "tabular-nums" }}>
                    {pos ? "+" : ""}{formatUSD(totalChange)} · {pos ? "+" : ""}{pct.toFixed(2)}% 24h
                  </span>
                </button>
              )}
              {addr && (
                <button onClick={() => { navigator.clipboard.writeText(addr); toast("Address copied"); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.26)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                  {shortenAddress(addr, 4)} <Icons.copy size={10} color="rgba(255,255,255,0.24)" />
                </button>
              )}
            </div>
            {!showSkeleton && (
              <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.20)" }}>
                {partialErrors.length > 0
                  ? `Partial data: ${partialErrors.join(", ")}`
                  : lastUpdated
                    ? `Updated ${formatDate(new Date(lastUpdated))}`
                    : "Indexing wallet"}
              </div>
            )}
          </div>
          {!watchOnly && (
            <div className="dashboard-actions" style={{ display: "flex", gap: 8, paddingTop: 4, flexShrink: 0 }}>
              <GlassButton variant="primary" size="md" onClick={() => setView("transfer")}><Icons.send size={13} color="#000" /> Send</GlassButton>
              <GlassButton variant="default" size="md" onClick={() => setView("transfer")}><Icons.receive size={13} /> Receive</GlassButton>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {chartOpen && !showSkeleton && !privacyMode && (
          <motion.div
            key="portfolio-chart"
            initial={{ opacity: 0, y: -18, scaleX: 0.82, scaleY: 0.08, height: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scaleX: 1, scaleY: 1, height: "auto", filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, scaleX: 0.82, scaleY: 0.08, height: 0, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.8 }}
            style={{ transformOrigin: "top center", overflow: "hidden" }}
          >
            <GlassCard elevated style={{ padding: "14px 16px 12px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 650, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.34)" }}>Overview</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.24)" }}>Portfolio value, 7D</div>
                </div>
                <button
                  type="button"
                  onClick={() => setChartOpen(false)}
                  title="Collapse chart"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 11,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.48)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ transform: "rotate(180deg)", display: "flex" }}>
                    <Icons.chevronD size={15} />
                  </span>
                </button>
              </div>
              <InteractiveChart points={portfolioPoints} positive={pos} />
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={up}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          {[
            { label: "Buy", icon: Icons.receive, tab: "ramp" as const },
            { label: "Sell", icon: Icons.send, tab: "ramp" as const },
            { label: "Swap", icon: Icons.swap, tab: "swap" as const },
            { label: "Bridge", icon: Icons.globe, tab: "bridge" as const },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setEcosystemTab(item.tab)}
                style={{ minHeight: 58, borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", borderTop: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.055)", color: "rgba(255,255,255,0.72)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 650, boxShadow: "0 2px 10px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)" }}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={up}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 0 }}>
            <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <Icons.search size={14} color="rgba(255,255,255,0.28)" />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets"
              style={{ width: "100%", height: 42, paddingLeft: 38, paddingRight: 14, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderTop: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.2)", boxSizing: "border-box" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.30)", display: "flex", padding: 2 }}>
                <Icons.x size={13} color="rgba(255,255,255,0.30)" />
              </button>
            )}
          </div>
          <NetworkFilter selected={networks} onApply={setNetworks} />
          <MoreMenu sortMode={sortMode} setSortMode={setSortMode} hideZero={hideZeroBalances} setHideZero={setHideZeroBalances} openManage={() => setManageOpen(true)} />
        </div>
      </motion.div>

      <motion.div variants={up}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
            Assets {visibleAssets.length > 0 && `· ${visibleAssets.length}`}
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
              {visibleAssets.map((asset, i) => (
                <motion.div key={asset.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025, duration: 0.20 }}>
                  <AssetRow
                    asset={asset}
                    privacyMode={privacyMode}
                    onClick={() => asset.nativeRef ? openAsset(asset.nativeRef) : openTransfer("send", asset.assetRef)}
                  />
                </motion.div>
              ))}
              {visibleAssets.length === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.20)" }}>
                  <Icons.search size={28} color="rgba(255,255,255,0.12)" />
                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    {search ? `No results for "${search}"` : "No balances indexed yet"}
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
