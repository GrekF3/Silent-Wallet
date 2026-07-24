import { TronWeb } from "tronweb";
import type { ChainTx, Network } from "./chains";
import { dataProxyPath } from "./api";
import { TRON_USDT_CONTRACT, verifiedToken, verifiedTokenAmountUSD } from "./tokenVerification";

const TRON_HOSTS: Record<Network, string> = {
  mainnet: "https://api.trongrid.io",
  testnet: "https://nile.trongrid.io",
};

const TRON_USDT_IMAGE = "https://coin-images.coingecko.com/coins/images/325/large/Tether.png";
const TRC20_FEE_LIMIT_SUN = 100_000_000;

const TRC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type Trc20Token = {
  contract: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  priceUSD: number;
  valueUSD: number;
  change24h: number;
  image: string;
  chain: "tron";
};

function privateKeyHex(privateKey: Uint8Array) {
  return Array.from(privateKey, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function tronWeb(network: Network, privateKey?: Uint8Array) {
  return new TronWeb({
    fullHost: TRON_HOSTS[network],
    ...(privateKey ? { privateKey: privateKeyHex(privateKey) } : {}),
  });
}

function decimalFromRaw(raw: string, decimals: number) {
  try {
    const value = BigInt(raw);
    const divisor = 10n ** BigInt(decimals);
    return Number(value / divisor) + Number(value % divisor) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

function parseDecimalUnits(value: string, decimals: number) {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error("Enter a valid amount");
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) throw new Error(`Amount supports up to ${decimals} decimal places`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
}

function safeInteger(value: bigint) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Amount is too large");
  return Number(value);
}

export function isTronAddress(address: string) {
  return TronWeb.isAddress(address.trim());
}

export async function getTrxBalanceServer(address: string, network: Network = "mainnet") {
  if (!isTronAddress(address)) return 0;
  const sun = await tronWeb(network).trx.getBalance(address);
  return sun / 1_000_000;
}

export async function getTrxBalance(address: string, network: Network = "mainnet") {
  if (typeof window === "undefined") return getTrxBalanceServer(address, network);
  const params = new URLSearchParams({ address, network });
  const response = await fetch(dataProxyPath(`/api/tron/balance?${params.toString()}`), {
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`TRON balance failed: ${response.status}`);
  const body = await response.json() as { balance?: number };
  return body.balance ?? 0;
}

export async function getTrc20TokensServer(address: string, network: Network = "mainnet"): Promise<Trc20Token[]> {
  if (network !== "mainnet" || !isTronAddress(address)) return [];
  const client = tronWeb(network);
  client.setAddress(address);
  const contract = client.contract(TRC20_ABI, TRON_USDT_CONTRACT);
  const raw = await contract.balanceOf(address).call();
  const balance = decimalFromRaw(String(raw), 6);
  return [{
    contract: TRON_USDT_CONTRACT,
    symbol: "USDT",
    name: "Tether USD (TRC-20)",
    decimals: 6,
    balance,
    priceUSD: 1,
    valueUSD: balance,
    change24h: 0,
    image: TRON_USDT_IMAGE,
    chain: "tron",
  }];
}

export async function getTrc20Tokens(address: string, network: Network = "mainnet"): Promise<Trc20Token[]> {
  if (typeof window === "undefined") return getTrc20TokensServer(address, network);
  const params = new URLSearchParams({ address, network });
  const response = await fetch(dataProxyPath(`/api/tron/tokens?${params.toString()}`), {
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`TRC-20 token lookup failed: ${response.status}`);
  const body = await response.json() as { tokens?: Trc20Token[] };
  return body.tokens ?? [];
}

export async function sendTrx(params: {
  privateKey: Uint8Array;
  to: string;
  amount: string;
  network: Network;
}) {
  if (!isTronAddress(params.to)) throw new Error("Invalid TRON address");
  const amountSun = safeInteger(parseDecimalUnits(params.amount, 6));
  const client = tronWeb(params.network, params.privateKey);
  const result = await client.trx.sendTransaction(params.to, amountSun, {
    privateKey: privateKeyHex(params.privateKey),
  });
  if (!result.result || !result.txid) {
    const message = result.message ? client.toUtf8(result.message) : "TRX broadcast failed";
    throw new Error(message);
  }
  return result.txid;
}

export async function sendTrc20(params: {
  privateKey: Uint8Array;
  tokenContract: string;
  to: string;
  amount: string;
  decimals: number;
  network: Network;
}) {
  if (!isTronAddress(params.to)) throw new Error("Invalid TRON address");
  if (!isTronAddress(params.tokenContract)) throw new Error("Invalid TRC-20 contract");
  const rawAmount = parseDecimalUnits(params.amount, params.decimals);
  const client = tronWeb(params.network, params.privateKey);
  const contract = client.contract(TRC20_ABI, params.tokenContract);
  return contract.transfer(params.to, rawAmount).send(
    { feeLimit: TRC20_FEE_LIMIT_SUN, callValue: 0, shouldPollResponse: false },
    privateKeyHex(params.privateKey),
  );
}

export async function getTronTransactionStatus(hash: string, network: Network): Promise<"pending" | "confirmed" | "failed"> {
  try {
    const info = await tronWeb(network).trx.getTransactionInfo(hash);
    if (!info || Object.keys(info).length === 0) return "pending";
    return info.result === "FAILED" ? "failed" : "confirmed";
  } catch {
    return "pending";
  }
}

function tronGridHeaders(): HeadersInit {
  const key = process.env.TRONGRID_API_KEY?.trim();
  return key ? { "TRON-PRO-API-KEY": key } : {};
}

function tronAddressFromHex(address: unknown) {
  try {
    return typeof address === "string" ? TronWeb.address.fromHex(address) : "";
  } catch {
    return "";
  }
}

type TronGridNativeTx = {
  txID?: string;
  block_timestamp?: number;
  ret?: { contractRet?: string }[];
  raw_data?: {
    contract?: {
      type?: string;
      parameter?: { value?: { amount?: number; owner_address?: string; to_address?: string } };
    }[];
  };
};

type TronGridTrc20Tx = {
  transaction_id?: string;
  block_timestamp?: number;
  from?: string;
  to?: string;
  type?: string;
  value?: string;
  token_info?: {
    address?: string;
    symbol?: string;
    name?: string;
    decimals?: number;
  };
};

async function tronGridList<T>(url: string): Promise<T[]> {
  const response = await fetch(url, {
    headers: tronGridHeaders(),
    signal: AbortSignal.timeout(18_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`TRON history failed: ${response.status}`);
  const body = await response.json() as { data?: T[] };
  return body.data ?? [];
}

export async function getTronTransactions(
  address: string,
  trxPriceUSD: number,
  network: Network = "mainnet",
): Promise<ChainTx[]> {
  if (!isTronAddress(address)) return [];
  const base = TRON_HOSTS[network];
  const encodedAddress = encodeURIComponent(address);
  const [native, trc20] = await Promise.all([
    tronGridList<TronGridNativeTx>(`${base}/v1/accounts/${encodedAddress}/transactions?only_confirmed=true&limit=30&order_by=block_timestamp,desc`),
    tronGridList<TronGridTrc20Tx>(`${base}/v1/accounts/${encodedAddress}/transactions/trc20?only_confirmed=true&limit=30&order_by=block_timestamp,desc`),
  ]);

  const nativeTxs = native.flatMap((row): ChainTx[] => {
    const contract = row.raw_data?.contract?.[0];
    if (contract?.type !== "TransferContract" || !row.txID) return [];
    const value = contract.parameter?.value;
    const from = tronAddressFromHex(value?.owner_address);
    const to = tronAddressFromHex(value?.to_address);
    const amount = Number(value?.amount ?? 0) / 1_000_000;
    const receive = to === address;
    return [{
      hash: row.txID,
      type: receive ? "receive" : "send",
      asset: "TRX",
      amount,
      amountUSD: amount * trxPriceUSD,
      from,
      to,
      date: new Date(row.block_timestamp ?? Date.now()),
      status: row.ret?.[0]?.contractRet === "SUCCESS" ? "confirmed" : "failed",
      network: "tron",
      id: `${row.txID}:trx`,
    }];
  });

  const tokenTxs = trc20.flatMap((row): ChainTx[] => {
    if (!row.transaction_id) return [];
    const decimals = Number(row.token_info?.decimals ?? 6);
    const amount = decimalFromRaw(row.value ?? "0", decimals);
    const tokenContract = row.token_info?.address;
    const verified = verifiedToken("tron", tokenContract);
    const symbol = verified?.symbol ?? row.token_info?.symbol ?? "TRC20";
    const receive = row.to === address || row.type === "Transfer" && row.to?.toLowerCase() === address.toLowerCase();
    return [{
      hash: row.transaction_id,
      type: receive ? "receive" : "send",
      asset: symbol,
      amount,
      amountUSD: verifiedTokenAmountUSD("tron", tokenContract, amount),
      from: row.from ?? "",
      to: row.to ?? "",
      date: new Date(row.block_timestamp ?? Date.now()),
      status: "confirmed",
      isToken: true,
      tokenSymbol: symbol,
      tokenContract,
      tokenImage: verified?.contract === TRON_USDT_CONTRACT ? TRON_USDT_IMAGE : undefined,
      network: "tron",
      id: `${row.transaction_id}:trc20:${row.token_info?.address ?? symbol}`,
    }];
  });

  const seen = new Set<string>();
  return [...nativeTxs, ...tokenTxs]
    .filter((tx) => {
      if (seen.has(tx.id ?? tx.hash)) return false;
      seen.add(tx.id ?? tx.hash);
      return tx.amount > 0 || tx.status === "failed";
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
