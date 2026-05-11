"use client";

import { useCallback, useEffect } from "react";
import { useWalletStore, type AssetInfo } from "./store";
import { fetchPrices, type Prices } from "./prices";
import { getBnbBalance, getBtcBalance, getEthBalance } from "./chains";
import { getSolBalance, getSplTokens } from "./solana";
import { bitcoinAddressForNetwork } from "./bitcoin";
import { fetchAllEvmTokens } from "./tokens";
import { fetchWalletHistory } from "./history";
import { readCacheAny, writeCache } from "./cache";
import { setWalletRefreshHandler } from "./walletRefresh";

const FETCH_TIMEOUT = 12_000;
const EMPTY_EVM = "0x0000000000000000000000000000000000000000";

let activeRefresh = false;
let hydratedCacheKey = "";

type LoadResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

async function loadWithTimeout<T>(promise: Promise<T>, ms: number): Promise<LoadResult<T>> {
  try {
    const value = await Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms)),
    ]);
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}

function emptyPrices(): Prices {
  return {
    ETH:  { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [], spark7dTimestamps: [] },
    BTC:  { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [], spark7dTimestamps: [] },
    BNB:  { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [], spark7dTimestamps: [] },
    SOL:  { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [], spark7dTimestamps: [] },
    USDC: { usd: 1, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [], spark7dTimestamps: [] },
  };
}

function mergePrices(fresh: Prices | null, previous: Prices | null): Prices {
  const fallback = emptyPrices();
  const merged: Prices = {};

  for (const symbol of Object.keys(fallback)) {
    const freshCoin = fresh?.[symbol];
    const prevCoin = previous?.[symbol];
    const base = fallback[symbol];
    const usableCoin = freshCoin?.usd ? freshCoin : (prevCoin?.usd ? prevCoin : freshCoin ?? prevCoin ?? base);
    merged[symbol] = {
      ...base,
      ...usableCoin,
      usd: usableCoin.usd || prevCoin?.usd || base.usd,
      image: usableCoin.image || prevCoin?.image || base.image,
      spark7d: usableCoin.spark7d?.length ? usableCoin.spark7d : (prevCoin?.spark7d ?? base.spark7d),
      spark7dTimestamps: usableCoin.spark7dTimestamps?.length ? usableCoin.spark7dTimestamps : (prevCoin?.spark7dTimestamps ?? base.spark7dTimestamps),
    };
  }

  return merged;
}

function skipped<T>(value: T): LoadResult<T> {
  return { ok: true, value };
}

function validEvm(address: string | undefined) {
  return !!address && address !== EMPTY_EVM && /^0x[0-9a-fA-F]{40}$/.test(address);
}

function validBtc(address: string | undefined) {
  return !!address && /^(bc1|tb1|[13mn2])[a-zA-HJ-NP-Z0-9]{25,80}$/.test(address);
}

function validSol(address: string | undefined) {
  return !!address && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function cacheAddress(addresses: { ethereum: string; bitcoin: string; solana: string }, mode: string) {
  const address = validEvm(addresses.ethereum) ? addresses.ethereum : (addresses.bitcoin || addresses.solana || addresses.ethereum);
  return `${mode}:${address}`;
}

export function useChainData() {
  const {
    addresses, network, mnemonic, sessionMode,
    setAssets, setTokens, setTxs, setPrices,
    setLoading, setInitialLoaded, setSourceState, markUpdated,
  } = useWalletStore();

  const refresh = useCallback(async (silent = false) => {
    if (!addresses) return;
    if (activeRefresh) return;

    activeRefresh = true;
    if (!silent) setLoading(true);

    const sourceStatus = silent ? "refreshing" : "loading";
    setSourceState("prices", { status: sourceStatus, error: undefined });
    setSourceState("balances", { status: sourceStatus, error: undefined });

    try {
      const priceResult = await loadWithTimeout(fetchPrices(), FETCH_TIMEOUT);
      const existingSnap = useWalletStore.getState();
      const prices = mergePrices(priceResult.ok ? priceResult.value : null, existingSnap.prices);

      setPrices(prices);
      setSourceState("prices", {
        status: priceResult.ok ? "ready" : (existingSnap.prices ? "partial" : "error"),
        error: priceResult.ok ? undefined : priceResult.error,
        updatedAt: Date.now(),
      });

      const bitcoinAddress = mnemonic ? bitcoinAddressForNetwork(mnemonic, network) : addresses.bitcoin;
      const hasEth = validEvm(addresses.ethereum);
      const hasBsc = validEvm(addresses.bsc);
      const hasBtc = validBtc(bitcoinAddress);
      const hasSol = validSol(addresses.solana);
      const [ethBal, bnbBal, btcBal, solBal] = await Promise.all([
        hasEth ? loadWithTimeout(getEthBalance(addresses.ethereum, network), FETCH_TIMEOUT) : skipped(0),
        hasBsc ? loadWithTimeout(getBnbBalance(addresses.bsc, network), FETCH_TIMEOUT) : skipped(0),
        hasBtc ? loadWithTimeout(getBtcBalance(bitcoinAddress, network), FETCH_TIMEOUT) : skipped(0),
        hasSol ? loadWithTimeout(getSolBalance(addresses.solana, network), FETCH_TIMEOUT) : skipped(0),
      ]);

      const prevAssets = useWalletStore.getState().assets;
      const safeBal = (fresh: LoadResult<number>, id: string) =>
        fresh.ok ? fresh.value : (prevAssets.find((a) => a.id === id)?.balance ?? 0);

      const allNativeAssets: AssetInfo[] = [
        { id: "eth", symbol: "ETH", name: "Ethereum", network: "ethereum", balance: safeBal(ethBal, "eth"), priceUSD: prices.ETH?.usd ?? 0, change24h: prices.ETH?.usd_24h_change ?? 0, change7d: prices.ETH?.usd_7d_change ?? 0, spark7d: prices.ETH?.spark7d ?? [], spark7dTimestamps: prices.ETH?.spark7dTimestamps ?? [], image: prices.ETH?.image ?? "", desc: "Smart contract platform" },
        { id: "btc", symbol: "BTC", name: "Bitcoin",  network: "bitcoin",  balance: safeBal(btcBal, "btc"), priceUSD: prices.BTC?.usd ?? 0, change24h: prices.BTC?.usd_24h_change ?? 0, change7d: prices.BTC?.usd_7d_change ?? 0, spark7d: prices.BTC?.spark7d ?? [], spark7dTimestamps: prices.BTC?.spark7dTimestamps ?? [], image: prices.BTC?.image ?? "", desc: "Original decentralised currency" },
        { id: "bnb", symbol: "BNB", name: "BNB",      network: "bsc",      balance: safeBal(bnbBal, "bnb"), priceUSD: prices.BNB?.usd ?? 0, change24h: prices.BNB?.usd_24h_change ?? 0, change7d: prices.BNB?.usd_7d_change ?? 0, spark7d: prices.BNB?.spark7d ?? [], spark7dTimestamps: prices.BNB?.spark7dTimestamps ?? [], image: prices.BNB?.image ?? "", desc: "BNB Chain native token" },
        { id: "sol", symbol: "SOL", name: "Solana",   network: "solana",   balance: safeBal(solBal, "sol"), priceUSD: prices.SOL?.usd ?? 0, change24h: prices.SOL?.usd_24h_change ?? 0, change7d: prices.SOL?.usd_7d_change ?? 0, spark7d: prices.SOL?.spark7d ?? [], spark7dTimestamps: prices.SOL?.spark7dTimestamps ?? [], image: prices.SOL?.image ?? "", desc: "High-performance L1" },
      ];
      const assets = sessionMode === "watch"
        ? allNativeAssets.filter((asset) =>
          (asset.network === "ethereum" && hasEth) ||
          (asset.network === "bsc" && hasBsc) ||
          (asset.network === "bitcoin" && hasBtc) ||
          (asset.network === "solana" && hasSol)
        )
        : allNativeAssets;

      setAssets(assets);
      const balanceFailures = [ethBal, bnbBal, btcBal, solBal].filter((res) => !res.ok);
      setSourceState("balances", {
        status: balanceFailures.length ? "partial" : "ready",
        error: balanceFailures.map((res) => !res.ok ? res.error : "").filter(Boolean).join("; ") || undefined,
        updatedAt: Date.now(),
      });

      setSourceState("transactions", { status: sourceStatus, error: undefined });
      const historyResult = await loadWithTimeout(fetchWalletHistory(addresses, bitcoinAddress, prices, network), 38_000);
      const txs = historyResult.ok ? historyResult.value : useWalletStore.getState().transactions;
      setTxs(txs);
      setSourceState("transactions", {
        status: historyResult.ok ? "ready" : (txs.length ? "partial" : "error"),
        error: historyResult.ok ? undefined : historyResult.error,
        updatedAt: Date.now(),
      });

      markUpdated();
      setInitialLoaded(true);
      setLoading(false);

      if (network === "mainnet") {
        setSourceState("tokens", { status: "refreshing", error: undefined });
        const [evmTokens, splTokens] = await Promise.all([
          hasEth || hasBsc ? loadWithTimeout(fetchAllEvmTokens(hasEth ? addresses.ethereum : EMPTY_EVM as `0x${string}`, hasBsc ? addresses.bsc : EMPTY_EVM as `0x${string}`), 25_000) : skipped([]),
          hasSol ? loadWithTimeout(getSplTokens(addresses.solana, network), 15_000) : skipped([]),
        ]);
        const storeSnap = useWalletStore.getState();
        const nextEvm = evmTokens.ok ? evmTokens.value : storeSnap.evmTokens;
        const nextSpl = splTokens.ok ? splTokens.value : storeSnap.splTokens;
        if (evmTokens.ok || splTokens.ok) setTokens(nextEvm, nextSpl);
        setSourceState("tokens", {
          status: evmTokens.ok && splTokens.ok ? "ready" : "partial",
          error: [evmTokens, splTokens].map((res) => !res.ok ? res.error : "").filter(Boolean).join("; ") || undefined,
          updatedAt: Date.now(),
        });
      } else {
        setTokens([], []);
        setSourceState("tokens", { status: "ready", updatedAt: Date.now(), error: undefined });
      }

      const finalSnap = useWalletStore.getState();
      writeCache(cacheAddress(addresses, sessionMode), network, {
        assets,
        transactions: txs,
        evmTokens: finalSnap.evmTokens,
        splTokens: finalSnap.splTokens,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : "Chain data failed";
      console.error("Chain data error:", e);
      setSourceState("balances", { status: "error", error });
      setSourceState("transactions", { status: "error", error });
      setInitialLoaded(true);
    } finally {
      setLoading(false);
      activeRefresh = false;
    }
  }, [addresses, markUpdated, mnemonic, network, sessionMode, setAssets, setInitialLoaded, setLoading, setPrices, setSourceState, setTokens, setTxs]);

  useEffect(() => {
    setWalletRefreshHandler(() => refresh(false));
    return () => setWalletRefreshHandler(null);
  }, [refresh]);

  useEffect(() => {
    if (!addresses) return;

    const primary = cacheAddress(addresses, sessionMode);
    const cacheKey = `${network}:${primary.toLowerCase()}`;
    let cached = null;
    if (hydratedCacheKey !== cacheKey) {
      hydratedCacheKey = cacheKey;
      cached = readCacheAny(primary, network);
      if (cached) {
        setAssets(cached.assets);
        setTxs(cached.transactions);
        setTokens(cached.evmTokens ?? [], cached.splTokens ?? []);
        setInitialLoaded(true);
      }
    }

    refresh(!!cached || useWalletStore.getState().initialLoaded);

    const id = setInterval(() => refresh(true), 60_000);
    return () => clearInterval(id);
  }, [addresses, network, refresh, sessionMode, setAssets, setInitialLoaded, setTokens, setTxs]);

  return { refresh: () => refresh(false) };
}
