"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { Skeleton } from "@/components/common/Skeleton";
import { Icons } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { defaultTokensForChain, toLifiTokenAddress } from "@/lib/ecosystem/chains";
import { approveErc20Exact, executeLifiQuote, getErc20Allowance, isNativeEcosystemToken } from "@/lib/ecosystem/executeEvm";
import { logRevenueEvent } from "@/lib/ecosystem/client";
import { getLifiQuote, getLifiRoutes } from "@/lib/ecosystem/lifiClient";
import { formatRawAmount } from "@/lib/ecosystem/fees";
import type { BridgeQuoteResponse, BridgeRoute, EcosystemConfigResponse, EcosystemToken } from "@/lib/ecosystem/types";
import type { WalletAddresses } from "@/lib/wallet";
import type { WalletAddressIndexes } from "@/lib/wallet";
import type { Network } from "@/lib/chains";
import type { SessionMode } from "@/lib/session";
import { TokenAmountInput } from "./TokenAmountInput";
import { EcosystemTokenPicker } from "./EcosystemTokenPicker";
import { QuoteReview } from "./QuoteReview";
import { ExecutionStatus, type ExecutionState } from "./ExecutionStatus";
import { ProviderBadge } from "./ProviderBadge";
import { HelpTooltip } from "./HelpTooltip";

function mergeTokens(tokens: EcosystemToken[], chainId: number) {
  const map = new Map<string, EcosystemToken>();
  for (const token of [...defaultTokensForChain(chainId), ...tokens.filter((item) => item.chainId === chainId)]) {
    map.set(`${token.chainId}:${token.isNative ? "native" : token.address.toLowerCase()}`, token);
  }
  return [...map.values()];
}

function addressForChain(chainId: number, addresses: WalletAddresses | null): `0x${string}` | null {
  if (!addresses) return null;
  if (chainId === 56) return addresses.bsc;
  if (chainId === 1) return addresses.ethereum;
  return null;
}

function rawAmount(amount: string, token: EcosystemToken) {
  if (!amount || Number(amount) <= 0) throw new Error("Enter an amount greater than zero");
  return parseUnits(amount, token.decimals).toString();
}

function RouteSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Skeleton width="32%" height={11} radius={6} />
      {[0, 1, 2].map((index) => (
        <div key={index} style={{ padding: "12px 14px", borderRadius: 15, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 9 }}>
            <Skeleton width="34%" height={12} radius={6} />
            <Skeleton width={62} height={11} radius={6} />
          </div>
          <Skeleton width="74%" height={11} radius={6} />
        </div>
      ))}
    </div>
  );
}

function RouteCard({ route, active, onClick }: { route: BridgeRoute; active: boolean; onClick: () => void }) {
  const minutes = route.estimatedTimeSeconds ? Math.max(1, Math.round(route.estimatedTimeSeconds / 60)) : null;
  return (
    <button type="button" onClick={onClick} style={{ width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 15, border: `1px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)"}`, background: active ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.045)", color: "#fff", fontFamily: "inherit", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{route.tool ?? "LI.FI route"}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.42)" }}>{minutes ? `~${minutes} min` : "Time varies"}</span>
      </div>
      <div style={{ marginTop: 5, fontSize: 12, color: "rgba(255,255,255,0.36)" }}>
        {route.fromAmountUSD ? `$${Number(route.fromAmountUSD).toFixed(2)}` : "Source amount"} → {route.toAmountUSD ? `$${Number(route.toAmountUSD).toFixed(2)}` : "destination amount"}
      </div>
    </button>
  );
}

export function BridgePanel({
  config,
  tokens,
  addresses,
  mnemonic,
  accountIndex,
  addressIndexes,
  sessionMode,
  network,
}: {
  config: EcosystemConfigResponse | null;
  tokens: EcosystemToken[];
  addresses: WalletAddresses | null;
  mnemonic: string | null;
  accountIndex: number;
  addressIndexes: WalletAddressIndexes;
  sessionMode: SessionMode;
  network: Network;
}) {
  const toast = useToast();
  const [fromChainId, setFromChainId] = useState<1 | 56>(1);
  const [toChainId, setToChainId] = useState<1 | 56>(56);
  const fromTokens = useMemo(() => mergeTokens(tokens, fromChainId), [tokens, fromChainId]);
  const toTokens = useMemo(() => mergeTokens(tokens, toChainId), [tokens, toChainId]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [routes, setRoutes] = useState<BridgeRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [quote, setQuote] = useState<BridgeQuoteResponse | null>(null);
  const [allowanceNeeded, setAllowanceNeeded] = useState(false);
  const [approvalBlocked, setApprovalBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [exec, setExec] = useState<ExecutionState>({ status: "idle" });

  const fromToken = fromTokens.find((token) => token.id === fromId) ?? fromTokens[0];
  const toToken = toTokens.find((token) => token.id === toId) ?? toTokens[0];
  const fromAddress = addressForChain(fromChainId, addresses);
  const toAddress = addressForChain(toChainId, addresses);
  const watchOnly = sessionMode === "watch";
  const disabledReason = network === "testnet"
    ? "Bridge is off on testnet."
    : !config?.lifiEnabled
      ? "LI.FI is not configured."
      : !fromAddress || !toAddress
        ? "No EVM address is available."
        : "";

  const clearQuote = () => {
    setRoutes([]);
    setSelectedRouteId("");
    setQuote(null);
    setAllowanceNeeded(false);
    setApprovalBlocked(false);
    setExec({ status: "idle" });
  };

  const switchFromChain = (id: 1 | 56) => {
    setFromChainId(id);
    setToChainId(id === 1 ? 56 : 1);
    setFromId("");
    setToId("");
    clearQuote();
  };

  const requestRoutes = async () => {
    if (!fromToken || !toToken || !fromAddress || !toAddress) return;
    setLoading(true);
    try {
      const fromAmount = rawAmount(amount, fromToken);
      const request = {
        fromChainId,
        toChainId,
        fromTokenAddress: toLifiTokenAddress(fromToken),
        toTokenAddress: toLifiTokenAddress(toToken),
        fromAmount,
        fromAddress,
        toAddress,
        slippage: Number(slippage || "0.5") / 100,
        order: "CHEAPEST" as const,
      };
      const routeResponse = await getLifiRoutes(request);
      setRoutes(routeResponse.routes);
      setSelectedRouteId(routeResponse.routes[0]?.id ?? "");
      const quoteResponse = await getLifiQuote(request);
      setQuote(quoteResponse);
      await logRevenueEvent({ provider: "lifi", action: "quote", chain: `${fromChainId}->${toChainId}`, tokenSymbols: [fromToken.symbol, toToken.symbol], feeBps: config ? Math.round(config.lifiFee * 10_000) : undefined, quoteId: quoteResponse.id });

      if (!isNativeEcosystemToken(toLifiTokenAddress(fromToken))) {
        if (!quoteResponse.approvalTarget) {
          setApprovalBlocked(true);
          setAllowanceNeeded(false);
        } else {
          const allowance = await getErc20Allowance({
            chainId: fromChainId,
            tokenAddress: fromToken.address as `0x${string}`,
            owner: fromAddress,
            spender: quoteResponse.approvalTarget,
          }).catch(() => 0n);
          setAllowanceNeeded(allowance < BigInt(fromAmount));
          setApprovalBlocked(false);
        }
      } else {
        setAllowanceNeeded(false);
        setApprovalBlocked(false);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Route request failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    if (!quote?.approvalTarget || !mnemonic || !fromToken) return;
    setApproving(true);
    setExec({ status: "pending", label: "Approve exact bridge allowance" });
    try {
      const hash = await approveErc20Exact({
        mnemonic,
        accountIndex,
        addressIndex: fromChainId === 56 ? addressIndexes.bsc : addressIndexes.ethereum,
        chainId: fromChainId,
        tokenAddress: fromToken.address as `0x${string}`,
        spender: quote.approvalTarget,
        amount: quote.fromAmount,
      });
      setAllowanceNeeded(false);
      setExec({ status: "success", label: "Approval submitted", txHash: hash, chainId: fromChainId });
      await logRevenueEvent({ provider: "lifi", action: "approve", chain: String(fromChainId), tokenSymbols: [fromToken.symbol], feeBps: config ? Math.round(config.lifiFee * 10_000) : undefined, txHash: hash });
      toast("Approval submitted");
    } catch (error) {
      setExec({ status: "error", error: error instanceof Error ? error.message : "Approval failed" });
    } finally {
      setApproving(false);
    }
  };

  const execute = async () => {
    if (!quote || !mnemonic) return;
    setExecuting(true);
    setExec({ status: "pending", label: "Sign bridge transaction locally" });
    try {
      const hash = await executeLifiQuote({ mnemonic, accountIndex, addressIndex: fromChainId === 56 ? addressIndexes.bsc : addressIndexes.ethereum, quote });
      setExec({ status: "success", label: "Bridge transaction submitted", txHash: hash, chainId: fromChainId });
      await logRevenueEvent({ provider: "lifi", action: "execute", chain: `${fromChainId}->${toChainId}`, tokenSymbols: [fromToken.symbol, toToken.symbol], feeBps: config ? Math.round(config.lifiFee * 10_000) : undefined, quoteId: quote.id, txHash: hash });
      toast("Bridge submitted");
    } catch (error) {
      setExec({ status: "error", error: error instanceof Error ? error.message : "Bridge failed" });
    } finally {
      setExecuting(false);
    }
  };

  if (!fromToken || !toToken) {
    return <div style={{ padding: 28, color: "rgba(255,255,255,0.30)", textAlign: "center" }}>No EVM assets are available for bridge routes.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ fontSize: 18, fontWeight: 650, color: "#fff" }}>Bridge</div>
          <HelpTooltip label="About bridges">
            LI.FI finds EVM bridge routes. Silent Wallet signs only supported local EVM transactions; BTC and Solana bridge execution stays disabled until safe local signing is ready.
          </HelpTooltip>
        </div>
        <ProviderBadge provider="lifi" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {([1, 56] as const).map((id) => (
          <button key={id} type="button" onClick={() => switchFromChain(id)} style={{ height: 40, borderRadius: 13, border: `1px solid ${fromChainId === id ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.08)"}`, background: fromChainId === id ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)", color: fromChainId === id ? "#fff" : "rgba(255,255,255,0.42)", font: "inherit", fontSize: 13, fontWeight: 650, cursor: "pointer" }}>
            From {id === 1 ? "Ethereum" : "BNB Chain"}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.34)", textAlign: "center" }}>
        Destination: {toChainId === 1 ? "Ethereum" : "BNB Chain"}
      </div>

      {disabledReason && (
        <div style={{ display: "flex", gap: 9, padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(251,191,36,0.18)", background: "rgba(251,191,36,0.06)" }}>
          <Icons.info size={15} color="rgba(251,191,36,0.82)" />
          <span style={{ fontSize: 12, color: "rgba(251,210,120,0.76)" }}>{disabledReason}</span>
        </div>
      )}

      {watchOnly && (
        <div style={{ display: "flex", gap: 9, padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.045)" }}>
          <Icons.lock size={15} color="rgba(255,255,255,0.46)" />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.42)" }}>Observer mode cannot sign transactions.</span>
        </div>
      )}

      <TokenAmountInput amount={amount} onAmountChange={(value) => { setAmount(value); clearQuote(); }} selected={fromToken} tokens={fromTokens} onTokenChange={(token) => { setFromId(token.id); clearQuote(); }} tokenLabel="From token" amountLabel="Amount" disabled={!!disabledReason} />
      <EcosystemTokenPicker label="To token" selected={toToken} tokens={toTokens} onSelect={(token) => { setToId(token.id); clearQuote(); }} disabled={!!disabledReason} />
      <GlassInput label="Slippage tolerance" type="number" min="0" max="50" suffix="%" value={slippage} onChange={(e) => { setSlippage(e.target.value); clearQuote(); }} disabled={!!disabledReason} />

      <GlassButton variant="default" size="lg" onClick={requestRoutes} disabled={loading || !!disabledReason || !amount || fromChainId === toChainId} style={{ width: "100%" }}>
        Quote LI.FI routes
      </GlassButton>

      {loading && <RouteSkeleton />}

      {routes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="label">Routes</div>
          {routes.slice(0, 3).map((route) => (
            <RouteCard key={route.id} route={route} active={selectedRouteId === route.id} onClick={() => setSelectedRouteId(route.id)} />
          ))}
        </div>
      )}

      {quote && (
        <QuoteReview
          title="Review bridge quote"
          fees={quote.fees}
          warnings={approvalBlocked ? [...quote.warnings, { code: "approval_target_missing", message: "This ERC-20 route did not include an approval target, so Silent Wallet will not execute it.", severity: "error" }] : quote.warnings}
          rows={[
            { label: "You bridge", value: `${amount} ${fromToken.symbol}` },
            { label: "Estimated receive", value: quote.toAmount ? `${formatRawAmount(quote.toAmount, toToken.decimals)} ${toToken.symbol}` : "Quoted by provider" },
            { label: "Provider", value: "LI.FI" },
          ]}
        >
          <div style={{ display: "grid", gridTemplateColumns: allowanceNeeded ? "1fr 1fr" : "1fr", gap: 10 }}>
            {allowanceNeeded && (
              <GlassButton variant="default" size="lg" onClick={approve} disabled={approving || watchOnly || !mnemonic}>
                {approving ? "Approving..." : "Approve exact amount"}
              </GlassButton>
            )}
            <GlassButton variant="primary" size="lg" onClick={execute} disabled={executing || watchOnly || !mnemonic || allowanceNeeded || approvalBlocked || !quote.transaction}>
              {executing ? "Signing..." : "Confirm bridge"}
            </GlassButton>
          </div>
        </QuoteReview>
      )}

      <ExecutionStatus state={exec} />
    </div>
  );
}
