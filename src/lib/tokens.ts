// ERC-20 / BEP-20 token balance discovery + pricing

export type EvmToken = {
  contract:  string;
  symbol:    string;
  name:      string;
  decimals:  number;
  balance:   number;
  priceUSD:  number;
  valueUSD:  number;
  change24h: number;
  image:     string;
  chain:     "ethereum" | "bsc";
};

// ── Hardcoded fallback prices for stablecoins ─────────────────────
// CoinGecko by-contract API is rate-limited; stablecoins are $1 by definition
const STABLE_PRICES: Record<string, number> = {
  tether: 1, "usd-coin": 1, "binance-usd": 1, dai: 1,
};

// ── Fetch all ERC-20 tokens via Blockscout v1 (ETH) ──────────────
async function fetchEthTokens(address: string): Promise<EvmToken[]> {
  try {
    const r = await fetch(
      `https://eth.blockscout.com/api?module=account&action=tokenlist&address=${address}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    const d = await r.json();
    if (d.status !== "1" || !Array.isArray(d.result)) return [];

    const tokens = (d.result as Record<string, string>[])
      .map((t) => ({
        contract: t.contractAddress,
        symbol:   t.symbol,
        name:     t.name,
        decimals: parseInt(t.decimals) || 18,
        balance:  parseFloat(t.balance) / Math.pow(10, parseInt(t.decimals) || 18),
        chain:    "ethereum" as const,
      }))
      .filter((t) => t.balance > 0);

    if (tokens.length === 0) return [];

    // Fetch prices via /coins/markets - much more reliable than token_price endpoint
    const contracts = tokens.slice(0, 30).map((t) => t.contract).join(",");
    let contractPriceMap: Record<string, { usd: number; change: number }> = {};
    try {
      const pr = await fetch(
        `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${contracts}&vs_currencies=usd&include_24hr_change=true`,
        { signal: AbortSignal.timeout(8_000) }
      );
      const raw = await pr.json();
      for (const [k, v] of Object.entries(raw as Record<string, { usd?: number; usd_24h_change?: number }>)) {
        contractPriceMap[k] = { usd: v.usd ?? 0, change: v.usd_24h_change ?? 0 };
      }
    } catch { /* ignore */ }

    return tokens.slice(0, 30).map((t) => {
      const p = contractPriceMap[t.contract.toLowerCase()];
      const priceUSD  = p?.usd ?? 0;
      const change24h = p?.change ?? 0;
      return {
        ...t,
        priceUSD,
        valueUSD:  t.balance * priceUSD,
        change24h,
        image:     "",
      };
    }).filter((t) => t.valueUSD > 0.001 || t.balance > 0)
      .sort((a, b) => b.valueUSD - a.valueUSD);
  } catch { return []; }
}

// ── Popular BEP-20 tokens on BSC ─────────────────────────────────
const BSC_TOKENS: { contract: string; symbol: string; name: string; decimals: number; cgId: string }[] = [
  { contract: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT",  name: "Tether USD",         decimals: 18, cgId: "tether" },
  { contract: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC",  name: "USD Coin",           decimals: 18, cgId: "usd-coin" },
  { contract: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", symbol: "BUSD",  name: "Binance USD",        decimals: 18, cgId: "binance-usd" },
  { contract: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", symbol: "DAI",   name: "Dai Stablecoin",     decimals: 18, cgId: "dai" },
  { contract: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE",  name: "PancakeSwap",        decimals: 18, cgId: "pancakeswap-token" },
  { contract: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH",   name: "Ethereum (BEP-20)",  decimals: 18, cgId: "ethereum" },
  { contract: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", symbol: "BTCB",  name: "Bitcoin BEP-20",     decimals: 18, cgId: "bitcoin" },
  { contract: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", symbol: "ADA",   name: "Cardano (BEP-20)",   decimals: 18, cgId: "cardano" },
  { contract: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", symbol: "DOT",   name: "Polkadot (BEP-20)",  decimals: 18, cgId: "polkadot" },
  { contract: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", symbol: "LINK",  name: "ChainLink (BEP-20)", decimals: 18, cgId: "chainlink" },
  { contract: "0xCC42724C6683B7E57334c4E856f4c9965ED682bD", symbol: "MATIC", name: "Polygon (BEP-20)",    decimals: 18, cgId: "matic-network" },
  { contract: "0x1CE0c2827e2ef14D5C4f29a091d735A204794041", symbol: "AVAX",  name: "Avalanche (BEP-20)", decimals: 18, cgId: "avalanche-2" },
  { contract: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", symbol: "SOL",   name: "Solana (BEP-20)",    decimals: 18, cgId: "solana" },
  { contract: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", symbol: "XRP",   name: "XRP (BEP-20)",       decimals: 18, cgId: "ripple" },
  { contract: "0xCE7de646e7208a4Ef112cb6ed5038FA6cC6b12e3", symbol: "TRX",   name: "TRON (BEP-20)",      decimals: 6,  cgId: "tron" },
  { contract: "0x2859e4544C4bB03966803b044A93563Bd2D0DD4D", symbol: "SHIB",  name: "Shiba Inu (BEP-20)", decimals: 18, cgId: "shiba-inu" },
  { contract: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1", symbol: "UNI",   name: "Uniswap (BEP-20)",   decimals: 18, cgId: "uniswap" },
  { contract: "0x85EAC5Ac2F758618Dfa09bDbe0cf174e7d574D5B", symbol: "TWT",   name: "Trust Wallet Token", decimals: 18, cgId: "trust-wallet-token" },
  { contract: "0xfb6115445Bff7b52FeB98650C87f44907E58f802", symbol: "AAVE",  name: "Aave (BEP-20)",      decimals: 18, cgId: "aave" },
  { contract: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB",  name: "Wrapped BNB",        decimals: 18, cgId: "wbnb" },
];

const BALANCE_OF = (addr: string) => "0x70a08231" + addr.slice(2).padStart(64, "0");

async function fetchBscTokens(address: string): Promise<EvmToken[]> {
  try {
    // Batch balanceOf calls
    const calls = BSC_TOKENS.map((t) =>
      Promise.race([
        fetch("https://bsc-dataseed1.binance.org", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: t.contract, data: BALANCE_OF(address) }, "latest"] }),
        }).then((r) => r.json()),
        new Promise<{ result: string }>((res) => setTimeout(() => res({ result: "0x0" }), 8_000)),
      ]).catch(() => ({ result: "0x0" }))
    );

    const settled = await Promise.allSettled(calls);
    const results = settled.map((r) => r.status === "fulfilled" ? r.value : { result: "0x0" });
    const withBalance = BSC_TOKENS.map((t, i) => {
      const raw     = (results[i] as { result: string }).result ?? "0x0";
      const balance = parseInt(raw, 16) / Math.pow(10, t.decimals);
      return { ...t, balance, chain: "bsc" as const };
    }).filter((t) => t.balance > 0.000001);

    if (withBalance.length === 0) return [];

    // Use /coins/markets which returns current_price, price_change_percentage_24h, image
    // This is far more reliable than /simple/token_price/binance-smart-chain
    const cgIds = withBalance.map((t) => t.cgId).filter(Boolean).join(",");
    const marketMap: Record<string, { price: number; change24h: number; image: string }> = {};
    if (cgIds) {
      try {
        const r = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cgIds}&per_page=50`,
          { signal: AbortSignal.timeout(10_000) }
        );
        const list = await r.json() as { id: string; current_price: number; price_change_percentage_24h: number; image: string }[];
        for (const c of (list ?? [])) {
          marketMap[c.id] = {
            price:    c.current_price ?? 0,
            change24h: c.price_change_percentage_24h ?? 0,
            image:    c.image ?? "",
          };
        }
      } catch { /* ignore */ }
    }

    return withBalance.map((t) => {
      const m = marketMap[t.cgId];
      // Use market price, fall back to hardcoded stable price, then 0
      const priceUSD = m?.price ?? STABLE_PRICES[t.cgId] ?? 0;
      return {
        contract:  t.contract,
        symbol:    t.symbol,
        name:      t.name,
        decimals:  t.decimals,
        balance:   t.balance,
        priceUSD,
        valueUSD:  t.balance * priceUSD,
        change24h: m?.change24h ?? 0,
        image:     m?.image ?? "",
        chain:     "bsc" as const,
      };
    }).sort((a, b) => b.valueUSD - a.valueUSD);
  } catch { return []; }
}

// ── Public API ────────────────────────────────────────────────────
export async function fetchAllEvmTokens(ethAddress: string): Promise<EvmToken[]> {
  const [eth, bsc] = await Promise.all([
    fetchEthTokens(ethAddress),
    fetchBscTokens(ethAddress),
  ]);
  return [...eth, ...bsc].sort((a, b) => b.valueUSD - a.valueUSD);
}

// ── CoinGecko token search ────────────────────────────────────────
export type SearchResult = {
  id:     string;
  symbol: string;
  name:   string;
  thumb:  string;
  marketCapRank?: number;
};

export async function searchTokens(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(8_000) });
  const d = await r.json();
  return (d.coins ?? []).slice(0, 20).map((c: Record<string, unknown>) => ({
    id:            c.id as string,
    symbol:        (c.symbol as string).toUpperCase(),
    name:          c.name as string,
    thumb:         c.thumb as string,
    marketCapRank: c.market_cap_rank as number,
  }));
}
