import { NextRequest, NextResponse } from "next/server";
import { isZeroXSupportedChain } from "@/lib/ecosystem/chains";
import { zeroXConfig } from "@/lib/ecosystem/config";
import { defaultSwapFeeBps, validateBps } from "@/lib/ecosystem/fees";
import { getFeeRecipient } from "@/lib/ecosystem/fees";
import {
  optionalString,
  validateChainId,
  validateEvmAddress,
  validateNumberRange,
  validatePositiveIntegerString,
  validateTokenAddress,
} from "@/lib/ecosystem/guards";
import {
  asRecord,
  buildSilentFeeBreakdown,
  feeFromProviderObject,
  jsonError,
  normalizeEvmTransaction,
  readGuardedJson,
  stringField,
} from "@/lib/ecosystem/server";
import type { ExecutionWarning, SwapQuoteRequest, SwapQuoteResponse } from "@/lib/ecosystem/types";

type ZeroXKind = "price" | "quote";

function optionalDecimals(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > 36) throw new Error(`Invalid ${label}`);
  return n;
}

function readRequest(body: Record<string, unknown>): SwapQuoteRequest {
  const chainId = validateChainId(body.chainId, [1, 56]);
  const sellToken = validateTokenAddress(body.sellToken, "sell token");
  const buyToken = validateTokenAddress(body.buyToken, "buy token");
  const sellAmount = validatePositiveIntegerString(body.sellAmount, "sell amount");
  const taker = validateEvmAddress(body.taker, "taker");
  const slippage = validateNumberRange(body.slippageBps, "slippage bps", 0, 10_000);
  const requestedBps = body.feeBps === undefined ? defaultSwapFeeBps() : validateBps(body.feeBps);
  const swapFeeToken = optionalString(body.swapFeeToken, 80) ?? sellToken;

  if (!isZeroXSupportedChain(chainId)) throw new Error("Unsupported chain/provider pair");
  if (requestedBps > 0 && !getFeeRecipient(chainId)) throw new Error("Missing fee recipient for configured Silent Wallet fee");
  if (swapFeeToken.toLowerCase() !== sellToken.toLowerCase() && swapFeeToken.toLowerCase() !== buyToken.toLowerCase()) {
    throw new Error("swapFeeToken must be the sellToken or buyToken");
  }

  return {
    chainId,
    sellToken,
    buyToken,
    sellAmount,
    taker,
    slippageBps: slippage,
    feeBps: requestedBps,
    swapFeeToken,
    sellTokenSymbol: optionalString(body.sellTokenSymbol, 24),
    buyTokenSymbol: optionalString(body.buyTokenSymbol, 24),
    sellTokenDecimals: optionalDecimals(body.sellTokenDecimals, "sell token decimals"),
    buyTokenDecimals: optionalDecimals(body.buyTokenDecimals, "buy token decimals"),
  };
}

function buildQuery(request: SwapQuoteRequest) {
  const query = new URLSearchParams({
    chainId: String(request.chainId),
    sellToken: request.sellToken,
    buyToken: request.buyToken,
    sellAmount: request.sellAmount,
    taker: request.taker,
  });
  if (request.slippageBps !== undefined) query.set("slippageBps", String(request.slippageBps));
  const feeBps = request.feeBps ?? defaultSwapFeeBps();
  if (feeBps > 0) {
    const recipient = getFeeRecipient(request.chainId);
    query.set("swapFeeRecipient", recipient);
    query.set("swapFeeBps", String(feeBps));
    query.set("swapFeeToken", request.swapFeeToken ?? request.sellToken);
  }
  return query;
}

function responseWarnings(raw: Record<string, unknown>): ExecutionWarning[] {
  const warnings: ExecutionWarning[] = [];
  const issues = asRecord(raw.issues);
  if (issues) {
    const allowance = asRecord(issues.allowance);
    if (allowance) {
      warnings.push({
        code: "allowance_required",
        message: "This ERC-20 swap needs an approval before the swap transaction.",
        severity: "warning",
      });
    }
    const balance = asRecord(issues.balance);
    if (balance) {
      warnings.push({
        code: "balance_issue",
        message: "The provider reported a possible balance issue for this quote.",
        severity: "error",
      });
    }
  }
  return warnings;
}

function allowanceTarget(raw: Record<string, unknown>): `0x${string}` | undefined {
  const direct = stringField(raw.allowanceTarget);
  if (direct && /^0x[0-9a-fA-F]{40}$/.test(direct)) return direct as `0x${string}`;
  const issues = asRecord(raw.issues);
  const allowance = asRecord(issues?.allowance);
  const spender = stringField(allowance?.spender);
  return spender && /^0x[0-9a-fA-F]{40}$/.test(spender) ? spender as `0x${string}` : undefined;
}

function normalizeZeroX(raw: Record<string, unknown>, request: SwapQuoteRequest): SwapQuoteResponse {
  const feeToken = request.swapFeeToken ?? request.sellToken;
  const feeTokenIsSell = feeToken.toLowerCase() === request.sellToken.toLowerCase();
  const feeTokenSymbol = feeTokenIsSell ? request.sellTokenSymbol : request.buyTokenSymbol;
  const feeTokenDecimals = feeTokenIsSell ? request.sellTokenDecimals : request.buyTokenDecimals;
  const integratorFee = feeFromProviderObject({
    label: "Silent Wallet fee",
    provider: "0x",
    fee: asRecord(raw.fees)?.integratorFee,
    fallbackToken: feeTokenSymbol,
    fallbackTokenAddress: feeToken,
    fallbackDecimals: feeTokenDecimals,
    fallbackBps: request.feeBps,
  });
  const zeroExFee = feeFromProviderObject({
    label: "0x fee",
    provider: "0x",
    fee: asRecord(raw.fees)?.zeroExFee,
  });
  const gasFee = feeFromProviderObject({
    label: "Estimated gas",
    provider: "0x",
    fee: asRecord(raw.fees)?.gasFee,
  });
  const fees = buildSilentFeeBreakdown({
    chainId: request.chainId,
    sellAmount: request.sellAmount,
    feeToken,
    feeTokenSymbol,
    feeTokenDecimals,
    integratorFee,
    providerFees: [zeroExFee, gasFee].filter((fee) => fee !== undefined),
    notes: integratorFee?.amount
      ? []
      : [`Silent Wallet fee is ${request.feeBps ?? defaultSwapFeeBps()} bps in ${feeTokenSymbol ?? "the selected fee token"}.`],
  });

  return {
    provider: "0x",
    chainId: request.chainId,
    sellToken: request.sellToken,
    buyToken: request.buyToken,
    sellAmount: request.sellAmount,
    buyAmount: stringField(raw.buyAmount),
    price: stringField(raw.price),
    guaranteedPrice: stringField(raw.guaranteedPrice),
    allowanceTarget: allowanceTarget(raw),
    transaction: normalizeEvmTransaction(raw.transaction),
    fees,
    warnings: responseWarnings(raw),
    issues: raw.issues,
    quoteId: stringField(raw.zid) ?? stringField(raw.quoteId),
    raw,
  };
}

export async function handleZeroX(req: NextRequest, kind: ZeroXKind) {
  try {
    const body = await readGuardedJson(req);
    const config = zeroXConfig();
    if (!config.enabled) return jsonError("0x is not configured", 503);
    const request = readRequest(body);
    const endpoint = kind === "price" ? "price" : "quote";
    const url = `${config.baseUrl.replace(/\/$/, "")}/swap/allowance-holder/${endpoint}?${buildQuery(request).toString()}`;
    const providerResponse = await fetch(url, {
      headers: {
        "0x-api-key": config.apiKey,
        "0x-version": config.version,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const raw = await providerResponse.json().catch(() => ({})) as unknown;
    if (!providerResponse.ok) {
      return NextResponse.json(
        { error: "0x request failed", details: raw },
        { status: providerResponse.status },
      );
    }
    const rawRecord = asRecord(raw);
    if (!rawRecord) return jsonError("Unexpected 0x response", 502);
    return NextResponse.json(normalizeZeroX(rawRecord, request), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid 0x request");
  }
}
