import { isAddress } from "viem";
import { isNativeTokenAddress } from "./chains";
export { assertNoForbiddenSensitiveKeys, detectForbiddenSensitiveKeys } from "@/lib/security/sensitiveGuards";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateEvmAddress(value: unknown, label = "address"): `0x${string}` {
  if (typeof value !== "string" || !isAddress(value)) throw new Error(`Invalid ${label}`);
  return value as `0x${string}`;
}

export function validatePublicWalletAddress(value: unknown, label = "wallet address"): string {
  if (typeof value !== "string" || value.trim().length < 26 || value.trim().length > 120) {
    throw new Error(`Invalid ${label}`);
  }
  const address = value.trim();
  const evm = isAddress(address);
  const btc = /^(bc1|tb1|[13mn2])[a-zA-HJ-NP-Z0-9]{25,80}$/.test(address);
  const sol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  if (!evm && !btc && !sol) throw new Error(`Invalid ${label}`);
  return address;
}

export function validateChainId(value: unknown, supported: readonly number[]): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n)) throw new Error("Invalid chain ID");
  if (!supported.includes(n)) throw new Error("Unsupported chain/provider pair");
  return n;
}

export function validateTokenAddress(value: unknown, label = "token address", allowNative = true): string {
  if (typeof value !== "string") throw new Error(`Invalid ${label}`);
  const token = value.trim();
  if (allowNative && isNativeTokenAddress(token)) return token;
  if (!isAddress(token)) throw new Error(`Invalid ${label}`);
  return token;
}

export function validatePositiveIntegerString(value: unknown, label = "amount"): string {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) throw new Error(`Invalid ${label}`);
  if (BigInt(value) <= 0n) throw new Error(`${label} must be greater than zero`);
  return value;
}

export function validateNumberRange(value: unknown, label: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Invalid ${label}`);
  return n;
}

export function optionalString(value: unknown, maxLength = 160): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("Invalid string value");
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error("String value is too long");
  return trimmed;
}

export function optionalUrl(value: unknown): string | undefined {
  const raw = optionalString(value, 500);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!["http:", "https:", "silent:"].includes(url.protocol)) throw new Error("Invalid redirect URL");
    return url.toString();
  } catch {
    throw new Error("Invalid redirect URL");
  }
}
