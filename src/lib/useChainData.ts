"use client";

import { useCallback, useEffect } from "react";
import { useWalletStore, type AssetInfo } from "./store";
import { fetchPrices, type Prices } from "./prices";
import { getBnbBalance, getBtcBalance, getEthBalance } from "./chains";
import { getSolBalance, getSplTokens } from "./solana";
import { getTrc20Tokens, getTrxBalance } from "./tron";
import { bitcoinAddressForNetwork } from "./bitcoin";
import { fetchAllEvmTokens } from "./tokens";
import { fetchWalletHistory } from "./history";
import { readCacheAny, writeCache } from "./cache";
import { setWalletRefreshHandler } from "./walletRefresh";
import type { WalletAddresses } from "./wallet";

const FETCH_TIMEOUT = 12_000;
const EMPTY_EVM = "0x0000000000000000000000000000000000000000";

let activeRefreshKey = "";
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
    TRX:  { usd: 0, usd_24h_change: 0, usd_7d_change: 0, image: "", spark7d: [], spark7dTimestamps: [] },
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

function validTron(address: string | undefined) {
  return !!address && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
}

function cacheAddress(addresses: WalletAddresses, mode: string) {
  return [
    mode,
    addresses.ethereum || EMPTY_EVM,
    addresses.bsc || EMPTY_EVM,
    addresses.bitcoin || "",
    addresses.solana || "",
    addresses.tron || "",
  ].join(":");
}

function pricesFromAssets(assets: AssetInfo[]): Prices {
  const prices = emptyPrices();
  for (const asset of assets) {
    if (!asset.symbol || asset.priceUSD <= 0) continue;
    const current = prices[asset.symbol] ?? {
      usd: 0,
      usd_24h_change: 0,
      usd_7d_change: 0,
      image: "",
      spark7d: [],
      spark7dTimestamps: [],
    };
    prices[asset.symbol] = {
      ...current,
      usd: asset.priceUSD,
      usd_24h_change: asset.change24h,
      usd_7d_change: asset.change7d,
      image: asset.image || current.image,
      spark7d: asset.spark7d?.length ? asset.spark7d : current.spark7d,
      spark7dTimestamps: asset.spark7dTimestamps?.length ? asset.spark7dTimestamps : current.spark7dTimestamps,
    };
  }
  return prices;
}

function usablePrices(prices: Prices | null, previousAssets: AssetInfo[]) {
  return mergePrices(prices, previousAssets.length ? pricesFromAssets(previousAssets) : null);
}

function nativePrice(prices: Prices, previousAssets: AssetInfo[], symbol: keyof ReturnType<typeof emptyPrices>, id: string) {
  const price = prices[symbol]?.usd ?? 0;
  if (price > 0) return price;
  return previousAssets.find((asset) => asset.id === id)?.priceUSD ?? 0;
}

function buildNativeAssets(
  balances: { eth: number; btc: number; bnb: number; sol: number; trx: number },
  prices: Prices,
  previousAssets: AssetInfo[],
): AssetInfo[] {
  const ethPrice = nativePrice(prices, previousAssets, "ETH", "eth");
  const btcPrice = nativePrice(prices, previousAssets, "BTC", "btc");
  const bnbPrice = nativePrice(prices, previousAssets, "BNB", "bnb");
  const solPrice = nativePrice(prices, previousAssets, "SOL", "sol");
  const trxPrice = nativePrice(prices, previousAssets, "TRX", "trx");

  return [
    { id: "eth", symbol: "ETH", name: "Ethereum", network: "ethereum", balance: balances.eth, priceUSD: ethPrice, change24h: prices.ETH?.usd_24h_change ?? 0, change7d: prices.ETH?.usd_7d_change ?? 0, spark7d: prices.ETH?.spark7d ?? [], spark7dTimestamps: prices.ETH?.spark7dTimestamps ?? [], image: prices.ETH?.image ?? "", desc: "Smart contract platform" },
    { id: "btc", symbol: "BTC", name: "Bitcoin",  network: "bitcoin",  balance: balances.btc, priceUSD: btcPrice, change24h: prices.BTC?.usd_24h_change ?? 0, change7d: prices.BTC?.usd_7d_change ?? 0, spark7d: prices.BTC?.spark7d ?? [], spark7dTimestamps: prices.BTC?.spark7dTimestamps ?? [], image: prices.BTC?.image ?? "", desc: "Original decentralised currency" },
    { id: "bnb", symbol: "BNB", name: "BNB",      network: "bsc",      balance: balances.bnb, priceUSD: bnbPrice, change24h: prices.BNB?.usd_24h_change ?? 0, change7d: prices.BNB?.usd_7d_change ?? 0, spark7d: prices.BNB?.spark7d ?? [], spark7dTimestamps: prices.BNB?.spark7dTimestamps ?? [], image: prices.BNB?.image ?? "", desc: "BNB Chain native token" },
    { id: "sol", symbol: "SOL", name: "Solana",   network: "solana",   balance: balances.sol, priceUSD: solPrice, change24h: prices.SOL?.usd_24h_change ?? 0, change7d: prices.SOL?.usd_7d_change ?? 0, spark7d: prices.SOL?.spark7d ?? [], spark7dTimestamps: prices.SOL?.spark7dTimestamps ?? [], image: prices.SOL?.image ?? "", desc: "High-performance L1" },
    { id: "trx", symbol: "TRX", name: "TRON",     network: "tron",     balance: balances.trx, priceUSD: trxPrice, change24h: prices.TRX?.usd_24h_change ?? 0, change7d: prices.TRX?.usd_7d_change ?? 0, spark7d: prices.TRX?.spark7d ?? [], spark7dTimestamps: prices.TRX?.spark7dTimestamps ?? [], image: prices.TRX?.image ?? "", desc: "TRON native token and TRC-20 fee asset" },
  ];
}

function filterWatchAssets(assets: AssetInfo[], available: { hasEth: boolean; hasBsc: boolean; hasBtc: boolean; hasSol: boolean; hasTron: boolean }, sessionMode: string) {
  if (sessionMode !== "watch") return assets;
  return assets.filter((asset) =>
    (asset.network === "ethereum" && available.hasEth) ||
    (asset.network === "bsc" && available.hasBsc) ||
    (asset.network === "bitcoin" && available.hasBtc) ||
    (asset.network === "solana" && available.hasSol) ||
    (asset.network === "tron" && available.hasTron)
  );
}

export function useChainData() {
  const {
    addresses, network, mnemonic, sessionMode, activeAccountIndex, activeAddressIndexes,
    setAssets, setTokens, setTxs, setPrices,
    setLoading, setInitialLoaded, setSourceState, markUpdated,
  } = useWalletStore();

  const refresh = useCallback(async (silent = false) => {
    if (!addresses) return;
    const requestKey = `${network}:${sessionMode}:${activeAccountIndex}:${cacheAddress(addresses, sessionMode).toLowerCase()}`;
    if (activeRefreshKey === requestKey) return;
    const isCurrentRequest = () => {
      const state = useWalletStore.getState();
      return state.addresses === addresses && state.network === network && state.activeAccountIndex === activeAccountIndex && state.sessionMode === sessionMode;
    };

    activeRefreshKey = requestKey;
    if (!silent) setLoading(true);

    const sourceStatus = silent ? "refreshing" : "loading";
    setSourceState("prices", { status: sourceStatus, error: undefined });
    setSourceState("balances", { status: sourceStatus, error: undefined });

    try {
      const bitcoinAddress = mnemonic ? bitcoinAddressForNetwork(mnemonic, network, activeAccountIndex, activeAddressIndexes.bitcoin) : addresses.bitcoin;
      const hasEth = validEvm(addresses.ethereum);
      const hasBsc = validEvm(addresses.bsc);
      const hasBtc = validBtc(bitcoinAddress);
      const hasSol = validSol(addresses.solana);
      const hasTron = validTron(addresses.tron);
      const available = { hasEth, hasBsc, hasBtc, hasSol, hasTron };
      const priceRequest = loadWithTimeout(fetchPrices(), FETCH_TIMEOUT);
      const [ethBal, bnbBal, btcBal, solBal, trxBal] = await Promise.all([
        hasEth ? loadWithTimeout(getEthBalance(addresses.ethereum, network), FETCH_TIMEOUT) : skipped(0),
        hasBsc ? loadWithTimeout(getBnbBalance(addresses.bsc, network), FETCH_TIMEOUT) : skipped(0),
        hasBtc ? loadWithTimeout(getBtcBalance(bitcoinAddress, network), FETCH_TIMEOUT) : skipped(0),
        hasSol ? loadWithTimeout(getSolBalance(addresses.solana, network), FETCH_TIMEOUT) : skipped(0),
        hasTron ? loadWithTimeout(getTrxBalance(addresses.tron, network), FETCH_TIMEOUT) : skipped(0),
      ]);

      if (!isCurrentRequest()) return;
      const balanceSnap = useWalletStore.getState();
      const prevAssets = balanceSnap.assets;
      const safeBal = (fresh: LoadResult<number>, id: string) =>
        fresh.ok ? fresh.value : (prevAssets.find((a) => a.id === id)?.balance ?? 0);
      const balances = {
        eth: safeBal(ethBal, "eth"),
        btc: safeBal(btcBal, "btc"),
        bnb: safeBal(bnbBal, "bnb"),
        sol: safeBal(solBal, "sol"),
        trx: safeBal(trxBal, "trx"),
      };
      const provisionalPrices = usablePrices(balanceSnap.prices, prevAssets);
      const provisionalAssets = filterWatchAssets(buildNativeAssets(balances, provisionalPrices, prevAssets), available, sessionMode);

      setAssets(provisionalAssets);
      setInitialLoaded(true);
      setLoading(false);
      const balanceFailures = [ethBal, bnbBal, btcBal, solBal, trxBal].filter((res) => !res.ok);
      setSourceState("balances", {
        status: balanceFailures.length ? "partial" : "ready",
        error: balanceFailures.map((res) => !res.ok ? res.error : "").filter(Boolean).join("; ") || undefined,
        updatedAt: Date.now(),
      });
      writeCache(cacheAddress(addresses, sessionMode), network, {
        assets: provisionalAssets,
        transactions: balanceSnap.transactions,
        evmTokens: balanceSnap.evmTokens,
        splTokens: balanceSnap.splTokens,
        trc20Tokens: balanceSnap.trc20Tokens,
        prices: balanceSnap.prices ?? pricesFromAssets(provisionalAssets),
      });

      const priceResult = await priceRequest;
      if (!isCurrentRequest()) return;
      const pricedSnap = useWalletStore.getState();
      const prices = mergePrices(priceResult.ok ? priceResult.value : null, pricedSnap.prices ?? pricesFromAssets(pricedSnap.assets));
      setPrices(prices);
      setSourceState("prices", {
        status: priceResult.ok ? "ready" : (pricedSnap.prices || pricedSnap.assets.some((asset) => asset.priceUSD > 0) ? "partial" : "error"),
        error: priceResult.ok ? undefined : priceResult.error,
        updatedAt: Date.now(),
      });
      const assets = filterWatchAssets(buildNativeAssets(balances, prices, pricedSnap.assets), available, sessionMode);
      setAssets(assets);

      setSourceState("transactions", { status: sourceStatus, error: undefined });
      const historyResult = await loadWithTimeout(fetchWalletHistory(addresses, bitcoinAddress, prices, network), 38_000);
      if (!isCurrentRequest()) return;
      const txs = historyResult.ok ? historyResult.value : useWalletStore.getState().transactions;
      setTxs(txs);
      setSourceState("transactions", {
        status: historyResult.ok ? "ready" : (txs.length ? "partial" : "error"),
        error: historyResult.ok ? undefined : historyResult.error,
        updatedAt: Date.now(),
      });

      markUpdated();

      if (network === "mainnet") {
        setSourceState("tokens", { status: "refreshing", error: undefined });
        const [evmTokens, splTokens, trc20Tokens] = await Promise.all([
          hasEth || hasBsc ? loadWithTimeout(fetchAllEvmTokens(hasEth ? addresses.ethereum : EMPTY_EVM as `0x${string}`, hasBsc ? addresses.bsc : EMPTY_EVM as `0x${string}`), 25_000) : skipped([]),
          hasSol ? loadWithTimeout(getSplTokens(addresses.solana, network), 15_000) : skipped([]),
          hasTron ? loadWithTimeout(getTrc20Tokens(addresses.tron, network), 18_000) : skipped([]),
        ]);
        if (!isCurrentRequest()) return;
        const storeSnap = useWalletStore.getState();
        const nextEvm = evmTokens.ok ? evmTokens.value : storeSnap.evmTokens;
        const nextSpl = splTokens.ok ? splTokens.value : storeSnap.splTokens;
        const nextTrc20 = trc20Tokens.ok ? trc20Tokens.value : storeSnap.trc20Tokens;
        if (evmTokens.ok || splTokens.ok || trc20Tokens.ok) setTokens(nextEvm, nextSpl, nextTrc20);
        setSourceState("tokens", {
          status: evmTokens.ok && splTokens.ok && trc20Tokens.ok ? "ready" : "partial",
          error: [evmTokens, splTokens, trc20Tokens].map((res) => !res.ok ? res.error : "").filter(Boolean).join("; ") || undefined,
          updatedAt: Date.now(),
        });
      } else {
        setTokens([], [], []);
        setSourceState("tokens", { status: "ready", updatedAt: Date.now(), error: undefined });
      }

      const finalSnap = useWalletStore.getState();
      writeCache(cacheAddress(addresses, sessionMode), network, {
        assets: finalSnap.assets,
        transactions: txs,
        evmTokens: finalSnap.evmTokens,
        splTokens: finalSnap.splTokens,
        trc20Tokens: finalSnap.trc20Tokens,
        prices,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : "Chain data failed";
      console.error("Chain data error:", e);
      if (isCurrentRequest()) {
        setSourceState("balances", { status: "error", error });
        setSourceState("transactions", { status: "error", error });
        setInitialLoaded(true);
      }
    } finally {
      if (isCurrentRequest()) setLoading(false);
      if (activeRefreshKey === requestKey) activeRefreshKey = "";
    }
  }, [activeAccountIndex, activeAddressIndexes, addresses, markUpdated, mnemonic, network, sessionMode, setAssets, setInitialLoaded, setLoading, setPrices, setSourceState, setTokens, setTxs]);

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
        setTokens(cached.evmTokens ?? [], cached.splTokens ?? [], cached.trc20Tokens ?? []);
        setPrices(cached.prices ?? pricesFromAssets(cached.assets));
        setSourceState("balances", { status: "refreshing", updatedAt: cached.ts, error: undefined });
        setSourceState("prices", { status: "refreshing", updatedAt: cached.ts, error: undefined });
        setSourceState("tokens", { status: "refreshing", updatedAt: cached.ts, error: undefined });
        setSourceState("transactions", { status: "refreshing", updatedAt: cached.ts, error: undefined });
        setInitialLoaded(true);
      }
    }

    refresh(!!cached || useWalletStore.getState().initialLoaded);

    const id = setInterval(() => refresh(true), 60_000);
    return () => clearInterval(id);
  }, [addresses, network, refresh, sessionMode, setAssets, setInitialLoaded, setPrices, setSourceState, setTokens, setTxs]);

  return { refresh: () => refresh(false) };
}
