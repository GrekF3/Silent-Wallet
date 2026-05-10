export type CoinData = {
  usd:            number;
  usd_24h_change: number;
  usd_7d_change:  number;
  image:          string;
  spark7d:        number[];
};

export type Prices = Record<string, CoinData>;

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

async function fetchSpark(id: string): Promise<number[]> {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7&interval=daily`
    );
    const d = await r.json();
    return (d.prices as [number, number][])?.map(([, p]) => p) ?? [];
  } catch { return []; }
}

export async function fetchPrices(): Promise<Prices> {
  const ids = Object.values(COIN_IDS).join(",");
  const symbols = Object.keys(COIN_IDS);

  const [markets, ...sparks] = await Promise.all([
    fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d`
    ).then((r) => r.json()).catch(() => []),
    ...Object.values(COIN_IDS).map((id) => fetchSpark(id)),
  ]);

  const result: Prices = {};
  symbols.forEach((sym, i) => {
    const id  = COIN_IDS[sym];
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
