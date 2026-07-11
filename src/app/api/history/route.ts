import { NextRequest, NextResponse } from "next/server";
import { formatEther } from "viem";
import { solanaRpcUrl } from "@/lib/config";
import { fetchEvmRawHistory } from "@/lib/serverEvmHistory";
import type { ChainTx, Network } from "@/lib/chains";
import { verifiedEvmToken, verifiedTokenAmountUSD } from "@/lib/tokenVerification";

export const dynamic = "force-dynamic";

type ApiRawTx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp?: string;
  isError?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
  tokenImage?: string;
  type?: string;
  chain?: string;
  contractAddress?: string;
  logIndex?: string;
  uniqueId?: string;
};

type SerializableTx = Omit<ChainTx, "date"> & { date: string };

const BTC_BASE = {
  mainnet: "https://blockstream.info/api",
  testnet: "https://blockstream.info/testnet/api",
} as const;

function parseNumber(value: string | null, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function parseRawValue(value: string | undefined, decimals: number) {
  try {
    const raw = (value ?? "0").startsWith("0x")
      ? BigInt(value ?? "0x0")
      : BigInt((value ?? "0").replace(/[^0-9]/g, "") || "0");
    const divisor = 10n ** BigInt(decimals);
    return Number(raw / divisor) + Number(raw % divisor) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

function parseUnix(input: string | undefined) {
  const n = Number(input ?? 0);
  if (!Number.isFinite(n) || n <= 0) return Date.now();
  return n > 9_999_999_999 ? n : n * 1000;
}

function parseEvmTx(raw: ApiRawTx, address: string, nativeAsset: "ETH" | "BNB", nativePriceUSD: number): ChainTx {
  const isToken = raw.type === "token" || !!raw.tokenSymbol;
  const txNetwork = raw.chain === "bsc" ? "bsc" : "ethereum";
  const verifiedToken = isToken ? verifiedEvmToken(txNetwork, raw.contractAddress) : undefined;
  const decimals = isToken ? (verifiedToken?.decimals ?? (parseInt(raw.tokenDecimal ?? "18", 10) || 18)) : 18;
  const amount = isToken
    ? parseRawValue(raw.value, decimals)
    : parseFloat(formatEther(raw.value?.startsWith("0x") ? BigInt(raw.value) : BigInt((raw.value ?? "0").replace(/[^0-9]/g, "") || "0")));
  const isReceive = (raw.to ?? "").toLowerCase() === address.toLowerCase();
  const symbol = isToken ? (verifiedToken?.symbol ?? raw.tokenSymbol ?? "TOKEN") : nativeAsset;
  const absoluteAmount = Math.abs(Number.isFinite(amount) ? amount : 0);

  return {
    hash: raw.hash,
    type: isReceive ? "receive" : "send",
    asset: symbol,
    amount: absoluteAmount,
    amountUSD: isToken ? verifiedTokenAmountUSD(txNetwork, raw.contractAddress, absoluteAmount) : absoluteAmount * nativePriceUSD,
    from: raw.from ?? "",
    to: raw.to ?? "",
    date: new Date(parseUnix(raw.timeStamp)),
    status: raw.isError === "1" ? "failed" : "confirmed",
    isToken,
    tokenSymbol: isToken ? symbol : undefined,
    tokenImage: raw.tokenImage,
    tokenContract: raw.contractAddress,
    network: txNetwork,
    id: raw.uniqueId ?? `${raw.hash}:${raw.type ?? "native"}:${raw.contractAddress ?? ""}:${raw.logIndex ?? ""}:${symbol}`,
    verification: isToken ? (verifiedToken ? "verified" : "unverified") : "native",
  };
}

async function fetchEvmHistory(address: string, chain: "eth" | "bsc", priceUSD: number, network: Network) {
  if (network !== "mainnet" || !/^0x[0-9a-fA-F]{40}$/.test(address)) return [];
  const d = await fetchEvmRawHistory(address, [chain]);
  const native = chain === "eth" ? "ETH" : "BNB";
  return (d.transactions ?? [])
    .map((tx) => parseEvmTx(tx, address, native, priceUSD))
    .filter((tx) => tx.isToken || tx.amount > 0 || tx.status === "failed");
}

type BlockstreamTx = {
  txid: string;
  vin?: { prevout?: { scriptpubkey_address?: string; value?: number } }[];
  vout?: { scriptpubkey_address?: string; value?: number }[];
  status?: { confirmed?: boolean; block_time?: number };
};

async function fetchBtcHistory(address: string, priceUSD: number, network: Network): Promise<ChainTx[]> {
  if (!address) return [];
  const r = await fetch(`${BTC_BASE[network]}/address/${address}/txs`, {
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`BTC history failed: ${r.status}`);
  const txs = await r.json() as BlockstreamTx[];

  return txs.slice(0, 25).map((tx) => {
    const vin = tx.vin ?? [];
    const vout = tx.vout ?? [];
    const fromUs = vin.reduce((sum, input) => input.prevout?.scriptpubkey_address === address ? sum + (input.prevout.value ?? 0) : sum, 0);
    const toUs = vout.reduce((sum, output) => output.scriptpubkey_address === address ? sum + (output.value ?? 0) : sum, 0);
    const netSats = toUs - fromUs;
    const amount = Math.abs(netSats || toUs) / 1e8;
    const type = netSats >= 0 ? "receive" : "send";
    const oppositeInput = vin.find((input) => input.prevout?.scriptpubkey_address && input.prevout.scriptpubkey_address !== address)?.prevout?.scriptpubkey_address;
    const oppositeOutput = vout.find((output) => output.scriptpubkey_address && output.scriptpubkey_address !== address)?.scriptpubkey_address;
    const confirmed = !!tx.status?.confirmed;

    return {
      hash: tx.txid,
      type,
      asset: "BTC",
      amount,
      amountUSD: amount * priceUSD,
      from: type === "send" ? address : (oppositeInput ?? address),
      to: type === "receive" ? address : (oppositeOutput ?? address),
      date: confirmed ? new Date((tx.status?.block_time ?? Date.now() / 1000) * 1000) : new Date(),
      status: confirmed ? "confirmed" : "pending",
      network: "bitcoin",
      id: `${tx.txid}:btc`,
      verification: "native",
    } satisfies ChainTx;
  }).filter((tx) => tx.amount > 0);
}

async function solRpc<T>(method: string, params: unknown[], network: Network): Promise<T> {
  const r = await fetch(solanaRpcUrl(network), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(18_000),
    cache: "no-store",
  });
  const d = await r.json() as { result?: T; error?: { message?: string } };
  if (!r.ok || d.error || d.result === undefined) throw new Error(d.error?.message ?? `SOL history failed: ${r.status}`);
  return d.result;
}

async function fetchSolHistory(address: string, priceUSD: number, network: Network): Promise<ChainTx[]> {
  if (!address) return [];
  const sigs = await solRpc<{ signature: string; blockTime?: number; err?: unknown }[]>(
    "getSignaturesForAddress",
    [address, { limit: 25 }],
    network
  );
  if (!sigs.length) return [];

  const details = await Promise.allSettled(
    sigs.slice(0, 15).map((sig) =>
      solRpc<{
        meta?: { preBalances?: number[]; postBalances?: number[] };
        transaction?: { message?: { accountKeys?: ({ pubkey?: string } | string)[] } };
      } | null>("getTransaction", [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }], network)
    )
  );

  return details.map((res, i) => {
    const sig = sigs[i];
    const tx = res.status === "fulfilled" ? res.value : null;
    const keys = tx?.transaction?.message?.accountKeys?.map((key) => typeof key === "string" ? key : key.pubkey ?? "") ?? [];
    const ownIndex = keys.findIndex((key) => key === address);
    const pre = ownIndex >= 0 ? (tx?.meta?.preBalances?.[ownIndex] ?? 0) : 0;
    const post = ownIndex >= 0 ? (tx?.meta?.postBalances?.[ownIndex] ?? 0) : 0;
    const diff = (post - pre) / 1e9;
    const amount = Math.abs(diff);
    const type = diff < 0 ? "send" : "receive";
    const opposite = keys.find((key) => key && key !== address) ?? address;

    return {
      hash: sig.signature,
      type,
      asset: "SOL",
      amount,
      amountUSD: amount * priceUSD,
      from: type === "send" ? address : opposite,
      to: type === "receive" ? address : opposite,
      date: sig.blockTime ? new Date(sig.blockTime * 1000) : new Date(),
      status: sig.err ? "failed" : "confirmed",
      network: "solana",
      id: `${sig.signature}:sol`,
      verification: "native",
    } satisfies ChainTx;
  }).filter((tx) => tx.amount > 0 || tx.status === "failed");
}

function dedupeAndSerialize(parts: ChainTx[][]): SerializableTx[] {
  const seen = new Set<string>();
  return parts
    .flat()
    .filter((tx) => {
      const id = tx.id ?? `${tx.hash}:${tx.asset}:${tx.type}`;
      if (!tx.hash || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((tx) => ({ ...tx, date: tx.date.toISOString() }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const network = searchParams.get("network") === "testnet" ? "testnet" : "mainnet";

  const eth = searchParams.get("eth") ?? "";
  const bsc = searchParams.get("bsc") ?? "";
  const btc = searchParams.get("btc") ?? "";
  const sol = searchParams.get("sol") ?? "";

  const [ethTxs, bscTxs, btcTxs, solTxs] = await Promise.allSettled([
    fetchEvmHistory(eth, "eth", parseNumber(searchParams.get("ethPrice")), network),
    fetchEvmHistory(bsc, "bsc", parseNumber(searchParams.get("bnbPrice")), network),
    fetchBtcHistory(btc, parseNumber(searchParams.get("btcPrice")), network),
    fetchSolHistory(sol, parseNumber(searchParams.get("solPrice")), network),
  ]);

  const errors = [ethTxs, bscTxs, btcTxs, solTxs]
    .filter((res): res is PromiseRejectedResult => res.status === "rejected")
    .map((res) => res.reason instanceof Error ? res.reason.message : "History source failed");

  return NextResponse.json({
    transactions: dedupeAndSerialize([ethTxs, bscTxs, btcTxs, solTxs].map((res) => res.status === "fulfilled" ? res.value : [])),
    errors,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
