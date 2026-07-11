"use client";

import { useMemo, useState } from "react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { Skeleton } from "@/components/common/Skeleton";
import { Icons } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { createMoonPayUrl, createTransakSession } from "@/lib/ecosystem/rampClient";
import type { EcosystemConfigResponse, EcosystemToken, RampProvider } from "@/lib/ecosystem/types";
import type { WalletAddresses } from "@/lib/wallet";
import { EcosystemTokenPicker } from "./EcosystemTokenPicker";
import { ProviderBadge } from "./ProviderBadge";
import { HelpTooltip } from "./HelpTooltip";
import { useI18n } from "@/lib/i18n";

function addressForToken(token: EcosystemToken, addresses: WalletAddresses | null) {
  if (!addresses) return "";
  if (token.chainKey === "bsc") return addresses.bsc;
  if (token.chainKey === "bitcoin") return addresses.bitcoin;
  if (token.chainKey === "solana") return addresses.solana;
  return addresses.ethereum;
}

function providerNetwork(token: EcosystemToken) {
  if (token.chainKey === "bsc") return "bsc";
  if (token.chainKey === "bitcoin") return "bitcoin";
  if (token.chainKey === "solana") return "solana";
  return "ethereum";
}

export function RampPanel({
  config,
  tokens,
  addresses,
}: {
  config: EcosystemConfigResponse | null;
  tokens: EcosystemToken[];
  addresses: WalletAddresses | null;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [provider, setProvider] = useState<RampProvider>("moonpay");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [fiatCurrency, setFiatCurrency] = useState("USD");
  const [fiatAmount, setFiatAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const rampTokens = useMemo(() => tokens.filter((token) => token.isNative || token.chainKey === "ethereum" || token.chainKey === "bsc"), [tokens]);
  const [selectedId, setSelectedId] = useState("");
  const selected = rampTokens.find((token) => token.id === selectedId) ?? rampTokens[0];
  const walletAddress = selected ? addressForToken(selected, addresses) : "";
  const moonPayEnabled = !!config?.moonPayEnabled;
  const transakEnabled = !!config?.transakEnabled;
  const currentEnabled = provider === "moonpay" ? moonPayEnabled : transakEnabled;
  const neitherEnabled = !moonPayEnabled && !transakEnabled;

  const openWidget = async () => {
    if (!selected || !walletAddress) return;
    setLoading(true);
    try {
      const base = {
        mode,
        walletAddress,
        cryptoCurrencyCode: selected.symbol,
        fiatCurrency,
        fiatAmount,
        network: providerNetwork(selected),
        redirectURL: typeof window !== "undefined" ? window.location.href : undefined,
      };
      const url = provider === "moonpay"
        ? (await createMoonPayUrl(base)).url
        : (await createTransakSession(base)).widgetUrl;
      window.open(url, "_blank", "noopener,noreferrer");
      toast(`${provider === "moonpay" ? "MoonPay" : "Transak"} opened`, "info");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Provider unavailable", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!selected) {
    return <div style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,0.30)" }}>{t("No wallet address is available for ramp providers.")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ fontSize: 18, fontWeight: 650, color: "#fff" }}>{t("Buy / Sell")}</div>
          <HelpTooltip label="About buy and sell">
            MoonPay or Transak opens as a third-party provider. Silent Wallet passes your public address only; the provider handles payment, KYC, and order status.
          </HelpTooltip>
        </div>
        <ProviderBadge provider={provider} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {(["moonpay", "transak"] as RampProvider[]).map((item) => {
          const enabled = item === "moonpay" ? moonPayEnabled : transakEnabled;
          return (
            <button
              type="button"
              key={item}
              onClick={() => setProvider(item)}
              style={{ height: 42, borderRadius: 14, border: `1px solid ${provider === item ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)"}`, background: provider === item ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.045)", color: enabled ? "#fff" : "rgba(255,255,255,0.32)", font: "inherit", fontSize: 13, fontWeight: 650, cursor: "pointer" }}
            >
              {item === "moonpay" ? "MoonPay" : "Transak"} {!enabled && "off"}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {(["buy", "sell"] as const).map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setMode(item)}
            style={{ height: 40, borderRadius: 13, border: `1px solid ${mode === item ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.08)"}`, background: mode === item ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)", color: mode === item ? "#fff" : "rgba(255,255,255,0.42)", font: "inherit", fontSize: 13, fontWeight: 650, cursor: "pointer" }}
          >
            {t(item === "buy" ? "Buy" : "Sell")}
          </button>
        ))}
      </div>

      <EcosystemTokenPicker label="Asset" selected={selected} tokens={rampTokens} onSelect={(token) => setSelectedId(token.id)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <GlassInput label="Fiat currency" value={fiatCurrency} onChange={(e) => setFiatCurrency(e.target.value.toUpperCase())} placeholder="USD" />
        <GlassInput label="Fiat amount" type="number" min="0" value={fiatAmount} onChange={(e) => setFiatAmount(e.target.value)} placeholder="100" />
      </div>

      <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="label" style={{ marginBottom: 7 }}>{t("Receiving wallet address")}</div>
        <div style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.55)", overflowWrap: "anywhere" }}>{walletAddress || "No address available"}</div>
      </div>

      {neitherEnabled && (
        <div style={{ display: "flex", gap: 9, padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(251,191,36,0.18)", background: "rgba(251,191,36,0.06)" }}>
          <Icons.info size={15} color="rgba(251,191,36,0.82)" />
          <span style={{ fontSize: 12, color: "rgba(251,210,120,0.76)" }}>{t("MoonPay or Transak is not configured yet.")}</span>
        </div>
      )}

      <GlassButton variant="primary" size="lg" onClick={openWidget} disabled={loading || !currentEnabled || !walletAddress} style={{ width: "100%" }}>
        {`Open ${provider === "moonpay" ? "MoonPay" : "Transak"}`} <Icons.externalLink size={14} color="#000" />
      </GlassButton>
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px" }}>
          <Skeleton width="44%" height={10} radius={6} />
          <Skeleton width="100%" height={9} radius={6} />
        </div>
      )}
    </div>
  );
}
