import { getSupportedEcosystemChains } from "./chains";
import { defaultSwapFeeBps } from "./fees";
import type { EcosystemConfigResponse } from "./types";

const DEFAULT_ZEROX_BASE_URL = "https://api.0x.org";
const DEFAULT_ZEROX_VERSION = "v2";
const DEFAULT_LIFI_BASE_URL = "https://li.quest";

function env(key: string) {
  return process.env[key]?.trim() ?? "";
}

function publicFlag(key: string, fallback: boolean) {
  const raw = env(key);
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function numberEnv(key: string, fallback: number) {
  const raw = env(key);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function ecosystemEnabled() {
  return publicFlag("NEXT_PUBLIC_ECOSYSTEM_ENABLED", true);
}

export function zeroXConfig() {
  return {
    enabled: ecosystemEnabled() && !!env("ZEROX_API_KEY"),
    apiKey: env("ZEROX_API_KEY"),
    baseUrl: env("ZEROX_API_BASE_URL") || DEFAULT_ZEROX_BASE_URL,
    version: env("ZEROX_VERSION") || DEFAULT_ZEROX_VERSION,
  };
}

export function lifiConfig() {
  return {
    enabled: ecosystemEnabled() && !!env("LIFI_API_KEY"),
    apiKey: env("LIFI_API_KEY"),
    baseUrl: env("LIFI_API_BASE_URL") || DEFAULT_LIFI_BASE_URL,
    integrator: env("LIFI_INTEGRATOR") || "silent-wallet",
    fee: Math.min(Math.max(numberEnv("NEXT_PUBLIC_LIFI_FEE", 0.003), 0), 0.1),
  };
}

export function moonPayConfig() {
  const enabledByPublicFlag = publicFlag("NEXT_PUBLIC_MOONPAY_ENABLED", true);
  const moonPayEnv = env("MOONPAY_ENV") || "sandbox";
  return {
    enabled: ecosystemEnabled() && enabledByPublicFlag && !!env("MOONPAY_API_KEY"),
    env: moonPayEnv === "production" ? "production" as const : "sandbox" as const,
    apiKey: env("MOONPAY_API_KEY"),
    secretKey: env("MOONPAY_SECRET_KEY"),
  };
}

export function transakConfig() {
  const enabledByPublicFlag = publicFlag("NEXT_PUBLIC_TRANSAK_ENABLED", true);
  const transakEnv = env("TRANSAK_ENV") || "staging";
  return {
    enabled: ecosystemEnabled() && enabledByPublicFlag && !!env("TRANSAK_API_KEY") && !!env("TRANSAK_API_SECRET") && !!env("TRANSAK_REFERRER_DOMAIN"),
    env: transakEnv === "production" ? "production" as const : "staging" as const,
    apiKey: env("TRANSAK_API_KEY"),
    accessToken: env("TRANSAK_API_SECRET"),
    referrerDomain: env("TRANSAK_REFERRER_DOMAIN"),
  };
}

export function safeEcosystemConfig(): EcosystemConfigResponse {
  const zeroX = zeroXConfig();
  const lifi = lifiConfig();
  const moonPay = moonPayConfig();
  const transak = transakConfig();
  return {
    zeroXEnabled: zeroX.enabled,
    lifiEnabled: lifi.enabled,
    moonPayEnabled: moonPay.enabled,
    transakEnabled: transak.enabled,
    defaultSwapFeeBps: defaultSwapFeeBps(),
    lifiFee: lifi.fee,
    supportedChains: getSupportedEcosystemChains(),
  };
}
