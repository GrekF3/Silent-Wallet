import { loadEnvConfig } from "@next/env";

let envLoaded = false;

function ensureEnvLoaded() {
  if (envLoaded) return;
  loadEnvConfig(process.cwd());
  envLoaded = true;
}

export function serverEnv(key: string) {
  ensureEnvLoaded();
  return process.env[key]?.trim() || "";
}

export function serverAnkrUrl() {
  const key = serverEnv("ANKR_API_KEY");
  return key ? `https://rpc.ankr.com/multichain/${key}` : "";
}

export function serverCoinGeckoHeaders(): HeadersInit {
  const key = serverEnv("COINGECKO_API_KEY");
  return key ? { "x-cg-demo-api-key": key } : {};
}
