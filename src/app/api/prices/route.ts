import { NextResponse } from "next/server";
import { serverAnkrUrl, serverCoinGeckoHeaders } from "@/lib/serverConfig";
import type { CoinData, Prices } from "@/lib/prices";

const COIN_IDS: Record<string, string> = {
  ETH:  "ethereum",
  BTC:  "bitcoin",
  BNB:  "binancecoin",
  SOL:  "solana",
  USDC: "usd-coin",
};

const FALLBACK_IMAGES: Record<string, string> = {
  ETH:  "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  BTC:  "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
  BNB:  "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  SOL:  "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
  USDC: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png",
};

function emptyCoin(symbol: string): CoinData {
  return { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: FALLBACK_IMAGES[symbol] ?? "", spark7d: [] };
}

async function fetchSpark(id: string): Promise<number[]> {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7&interval=daily`,
      { signal: AbortSignal.timeout(10_000), headers: serverCoinGeckoHeaders(), cache: "no-store" }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return (d.prices as [number, number][])?.map(([, p]) => p) ?? [];
  } catch {
    return [];
  }
}

async function coinGeckoPrices(): Promise<Prices> {
  const ids = Object.values(COIN_IDS).join(",");
  const symbols = Object.keys(COIN_IDS);
  const [markets, ...sparks] = await Promise.all([
    fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d`,
      { signal: AbortSignal.timeout(10_000), headers: serverCoinGeckoHeaders(), cache: "no-store" }
    ).then((r) => r.ok ? r.json() : []).catch(() => []),
    ...Object.values(COIN_IDS).map((id) => fetchSpark(id)),
  ]);

  const result: Prices = {};
  symbols.forEach((sym, i) => {
    const id = COIN_IDS[sym];
    const row = (markets as Record<string, unknown>[])?.find((m) => m.id === id);
    result[sym] = {
      usd:            (row?.current_price as number)                          ?? 0,
      usd_24h_change: (row?.price_change_percentage_24h as number)            ?? 0,
      usd_7d_change:  (row?.price_change_percentage_7d_in_currency as number) ?? 0,
      image:          (row?.image as string)                                   ?? FALLBACK_IMAGES[sym] ?? "",
      spark7d:        sparks[i],
    };
  });
  return result;
}

async function ankrNativePrices(): Promise<Partial<Record<"ETH" | "BNB", number>>> {
  const url = serverAnkrUrl();
  if (!url) return {};
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ankr_getBlockchainStats", params: { blockchain: ["eth", "bsc"] } }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!r.ok) return {};
    const d = await r.json() as { result?: { stats?: { blockchain: string; nativeCoinUsdPrice?: string }[] } };
    const out: Partial<Record<"ETH" | "BNB", number>> = {};
    for (const stat of d.result?.stats ?? []) {
      const price = Number(stat.nativeCoinUsdPrice ?? 0);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (stat.blockchain === "eth") out.ETH = price;
      if (stat.blockchain === "bsc") out.BNB = price;
    }
    return out;
  } catch {
    return {};
  }
}

async function defiLlamaPrices(): Promise<Partial<Record<string, number>>> {
  try {
    const ids = Object.values(COIN_IDS).map((id) => `coingecko:${id}`).join(",");
    const r = await fetch(`https://coins.llama.fi/prices/current/${ids}`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!r.ok) return {};
    const d = await r.json() as { coins?: Record<string, { price?: number }> };
    const out: Partial<Record<string, number>> = {};
    for (const [symbol, id] of Object.entries(COIN_IDS)) {
      const price = d.coins?.[`coingecko:${id}`]?.price ?? 0;
      if (Number.isFinite(price) && price > 0) out[symbol] = price;
    }
    return out;
  } catch {
    return {};
  }
}

export async function GET() {
  const [prices, nativeFallback, llamaFallback] = await Promise.all([
    coinGeckoPrices().catch(() => ({} as Prices)),
    ankrNativePrices(),
    defiLlamaPrices(),
  ]);

  const result: Prices = {};
  for (const symbol of Object.keys(COIN_IDS)) {
    const current = prices[symbol] ?? emptyCoin(symbol);
    result[symbol] = {
      ...emptyCoin(symbol),
      ...current,
      usd: current.usd || nativeFallback[symbol as "ETH" | "BNB"] || llamaFallback[symbol] || 0,
    };
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
