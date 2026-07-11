"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { Skeleton } from "@/components/common/Skeleton";
import { Icons } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { defaultTokensForChain, toZeroXTokenAddress } from "@/lib/ecosystem/chains";
import { approveErc20Exact, executeZeroXQuote, getErc20Allowance, isNativeEcosystemToken } from "@/lib/ecosystem/executeEvm";
import { logRevenueEvent } from "@/lib/ecosystem/client";
import { getZeroXQuote } from "@/lib/ecosystem/zeroXClient";
import { formatRawAmount } from "@/lib/ecosystem/fees";
import type { EcosystemConfigResponse, EcosystemToken, SwapQuoteResponse } from "@/lib/ecosystem/types";
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

function quoteMovedMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("0x97a6f3b9") || message.includes("TooMuchSlippage")
    ? "Quote moved before execution. Get a fresh quote or increase slippage, then try again."
    : error instanceof Error ? error.message : "Swap failed";
}

function QuoteSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <Skeleton width="42%" height={12} radius={6} />
      <Skeleton width="100%" height={38} radius={12} />
      <Skeleton width="100%" height={38} radius={12} />
      <Skeleton width="58%" height={11} radius={6} />
    </div>
  );
}

export function SwapPanel({
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
  const [chainId, setChainId] = useState<1 | 56>(1);
  const chainTokens = useMemo(() => mergeTokens(tokens, chainId), [tokens, chainId]);
  const fromTokens = useMemo(() => chainTokens.filter((token) => token.isNative || token.balance === undefined || token.balance > 0), [chainTokens]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [quote, setQuote] = useState<SwapQuoteResponse | null>(null);
  const [allowanceNeeded, setAllowanceNeeded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [exec, setExec] = useState<ExecutionState>({ status: "idle" });

  const fromToken = fromTokens.find((token) => token.id === fromId) ?? fromTokens[0];
  const toCandidates = chainTokens.filter((token) => token.id !== fromToken?.id);
  const toToken = toCandidates.find((token) => token.id === toId) ?? toCandidates[0] ?? chainTokens[0];
  const taker = addressForChain(chainId, addresses);
  const disabledReason = network === "testnet"
    ? "Swaps are off on testnet."
    : !config?.zeroXEnabled
      ? "0x is not configured."
      : !taker
        ? "No EVM address is available."
        : "";
  const watchOnly = sessionMode === "watch";
  const quoteMismatchReason = useMemo(() => {
    if (!quote || !fromToken || !toToken || !taker) return "";
    let currentSellAmount = "";
    try {
      currentSellAmount = rawAmount(amount, fromToken);
    } catch {
      return "Quote no longer matches the current amount.";
    }
    if (quote.chainId !== chainId) return "Quote no longer matches the selected chain.";
    if (quote.sellToken.toLowerCase() !== toZeroXTokenAddress(fromToken).toLowerCase()) return "Quote no longer matches the from asset.";
    if (quote.buyToken.toLowerCase() !== toZeroXTokenAddress(toToken).toLowerCase()) return "Quote no longer matches the to asset.";
    if (quote.sellAmount !== currentSellAmount) return "Quote no longer matches the current amount.";
    if (quote.taker && quote.taker.toLowerCase() !== taker.toLowerCase()) return "Quote was created for another active address. Get a new quote.";
    return "";
  }, [amount, chainId, fromToken, quote, taker, toToken]);

  const clearQuote = () => {
    setQuote(null);
    setAllowanceNeeded(false);
    setExec({ status: "idle" });
  };

  const requestQuote = async () => {
    if (!fromToken || !toToken || !taker) return;
    setLoading(true);
    setExec({ status: "idle" });
    try {
      const sellAmount = rawAmount(amount, fromToken);
      if ((config?.defaultSwapFeeBps ?? 0) > 1000) throw new Error("Configured swap fee is too high");
      const response = await getZeroXQuote({
        chainId,
        sellToken: toZeroXTokenAddress(fromToken),
        buyToken: toZeroXTokenAddress(toToken),
        sellAmount,
        taker,
        slippageBps: Math.round(Number(slippage || "0.5") * 100),
        feeBps: config?.defaultSwapFeeBps,
        swapFeeToken: toZeroXTokenAddress(fromToken),
        sellTokenSymbol: fromToken.symbol,
        buyTokenSymbol: toToken.symbol,
        sellTokenDecimals: fromToken.decimals,
        buyTokenDecimals: toToken.decimals,
      });
      setQuote(response);
      await logRevenueEvent({ provider: "0x", action: "quote", chain: String(chainId), tokenSymbols: [fromToken.symbol, toToken.symbol], feeBps: config?.defaultSwapFeeBps, quoteId: response.quoteId });
      if (!isNativeEcosystemToken(toZeroXTokenAddress(fromToken)) && response.allowanceTarget) {
        const allowance = await getErc20Allowance({
          chainId,
          tokenAddress: fromToken.address as `0x${string}`,
          owner: taker,
          spender: response.allowanceTarget,
        }).catch(() => 0n);
        setAllowanceNeeded(allowance < BigInt(sellAmount));
      } else {
        setAllowanceNeeded(false);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Quote failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    if (!quote?.allowanceTarget || !mnemonic || !fromToken || quoteMismatchReason) return;
    setApproving(true);
    setExec({ status: "pending", label: "Approve exact token allowance in your wallet" });
    try {
      const hash = await approveErc20Exact({
        mnemonic,
        accountIndex,
        addressIndex: chainId === 56 ? addressIndexes.bsc : addressIndexes.ethereum,
        chainId,
        tokenAddress: fromToken.address as `0x${string}`,
        spender: quote.allowanceTarget,
        amount: quote.sellAmount,
      });
      setAllowanceNeeded(false);
      setExec({ status: "success", label: "Approval submitted", txHash: hash, chainId });
      await logRevenueEvent({ provider: "0x", action: "approve", chain: String(chainId), tokenSymbols: [fromToken.symbol], feeBps: config?.defaultSwapFeeBps, txHash: hash });
      toast("Approval submitted");
    } catch (error) {
      setExec({ status: "error", error: error instanceof Error ? error.message : "Approval failed" });
    } finally {
      setApproving(false);
    }
  };

  const execute = async () => {
    if (!quote || !mnemonic) return;
    if (quoteMismatchReason) {
      setExec({ status: "error", error: quoteMismatchReason });
      return;
    }
    setExecuting(true);
    setExec({ status: "pending", label: "Sign swap transaction locally" });
    try {
      const hash = await executeZeroXQuote({ mnemonic, accountIndex, addressIndex: chainId === 56 ? addressIndexes.bsc : addressIndexes.ethereum, quote });
      setExec({ status: "success", label: "Swap transaction submitted", txHash: hash, chainId });
      await logRevenueEvent({ provider: "0x", action: "execute", chain: String(chainId), tokenSymbols: [fromToken.symbol, toToken.symbol], feeBps: config?.defaultSwapFeeBps, quoteId: quote.quoteId, txHash: hash });
      toast("Swap submitted");
    } catch (error) {
      setExec({ status: "error", error: quoteMovedMessage(error) });
    } finally {
      setExecuting(false);
    }
  };

  if (!fromToken || !toToken) {
    return <div style={{ padding: 28, color: "rgba(255,255,255,0.30)", textAlign: "center" }}>No EVM assets are available for swaps.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ fontSize: 18, fontWeight: 650, color: "#fff" }}>Swap</div>
          <HelpTooltip label="About swaps">
            Same-chain EVM swaps use 0x quotes. Approvals and swaps are signed locally; Silent Wallet never sends your private key to the server.
          </HelpTooltip>
        </div>
        <ProviderBadge provider="0x" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {([1, 56] as const).map((id) => (
          <button key={id} type="button" onClick={() => { setChainId(id); setFromId(""); setToId(""); clearQuote(); }} style={{ height: 40, borderRadius: 13, border: `1px solid ${chainId === id ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.08)"}`, background: chainId === id ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)", color: chainId === id ? "#fff" : "rgba(255,255,255,0.42)", font: "inherit", fontSize: 13, fontWeight: 650, cursor: "pointer" }}>
            {id === 1 ? "Ethereum" : "BNB Chain"}
          </button>
        ))}
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

      <TokenAmountInput amount={amount} onAmountChange={(value) => { setAmount(value); clearQuote(); }} selected={fromToken} tokens={fromTokens} onTokenChange={(token) => { setFromId(token.id); clearQuote(); }} tokenLabel="From asset" amountLabel="Amount" disabled={!!disabledReason} />
      <EcosystemTokenPicker label="To asset" selected={toToken} tokens={toCandidates} onSelect={(token) => { setToId(token.id); clearQuote(); }} disabled={!!disabledReason} />
      <GlassInput label="Slippage tolerance" type="number" min="0" max="50" suffix="%" value={slippage} onChange={(e) => { setSlippage(e.target.value); clearQuote(); }} disabled={!!disabledReason} />

      <GlassButton variant="default" size="lg" onClick={requestQuote} disabled={loading || !!disabledReason || !amount} style={{ width: "100%" }}>
        Get 0x quote
      </GlassButton>

      {loading && <QuoteSkeleton />}

      {quote && (
        <QuoteReview
          title="Review swap quote"
          fees={quote.fees}
          warnings={quote.warnings}
          rows={[
            { label: "You pay", value: `${amount} ${fromToken.symbol}` },
            { label: "You receive", value: quote.buyAmount ? `${formatRawAmount(quote.buyAmount, toToken.decimals)} ${toToken.symbol}` : "Quoted by provider" },
          ]}
        >
          {quoteMismatchReason && (
            <div style={{ display: "flex", gap: 8, padding: "10px 12px", marginBottom: 10, borderRadius: 13, border: "1px solid rgba(251,191,36,0.18)", background: "rgba(251,191,36,0.06)" }}>
              <Icons.info size={14} color="rgba(251,191,36,0.78)" />
              <span style={{ fontSize: 12, color: "rgba(251,210,120,0.74)" }}>{quoteMismatchReason}</span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: allowanceNeeded ? "1fr 1fr" : "1fr", gap: 10 }}>
            {allowanceNeeded && (
              <GlassButton variant="default" size="lg" onClick={approve} disabled={approving || watchOnly || !mnemonic || !!quoteMismatchReason}>
                {approving ? "Approving..." : "Approve exact amount"}
              </GlassButton>
            )}
            <GlassButton variant="primary" size="lg" onClick={execute} disabled={executing || watchOnly || !mnemonic || allowanceNeeded || !quote.transaction || !!quoteMismatchReason}>
              {executing ? "Signing..." : "Confirm swap"}
            </GlassButton>
          </div>
        </QuoteReview>
      )}

      <ExecutionStatus state={exec} />
    </div>
  );
}
