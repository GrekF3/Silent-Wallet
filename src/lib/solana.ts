// Solana: SLIP-0010 key derivation via @noble/hashes (already a viem dep)
// No ESM-only packages needed.
import { hmac }   from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";
import nacl from "tweetnacl";
import * as bip39 from "@scure/bip39";
import { solanaRpcUrl } from "./config";
import { dataProxyPath } from "./api";
import type { Network } from "./chains";

/* ── Base58 (inline, avoids ESM-only bs58) ───────────────────────── */
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function encodeBase58(bytes: Uint8Array): string {
  let zeros = 0;
  for (const b of bytes) { if (b === 0) zeros++; else break; }
  const digits = [0];
  for (const b of bytes) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = Math.floor(carry / 58); }
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  return "1".repeat(zeros) + digits.reverse().map((d) => B58[d]).join("");
}
function decodeBase58(text: string): Uint8Array {
  const bytes = [0];
  for (const ch of text) {
    const val = B58.indexOf(ch);
    if (val < 0) throw new Error("Invalid base58");
    let carry = val;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  let zeros = 0;
  for (const ch of text) { if (ch === "1") zeros++; else break; }
  return new Uint8Array([...Array(zeros).fill(0), ...bytes.reverse()]);
}

/* ── SLIP-0010 ed25519 HD derivation ─────────────────────────────── */
type HdNode = { key: Uint8Array; chainCode: Uint8Array };

function slip10Master(seed: Uint8Array): HdNode {
  const I = hmac(sha512, Buffer.from("ed25519 seed"), seed);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

function slip10Child(parent: HdNode, index: number): HdNode {
  const data = new Uint8Array(37);
  data[0] = 0x00;
  data.set(parent.key, 1);
  new DataView(data.buffer).setUint32(33, index + 0x80000000, false);
  const I = hmac(sha512, parent.chainCode, data);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

function safeAccountIndex(accountIndex = 0) {
  return Number.isInteger(accountIndex) && accountIndex >= 0 ? accountIndex : 0;
}

function pathAccountIndex(accountIndex = 0, addressIndex = 0) {
  const account = safeAccountIndex(accountIndex);
  const address = Number.isInteger(addressIndex) && addressIndex >= 0 ? addressIndex : 0;
  if (address === 0) return account;
  return 10_000 + account * 1_000 + address;
}

/* ── Key derivation (m/44'/501'/{account/address}'/0') ───────────── */
export function deriveSolanaKeypair(mnemonic: string, accountIndex = 0, addressIndex = 0): { address: string; secretKey: Uint8Array } {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  let node = slip10Master(seed);
  for (const i of [44, 501, pathAccountIndex(accountIndex, addressIndex), 0]) node = slip10Child(node, i);
  const kp = nacl.sign.keyPair.fromSeed(node.key);
  return { address: encodeBase58(kp.publicKey), secretKey: kp.secretKey };
}

/* ── SOL balance ─────────────────────────────────────────────────── */
const TOKEN_PROG = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";

async function solRpc<T>(method: string, params: unknown[], network: Network = "mainnet"): Promise<T> {
  const r = await fetch(solanaRpcUrl(network), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(d.error?.message ?? `Solana RPC failed: ${r.status}`);
  return d.result as T;
}

export async function getSolBalanceServer(address: string, network: Network = "mainnet"): Promise<number> {
  const result = await solRpc<{ value: number }>("getBalance", [address], network);
  return (result?.value ?? 0) / 1e9;
}

export async function getSolBalance(address: string, network: Network = "mainnet"): Promise<number> {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams({ address, network });
    const r = await fetch(dataProxyPath(`/api/solana/balance?${params.toString()}`), {
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`SOL balance failed: ${r.status}`);
    const d = await r.json() as { balance?: number | null; error?: string };
    if (d.error) throw new Error(d.error);
    return d.balance ?? 0;
  }

  return getSolBalanceServer(address, network);
}

function shortVec(n: number): number[] {
  const out: number[] = [];
  let value = n;
  do {
    let elem = value & 0x7f;
    value >>= 7;
    if (value) elem |= 0x80;
    out.push(elem);
  } while (value);
  return out;
}

function u32le(n: number): number[] {
  return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
}

function u64le(n: bigint): number[] {
  const out: number[] = [];
  let value = n;
  for (let i = 0; i < 8; i++) { out.push(Number(value & 255n)); value >>= 8n; }
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

export async function sendSol(params: { mnemonic: string; to: string; amount: string; network: Network; accountIndex?: number; addressIndex?: number }): Promise<string> {
  const kp = deriveSolanaKeypair(params.mnemonic, params.accountIndex ?? 0, params.addressIndex ?? 0);
  const from = decodeBase58(kp.address);
  const to = decodeBase58(params.to);
  const system = decodeBase58(SYSTEM_PROGRAM);
  if (from.length !== 32 || to.length !== 32 || system.length !== 32) throw new Error("Invalid Solana address");

  const lamports = BigInt(Math.floor(Number(params.amount) * 1e9));
  if (lamports <= 0n) throw new Error("Amount must be greater than zero");

  const latest = await solRpc<{ value: { blockhash: string } }>("getLatestBlockhash", [{ commitment: "confirmed" }], params.network);
  const blockhash = decodeBase58(latest.value.blockhash);

  const message = concatBytes([
    new Uint8Array([1, 0, 1]),
    new Uint8Array(shortVec(3)),
    from, to, system,
    blockhash,
    new Uint8Array(shortVec(1)),
    new Uint8Array([2]),
    new Uint8Array(shortVec(2)),
    new Uint8Array([0, 1]),
    new Uint8Array(shortVec(12)),
    new Uint8Array([...u32le(2), ...u64le(lamports)]),
  ]);
  const sig = nacl.sign.detached(message, kp.secretKey);
  const tx = concatBytes([new Uint8Array(shortVec(1)), sig, message]);
  return await solRpc<string>("sendTransaction", [encodeBase58(tx), { encoding: "base58", skipPreflight: false }], params.network);
}

/* ── SOL transaction history ─────────────────────────────────────── */
export type SolTx = {
  hash:      string;
  type:      "send" | "receive";
  asset:     "SOL";
  amount:    number;
  amountUSD: number;
  from:      string;
  to:        string;
  date:      Date;
  status:    "confirmed" | "pending" | "failed";
};

export async function getSolTransactions(address: string, priceUSD = 0, network: Network = "mainnet"): Promise<SolTx[]> {
  try {
    // Get recent signatures
    const sigs = await solRpc<{ signature: string; blockTime: number; err: unknown; confirmationStatus: string }[]>(
      "getSignaturesForAddress",
      [address, { limit: 15 }],
      network
    );
    if (!sigs.length) return [];

    // Fetch full transactions in parallel (limit to avoid rate limiting)
    const txDetails = await Promise.allSettled(
      sigs.slice(0, 10).map((s) =>
        solRpc<unknown>("getTransaction", [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }], network)
      )
    );

    return txDetails.map((res, i) => {
      const sig = sigs[i];
      const tx = (res.status === "fulfilled" ? res.value : null) as {
        meta?: { preBalances?: number[]; postBalances?: number[] };
        transaction?: { message?: { accountKeys?: ({ pubkey?: string } | string)[] } };
      } | null;

      let amount = 0;
      let type: "send" | "receive" = "receive";

      if (tx?.meta && tx?.transaction) {
        const accountKeys: string[] = tx.transaction.message?.accountKeys?.map(
          (k: { pubkey?: string } | string) => typeof k === "string" ? k : k.pubkey ?? ""
        ) ?? [];
        const myIdx = accountKeys.findIndex((k: string) => k === address);
        if (myIdx >= 0) {
          const pre  = (tx.meta.preBalances?.[myIdx]  ?? 0) as number;
          const post = (tx.meta.postBalances?.[myIdx] ?? 0) as number;
          const diff = (post - pre) / 1e9;
          amount = Math.abs(diff);
          type = diff >= 0 ? "receive" : "send";
        }
      }

      return {
        hash:      sig.signature,
        type,
        asset:     "SOL" as const,
        amount,
        amountUSD: amount * priceUSD,
        from:      type === "send" ? address : "",
        to:        type === "receive" ? address : "",
        date:      sig.blockTime ? new Date(sig.blockTime * 1000) : new Date(),
        status:    sig.err ? "failed" : "confirmed",
      } satisfies SolTx;
    });
  } catch { return []; }
}

/* ── SPL token balances ──────────────────────────────────────────── */
export type SplToken = {
  mint:      string;
  amount:    number;
  decimals:  number;
  symbol?:   string;
  name?:     string;
  logoURI?:  string;
  priceUSD?: number;
  change24h?: number;
};

let tokenListCache: Record<string, { symbol: string; name: string; logoURI: string }> | null = null;

async function getTokenList(): Promise<Record<string, { symbol: string; name: string; logoURI: string }>> {
  if (tokenListCache) return tokenListCache;
  try {
    const r = await fetch("https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json");
    const d = await r.json();
    const map: Record<string, { symbol: string; name: string; logoURI: string }> = {};
    for (const t of (d.tokens ?? [])) map[t.address] = { symbol: t.symbol, name: t.name, logoURI: t.logoURI };
    tokenListCache = map;
    return map;
  } catch { return {}; }
}

export async function getSplTokensServer(address: string, network: Network = "mainnet"): Promise<SplToken[]> {
  const [rpcRes, tokenList] = await Promise.all([
    solRpc<{ value: { account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmountString?: string; decimals: number } } } } } }[] }>(
      "getTokenAccountsByOwner",
      [address, { programId: TOKEN_PROG }, { encoding: "jsonParsed" }],
      network
    ),
    getTokenList(),
  ]);

  const accounts = rpcRes.value ?? [];
  const tokens: SplToken[] = [];

  for (const acc of accounts) {
    const info   = acc.account.data.parsed.info;
    const amount = parseFloat(info.tokenAmount.uiAmountString ?? "0");
    if (amount === 0) continue;
    const meta = tokenList[info.mint];
    tokens.push({ mint: info.mint, amount, decimals: info.tokenAmount.decimals, symbol: meta?.symbol, name: meta?.name, logoURI: meta?.logoURI });
  }

  // Batch price fetch
  if (tokens.length > 0) {
    const mints = tokens.slice(0, 20).map((t) => t.mint).join(",");
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${mints}&vs_currencies=usd&include_24hr_change=true`, { cache: "no-store" });
      const prices = await r.json();
      for (const t of tokens) {
        const p = prices[t.mint.toLowerCase()];
        if (p) { t.priceUSD = p.usd; t.change24h = p.usd_24h_change; }
      }
    } catch { /* ignore */ }
  }

  return tokens.sort((a, b) => (b.amount * (b.priceUSD ?? 0)) - (a.amount * (a.priceUSD ?? 0)));
}

export async function getSplTokens(address: string, network: Network = "mainnet"): Promise<SplToken[]> {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams({ address, network });
    const r = await fetch(dataProxyPath(`/api/solana/tokens?${params.toString()}`), {
      signal: AbortSignal.timeout(18_000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`SPL token discovery failed: ${r.status}`);
    const d = await r.json() as { tokens?: SplToken[]; error?: string };
    if (d.error) throw new Error(d.error);
    return d.tokens ?? [];
  }

  return getSplTokensServer(address, network);
}
