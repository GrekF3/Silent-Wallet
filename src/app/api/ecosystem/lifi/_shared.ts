import { NextRequest, NextResponse } from "next/server";
import { isLifiExecutableChain, LIFI_NATIVE_TOKEN } from "@/lib/ecosystem/chains";
import { lifiConfig } from "@/lib/ecosystem/config";
import {
  validateChainId,
  validateEvmAddress,
  validateNumberRange,
  validatePositiveIntegerString,
  validateTokenAddress,
} from "@/lib/ecosystem/guards";
import {
  asRecord,
  jsonError,
  lifiFeeBreakdownFromSteps,
  normalizeEvmTransaction,
  numberField,
  readGuardedJson,
  stringField,
} from "@/lib/ecosystem/server";
import type {
  BridgeQuoteResponse,
  BridgeRoute,
  BridgeRouteRequest,
  BridgeRouteResponse,
  ExecutionWarning,
} from "@/lib/ecosystem/types";

function readBridgeRequest(body: Record<string, unknown>): BridgeRouteRequest {
  const fromChainId = validateChainId(body.fromChainId, [1, 56]);
  const toChainId = validateChainId(body.toChainId, [1, 56]);
  if (!isLifiExecutableChain(fromChainId) || !isLifiExecutableChain(toChainId)) {
    throw new Error("Unsupported chain/provider pair");
  }
  const fromTokenAddress = normalizeLifiToken(validateTokenAddress(body.fromTokenAddress, "from token"));
  const toTokenAddress = normalizeLifiToken(validateTokenAddress(body.toTokenAddress, "to token"));
  const fromAmount = validatePositiveIntegerString(body.fromAmount, "from amount");
  const fromAddress = validateEvmAddress(body.fromAddress, "from address");
  const toAddress = body.toAddress ? validateEvmAddress(body.toAddress, "to address") : undefined;
  const slippage = validateNumberRange(body.slippage, "slippage", 0, 0.5);
  const order = body.order === "FASTEST" ? "FASTEST" : "CHEAPEST";
  return {
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    fromAmount,
    fromAddress,
    toAddress,
    slippage,
    order,
  };
}

function normalizeLifiToken(address: string) {
  return address.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ? LIFI_NATIVE_TOKEN : address;
}

function lifiHeaders(apiKey: string): HeadersInit {
  return apiKey ? { "Content-Type": "application/json", "x-lifi-api-key": apiKey } : { "Content-Type": "application/json" };
}

function routeTool(route: Record<string, unknown>): { name?: string; key?: string } {
  const steps = Array.isArray(route.steps) ? route.steps : [];
  const firstStep = asRecord(steps[0]);
  const toolDetails = asRecord(firstStep?.toolDetails);
  return {
    name: stringField(toolDetails?.name),
    key: stringField(toolDetails?.key),
  };
}

function estimatedTime(route: Record<string, unknown>): number | undefined {
  const steps = Array.isArray(route.steps) ? route.steps : [];
  let seconds = 0;
  for (const step of steps) {
    const estimate = asRecord(asRecord(step)?.estimate);
    const duration = numberField(estimate?.executionDuration);
    if (duration) seconds += duration;
  }
  return seconds > 0 ? seconds : undefined;
}

function routeWarnings(route: Record<string, unknown>): ExecutionWarning[] {
  const warnings: ExecutionWarning[] = [];
  const steps = Array.isArray(route.steps) ? route.steps : [];
  if (steps.length > 1) {
    warnings.push({
      code: "multi_step_route",
      message: "This route may require more than one transaction. Silent Wallet only executes locally signed EVM transaction data.",
      severity: "warning",
    });
  }
  return warnings;
}

function normalizeRoute(raw: unknown, feePercent: number): BridgeRoute | null {
  const route = asRecord(raw);
  if (!route) return null;
  const tool = routeTool(route);
  const fromChainId = numberField(route.fromChainId);
  const toChainId = numberField(route.toChainId);
  const id = stringField(route.id);
  if (!fromChainId || !toChainId || !id) return null;
  return {
    id,
    provider: "lifi",
    fromChainId,
    toChainId,
    fromAmount: stringField(route.fromAmount) ?? "0",
    toAmount: stringField(route.toAmount),
    fromAmountUSD: stringField(route.fromAmountUSD),
    toAmountUSD: stringField(route.toAmountUSD),
    tool: tool.name ?? tool.key,
    toolDetails: tool.key,
    estimatedTimeSeconds: estimatedTime(route),
    fees: lifiFeeBreakdownFromSteps({
      raw: route,
      silentFeeBps: Math.round(feePercent * 10_000),
      silentFeePercent: feePercent * 100,
    }),
    warnings: routeWarnings(route),
    raw: route,
  };
}

export async function handleLifiRoutes(req: NextRequest) {
  try {
    const body = await readGuardedJson(req);
    const config = lifiConfig();
    if (!config.enabled) return jsonError("LI.FI is not configured", 503);
    const request = readBridgeRequest(body);
    const providerResponse = await fetch(`${config.baseUrl.replace(/\/$/, "")}/v1/advanced/routes`, {
      method: "POST",
      headers: lifiHeaders(config.apiKey),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        fromChainId: request.fromChainId,
        toChainId: request.toChainId,
        fromTokenAddress: request.fromTokenAddress,
        toTokenAddress: request.toTokenAddress,
        fromAmount: request.fromAmount,
        fromAddress: request.fromAddress,
        toAddress: request.toAddress ?? request.fromAddress,
        options: {
          integrator: config.integrator,
          fee: config.fee,
          slippage: request.slippage ?? 0.005,
          order: request.order ?? "CHEAPEST",
          allowSwitchChain: false,
        },
      }),
    });
    const raw = await providerResponse.json().catch(() => ({})) as unknown;
    if (!providerResponse.ok) {
      return NextResponse.json({ error: "LI.FI routes request failed", details: raw }, { status: providerResponse.status });
    }
    const rawRecord = asRecord(raw);
    if (!rawRecord) return jsonError("Unexpected LI.FI response", 502);
    const routes = (Array.isArray(rawRecord.routes) ? rawRecord.routes : [])
      .map((route) => normalizeRoute(route, config.fee))
      .filter((route): route is BridgeRoute => route !== null);
    const response: BridgeRouteResponse = { provider: "lifi", routes, warnings: [] };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid LI.FI routes request");
  }
}

function quoteUrl(baseUrl: string, request: BridgeRouteRequest, config: ReturnType<typeof lifiConfig>) {
  const query = new URLSearchParams({
    fromChain: String(request.fromChainId),
    toChain: String(request.toChainId),
    fromToken: request.fromTokenAddress,
    toToken: request.toTokenAddress,
    fromAmount: request.fromAmount,
    fromAddress: request.fromAddress,
    toAddress: request.toAddress ?? request.fromAddress,
    integrator: config.integrator,
    fee: String(config.fee),
    slippage: String(request.slippage ?? 0.005),
    order: request.order ?? "CHEAPEST",
  });
  return `${baseUrl.replace(/\/$/, "")}/v1/quote?${query.toString()}`;
}

function approvalTarget(raw: Record<string, unknown>): `0x${string}` | undefined {
  const estimate = asRecord(raw.estimate);
  const direct = stringField(estimate?.approvalAddress) ?? stringField(raw.approvalAddress);
  return direct && /^0x[0-9a-fA-F]{40}$/.test(direct) ? direct as `0x${string}` : undefined;
}

export async function handleLifiQuote(req: NextRequest) {
  try {
    const body = await readGuardedJson(req);
    const config = lifiConfig();
    if (!config.enabled) return jsonError("LI.FI is not configured", 503);
    const request = readBridgeRequest(body);
    const providerResponse = await fetch(quoteUrl(config.baseUrl, request, config), {
      headers: config.apiKey ? { "x-lifi-api-key": config.apiKey } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const raw = await providerResponse.json().catch(() => ({})) as unknown;
    if (!providerResponse.ok) {
      return NextResponse.json({ error: "LI.FI quote request failed", details: raw }, { status: providerResponse.status });
    }
    const rawRecord = asRecord(raw);
    if (!rawRecord) return jsonError("Unexpected LI.FI response", 502);
    const response: BridgeQuoteResponse = {
      provider: "lifi",
      id: stringField(rawRecord.id),
      fromChainId: request.fromChainId,
      toChainId: request.toChainId,
      fromAmount: request.fromAmount,
      toAmount: stringField(rawRecord.toAmount) ?? stringField(asRecord(rawRecord.estimate)?.toAmount),
      transaction: normalizeEvmTransaction(rawRecord.transactionRequest),
      approvalTarget: approvalTarget(rawRecord),
      fees: lifiFeeBreakdownFromSteps({
        raw: rawRecord,
        silentFeeBps: Math.round(config.fee * 10_000),
        silentFeePercent: config.fee * 100,
      }),
      warnings: routeWarnings(rawRecord),
      raw: rawRecord,
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid LI.FI quote request");
  }
}
