"use client";

import type { ChainTx, Network } from "./chains";
import type { Prices } from "./prices";
import type { WalletAddresses } from "./wallet";
import { dataProxyPath } from "./api";

type ApiHistoryTx = Omit<ChainTx, "date"> & { date: string };

export async function fetchWalletHistory(
  addresses: WalletAddresses,
  bitcoinAddress: string,
  prices: Prices,
  network: Network
): Promise<ChainTx[]> {
  const params = new URLSearchParams({
    eth: addresses.ethereum,
    bsc: addresses.bsc,
    btc: bitcoinAddress,
    sol: addresses.solana,
    network,
    ethPrice: String(prices.ETH?.usd ?? 0),
    bnbPrice: String(prices.BNB?.usd ?? 0),
    btcPrice: String(prices.BTC?.usd ?? 0),
    solPrice: String(prices.SOL?.usd ?? 0),
  });

  const r = await fetch(dataProxyPath(`/api/history?${params.toString()}`), {
    signal: AbortSignal.timeout(35_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`History failed: ${r.status}`);

  const d = await r.json() as { transactions?: ApiHistoryTx[]; errors?: string[] };
  if (d.errors?.length && !d.transactions?.length) {
    throw new Error(d.errors.join("; "));
  }
  return (d.transactions ?? [])
    .map((tx) => ({ ...tx, date: new Date(tx.date) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
