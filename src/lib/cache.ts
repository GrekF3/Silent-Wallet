import type { AssetInfo } from "./store";
import type { ChainTx } from "./chains";
import type { EvmToken } from "./tokens";
import type { SplToken } from "./solana";

type CachePayload = {
  assets:       AssetInfo[];
  transactions: ChainTx[];
  evmTokens:    EvmToken[];
  splTokens:    SplToken[];
  ts:           number;
};

const TTL = 30 * 60 * 1000; // 30 min — стейл данные лучше чем ничего

function key(address: string, network: string) {
  return `silent_cache_${network}_${address.slice(0, 10)}`;
}

export function readCache(address: string, network: string): CachePayload | null {
  try {
    const raw = localStorage.getItem(key(address, network));
    if (!raw) return null;
    const p: CachePayload = JSON.parse(raw);
    // Restore Date objects
    p.transactions = p.transactions.map((t) => ({ ...t, date: new Date(t.date) }));
    // Return even if stale — caller decides what to do with old data
    if (Date.now() - p.ts > TTL) return null;
    return p;
  } catch { return null; }
}

// Separate function to read stale cache (for initial display)
export function readCacheAny(address: string, network: string): CachePayload | null {
  try {
    const raw = localStorage.getItem(key(address, network));
    if (!raw) return null;
    const p: CachePayload = JSON.parse(raw);
    p.transactions = p.transactions.map((t) => ({ ...t, date: new Date(t.date) }));
    return p; // return regardless of age
  } catch { return null; }
}

export function writeCache(address: string, network: string, payload: Omit<CachePayload, "ts">) {
  try {
    localStorage.setItem(key(address, network), JSON.stringify({ ...payload, ts: Date.now() }));
  } catch { /* quota exceeded */ }
}
