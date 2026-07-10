"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton, SkeletonPanel } from "@/components/common/Skeleton";
import { Icons } from "@/components/ui/Icon";
import { useWalletStore, type EcosystemTab, type AssetInfo } from "@/lib/store";
import { getEcosystemConfig } from "@/lib/ecosystem/client";
import { defaultTokensForChain, ZEROX_NATIVE_TOKEN } from "@/lib/ecosystem/chains";
import type { EcosystemConfigResponse, EcosystemToken } from "@/lib/ecosystem/types";
import type { EvmToken } from "@/lib/tokens";
import type { SplToken } from "@/lib/solana";
import { RampPanel } from "./RampPanel";
import { SwapPanel } from "./SwapPanel";
import { BridgePanel } from "./BridgePanel";
import { HelpTooltip } from "./HelpTooltip";

const TABS: { id: EcosystemTab; label: string; icon: keyof typeof Icons }[] = [
  { id: "ramp", label: "Buy / Sell", icon: "wallet" },
  { id: "swap", label: "Swap", icon: "swap" },
  { id: "bridge", label: "Bridge", icon: "globe" },
];

function nativeDecimals(asset: AssetInfo) {
  if (asset.network === "bitcoin") return 8;
  if (asset.network === "solana") return 9;
  return 18;
}

function nativeTokenFromAsset(asset: AssetInfo): EcosystemToken {
  const chainId = asset.network === "ethereum" ? 1 : asset.network === "bsc" ? 56 : undefined;
  return {
    id: `${asset.network}:native`,
    chainKey: asset.network,
    chainId,
    address: chainId ? ZEROX_NATIVE_TOKEN : "native",
    symbol: asset.symbol,
    name: asset.name,
    decimals: nativeDecimals(asset),
    logoURI: asset.image,
    isNative: true,
    balance: asset.balance,
    priceUSD: asset.priceUSD,
    source: "wallet",
  };
}

function evmTokenFromStore(token: EvmToken): EcosystemToken {
  return {
    id: `${token.chain}:${token.contract.toLowerCase()}`,
    chainKey: token.chain,
    chainId: token.chain === "bsc" ? 56 : 1,
    address: token.contract,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    logoURI: token.image,
    isNative: false,
    balance: token.balance,
    priceUSD: token.priceUSD,
    source: "wallet",
  };
}

function splTokenFromStore(token: SplToken): EcosystemToken {
  return {
    id: `solana:${token.mint}`,
    chainKey: "solana",
    address: token.mint,
    symbol: token.symbol ?? token.mint.slice(0, 6),
    name: token.name ?? token.mint,
    decimals: token.decimals,
    logoURI: token.logoURI,
    isNative: false,
    balance: token.amount,
    priceUSD: token.priceUSD,
    source: "wallet",
    unsupportedReason: "local_signing_unavailable",
  };
}

function mergeTokenList(tokens: EcosystemToken[]) {
  const map = new Map<string, EcosystemToken>();
  for (const token of tokens) {
    const key = `${token.chainKey}:${token.chainId ?? "none"}:${token.isNative ? "native" : token.address.toLowerCase()}`;
    const existing = map.get(key);
    map.set(key, existing ? { ...token, ...existing, balance: existing.balance ?? token.balance, priceUSD: existing.priceUSD ?? token.priceUSD } : token);
  }
  return [...map.values()];
}

function fallbackRampTokens(): EcosystemToken[] {
  return [
    {
      id: "bitcoin:native",
      chainKey: "bitcoin",
      address: "native",
      symbol: "BTC",
      name: "Bitcoin",
      decimals: 8,
      isNative: true,
      source: "default",
    },
    {
      id: "solana:native",
      chainKey: "solana",
      address: "native",
      symbol: "SOL",
      name: "Solana",
      decimals: 9,
      isNative: true,
      source: "default",
    },
  ];
}

export function EcosystemView() {
  const {
    assets,
    evmTokens,
    splTokens,
    addresses,
    mnemonic,
    sessionMode,
    network,
    activeAccountIndex,
    activeAddressIndexes,
    ecosystemTab,
    setEcosystemTab,
    setView,
  } = useWalletStore();
  const [config, setConfig] = useState<EcosystemConfigResponse | null>(null);
  const [configError, setConfigError] = useState("");
  const configLoading = config === null && !configError;

  useEffect(() => {
    let alive = true;
    getEcosystemConfig()
      .then((value) => { if (alive) setConfig(value); })
      .catch((error) => { if (alive) setConfigError(error instanceof Error ? error.message : "Unable to load Web3 config"); });
    return () => { alive = false; };
  }, []);

  const tokens = useMemo(() => mergeTokenList([
    ...defaultTokensForChain(1),
    ...defaultTokensForChain(56),
    ...fallbackRampTokens(),
    ...assets.map(nativeTokenFromAsset),
    ...evmTokens.map(evmTokenFromStore),
    ...splTokens.map(splTokenFromStore),
  ]), [assets, evmTokens, splTokens]);

  return (
    <motion.div className="view-shell ecosystem-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      style={{ padding: "32px 28px", maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div>
          <span className="label">Web3 ecosystem</span>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 28, fontWeight: 300, color: "#fff", letterSpacing: 0 }}>Web3</div>
            <HelpTooltip label="About Web3">
              Buy, sell, swap, and bridge from Silent Wallet. Providers receive only public quote details; your seed phrase and private keys stay on this device.
            </HelpTooltip>
          </div>
        </div>
      </div>

      <GlassCard style={{ padding: 16, borderRadius: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Icons.info size={15} color="rgba(255,255,255,0.46)" />
          <div style={{ fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.36)" }}>
            Buy, sell, swap, and bridge are provider surfaces. They use public quote details and the active account address. Private keys stay on this device; unsupported or unconfigured providers remain disabled.
            <button type="button" onClick={() => setView("learn")} style={{ marginLeft: 8, padding: 0, border: "none", background: "transparent", color: "rgba(255,255,255,0.62)", font: "inherit", cursor: "pointer" }}>
              Open Academy
            </button>
          </div>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 4, borderRadius: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }}>
          {TABS.map((tab) => {
            const Icon = Icons[tab.icon];
            const active = ecosystemTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEcosystemTab(tab.id)}
                style={{ height: 42, borderRadius: 12, border: `1px solid ${active ? "rgba(255,255,255,0.14)" : "transparent"}`, background: active ? "rgba(255,255,255,0.10)" : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.38)", font: "inherit", fontSize: 13, fontWeight: 650, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer" }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {configError && (
        <div style={{ display: "flex", gap: 9, padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,80,80,0.18)", background: "rgba(255,60,60,0.06)" }}>
          <Icons.info size={15} color="rgba(255,100,100,0.82)" />
          <span style={{ fontSize: 12, color: "rgba(255,130,130,0.80)" }}>{configError}</span>
        </div>
      )}

      <GlassCard elevated style={{ padding: 18, borderRadius: 20 }}>
        {configLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Skeleton width={120} height={20} radius={8} />
              <Skeleton width={88} height={26} radius={13} />
            </div>
            <SkeletonPanel rows={6} />
          </div>
        ) : (
          <>
            {ecosystemTab === "ramp" && <RampPanel config={config} tokens={tokens} addresses={addresses} />}
            {ecosystemTab === "swap" && <SwapPanel config={config} tokens={tokens} addresses={addresses} mnemonic={mnemonic} accountIndex={activeAccountIndex} addressIndexes={activeAddressIndexes} sessionMode={sessionMode} network={network} />}
            {ecosystemTab === "bridge" && <BridgePanel config={config} tokens={tokens} addresses={addresses} mnemonic={mnemonic} accountIndex={activeAccountIndex} addressIndexes={activeAddressIndexes} sessionMode={sessionMode} network={network} />}
          </>
        )}
      </GlassCard>
    </motion.div>
  );
}
