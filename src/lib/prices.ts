export type CoinData = {
  usd:            number;
  usd_24h_change: number;
  usd_7d_change:  number;
  image:          string;
  spark7d:        number[];
};

export type Prices = Record<string, CoinData>;

export async function fetchPrices(): Promise<Prices> {
  const r = await fetch("/api/prices", {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!r.ok) throw new Error(`Price fetch failed: ${r.status}`);
  return await r.json() as Prices;
}

