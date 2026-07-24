import {
  createPublicClient, createWalletClient,
  http, formatEther, parseEther, parseUnits, encodeFunctionData, type Hash,
} from "viem";
import { mainnet, sepolia, bsc, bscTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { rpcUrl } from "./config";
import { dataProxyFetch, dataProxyPath } from "./api";

export type Network = "mainnet" | "testnet";

const ETH_MAINNET = createPublicClient({ chain: mainnet,    transport: http(rpcUrl("ethereum", "mainnet")) });
const ETH_TESTNET = createPublicClient({ chain: sepolia,    transport: http(rpcUrl("ethereum", "testnet")) });
const BNB_MAINNET = createPublicClient({ chain: bsc,        transport: http(rpcUrl("bsc", "mainnet")) });
const BNB_TESTNET = createPublicClient({ chain: bscTestnet, transport: http(rpcUrl("bsc", "testnet")) });

const ethClient = (net: Network) => net === "testnet" ? ETH_TESTNET : ETH_MAINNET;
const bnbClient = (net: Network) => net === "testnet" ? BNB_TESTNET : BNB_MAINNET;

const btcBase = (net: Network) => net === "testnet"
  ? "https://blockstream.info/testnet/api"
  : "https://blockstream.info/api";

/* ── Balances ─────────────────────────────────────────────────── */
export async function getEthBalance(address: `0x${string}`, net: Network = "mainnet"): Promise<number> {
  const raw = await ethClient(net).getBalance({ address });
  return parseFloat(formatEther(raw));
}
export async function getBnbBalance(address: `0x${string}`, net: Network = "mainnet"): Promise<number> {
  const raw = await bnbClient(net).getBalance({ address });
  return parseFloat(formatEther(raw));
}
export async function getBtcBalance(address: string, net: Network = "mainnet"): Promise<number> {
  const r = await fetch(`${btcBase(net)}/address/${address}`, { signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`BTC balance failed: ${r.status}`);
  const d = await r.json();
  return ((d.chain_stats.funded_txo_sum as number) - (d.chain_stats.spent_txo_sum as number)) / 1e8;
}

/* ── Transaction types ────────────────────────────────────────── */
export type ChainTx = {
  hash:      string;
  type:      "send" | "receive";
  asset:     string;
  amount:    number;
  amountUSD: number;
  from:      string;
  to:        string;
  date:      Date;
  status:    "confirmed" | "pending" | "failed";
  isToken?:  boolean;
  tokenSymbol?: string;
  tokenImage?: string;
  tokenContract?: string;
  network?:   "ethereum" | "bsc" | "bitcoin" | "solana" | "tron";
  id?:       string;
  verification?: "native" | "verified" | "unverified";
};


/* ═══════════════════════════════════════════════════════════════
   TRANSACTION HISTORY
   All fetching goes through /api/txs (Next.js server route) so:
   — No browser CORS restrictions
   — BscScan/Etherscan work without API keys from server
   — eth_getLogs covers 7 days via server-side BSC RPC
   ═══════════════════════════════════════════════════════════════ */

type ApiRawTx = {
  hash: string; from: string; to: string; value: string;
  timeStamp?: string; isError?: string;
  tokenSymbol?: string; tokenDecimal?: string;
  tokenImage?: string;
  type?: string; chain?: string;
  contractAddress?: string; logIndex?: string; uniqueId?: string;
};

function parseTx(raw: ApiRawTx, address: string, nativeAsset: string, nativePriceUSD: number): ChainTx {
  const isToken  = raw.type === "token" || !!raw.tokenSymbol;
  const symbol   = isToken ? (raw.tokenSymbol || "TOKEN") : nativeAsset;
  const decimals = isToken ? (parseInt(raw.tokenDecimal ?? "18") || 18) : 18;
  let amount = 0;
  try {
    if (isToken) {
      // value is a plain decimal integer string (e.g. "1000000000000000000")
      const raw_val = raw.value.replace(/[^0-9]/g, "") || "0";
      const big     = BigInt(raw_val);
      const divisor = BigInt("1" + "0".repeat(decimals));
      amount = Number(big / divisor) + Number(big % divisor) / Math.pow(10, decimals);
    } else {
      const rawValue = raw.value || "0";
      const wei = rawValue.startsWith("0x") ? BigInt(rawValue) : BigInt(rawValue.replace(/[^0-9]/g, "") || "0");
      amount = parseFloat(formatEther(wei));
    }
  } catch { amount = 0; }

  const tsNum = raw.timeStamp ? Number(raw.timeStamp) : 0;
  const ts = Number.isFinite(tsNum) && tsNum > 0
    ? (tsNum > 9_999_999_999 ? tsNum : tsNum * 1000)
    : Date.now();
  const isRcv = (raw.to ?? "").toLowerCase() === address.toLowerCase();

  return {
    hash:        raw.hash,
    type:        isRcv ? "receive" : "send",
    asset:       symbol,
    amount:      isNaN(amount) ? 0 : Math.abs(amount),
    amountUSD:   isToken ? 0 : Math.abs(amount) * nativePriceUSD,
    from:        raw.from ?? "",
    to:          raw.to   ?? "",
    date:        new Date(ts),
    status:      raw.isError === "1" ? "failed" : "confirmed",
    isToken,
    tokenSymbol: isToken ? symbol : undefined,
    tokenImage:  raw.tokenImage,
    tokenContract: raw.contractAddress,
    network:     raw.chain === "bsc" ? "bsc" : "ethereum",
    id:          raw.uniqueId ?? `${raw.hash}:${raw.type ?? "native"}:${raw.contractAddress ?? ""}:${raw.logIndex ?? ""}:${symbol}`,
  };
}

async function fetchTxsFromApi(address: string, chain: "eth" | "bsc"): Promise<ApiRawTx[]> {
  try {
    const r = await dataProxyFetch(dataProxyPath(`/api/txs?address=${address}&chain=${chain}`), {
      signal: AbortSignal.timeout(25_000),
    });
    if (!r.ok) return [];
    const d = await r.json() as { transactions: ApiRawTx[] };
    return d.transactions ?? [];
  } catch { return []; }
}

export async function getEthTransactions(address: string, priceUSD: number, net: Network = "mainnet") {
  if (net === "testnet") return []; // skip for testnet
  const raw = await fetchTxsFromApi(address, "eth");
  const seen = new Set<string>();
  return raw
    .map((tx) => parseTx(tx, address, "ETH", priceUSD))
    .filter((tx) => { const id = tx.id ?? tx.hash; if (seen.has(id)) return false; seen.add(id); return true; })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getBnbTransactions(address: string, priceUSD: number, net: Network = "mainnet") {
  if (net === "testnet") return []; // skip for testnet
  const raw = await fetchTxsFromApi(address, "bsc");
  const seen = new Set<string>();
  return raw
    .map((tx) => parseTx(tx, address, "BNB", priceUSD))
    .filter((tx) => { const id = tx.id ?? tx.hash; if (seen.has(id)) return false; seen.add(id); return true; })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
export async function getBtcTransactions(address: string, priceUSD: number, net: Network = "mainnet"): Promise<ChainTx[]> {
  try {
    const r = await fetch(`${btcBase(net)}/address/${address}/txs`, { signal: AbortSignal.timeout(10_000) });
    const txs = await r.json() as Record<string, unknown>[];
    return txs.slice(0, 10).map((tx) => {
      const vout  = (tx.vout as { scriptpubkey_address: string; value: number }[]) ?? [];
      const vin   = (tx.vin as { prevout?: { scriptpubkey_address?: string; value?: number } }[]) ?? [];
      const toUs  = vout.filter((o) => o.scriptpubkey_address === address).reduce((s, o) => s + o.value, 0);
      const fromUs = vin.filter((i) => i.prevout?.scriptpubkey_address === address).reduce((s, i) => s + (i.prevout?.value ?? 0), 0);
      const netSats = toUs - fromUs;
      const conf  = !!(tx.status as { confirmed: boolean })?.confirmed;
      const amount = Math.abs(netSats || toUs) / 1e8;
      return {
        hash: tx.txid as string, type: netSats >= 0 ? "receive" : "send", asset: "BTC",
        amount, amountUSD: amount * priceUSD,
        from: address, to: address,
        date: conf ? new Date(((tx.status as { block_time: number })?.block_time ?? Date.now() / 1000) * 1000) : new Date(),
        status: conf ? "confirmed" : "pending",
        network: "bitcoin",
      } satisfies ChainTx;
    });
  } catch { return []; }
}

/* ── ERC-20 Transfer ABI ──────────────────────────────────────── */
const ERC20_TRANSFER_ABI = [{
  name: "transfer", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}] as const;

/* ── Send native ETH / BNB ────────────────────────────────────── */
export async function sendEth(params: { privateKey: Uint8Array; to: `0x${string}`; amount: string; net: Network }): Promise<Hash> {
  const account = privateKeyToAccount(`0x${Buffer.from(params.privateKey).toString("hex")}`);
  const chain   = params.net === "testnet" ? sepolia : mainnet;
  const rpc     = rpcUrl("ethereum", params.net);
  const client  = createWalletClient({ account, chain, transport: http(rpc) });
  return client.sendTransaction({ to: params.to, value: parseEther(params.amount) });
}
export async function sendBnb(params: { privateKey: Uint8Array; to: `0x${string}`; amount: string; net: Network }): Promise<Hash> {
  const account = privateKeyToAccount(`0x${Buffer.from(params.privateKey).toString("hex")}`);
  const chain   = params.net === "testnet" ? bscTestnet : bsc;
  const rpc     = rpcUrl("bsc", params.net);
  const client  = createWalletClient({ account, chain, transport: http(rpc) });
  return client.sendTransaction({ to: params.to, value: parseEther(params.amount) });
}

/* ── Send ERC-20 token ────────────────────────────────────────── */
export async function sendErc20(params: {
  privateKey:      Uint8Array;
  tokenContract:   `0x${string}`;
  to:              `0x${string}`;
  amount:          string;
  decimals:        number;
  chain:           "ethereum" | "bsc";
  net:             Network;
}): Promise<Hash> {
  const account  = privateKeyToAccount(`0x${Buffer.from(params.privateKey).toString("hex")}`);
  const isEth    = params.chain === "ethereum";
  const viemChain = params.net === "testnet" ? (isEth ? sepolia : bscTestnet) : (isEth ? mainnet : bsc);
  const rpc      = rpcUrl(isEth ? "ethereum" : "bsc", params.net);

  const client = createWalletClient({ account, chain: viemChain, transport: http(rpc) });
  const rawAmount = parseUnits(params.amount, params.decimals);
  const data   = encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: "transfer", args: [params.to, rawAmount] });

  return client.sendTransaction({ to: params.tokenContract, data });
}

export async function estimateGasUSD(priceUSD: number, net: Network = "mainnet"): Promise<number> {
  try {
    const gasPrice = await ethClient(net).getGasPrice();
    return (Number(gasPrice) * 21000 / 1e18) * priceUSD;
  } catch { return 0.5; }
}
