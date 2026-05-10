import { serverAnkrUrl } from "./serverConfig";

export type ApiTx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp?: string;
  isError?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
  tokenName?: string;
  tokenImage?: string;
  type?: string;
  chain?: string;
  contractAddress?: string;
  logIndex?: string;
  uniqueId?: string;
};

type AnkrTx = {
  hash?: string;
  from?: string;
  to?: string;
  value?: string;
  timestamp?: string | number;
  blockchain?: string;
  status?: string;
};

type AnkrTransfer = {
  fromAddress?: string;
  toAddress?: string;
  contractAddress?: string;
  valueRawInteger?: string;
  blockchain?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  thumbnail?: string;
  transactionHash?: string;
  blockHeight?: number;
  timestamp?: number | string;
  logIndex?: number | string;
};

const CHAIN_BLOCKSCOUT = {
  eth: "https://eth.blockscout.com/api/v2",
  bsc: "https://bsc.blockscout.com/api/v2",
} as const;

function unixSeconds(input: unknown): string {
  if (typeof input === "number") return String(input > 9_999_999_999 ? Math.floor(input / 1000) : input);
  if (typeof input !== "string" || !input) return String(Math.floor(Date.now() / 1000));
  if (input.startsWith("0x")) return String(parseInt(input, 16));
  if (/^\d+$/.test(input)) {
    const n = Number(input);
    return String(n > 9_999_999_999 ? Math.floor(n / 1000) : n);
  }
  const parsed = Date.parse(input);
  return Number.isFinite(parsed) ? String(Math.floor(parsed / 1000)) : String(Math.floor(Date.now() / 1000));
}

async function ankrPost(method: string, params: Record<string, unknown>) {
  const url = serverAnkrUrl();
  if (!url) throw new Error("ANKR_API_KEY is not configured");
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const d = await r.json() as { result?: unknown; error?: unknown };
  if (!r.ok || !d.result) throw new Error(JSON.stringify(d.error ?? { status: r.status }));
  return d.result;
}

function normalizeAnkrNative(tx: AnkrTx): ApiTx | null {
  if (!tx.hash) return null;
  return {
    hash: tx.hash,
    from: tx.from ?? "",
    to: tx.to ?? "",
    value: tx.value ?? "0",
    timeStamp: unixSeconds(tx.timestamp),
    isError: tx.status === "0" || tx.status === "failed" ? "1" : "0",
    type: "native",
    chain: tx.blockchain,
    uniqueId: `${tx.hash}:native`,
  };
}

function normalizeAnkrToken(tx: AnkrTransfer): ApiTx | null {
  if (!tx.transactionHash) return null;
  const logIndex = String(tx.logIndex ?? tx.blockHeight ?? "");
  return {
    hash: tx.transactionHash,
    from: tx.fromAddress ?? "",
    to: tx.toAddress ?? "",
    value: tx.valueRawInteger ?? "0",
    timeStamp: unixSeconds(tx.timestamp),
    tokenSymbol: tx.tokenSymbol,
    tokenDecimal: String(tx.tokenDecimals ?? 18),
    tokenName: tx.tokenName,
    tokenImage: tx.thumbnail,
    type: "token",
    chain: tx.blockchain,
    contractAddress: tx.contractAddress,
    logIndex,
    uniqueId: `${tx.transactionHash}:token:${tx.contractAddress ?? ""}:${logIndex}`,
  };
}

async function fetchAnkr(address: string, blockchains: ("eth" | "bsc")[]): Promise<{ transactions: ApiTx[]; nativeCount: number; tokenCount: number; failed: boolean; errors: string[] }> {
  const [nativeResult, tokenResult] = await Promise.allSettled([
    ankrPost("ankr_getTransactionsByAddress", {
      blockchain: blockchains,
      address,
      pageSize: 100,
      descOrder: true,
    }),
    ankrPost("ankr_getTokenTransfers", {
      blockchain: blockchains,
      address,
      pageSize: 100,
      descOrder: true,
    }),
  ]);

  const native = nativeResult.status === "fulfilled"
    ? (((nativeResult.value as { transactions?: AnkrTx[] }).transactions ?? []).map(normalizeAnkrNative).filter(Boolean) as ApiTx[])
    : [];
  const tokens = tokenResult.status === "fulfilled"
    ? (((tokenResult.value as { transfers?: AnkrTransfer[] }).transfers ?? []).map(normalizeAnkrToken).filter(Boolean) as ApiTx[])
    : [];

  const errors = [nativeResult, tokenResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason instanceof Error ? result.reason.message : "Ankr request failed");

  return {
    transactions: [...native, ...tokens],
    nativeCount: native.length,
    tokenCount: tokens.length,
    failed: nativeResult.status === "rejected" && tokenResult.status === "rejected",
    errors,
  };
}

async function fetchBlockscout(address: string, chain: "eth" | "bsc"): Promise<ApiTx[]> {
  const base = CHAIN_BLOCKSCOUT[chain];
  const [nativeResult, tokenResult] = await Promise.allSettled([
    fetch(`${base}/addresses/${address}/transactions?limit=50`, { signal: AbortSignal.timeout(12_000), cache: "no-store" }).then((r) => r.ok ? r.json() : { items: [] }),
    fetch(`${base}/addresses/${address}/token-transfers?type=ERC-20`, { signal: AbortSignal.timeout(12_000), cache: "no-store" }).then((r) => r.ok ? r.json() : { items: [] }),
  ]);

  const nativeItems = nativeResult.status === "fulfilled" ? ((nativeResult.value as { items?: Record<string, unknown>[] }).items ?? []) : [];
  const tokenItems = tokenResult.status === "fulfilled" ? ((tokenResult.value as { items?: Record<string, unknown>[] }).items ?? []) : [];

  const native = nativeItems.map((tx): ApiTx => ({
    hash: tx.hash as string,
    from: (tx.from as { hash?: string } | undefined)?.hash ?? "",
    to: (tx.to as { hash?: string } | undefined)?.hash ?? "",
    value: String(tx.value ?? "0"),
    timeStamp: unixSeconds(tx.timestamp),
    isError: tx.status === "ok" || tx.result === "success" ? "0" : "0",
    type: "native",
    chain,
    uniqueId: `${tx.hash}:native`,
  })).filter((tx) => !!tx.hash);

  const tokens = tokenItems.map((item): ApiTx => {
    const token = item.token as { address?: string; symbol?: string; name?: string; decimals?: string; icon_url?: string } | undefined;
    const total = item.total as { value?: string; decimals?: string } | undefined;
    const txHash = (item.transaction_hash ?? item.transactionHash) as string;
    const logIndex = String(item.log_index ?? item.index ?? "");
    return {
      hash: txHash,
      from: (item.from as { hash?: string } | undefined)?.hash ?? "",
      to: (item.to as { hash?: string } | undefined)?.hash ?? "",
      value: String(total?.value ?? item.value ?? "0"),
      timeStamp: unixSeconds(item.timestamp),
      tokenSymbol: token?.symbol,
      tokenDecimal: String(total?.decimals ?? token?.decimals ?? "18"),
      tokenName: token?.name,
      tokenImage: token?.icon_url,
      type: "token",
      chain,
      contractAddress: token?.address,
      logIndex,
      uniqueId: `${txHash}:token:${token?.address ?? ""}:${logIndex}`,
    };
  }).filter((tx) => !!tx.hash);

  return [...native, ...tokens];
}

export function dedupeEvmTxs(txs: ApiTx[]) {
  const seen = new Set<string>();
  return txs.filter((tx) => {
    const id = tx.uniqueId ?? `${tx.hash}:${tx.type ?? "native"}:${tx.contractAddress ?? ""}:${tx.logIndex ?? ""}`;
    if (!tx.hash || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).sort((a, b) => Number(b.timeStamp ?? 0) - Number(a.timeStamp ?? 0));
}

export async function fetchEvmRawHistory(address: string, chains: ("eth" | "bsc")[]) {
  const ankr = await fetchAnkr(address, chains).catch((error) => ({
    transactions: [],
    nativeCount: 0,
    tokenCount: 0,
    failed: true,
    errors: [error instanceof Error ? error.message : "Ankr failed"],
  }));
  const fallback = ankr.failed || ankr.transactions.length === 0 || ankr.tokenCount === 0
    ? await Promise.all(chains.map((chain) => fetchBlockscout(address, chain).catch(() => []))).then((parts) => parts.flat())
    : [];

  return {
    transactions: dedupeEvmTxs([...ankr.transactions, ...fallback]),
    source: ankr.transactions.length ? "ankr" : "blockscout",
    errors: ankr.errors,
  };
}
