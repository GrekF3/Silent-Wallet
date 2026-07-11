"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput }  from "@/components/ui/GlassInput";
import { Icons }       from "@/components/ui/Icon";
import { CryptoIcon }  from "@/components/ui/CryptoIcon";
import { useWalletStore } from "@/lib/store";
import { deriveNetworkAddress, derivePrivateKey } from "@/lib/wallet";
import { sendEth, sendBnb, sendErc20, estimateGasUSD } from "@/lib/chains";
import { bitcoinAddressForNetwork, sendBtc } from "@/lib/bitcoin";
import { sendSol } from "@/lib/solana";
import { formatUSD, formatCrypto, shortenAddress } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import type { AssetInfo, AssetRef } from "@/lib/store";
import type { EvmToken } from "@/lib/tokens";
import type { SplToken } from "@/lib/solana";
import { useAddressBook } from "@/lib/addressBook/storage";
import { buildTransactionWarnings } from "@/lib/transactions/review";
import { TransactionReview } from "@/components/wallet/TransactionReview";
import { TransactionTemplates } from "@/components/transactions/TransactionTemplates";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton, SkeletonPanel } from "@/components/common/Skeleton";
import { useI18n } from "@/lib/i18n";
import { createAccountAddressSlot, useAccountAddressSlots, useWalletAccounts } from "@/lib/accounts/storage";
import type { AccountAddressNetwork, WalletAccount } from "@/lib/accounts/types";
import { usePremium } from "@/lib/premium/entitlements";

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
  ref:      AssetRef;
  tokenKind?: "evm" | "spl";
  contract?: `0x${string}`;
  decimals?: number;
};

function fromNative(a: AssetInfo): PickAsset {
  return { id: a.id, symbol: a.symbol, name: a.name, balance: a.balance, priceUSD: a.priceUSD, network: a.network, image: a.image, isToken: false, ref: { kind: "native", id: a.id, network: a.network } };
}
function fromEvmToken(t: EvmToken): PickAsset {
  const network = t.chain === "bsc" ? "bsc" : "ethereum";
  return {
    id: `tok_${t.contract}`, symbol: t.symbol, name: t.name,
    balance: t.balance, priceUSD: t.priceUSD,
    network,
    image: t.image, isToken: true, tokenKind: "evm",
    ref: { kind: "evm", id: t.contract.toLowerCase(), network },
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
    ref: { kind: "spl", id: t.mint, network: "solana" },
  };
}

function canSendAsset(asset: PickAsset) {
  return !asset.isToken || asset.tokenKind === "evm";
}

function sameAssetRef(asset: PickAsset, ref: AssetRef) {
  return asset.ref.kind === ref.kind && asset.ref.network === ref.network && asset.ref.id.toLowerCase() === ref.id.toLowerCase();
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
  const { t } = useI18n();
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
      <span style={S.label}>{t("Asset & Network")}</span>
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
        <div style={{ width: 42, height: 42, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CryptoIcon symbol={selected.symbol} image={selected.image} size={34} />
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
                  placeholder={t("Search…")}
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
                    <div style={{ width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CryptoIcon symbol={a.symbol} image={a.image} size={31} />
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
                <div style={{ padding: "20px 16px", fontSize: 13, color: "rgba(255,255,255,0.28)", textAlign: "center" }}>{t("No assets found")}</div>
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
  const { t } = useI18n();
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
    return <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>{t("Network fee calculated on send")}</span>;
  }

  return fee === null
    ? <Skeleton width={146} height={12} radius={6} />
    : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>≈ {formatUSD(fee)} network fee</span>;
}

function AddressSlotSelector({ assetNetwork, activeNetwork }: { assetNetwork: AccountAddressNetwork; activeNetwork: "mainnet" | "testnet" }) {
  const { mnemonic, activeAccountIndex, activeAddressIndexes, setActiveAddressIndex, setView } = useWalletStore();
  const slots = useAccountAddressSlots(activeAccountIndex, assetNetwork);
  const premium = usePremium();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const selectedIndex = activeAddressIndexes[assetNetwork] ?? 0;
  const selectedSlot = slots.find((slot) => slot.addressIndex === selectedIndex) ?? slots[0];

  const addressForSlot = useCallback((addressIndex: number) => {
    if (!mnemonic) return "";
    if (assetNetwork === "bitcoin") return bitcoinAddressForNetwork(mnemonic, activeNetwork, activeAccountIndex, addressIndex);
    return deriveNetworkAddress(mnemonic, assetNetwork, activeAccountIndex, addressIndex);
  }, [activeAccountIndex, activeNetwork, assetNetwork, mnemonic]);

  const selectedAddress = selectedSlot ? addressForSlot(selectedSlot.addressIndex) : "";

  const copy = async (address: string) => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast(`${NET_LABEL[assetNetwork]} address copied`);
  };

  const addAddress = () => {
    if (!premium.hasEntitlement("pro.accounts.addressSeparation")) {
      setView("premium");
      return;
    }
    const slot = createAccountAddressSlot(activeAccountIndex, assetNetwork);
    setActiveAddressIndex(assetNetwork, slot.addressIndex);
    setOpen(false);
    toast(`${NET_LABEL[assetNetwork]} address created`);
  };

  if (!mnemonic) return null;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span style={S.label}>{NET_LABEL[assetNetwork]} address</span>
        <button
          type="button"
          onClick={addAddress}
          title="Create new address"
          style={{ width: 28, height: 28, borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.56)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <Icons.plus size={13} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{ width: "100%", minHeight: 58, display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 15, border: "1px solid rgba(255,255,255,0.10)", borderTop: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.052)", color: "#fff", font: "inherit", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 750, color: "#fff" }}>{selectedSlot?.label ?? "Primary"}</span>
          <span style={{ display: "block", marginTop: 2, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.34)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedAddress ? shortenAddress(selectedAddress, 8) : "Address unavailable"}
          </span>
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => { event.stopPropagation(); void copy(selectedAddress); }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); void copy(selectedAddress); } }}
          style={{ width: 30, height: 30, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.045)", color: "rgba(255,255,255,0.42)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Icons.copy size={12} />
        </span>
        <Icons.chevronD size={13} color="rgba(255,255,255,0.32)" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 8px)", zIndex: 90, padding: 8, borderRadius: 16, background: "rgba(12,12,12,0.98)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 18px 48px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.08)", backdropFilter: "blur(38px)" }}
          >
            {slots.map((slot) => {
              const address = addressForSlot(slot.addressIndex);
              const active = slot.addressIndex === selectedIndex;
              return (
                <div key={slot.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center", padding: 6, borderRadius: 12, background: active ? "rgba(255,255,255,0.07)" : "transparent" }}>
                  <button
                    type="button"
                    onClick={() => { setActiveAddressIndex(assetNetwork, slot.addressIndex); setOpen(false); }}
                    style={{ minWidth: 0, display: "block", border: "none", background: "transparent", color: "#fff", font: "inherit", cursor: "pointer", textAlign: "left" }}
                  >
                    <span style={{ display: "block", fontSize: 12, fontWeight: 750 }}>{slot.label}</span>
                    <span style={{ display: "block", marginTop: 2, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.32)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortenAddress(address, 8)}</span>
                  </button>
                  <button type="button" onClick={() => void copy(address)} style={{ width: 30, height: 30, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.045)", color: "rgba(255,255,255,0.42)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Icons.copy size={12} />
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OwnAccountRecipients({
  accounts,
  activeAccountIndex,
  mnemonic,
  assetNetwork,
  activeNetwork,
  onSelect,
}: {
  accounts: WalletAccount[];
  activeAccountIndex: number;
  mnemonic: string | null;
  assetNetwork: AccountAddressNetwork;
  activeNetwork: "mainnet" | "testnet";
  onSelect: (address: string, accountName: string) => void;
}) {
  const { t } = useI18n();
  const targets = useMemo(() => {
    if (!mnemonic) return [];
    return accounts
      .filter((account) => !account.archived && account.index !== activeAccountIndex)
      .map((account) => ({
        account,
        address: assetNetwork === "bitcoin"
          ? bitcoinAddressForNetwork(mnemonic, activeNetwork, account.index, 0)
          : deriveNetworkAddress(mnemonic, assetNetwork, account.index, 0),
      }));
  }, [accounts, activeAccountIndex, activeNetwork, assetNetwork, mnemonic]);

  if (targets.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: -8 }}>
      <span style={{ ...S.label, marginBottom: 0 }}>{t("Own accounts")}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {targets.slice(0, 5).map(({ account, address }) => (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect(address, account.name)}
            title={address}
            style={{ height: 31, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.045)", color: "rgba(255,255,255,0.50)", font: "inherit", fontSize: 12, cursor: "pointer" }}
          >
            <Icons.wallet size={12} />
            {account.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── QR Code ─────────────────────────────────────────────────────── */
function QRDisplay({ value }: { value: string }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) => QRCode.toDataURL(value, {
        width: 220, margin: 2,
        color: { dark: "#ffffff", light: "#00000000" },
        errorCorrectionLevel: "M",
      }))
      .then((nextSrc) => {
        if (!cancelled) setSrc(nextSrc);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) return <Skeleton width="min(220px, 68vw)" height="auto" radius={14} style={{ aspectRatio: "1 / 1" }} />;

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
  const { t } = useI18n();
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
        <button onClick={() => navigator.clipboard.writeText(hash)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", padding: 2 }} title={t("Copy hash")}>
          <Icons.copy size={13} />
        </button>
        {explorerUrl && (
          <a href={`${explorerUrl}${hash}`} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.35)", display: "flex" }} title={t("View on explorer")}>
            <Icons.externalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

/* ── MAIN ────────────────────────────────────────────────────────── */
export function TransferView() {
  const { t: tr } = useI18n();
  const { assets, evmTokens, splTokens, addresses, mnemonic, network, activeAccountIndex, activeAddressIndexes, setTxs, hiddenAssetIds, transferIntent, clearTransferIntent, transactions, loading: walletLoading, initialLoaded } = useWalletStore();
  const toast = useToast();
  const addressBook = useAddressBook();
  const accounts = useWalletAccounts();

  // All picker assets: native + ERC-20 tokens
  const allAssets = useMemo<PickAsset[]>(() => [
    ...assets.filter((a) => !hiddenAssetIds.includes(`native:${a.id}`)).map(fromNative),
    ...evmTokens.filter((t) => !hiddenAssetIds.includes(`evm:${t.chain}:${t.contract.toLowerCase()}`)).map(fromEvmToken),
    ...splTokens.filter((t) => !hiddenAssetIds.includes(`spl:${t.mint}`)).map(fromSplToken),
  ], [assets, evmTokens, splTokens, hiddenAssetIds]);

  const [tab,    setTab]    = useState<Tab>("send");
  const [step,   setStep]   = useState<Step>("form");
  const [selectedAsset, setSelectedAsset] = useState<PickAsset | null>(null);
  const [amount, setAmount] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error,  setError]  = useState("");
  const [loading, setLoading] = useState(false);
  const [gasFee,  setGasFee]  = useState<number | null>(null);
  const pickerAssets = useMemo(() => tab === "send" ? allAssets.filter(canSendAsset) : allAssets, [allAssets, tab]);
  const effectiveAsset = selectedAsset && pickerAssets.some((candidate) => candidate.id === selectedAsset.id)
    ? selectedAsset
    : pickerAssets[0] ?? null;

  useEffect(() => {
    if (!transferIntent || allAssets.length === 0) return;

    const targetAsset = allAssets.find((candidate) => sameAssetRef(candidate, transferIntent.assetRef));
    const nextTab = transferIntent.tab === "send" && targetAsset && !canSendAsset(targetAsset) ? "receive" : transferIntent.tab;

    queueMicrotask(() => {
      setTab(nextTab);
      setStep("form");
      setAmount("");
      setToAddr("");
      setTxHash("");
      setError("");
      if (targetAsset) setSelectedAsset(targetAsset);
      clearTransferIntent();
    });
  }, [allAssets, clearTransferIntent, transferIntent]);

  // Initialise asset once assets load
  useEffect(() => {
    if (transferIntent) return;
    if (pickerAssets.length === 0) return;
    const nextAsset = !selectedAsset || !pickerAssets.some((a) => a.id === selectedAsset.id)
      ? pickerAssets[0]
      : null;
    if (!nextAsset) return;
    queueMicrotask(() => {
      setSelectedAsset(nextAsset);
      if (selectedAsset) setAmount("");
    });
  }, [pickerAssets, selectedAsset, transferIntent]);

  const switchTab = (t: Tab) => { setTab(t); setStep("form"); setError(""); setAmount(""); setToAddr(""); setTxHash(""); };

  const amountNum = parseFloat(amount) || 0;
  const activeAccount = accounts.find((account) => account.index === activeAccountIndex);
  const activeAssetAddressIndex = effectiveAsset ? activeAddressIndexes[effectiveAsset.network] ?? 0 : 0;
  const amountUSD = effectiveAsset ? amountNum * effectiveAsset.priceUSD : 0;
  const isEVM     = effectiveAsset?.network === "ethereum" || effectiveAsset?.network === "bsc";
  const isNativeSend = effectiveAsset && !effectiveAsset.isToken && (effectiveAsset.network === "ethereum" || effectiveAsset.network === "bsc" || effectiveAsset.network === "bitcoin" || effectiveAsset.network === "solana");
  const isEvmTokenSend = !!effectiveAsset?.isToken && effectiveAsset.tokenKind === "evm";
  const canSend = !!effectiveAsset && canSendAsset(effectiveAsset) && (isNativeSend || isEvmTokenSend);

  const isValidAddr = isEVM
    ? /^0x[0-9a-fA-F]{40}$/.test(toAddr)
    : effectiveAsset?.network === "bitcoin"
      ? /^(bc1|tb1|[13mn2])[a-zA-HJ-NP-Z0-9]{25,80}$/.test(toAddr)
      : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(toAddr);

  const isValid = amountNum > 0 && !!effectiveAsset && amountNum <= effectiveAsset.balance && isValidAddr && canSend;
  const savedRecipient = addressBook.find((contact) => {
    const sameAddress = contact.address.toLowerCase() === toAddr.trim().toLowerCase();
    const sameNetwork = contact.network === "any" || contact.network === effectiveAsset?.network;
    return sameAddress && sameNetwork;
  });

  const loadGasFee = useCallback(async () => {
    if (!effectiveAsset || !isEVM) { setGasFee(null); return; }
    const fee = await estimateGasUSD(effectiveAsset.priceUSD || 2500, network).catch(() => null);
    setGasFee(fee);
  }, [effectiveAsset, isEVM, network]);

  const goConfirm = async () => { await loadGasFee(); setStep("confirm"); };

  const handleSend = async () => {
    const selectedAsset = effectiveAsset;
    if (!mnemonic || !selectedAsset) return;
    if (!canSend) { setError(`${selectedAsset.symbol} sending is not available for this asset type`); return; }
    setLoading(true); setError("");
    try {
      const privKey = derivePrivateKey(mnemonic, activeAccountIndex, activeAssetAddressIndex);
      let hash: string;

      if (selectedAsset.isToken && selectedAsset.contract && selectedAsset.decimals !== undefined) {
        hash = await sendErc20({
          privateKey:    privKey,
          tokenContract: selectedAsset.contract,
          to:            toAddr as `0x${string}`,
          amount,
          decimals:      selectedAsset.decimals,
          chain:         selectedAsset.network === "bsc" ? "bsc" : "ethereum",
          net:           network,
        });
      } else if (selectedAsset.network === "ethereum") {
        hash = await sendEth({ privateKey: privKey, to: toAddr as `0x${string}`, amount, net: network });
      } else if (selectedAsset.network === "bsc") {
        hash = await sendBnb({ privateKey: privKey, to: toAddr as `0x${string}`, amount, net: network });
      } else if (selectedAsset.network === "bitcoin") {
        hash = await sendBtc({ mnemonic, to: toAddr, amount, net: network, accountIndex: activeAccountIndex, addressIndex: activeAddressIndexes.bitcoin });
      } else {
        hash = await sendSol({ mnemonic, to: toAddr, amount, network, accountIndex: activeAccountIndex, addressIndex: activeAddressIndexes.solana });
      }

      setTxHash(hash);
      const pending = {
        hash,
        type: "send" as const,
        asset: selectedAsset.symbol,
        amount: amountNum,
        amountUSD,
        from: receiveAddr,
        to: toAddr,
        date: new Date(),
        status: "pending" as const,
        isToken: selectedAsset.isToken,
        tokenSymbol: selectedAsset.isToken ? selectedAsset.symbol : undefined,
        id: `${hash}:pending:${selectedAsset.id}`,
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

  const receiveAddr = !effectiveAsset ? ""
    : effectiveAsset.network === "bitcoin" ? (mnemonic ? bitcoinAddressForNetwork(mnemonic, network, activeAccountIndex, activeAddressIndexes.bitcoin) : (addresses?.bitcoin ?? ""))
    : effectiveAsset.network === "solana"  ? (addresses?.solana   ?? "")
    : effectiveAsset.network === "bsc"     ? (addresses?.bsc      ?? "")
    :                               (addresses?.ethereum ?? "");

  if (!effectiveAsset) return (
    <motion.div className="view-shell transfer-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      style={{ padding: "30px 20px", maxWidth: 480, display: "flex", flexDirection: "column", gap: 18 }}>
      {walletLoading || !initialLoaded ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              <Skeleton width={110} height={10} radius={6} />
              <Skeleton width={150} height={32} radius={10} />
            </div>
            <Skeleton width={158} height={42} radius={14} />
          </div>
          <SkeletonPanel rows={5} />
        </>
      ) : (
        <EmptyState
          icon="wallet"
          title={tr("No transferable assets")}
          body={tr("Receive crypto or switch to another account before starting a transfer.")}
        />
      )}
    </motion.div>
  );

  const asset = effectiveAsset;

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
          <div style={{ fontSize: 26, fontWeight: 300, color: "#fff", letterSpacing: "-0.015em", marginBottom: 6 }}>{tr("Sent")}</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.50)", fontVariantNumeric: "tabular-nums" }}>
            {amount} {asset.symbol}{amountUSD > 0 ? ` · ${formatUSD(amountUSD)}` : ""}
          </div>
        </div>
        <GlassCard elevated style={{ padding: "8px 20px" }}>
          <TxTracker hash={txHash} assetNetwork={asset.network} network={network} />
        </GlassCard>
        <GlassButton variant="default" size="lg" style={{ width: "100%" }} onClick={() => { setStep("form"); setAmount(""); setToAddr(""); setTxHash(""); }}>
          {tr("New Transfer")}
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
          <span style={S.label}>{tr("Confirm Transaction")}</span>
          <div style={{ fontSize: 26, fontWeight: 300, color: "#fff", letterSpacing: "-0.015em" }}>{tr("Review & Send")}</div>
        </div>
        <TransactionReview
          amount={amount}
          asset={asset.symbol}
          value={amountUSD > 0 ? formatUSD(amountUSD) : undefined}
          recipient={toAddr}
          network={NET_LABEL[asset.network]}
          sourceAccount={activeAccount ? `${activeAccount.name}${activeAssetAddressIndex > 0 ? ` / Address ${activeAssetAddressIndex + 1}` : ""}` : undefined}
          fee={gasFee ? formatUSD(gasFee) : "Calculated on broadcast"}
          contactName={savedRecipient?.name}
          warnings={buildTransactionWarnings({
            amount: amountNum,
            amountText: amount,
            assetSymbol: asset.symbol,
            assetBalance: asset.balance,
            recipient: toAddr,
            networkLabel: NET_LABEL[asset.network],
            estimatedFee: gasFee ? formatUSD(gasFee) : undefined,
            amountUSD,
            watchOnly: false,
            addressBookContact: savedRecipient,
            transactions,
          })}
        />
        {network === "testnet" && (
          <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 12, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.20)" }}>
            <Icons.info size={14} color="rgba(251,191,36,0.80)" />
            <span style={{ fontSize: 12, color: "rgba(251,191,36,0.75)" }}>{tr("You are on Testnet. No real funds will move.")}</span>
          </div>
        )}
        {error && <div style={{ fontSize: 13, color: "rgba(255,100,100,0.85)", padding: "10px 14px", borderRadius: 12, background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.18)" }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <GlassButton variant="ghost" size="lg" style={{ flex: 1 }} onClick={() => { setStep("form"); setError(""); }} disabled={loading}>{tr("Cancel")}</GlassButton>
          <GlassButton variant="primary" size="lg" style={{ flex: 1 }} onClick={handleSend} disabled={loading}>
            {tr(loading ? "Signing…" : "Confirm & Send")}
          </GlassButton>
        </div>
      </motion.div>
    </div>
  );

  /* ─── FORM ────────────────────────────────────────────────────── */
  return (
    <motion.div className="view-shell transfer-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      style={{ padding: "30px 20px", maxWidth: 480, display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Title + Tab toggle */}
      <div className="view-title-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div className="transfer-title-block">
          <span style={S.label}>{tr("Wallet transfer")}</span>
          <div style={{ fontSize: 30, fontWeight: 300, color: "#fff", letterSpacing: 0 }}>{tr("Transfer")}</div>
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
                {tr(t === "send" ? "Send" : "Receive")}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Asset picker */}
      <AssetPicker selected={asset} assets={pickerAssets} onSelect={(a) => { setSelectedAsset(a); setAmount(""); }} />
      {asset && mnemonic && <AddressSlotSelector assetNetwork={asset.network} activeNetwork={network} />}

      <AnimatePresence mode="wait">
        {/* ══ SEND ══════════════════════════════════════════════════ */}
        {tab === "send" && (
          <motion.div className="transfer-panel" key="send" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <GlassInput
              label={tr("Recipient address")}
              placeholder={isEVM ? "0x…" : "bc1… or 1…"}
              value={toAddr}
              onChange={(e) => { setToAddr(e.target.value); setError(""); }}
            />
            <OwnAccountRecipients
              accounts={accounts}
              activeAccountIndex={activeAccountIndex}
              mnemonic={mnemonic}
              assetNetwork={asset.network}
              activeNetwork={network}
              onSelect={(address, accountName) => {
                setToAddr(address);
                setError("");
                toast(`Recipient set to ${accountName}`);
              }}
            />
            {addressBook.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: -10 }}>
                {addressBook
                  .filter((contact) => contact.network === "any" || contact.network === asset.network)
                  .slice(0, 4)
                  .map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setToAddr(contact.address)}
                      style={{ height: 30, padding: "0 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.045)", color: "rgba(255,255,255,0.46)", font: "inherit", fontSize: 12, cursor: "pointer" }}
                    >
                      {contact.name}
                    </button>
                  ))}
              </div>
            )}
            {toAddr.length > 5 && !isValidAddr && (
              <div style={{ fontSize: 12, color: "rgba(255,100,100,0.75)", marginTop: -12 }}>{tr("Invalid address format")}</div>
            )}
            {toAddr.length > 5 && isValidAddr && savedRecipient && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: -12 }}>
                Sending to {savedRecipient.name}{savedRecipient.trusted ? " · trusted" : ""}
              </div>
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
              {tr("Continue")} <Icons.chevronR size={14} color="#000" />
            </GlassButton>
            <TransactionTemplates recipient={toAddr} assetSymbol={asset.symbol} network={NET_LABEL[asset.network]} onUse={(recipient) => setToAddr(recipient)} />
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
                  <CryptoIcon symbol={asset.symbol} image={asset.image} size={18} />
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
                    <Icons.copy size={13} /> {tr("Copy")}
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
                    <Icons.share size={13} /> {tr("Share")}
                  </GlassButton>
                </div>
              </div>

            </GlassCard>

            {network === "testnet" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 16px", borderRadius: 12, background: "rgba(98,88,255,0.07)", border: "1px solid rgba(98,88,255,0.20)" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(150,140,255,0.85)" }}>{tr("Testnet Faucets")}</span>
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
