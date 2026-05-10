"use client";
import { useEffect, useCallback, useRef } from "react";
import { useWalletStore } from "./store";
import { fetchPrices } from "./prices";
import { getEthBalance, getBnbBalance, getBtcBalance, getEthTransactions, getBnbTransactions, getBtcTransactions } from "./chains";
import { getSolBalance, getSplTokens, getSolTransactions } from "./solana";
import { fetchAllEvmTokens } from "./tokens";
import { readCacheAny, writeCache } from "./cache";
import type { AssetInfo } from "./store";

const FETCH_TIMEOUT = 12_000; // 12s per call max

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function useChainData() {
  const {
    addresses, network,
    setAssets, setTokens, setTxs, setPrices,
    setLoading, setInitialLoaded,
  } = useWalletStore();

  const loadingRef = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (!addresses) return;
    if (loadingRef.current && !silent) return; // prevent duplicate calls
    loadingRef.current = true;
    if (!silent) setLoading(true);

    try {
      // ── STEP 1: Prices (fast) ──────────────────────────────────
      const p = await withTimeout(fetchPrices(), FETCH_TIMEOUT, null);
      if (p) setPrices(p);

      // ── STEP 2: Native balances in parallel (with individual fallbacks) ─
      const [ethBal, bnbBal, btcBal, solBal] = await Promise.all([
        withTimeout(getEthBalance(addresses.ethereum, network), FETCH_TIMEOUT, -1),
        withTimeout(getBnbBalance(addresses.bsc, network),      FETCH_TIMEOUT, -1),
        withTimeout(getBtcBalance(addresses.bitcoin, network),  FETCH_TIMEOUT, -1),
        withTimeout(getSolBalance(addresses.solana),            FETCH_TIMEOUT, -1),
      ]);

      // Preserve existing prices/sparklines if fresh fetch failed (CoinGecko rate-limited)
      const existingSnap = useWalletStore.getState() as { assets: AssetInfo[]; prices: import("./prices").Prices | null };
      const prevPrices   = existingSnap.prices;
      const prices = p ?? prevPrices ?? {
        ETH:  { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [] },
        BTC:  { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [] },
        BNB:  { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [] },
        SOL:  { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [] },
        USDC: { usd: 1, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [] },
      };

      // Use -1 as sentinel: -1 means API failed → keep existing balance
      const prevAssets = existingSnap.assets;
      const safeBal = (fresh: number, id: string) =>
        fresh >= 0 ? fresh : (prevAssets.find((a) => a.id === id)?.balance ?? 0);

      const assets: AssetInfo[] = [
        { id: "eth", symbol: "ETH", name: "Ethereum", network: "ethereum", balance: safeBal(ethBal, "eth"), priceUSD: prices.ETH?.usd ?? 0, change24h: prices.ETH?.usd_24h_change ?? 0, change7d: prices.ETH?.usd_7d_change ?? 0, spark7d: prices.ETH?.spark7d?.length ? prices.ETH.spark7d : (prevPrices?.ETH?.spark7d ?? []), image: prices.ETH?.image || prevPrices?.ETH?.image || "", desc: "Smart contract platform" },
        { id: "btc", symbol: "BTC", name: "Bitcoin",  network: "bitcoin",  balance: safeBal(btcBal, "btc"), priceUSD: prices.BTC?.usd ?? 0, change24h: prices.BTC?.usd_24h_change ?? 0, change7d: prices.BTC?.usd_7d_change ?? 0, spark7d: prices.BTC?.spark7d?.length ? prices.BTC.spark7d : (prevPrices?.BTC?.spark7d ?? []), image: prices.BTC?.image || prevPrices?.BTC?.image || "", desc: "Original decentralised currency" },
        { id: "bnb", symbol: "BNB", name: "BNB",      network: "bsc",      balance: safeBal(bnbBal, "bnb"), priceUSD: prices.BNB?.usd ?? 0, change24h: prices.BNB?.usd_24h_change ?? 0, change7d: prices.BNB?.usd_7d_change ?? 0, spark7d: prices.BNB?.spark7d?.length ? prices.BNB.spark7d : (prevPrices?.BNB?.spark7d ?? []), image: prices.BNB?.image || prevPrices?.BNB?.image || "", desc: "BNB Chain native token" },
        { id: "sol", symbol: "SOL", name: "Solana",   network: "solana",   balance: safeBal(solBal, "sol"), priceUSD: prices.SOL?.usd ?? 0, change24h: prices.SOL?.usd_24h_change ?? 0, change7d: prices.SOL?.usd_7d_change ?? 0, spark7d: prices.SOL?.spark7d?.length ? prices.SOL.spark7d : (prevPrices?.SOL?.spark7d ?? []), image: prices.SOL?.image || prevPrices?.SOL?.image || "", desc: "High-performance L1" },
      ];

      setAssets(assets);

      // ── STEP 3: Show UI immediately (no more skeletons) ────────
      setInitialLoaded(true);
      setLoading(false);
      loadingRef.current = false;

      // ── STEP 4: Tokens in background (non-blocking) ───────────
      if (network === "mainnet") {
        const [evmTokens, splTokens] = await Promise.all([
          withTimeout(fetchAllEvmTokens(addresses.ethereum), 25_000, []),
          withTimeout(getSplTokens(addresses.solana), 15_000, []),
        ]);
        // Never overwrite existing tokens with empty — API timeout returns []
        // and would silently wipe all visible tokens from the store
        const storeSnap = useWalletStore.getState() as { evmTokens: unknown[] };
        const hadTokens = storeSnap.evmTokens.length > 0;
        if (evmTokens.length > 0 || splTokens.length > 0 || !hadTokens) {
          setTokens(evmTokens, splTokens);
        }
      }

      // ── STEP 5: Transactions (server-side API, allow plenty of time) ──
      const [ethTxs, bnbTxs, btcTxs, solTxs] = await Promise.all([
        withTimeout(getEthTransactions(addresses.ethereum, prices.ETH?.usd ?? 0, network), 30_000, []),
        withTimeout(getBnbTransactions(addresses.bsc,      prices.BNB?.usd ?? 0, network), 30_000, []),
        withTimeout(getBtcTransactions(addresses.bitcoin,  prices.BTC?.usd ?? 0, network), 15_000, []),
        network === "mainnet"
          ? withTimeout(getSolTransactions(addresses.solana, prices.SOL?.usd ?? 0), 20_000, [])
          : Promise.resolve([]),
      ]);

      const txs = [...ethTxs, ...bnbTxs, ...btcTxs, ...solTxs]
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      setTxs(txs);

      // ── Cache fresh data (including tokens for instant next load) ──
      const snap = useWalletStore.getState() as { evmTokens: unknown[]; splTokens: unknown[] };
      writeCache(addresses.ethereum, network, {
        assets,
        transactions: txs,
        evmTokens: (snap.evmTokens ?? []) as import("./tokens").EvmToken[],
        splTokens: (snap.splTokens ?? []) as import("./solana").SplToken[],
      });

    } catch (e) {
      console.error("Chain data error:", e);
      setInitialLoaded(true); // always unblock UI
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [addresses, network]);

  useEffect(() => {
    if (!addresses) return;

    // Always show cached data instantly (stale-while-revalidate)
    const cached = readCacheAny(addresses.ethereum, network);
    if (cached) {
      setAssets(cached.assets);
      setTxs(cached.transactions);
      if (cached.evmTokens?.length || cached.splTokens?.length) {
        setTokens(cached.evmTokens ?? [], cached.splTokens ?? []);
      }
      setInitialLoaded(true); // show cached UI immediately, no skeletons
    }

    // Then refresh in background regardless of cache age
    refresh(!!cached);

    const id = setInterval(() => refresh(true), 60_000);
    return () => clearInterval(id);
  }, [addresses, network]);

  return { refresh: () => refresh(false) };
}
