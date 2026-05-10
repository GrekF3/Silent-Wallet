"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput }  from "@/components/ui/GlassInput";
import { Icons }       from "@/components/ui/Icon";
import { CryptoIcon }  from "@/components/ui/CryptoIcon";
import { useWalletStore } from "@/lib/store";
import { derivePrivateKey } from "@/lib/wallet";
import { sendEth, sendBnb, sendErc20, estimateGasUSD } from "@/lib/chains";
import { bitcoinAddressForNetwork, sendBtc } from "@/lib/bitcoin";
import { sendSol } from "@/lib/solana";
import { formatUSD, formatCrypto } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import type { AssetInfo } from "@/lib/store";
import type { EvmToken } from "@/lib/tokens";
import type { SplToken } from "@/lib/solana";

/* ── Normalised picker asset ─────────────────────────────────────── */
type PickAsset = {
  id:       string;
  symbol:   string;
  name:     string;
  balance:  number;
  priceUSD: number;
  network:  "ethereum" | "bsc" | "bitcoin" | "solana";
  image:    string;
  isToken:  boolean;
  tokenKind?: "evm" | "spl";
  contract?: `0x${string}`;
  decimals?: number;
};

function fromNative(a: AssetInfo): PickAsset {
  return { id: a.id, symbol: a.symbol, name: a.name, balance: a.balance, priceUSD: a.priceUSD, network: a.network, image: a.image, isToken: false };
}
function fromEvmToken(t: EvmToken): PickAsset {
  return {
    id: `tok_${t.contract}`, symbol: t.symbol, name: t.name,
    balance: t.balance, priceUSD: t.priceUSD,
    network: t.chain === "bsc" ? "bsc" : "ethereum",
    image: t.image, isToken: true, tokenKind: "evm",
    contract: t.contract as `0x${string}`,
    decimals: t.decimals,
  };
}
function fromSplToken(t: SplToken): PickAsset {
  const symbol = t.symbol ?? t.mint.slice(0, 6);
  return {
    id: `spl_${t.mint}`, symbol, name: t.name ?? symbol,
    balance: t.amount, priceUSD: t.priceUSD ?? 0,
    network: "solana", image: t.logoURI ?? "", isToken: true, tokenKind: "spl",
  };
}

function canSendAsset(asset: PickAsset) {
  return !asset.isToken || asset.tokenKind === "evm";
}

/* ── Constants ─────────────────────────────────────────────────── */
const NET_BG: Record<string, string> = {
  ethereum: "rgba(98,88,255,0.14)",
  bitcoin:  "rgba(247,147,26,0.14)",
  bsc:      "rgba(240,185,11,0.14)",
  solana:   "rgba(153,69,255,0.14)",
};
const NET_LABEL: Record<string, string> = {
  ethereum: "Ethereum", bitcoin: "Bitcoin", bsc: "BNB Chain", solana: "Solana",
};
const NET_SHORT: Record<string, string> = {
  ethereum: "ETH", bitcoin: "BTC", bsc: "BSC", solana: "SOL",
};
const EXPLORERS: Record<string, Record<string, string>> = {
  mainnet: { ethereum: "https://etherscan.io/tx/", bitcoin: "https://blockstream.info/tx/", bsc: "https://bscscan.com/tx/", solana: "https://solscan.io/tx/" },
  testnet: { ethereum: "https://sepolia.etherscan.io/tx/", bitcoin: "https://blockstream.info/testnet/tx/", bsc: "https://testnet.bscscan.com/tx/", solana: "https://solscan.io/tx/" },
};

type Tab      = "send" | "receive";
type Step     = "form" | "confirm" | "done";
type TxStatus = "pending" | "confirmed" | "failed";

const S = {
  label:  { fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", display: "block", marginBottom: 8 } as React.CSSProperties,
  divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "0 0" } as React.CSSProperties,
};

/* ── Asset Picker ────────────────────────────────────────────────── */
function AssetPicker({ selected, assets, onSelect }: {
  selected: PickAsset;
  assets:   PickAsset[];
  onSelect: (a: PickAsset) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assets.filter((a) =>
      !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    );
  }, [assets, search]);

  return (
    <div style={{ position: "relative" }}>
      <span style={S.label}>Asset & Network</span>
      <motion.button
        onClick={() => { setOpen(!open); setSearch(""); }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%",
          padding: "12px 16px", borderRadius: 16, cursor: "pointer", fontFamily: "inherit",
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
          borderTop: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: NET_BG[selected.network], border: "1px solid rgba(255,255,255,0.09)", borderTop: "1px solid rgba(255,255,255,0.18)" }}>
          <CryptoIcon symbol={selected.symbol} image={selected.image} size={22} />
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{selected.symbol}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: NET_BG[selected.network], color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)", letterSpacing: "0.03em" }}>
              {NET_SHORT[selected.network]}
            </span>
            {selected.isToken && (
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.09)" }}>Token</span>
            )}
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>
            {NET_LABEL[selected.network]} · {formatCrypto(selected.balance, 5)} {selected.symbol}
          </span>
        </div>
        <Icons.chevronD size={15} color="rgba(255,255,255,0.30)" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
              borderRadius: 16, overflow: "hidden",
              background: "rgba(12,12,12,0.96)", border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.10)",
              backdropFilter: "blur(40px)",
            }}
          >
            {/* Search inside picker */}
            {assets.length > 5 && (
              <div style={{ padding: "10px 12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  autoFocus
                  style={{ width: "100%", height: 36, padding: "0 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                />
              </div>
            )}
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {filtered.map((a, i) => (
                <div key={a.id}>
                  <button
                    onClick={() => { onSelect(a); setOpen(false); setSearch(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 16px", cursor: "pointer", background: a.id === selected.id ? "rgba(255,255,255,0.06)" : "transparent", border: "none", fontFamily: "inherit", transition: "background 0.12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = a.id === selected.id ? "rgba(255,255,255,0.06)" : "transparent")}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: NET_BG[a.network] }}>
                      <CryptoIcon symbol={a.symbol} image={a.image} size={20} />
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{a.symbol}</span>
                        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: NET_BG[a.network], color: "rgba(255,255,255,0.50)" }}>{NET_SHORT[a.network]}</span>
                        {a.isToken && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.30)", border: "1px solid rgba(255,255,255,0.08)" }}>Token</span>}
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{formatCrypto(a.balance, 5)} {a.symbol}</span>
                    </div>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>
                      {a.priceUSD > 0 ? formatUSD(a.balance * a.priceUSD) : "Balance only"}
                    </span>
                  </button>
                  {i < filtered.length - 1 && <div style={S.divider} />}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: "20px 16px", fontSize: 13, color: "rgba(255,255,255,0.28)", textAlign: "center" }}>No assets found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Gas Estimate ────────────────────────────────────────────────── */
function GasEstimate({ asset, network }: { asset: PickAsset; network: string }) {
  const [fee, setFee] = useState<number | null>(null);

  useEffect(() => {
    if (asset.network === "bitcoin" || asset.network === "solana") return;
    const net = network as "mainnet" | "testnet";
    const load = () => estimateGasUSD(asset.priceUSD || 2500, net).then(setFee).catch(() => setFee(null));
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [asset, network]);

  if (asset.network === "bitcoin" || asset.network === "solana") {
    return <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>Network fee calculated on send</span>;
  }

  return fee === null
    ? <motion.span animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>Calculating…</motion.span>
    : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>≈ {formatUSD(fee)} network fee</span>;
}

/* ── QR Code ─────────────────────────────────────────────────────── */
function QRDisplay({ value }: { value: string }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: 220, margin: 2,
      color: { dark: "#ffffff", light: "#00000000" },
      errorCorrectionLevel: "M",
    }).then(setSrc).catch(console.error);
  }, [value]);

  if (!src) return <div style={{ width: "min(220px, 68vw)", aspectRatio: "1 / 1" }} />;

  return (
    <motion.img
      src={src} alt="QR Code"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{ width: "min(220px, 68vw)", height: "auto", aspectRatio: "1 / 1", display: "block" }}
    />
  );
}

/* ── Tx Status Tracker ───────────────────────────────────────────── */
function TxTracker({ hash, assetNetwork, network }: { hash: string; assetNetwork: string; network: string }) {
  const [status, setStatus] = useState<TxStatus>("pending");
  const net = network as "mainnet" | "testnet";
  const explorerUrl = EXPLORERS[net]?.[assetNetwork] ?? "";

  useEffect(() => {
    if (assetNetwork === "bitcoin" || assetNetwork === "solana") return;
    const poll = async () => {
      try {
        const { createPublicClient, http } = await import("viem");
        const { sepolia, mainnet, bsc, bscTestnet } = await import("viem/chains");
        const chain = assetNetwork === "bsc"
          ? (net === "testnet" ? bscTestnet : bsc)
          : (net === "testnet" ? sepolia : mainnet);
        const rpc = assetNetwork === "bsc"
          ? (net === "testnet" ? "https://bsc-testnet-dataseed.bnbchain.org" : "https://bsc-dataseed1.binance.org")
          : (net === "testnet" ? "https://ethereum-sepolia.publicnode.com" : "https://ethereum.publicnode.com");
        const client = createPublicClient({ chain, transport: http(rpc) });
        const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null);
        if (receipt) setStatus(receipt.status === "success" ? "confirmed" : "failed");
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 5_000);
    poll();
    return () => clearInterval(id);
  }, [hash, assetNetwork, net]);

  const colors: Record<TxStatus, string> = {
    pending:   "rgba(251,191,36,0.80)",
    confirmed: "rgba(120,220,90,0.90)",
    failed:    "rgba(255,100,100,0.80)",
  };
  const labels: Record<TxStatus, string> = {
    pending:   "Pending confirmation…",
    confirmed: "Confirmed",
    failed:    "Failed",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {status === "pending"
          ? <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: "50%", background: colors.pending, flexShrink: 0 }} />
          : <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status], flexShrink: 0 }} />
        }
        <span style={{ fontSize: 13, fontWeight: 500, color: colors[status] }}>{labels[status]}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hash.slice(0, 20)}…{hash.slice(-10)}
        </span>
        <button onClick={() => navigator.clipboard.writeText(hash)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", padding: 2 }} title="Copy hash">
          <Icons.copy size={13} />
        </button>
        {explorerUrl && (
          <a href={`${explorerUrl}${hash}`} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.35)", display: "flex" }} title="View on explorer">
            <Icons.externalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

/* ── Confirm row ─────────────────────────────────────────────────── */
function Row({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, fontFamily: mono ? "monospace" : "inherit", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

/* ── MAIN ────────────────────────────────────────────────────────── */
export function TransferView() {
  const { assets, evmTokens, splTokens, addresses, mnemonic, network, setTxs, hiddenAssetIds } = useWalletStore();
  const toast = useToast();

  // All picker assets: native + ERC-20 tokens
  const allAssets = useMemo<PickAsset[]>(() => [
    ...assets.filter((a) => !hiddenAssetIds.includes(`native:${a.id}`)).map(fromNative),
    ...evmTokens.filter((t) => !hiddenAssetIds.includes(`evm:${t.chain}:${t.contract.toLowerCase()}`)).map(fromEvmToken),
    ...splTokens.filter((t) => !hiddenAssetIds.includes(`spl:${t.mint}`)).map(fromSplToken),
  ], [assets, evmTokens, splTokens, hiddenAssetIds]);

  const [tab,    setTab]    = useState<Tab>("send");
  const [step,   setStep]   = useState<Step>("form");
  const [asset,  setAsset]  = useState<PickAsset | null>(null);
  const [amount, setAmount] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error,  setError]  = useState("");
  const [loading, setLoading] = useState(false);
  const [gasFee,  setGasFee]  = useState<number | null>(null);
  const pickerAssets = useMemo(() => tab === "send" ? allAssets.filter(canSendAsset) : allAssets, [allAssets, tab]);

  // Initialise asset once assets load
  useEffect(() => {
    if (pickerAssets.length === 0) return;
    const nextAsset = !asset || !pickerAssets.some((a) => a.id === asset.id)
      ? pickerAssets[0]
      : null;
    if (!nextAsset) return;
    queueMicrotask(() => {
      setAsset(nextAsset);
      if (asset) setAmount("");
    });
  }, [pickerAssets, asset]);

  const switchTab = (t: Tab) => { setTab(t); setStep("form"); setError(""); setAmount(""); setToAddr(""); setTxHash(""); };

  const amountNum = parseFloat(amount) || 0;
  const amountUSD = asset ? amountNum * asset.priceUSD : 0;
  const isEVM     = asset?.network === "ethereum" || asset?.network === "bsc";
  const isNativeSend = asset && !asset.isToken && (asset.network === "ethereum" || asset.network === "bsc" || asset.network === "bitcoin" || asset.network === "solana");
  const isEvmTokenSend = !!asset?.isToken && asset.tokenKind === "evm";
  const canSend = !!asset && canSendAsset(asset) && (isNativeSend || isEvmTokenSend);

  const isValidAddr = isEVM
    ? /^0x[0-9a-fA-F]{40}$/.test(toAddr)
    : asset?.network === "bitcoin"
      ? /^(bc1|tb1|[13mn2])[a-zA-HJ-NP-Z0-9]{25,80}$/.test(toAddr)
      : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(toAddr);

  const isValid = amountNum > 0 && !!asset && amountNum <= asset.balance && isValidAddr && canSend;

  const loadGasFee = useCallback(async () => {
    if (!asset || !isEVM) { setGasFee(null); return; }
    const fee = await estimateGasUSD(asset.priceUSD || 2500, network).catch(() => null);
    setGasFee(fee);
  }, [asset, isEVM, network]);

  const goConfirm = async () => { await loadGasFee(); setStep("confirm"); };

  const handleSend = async () => {
    if (!mnemonic || !asset) return;
    if (!canSend) { setError(`${asset.symbol} sending is not available for this asset type`); return; }
    setLoading(true); setError("");
    try {
      const privKey = derivePrivateKey(mnemonic);
      let hash: string;

      if (asset.isToken && asset.contract && asset.decimals !== undefined) {
        hash = await sendErc20({
          privateKey:    privKey,
          tokenContract: asset.contract,
          to:            toAddr as `0x${string}`,
          amount,
          decimals:      asset.decimals,
          chain:         asset.network === "bsc" ? "bsc" : "ethereum",
          net:           network,
        });
      } else if (asset.network === "ethereum") {
        hash = await sendEth({ privateKey: privKey, to: toAddr as `0x${string}`, amount, net: network });
      } else if (asset.network === "bsc") {
        hash = await sendBnb({ privateKey: privKey, to: toAddr as `0x${string}`, amount, net: network });
      } else if (asset.network === "bitcoin") {
        hash = await sendBtc({ mnemonic, to: toAddr, amount, net: network });
      } else {
        hash = await sendSol({ mnemonic, to: toAddr, amount, network });
      }

      setTxHash(hash);
      const pending = {
        hash,
        type: "send" as const,
        asset: asset.symbol,
        amount: amountNum,
        amountUSD,
        from: receiveAddr,
        to: toAddr,
        date: new Date(),
        status: "pending" as const,
        isToken: asset.isToken,
        tokenSymbol: asset.isToken ? asset.symbol : undefined,
        id: `${hash}:pending:${asset.id}`,
      };
      setTxs([pending, ...useWalletStore.getState().transactions.filter((t) => t.hash !== hash)]);
      setStep("done");
      toast("Transaction broadcast!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const receiveAddr = !asset ? ""
    : asset.network === "bitcoin" ? (mnemonic ? bitcoinAddressForNetwork(mnemonic, network) : (addresses?.bitcoin ?? ""))
    : asset.network === "solana"  ? (addresses?.solana   ?? "")
    : asset.network === "bsc"     ? (addresses?.bsc      ?? "")
    :                               (addresses?.ethereum ?? "");

  if (!asset) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}
        style={{ fontSize: 13, color: "rgba(255,255,255,0.30)" }}>Loading assets…</motion.div>
    </div>
  );

  /* ─── SUCCESS ─────────────────────────────────────────────────── */
  if (step === "done") return (
    <div className="view-center-shell" style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
        style={{ maxWidth: 400, width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(120,220,90,0.08)", border: "1px solid rgba(120,220,90,0.25)", borderTop: "1px solid rgba(120,220,90,0.40)", boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(120,220,90,0.15)" }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
            <motion.path d="M5 12l5 5L19 7" stroke="rgba(120,220,90,0.90)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.2 }} />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 300, color: "#fff", letterSpacing: "-0.015em", marginBottom: 6 }}>Sent</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.50)", fontVariantNumeric: "tabular-nums" }}>
            {amount} {asset.symbol}{amountUSD > 0 ? ` · ${formatUSD(amountUSD)}` : ""}
          </div>
        </div>
        <GlassCard elevated style={{ padding: "8px 20px" }}>
          <TxTracker hash={txHash} assetNetwork={asset.network} network={network} />
        </GlassCard>
        <GlassButton variant="default" size="lg" style={{ width: "100%" }} onClick={() => { setStep("form"); setAmount(""); setToAddr(""); setTxHash(""); }}>
          New Transfer
        </GlassButton>
      </motion.div>
    </div>
  );

  /* ─── CONFIRM ─────────────────────────────────────────────────── */
  if (step === "confirm") return (
    <div className="view-center-shell" style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        style={{ maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <span style={S.label}>Confirm Transaction</span>
          <div style={{ fontSize: 26, fontWeight: 300, color: "#fff", letterSpacing: "-0.015em" }}>Review & Send</div>
        </div>
        <GlassCard elevated style={{ padding: "4px 20px" }}>
          <Row label="Asset"       value={`${asset.symbol} · ${NET_LABEL[asset.network]}`} />
          <Row label="Amount"      value={`${amount} ${asset.symbol}`} />
          {amountUSD > 0 && <Row label="Value" value={formatUSD(amountUSD)} />}
          <Row label="To"          value={`${toAddr.slice(0,10)}…${toAddr.slice(-8)}`} mono />
          <Row label="Network fee" value={gasFee ? formatUSD(gasFee) : "Calculated on broadcast"} last />
        </GlassCard>
        {network === "testnet" && (
          <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 12, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.20)" }}>
            <Icons.info size={14} color="rgba(251,191,36,0.80)" />
            <span style={{ fontSize: 12, color: "rgba(251,191,36,0.75)" }}>You are on Testnet. No real funds will move.</span>
          </div>
        )}
        {error && <div style={{ fontSize: 13, color: "rgba(255,100,100,0.85)", padding: "10px 14px", borderRadius: 12, background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.18)" }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <GlassButton variant="ghost" size="lg" style={{ flex: 1 }} onClick={() => { setStep("form"); setError(""); }} disabled={loading}>Cancel</GlassButton>
          <GlassButton variant="primary" size="lg" style={{ flex: 1 }} onClick={handleSend} disabled={loading}>
            {loading ? "Signing…" : "Confirm & Send"}
          </GlassButton>
        </div>
      </motion.div>
    </div>
  );

  /* ─── FORM ────────────────────────────────────────────────────── */
  return (
    <motion.div className="view-shell transfer-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      style={{ padding: "32px 28px", maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Title + Tab toggle */}
      <div className="view-title-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="transfer-title-block">
          <span style={S.label}>Wallet</span>
          <div style={{ fontSize: 28, fontWeight: 300, color: "#fff", letterSpacing: "-0.015em" }}>Transfer</div>
        </div>
        <div className="transfer-tabs" style={{ display: "flex", padding: 3, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3)" }}>
          {(["send","receive"] as Tab[]).map((t) => (
            <div className="transfer-tab-wrap" key={t} style={{ position: "relative" }}>
              {tab === t && (
                <motion.div layoutId="tab-bg" transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  style={{ position: "absolute", inset: 0, borderRadius: 11, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)", borderTop: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)" }} />
              )}
              <button className="transfer-tab-button" onClick={() => switchTab(t)} style={{ position: "relative", zIndex: 1, padding: "7px 18px", borderRadius: 11, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: tab === t ? "#fff" : "rgba(255,255,255,0.35)", transition: "color 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {t === "send" ? <Icons.send size={13} /> : <Icons.receive size={13} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Asset picker */}
      <AssetPicker selected={asset} assets={pickerAssets} onSelect={(a) => { setAsset(a); setAmount(""); }} />

      <AnimatePresence mode="wait">
        {/* ══ SEND ══════════════════════════════════════════════════ */}
        {tab === "send" && (
          <motion.div className="transfer-panel" key="send" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <GlassInput
              label="Recipient address"
              placeholder={isEVM ? "0x…" : "bc1… or 1…"}
              value={toAddr}
              onChange={(e) => { setToAddr(e.target.value); setError(""); }}
            />
            {toAddr.length > 5 && !isValidAddr && (
              <div style={{ fontSize: 12, color: "rgba(255,100,100,0.75)", marginTop: -12 }}>Invalid address format</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <GlassInput
                label={`Amount (${asset.symbol})`}
                placeholder="0.00"
                type="number"
                min="0"
                suffix={asset.symbol}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {amountUSD > 0 && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.26)", fontVariantNumeric: "tabular-nums" }}>≈ {formatUSD(amountUSD)}</span>}
                  <GasEstimate asset={asset} network={network} />
                </div>
                <button onClick={() => setAmount(String(asset.balance))} style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}>
                  Max {formatCrypto(asset.balance, 5)}
                </button>
              </div>
            </div>

            <GlassButton variant="primary" size="lg" style={{ width: "100%" }} disabled={!isValid} onClick={goConfirm}>
              Continue <Icons.chevronR size={14} color="#000" />
            </GlassButton>
          </motion.div>
        )}

        {/* ══ RECEIVE ═══════════════════════════════════════════════ */}
        {tab === "receive" && (
          <motion.div className="transfer-panel" key="receive" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <GlassCard className="receive-card" elevated style={{ overflow: "hidden" }}>
              <div className="receive-card-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "24px 24px 20px" }}>
                <div className="receive-qr-frame" style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.10)", borderTop: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)" }}>
                  <QRDisplay value={receiveAddr} />
                </div>

                <div className="receive-network-pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: NET_BG[asset.network], border: "1px solid rgba(255,255,255,0.09)" }}>
                  <CryptoIcon symbol={asset.symbol} image={asset.image} size={14} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: "0.03em" }}>
                    {NET_LABEL[asset.network]} · {NET_SHORT[asset.network]}
                    {asset.isToken && ` · ${asset.symbol} Token`}
                  </span>
                </div>

                <div className="receive-address-block" style={{ textAlign: "center", width: "100%" }}>
                  <span style={S.label}>Your {asset.isToken ? asset.symbol : asset.symbol} address</span>
                  <div className="receive-address-text" style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.50)", wordBreak: "break-all", lineHeight: 1.7, padding: "0 8px" }}>
                    {receiveAddr}
                  </div>
                </div>

                <div className="receive-actions" style={{ display: "flex", gap: 10, width: "100%" }}>
                  <GlassButton variant="default" size="md" style={{ flex: 1 }} onClick={() => { navigator.clipboard.writeText(receiveAddr); toast(`${asset.symbol} address copied`); }}>
                    <Icons.copy size={13} /> Copy
                  </GlassButton>
                  <GlassButton variant="ghost" size="md" style={{ flex: 1 }} onClick={async () => {
                    const data = { title: `${asset.symbol} address`, text: receiveAddr };
                    if (typeof navigator.share === "function") {
                      await navigator.share(data).catch(() => undefined);
                    } else {
                      await navigator.clipboard.writeText(receiveAddr);
                      toast(`${asset.symbol} address copied`);
                    }
                  }}>
                    <Icons.share size={13} /> Share
                  </GlassButton>
                </div>
              </div>

            </GlassCard>

            {network === "testnet" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 16px", borderRadius: 12, background: "rgba(98,88,255,0.07)", border: "1px solid rgba(98,88,255,0.20)" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(150,140,255,0.85)" }}>Testnet Faucets</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "Sepolia ETH", url: "https://sepoliafaucet.com" },
                    { label: "BSC Testnet", url: "https://testnet.bnbchain.org/faucet-smart" },
                  ].map((f) => (
                    <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "rgba(98,88,255,0.12)", border: "1px solid rgba(98,88,255,0.22)", color: "rgba(150,140,255,0.80)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                      {f.label} <Icons.externalLink size={10} color="rgba(150,140,255,0.60)" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="receive-warning" style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", textAlign: "center", lineHeight: 1.5 }}>
              {asset.isToken
                ? `Send only ${asset.symbol} (${NET_LABEL[asset.network]}) to this address.`
                : `Only send ${asset.symbol} (${NET_LABEL[asset.network]}) to this address.`
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
