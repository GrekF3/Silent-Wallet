import { NextRequest, NextResponse } from "next/server";
import { serverCoinGeckoHeaders } from "@/lib/serverConfig";

export const dynamic = "force-dynamic";

type TokenPrice = {
  usd?: number;
  usd_24h_change?: number;
};

const LLAMA_CHAIN: Record<string, string> = {
  ethereum: "ethereum",
  "binance-smart-chain": "bsc",
  solana: "solana",
};

function normalizeContracts(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 80);
}

async function coinGeckoTokenPrices(platform: string, contracts: string[]) {
  if (!contracts.length) return {};
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${contracts.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(10_000), headers: serverCoinGeckoHeaders(), cache: "no-store" }
    );
    if (!r.ok) return {};
    return await r.json() as Record<string, TokenPrice>;
  } catch {
    return {};
  }
}

async function llamaTokenPrices(platform: string, contracts: string[]) {
  const chain = LLAMA_CHAIN[platform];
  if (!chain || !contracts.length) return {};
  try {
    const ids = contracts.map((contract) => `${chain}:${contract}`).join(",");
    const r = await fetch(`https://coins.llama.fi/prices/current/${ids}`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!r.ok) return {};
    const d = await r.json() as { coins?: Record<string, { price?: number }> };
    const out: Record<string, TokenPrice> = {};
    for (const contract of contracts) {
      const price = d.coins?.[`${chain}:${contract}`]?.price ?? d.coins?.[`${chain}:${contract.toLowerCase()}`]?.price ?? 0;
      if (Number.isFinite(price) && price > 0) out[contract.toLowerCase()] = { usd: price };
    }
    return out;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const platform = searchParams.get("platform") ?? "";
  const contracts = normalizeContracts(searchParams.get("contracts"));

  if (!["ethereum", "binance-smart-chain", "solana"].includes(platform)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  const [cg, llama] = await Promise.all([
    coinGeckoTokenPrices(platform, contracts),
    llamaTokenPrices(platform, contracts),
  ]);

  const prices: Record<string, TokenPrice> = {};
  for (const contract of contracts) {
    const key = contract.toLowerCase();
    prices[key] = {
      usd: cg[key]?.usd || llama[key]?.usd || 0,
      usd_24h_change: cg[key]?.usd_24h_change ?? 0,
    };
  }

  return NextResponse.json(prices, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
