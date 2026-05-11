import { NextRequest, NextResponse } from "next/server";
import { assertNoForbiddenSensitiveKeys, isRecord } from "./guards";
import { feeFromRaw, formatRawAmount, silentFeeConfig } from "./fees";
import type { EvmTransactionRequest, FeeBreakdown, ProviderFee } from "./types";

export async function readGuardedJson(req: NextRequest): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null) as unknown;
  if (!isRecord(body)) throw new Error("Invalid JSON body");
  assertNoForbiddenSensitiveKeys(body);
  return body;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeEvmTransaction(value: unknown): EvmTransactionRequest | undefined {
  const tx = asRecord(value);
  if (!tx) return undefined;
  const to = stringField(tx.to);
  if (!to || !/^0x[0-9a-fA-F]{40}$/.test(to)) return undefined;
  const data = stringField(tx.data);
  const valueRaw = stringField(tx.value) ?? (typeof tx.value === "number" ? String(tx.value) : undefined);
  const gas = stringField(tx.gas);
  const gasPrice = stringField(tx.gasPrice);
  return {
    to: to as `0x${string}`,
    data: data && data.startsWith("0x") ? data as `0x${string}` : undefined,
    value: valueRaw ?? "0",
    gas,
    gasPrice,
  };
}

export function feeFromProviderObject(params: {
  label: string;
  provider: ProviderFee["provider"];
  fee: unknown;
  fallbackToken?: string;
  fallbackTokenAddress?: string;
  fallbackDecimals?: number;
  fallbackBps?: number;
}): ProviderFee | undefined {
  const fee = asRecord(params.fee);
  if (!fee) return undefined;
  const amountRaw = stringField(fee.amount);
  const tokenAddress = stringField(fee.token) ?? params.fallbackTokenAddress;
  const type = stringField(fee.type);
  return feeFromRaw({
    label: params.label,
    provider: params.provider,
    amountRaw,
    tokenAddress,
    token: params.fallbackToken,
    decimals: params.fallbackDecimals,
    bps: params.fallbackBps,
    type,
  });
}

export function buildSilentFeeBreakdown(params: {
  chainId: number;
  sellAmount: string;
  feeToken: string;
  feeTokenSymbol?: string;
  feeTokenDecimals?: number;
  providerFees?: ProviderFee[];
  integratorFee?: ProviderFee;
  notes?: string[];
}): FeeBreakdown {
  const silent = silentFeeConfig(params.chainId, params.feeToken);
  const silentFee = silent.bps > 0 && !params.integratorFee
    ? feeFromRaw({
        label: "Silent Wallet fee",
        provider: "0x",
        amountRaw: silent.enabled ? undefined : undefined,
        token: params.feeTokenSymbol,
        tokenAddress: params.feeToken,
        decimals: params.feeTokenDecimals,
        bps: silent.bps,
      })
    : undefined;
  return {
    silentFee,
    integratorFee: params.integratorFee,
    providerFees: params.providerFees ?? [],
    notes: params.notes ?? [],
  };
}

export function lifiFeeBreakdownFromSteps(params: {
  raw: Record<string, unknown>;
  silentFeeBps?: number;
  silentFeePercent?: number;
}): FeeBreakdown {
  const providerFees: ProviderFee[] = [];
  const steps = Array.isArray(params.raw.steps) ? params.raw.steps : [];
  for (const step of steps) {
    const stepRecord = asRecord(step);
    const estimate = asRecord(stepRecord?.estimate);
    const feeCosts = Array.isArray(estimate?.feeCosts) ? estimate.feeCosts : [];
    for (const feeCost of feeCosts) {
      const feeRecord = asRecord(feeCost);
      if (!feeRecord) continue;
      const token = asRecord(feeRecord.token);
      const symbol = stringField(token?.symbol);
      const decimals = numberField(token?.decimals);
      const amountRaw = stringField(feeRecord.amount);
      const amountUsdRaw = stringField(feeRecord.amountUSD);
      const usd = amountUsdRaw ? Number(amountUsdRaw) : undefined;
      providerFees.push(feeFromRaw({
        label: stringField(feeRecord.name) ?? "Provider fee",
        provider: "lifi",
        amountRaw,
        token: symbol,
        tokenAddress: stringField(token?.address),
        decimals,
        usd: Number.isFinite(usd) ? usd : undefined,
      }));
    }
  }

  const feeCosts = Array.isArray(params.raw.feeCosts) ? params.raw.feeCosts : [];
  for (const feeCost of feeCosts) {
    const feeRecord = asRecord(feeCost);
    if (!feeRecord) continue;
    const token = asRecord(feeRecord.token);
    providerFees.push(feeFromRaw({
      label: stringField(feeRecord.name) ?? "Provider fee",
      provider: "lifi",
      amountRaw: stringField(feeRecord.amount),
      token: stringField(token?.symbol),
      tokenAddress: stringField(token?.address),
      decimals: numberField(token?.decimals),
    }));
  }

  return {
    silentFee: params.silentFeeBps && params.silentFeeBps > 0
      ? {
          label: "Silent Wallet fee",
          provider: "lifi",
          bps: params.silentFeeBps,
          amount: params.silentFeePercent !== undefined ? `${params.silentFeePercent}%` : undefined,
        }
      : undefined,
    lifiFee: { label: "LI.FI service fee", provider: "lifi", bps: 25, amount: "0.25%" },
    providerFees,
    notes: providerFees.length
      ? []
      : ["Provider and gas fees are finalized by LI.FI in the quote response."],
  };
}

export function humanAmount(raw: string | undefined, decimals: number | undefined) {
  return raw && decimals !== undefined ? formatRawAmount(raw, decimals) : raw;
}
