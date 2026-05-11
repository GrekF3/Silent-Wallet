import type { EcosystemChainKey, FeeBreakdown, ProviderFee, SilentFeeConfig } from "./types";

const DEFAULT_SWAP_FEE_BPS = 30;
const DEFAULT_MAX_FEE_BPS = 100;
const ABSOLUTE_MAX_FEE_BPS = 1000;

function env(key: string) {
  return process.env[key]?.trim() ?? "";
}

function parseInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
  return Number(value);
}

export function configuredMaxFeeBps(): number {
  const raw = parseInteger(env("SWAP_FEE_MAX_BPS"));
  if (raw === null) return DEFAULT_MAX_FEE_BPS;
  return Math.min(Math.max(raw, DEFAULT_MAX_FEE_BPS), ABSOLUTE_MAX_FEE_BPS);
}

export function validateBps(value: unknown, maxBps = configuredMaxFeeBps()): number {
  const parsed = parseInteger(value);
  if (parsed === null) throw new Error("Fee bps must be a whole number");
  if (parsed < 0) throw new Error("Fee bps cannot be negative");
  if (parsed > ABSOLUTE_MAX_FEE_BPS) throw new Error("Fee bps cannot exceed 1000");
  if (parsed > maxBps) throw new Error(`Fee bps cannot exceed ${maxBps}`);
  return parsed;
}

export function defaultSwapFeeBps(): number {
  const raw = env("NEXT_PUBLIC_SWAP_FEE_BPS") || String(DEFAULT_SWAP_FEE_BPS);
  return validateBps(raw);
}

export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function calculateFeeAmount(rawAmount: string | bigint, bps: number): string {
  const amount = typeof rawAmount === "bigint" ? rawAmount : BigInt(rawAmount);
  if (amount <= 0n || bps <= 0) return "0";
  return ((amount * BigInt(bps)) / 10_000n).toString();
}

export function formatRawAmount(rawAmount: string, decimals = 18, maxFractionDigits = 8): string {
  try {
    const value = BigInt(rawAmount);
    const divisor = 10n ** BigInt(decimals);
    const whole = value / divisor;
    const fraction = value % divisor;
    if (fraction === 0n) return whole.toString();
    const padded = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
    const trimmed = padded.slice(0, maxFractionDigits);
    return `${whole.toString()}.${trimmed}`;
  } catch {
    return rawAmount;
  }
}

export function getFeeRecipient(chain: EcosystemChainKey | number): string {
  const key = typeof chain === "number"
    ? chain === 56 ? "bsc" : chain === 1 ? "ethereum" : ""
    : chain;
  if (key === "ethereum") return env("SILENT_FEE_RECIPIENT_ETH");
  if (key === "bsc") return env("SILENT_FEE_RECIPIENT_BSC");
  return "";
}

export function isFeeEnabled(chain?: EcosystemChainKey | number): boolean {
  const bps = defaultSwapFeeBps();
  if (bps <= 0) return false;
  return chain === undefined ? true : !!getFeeRecipient(chain);
}

export function silentFeeConfig(chain: EcosystemChainKey | number, token?: string): SilentFeeConfig {
  const bps = defaultSwapFeeBps();
  const recipient = getFeeRecipient(chain);
  return {
    enabled: bps > 0 && !!recipient,
    bps,
    maxBps: configuredMaxFeeBps(),
    recipient: recipient || undefined,
    token,
  };
}

export function feeFromRaw(params: {
  label: string;
  provider?: ProviderFee["provider"];
  amountRaw?: string;
  token?: string;
  tokenAddress?: string;
  decimals?: number;
  bps?: number;
  type?: string;
  usd?: number;
}): ProviderFee {
  const amount = params.amountRaw && params.decimals !== undefined
    ? formatRawAmount(params.amountRaw, params.decimals)
    : params.amountRaw;
  return {
    label: params.label,
    provider: params.provider,
    type: params.type,
    amount,
    amountRaw: params.amountRaw,
    token: params.token,
    tokenAddress: params.tokenAddress,
    decimals: params.decimals,
    usd: params.usd,
    bps: params.bps,
  };
}

export function emptyFeeBreakdown(notes: string[] = []): FeeBreakdown {
  return { providerFees: [], notes };
}

export function formatFeeBreakdown(breakdown: FeeBreakdown): string[] {
  const rows: string[] = [];
  const all = [
    breakdown.silentFee,
    breakdown.integratorFee,
    breakdown.lifiFee,
    breakdown.networkFee,
    ...breakdown.providerFees,
  ].filter((fee): fee is ProviderFee => Boolean(fee));
  for (const fee of all) {
    const amount = fee.amount && fee.token ? `${fee.amount} ${fee.token}` : fee.bps !== undefined ? bpsToPercent(fee.bps) : "Shown by provider";
    rows.push(`${fee.label}: ${amount}`);
  }
  return [...rows, ...breakdown.notes];
}
