import { isAddress } from "viem";
import { isNativeTokenAddress } from "./chains";

const FORBIDDEN_KEYS = new Set([
  "mnemonic",
  "privatekey",
  "seed",
  "secret",
  "recoveryphrase",
  "secretrecoveryphrase",
]);

export type GuardResult = { ok: true } | { ok: false; key: string };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function detectForbiddenSensitiveKeys(value: unknown): GuardResult {
  const seen = new WeakSet<object>();
  const visit = (node: unknown): GuardResult => {
    if (!node || typeof node !== "object") return { ok: true };
    if (seen.has(node)) return { ok: true };
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) {
        const result = visit(item);
        if (!result.ok) return result;
      }
      return { ok: true };
    }
    for (const [key, nested] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) return { ok: false, key };
      const result = visit(nested);
      if (!result.ok) return result;
    }
    return { ok: true };
  };
  return visit(value);
}

export function assertNoForbiddenSensitiveKeys(value: unknown): void {
  const result = detectForbiddenSensitiveKeys(value);
  if (!result.ok) throw new Error(`Request body contains forbidden sensitive key: ${result.key}`);
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
