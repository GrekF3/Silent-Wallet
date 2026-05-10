// Solana: SLIP-0010 key derivation via @noble/hashes (already a viem dep)
// No ESM-only packages needed.
import { hmac }   from "@noble/hashes/hmac";
import { sha512 } from "@noble/hashes/sha512";
import nacl from "tweetnacl";
import * as bip39 from "@scure/bip39";

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

/* ── Key derivation (m/44'/501'/0'/0') ──────────────────────────── */
export function deriveSolanaKeypair(mnemonic: string): { address: string; secretKey: Uint8Array } {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  let node = slip10Master(seed);
  for (const i of [44, 501, 0, 0]) node = slip10Child(node, i);
  const kp = nacl.sign.keyPair.fromSeed(node.key);
  return { address: encodeBase58(kp.publicKey), secretKey: kp.secretKey };
}

/* ── SOL balance ─────────────────────────────────────────────────── */
const SOL_RPC    = "https://api.mainnet-beta.solana.com";
const TOKEN_PROG = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export async function getSolBalance(address: string): Promise<number> {
  const r = await fetch(SOL_RPC, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
  });
  const d = await r.json();
  return (d.result?.value ?? 0) / 1e9;
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

export async function getSolTransactions(address: string, priceUSD = 0): Promise<SolTx[]> {
  try {
    // Get recent signatures
    const sigRes = await fetch(SOL_RPC, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress", params: [address, { limit: 15 }] }),
      signal: AbortSignal.timeout(10_000),
    });
    const sigData = await sigRes.json();
    const sigs = (sigData.result ?? []) as { signature: string; blockTime: number; err: unknown; confirmationStatus: string }[];
    if (!sigs.length) return [];

    // Fetch full transactions in parallel (limit to avoid rate limiting)
    const txDetails = await Promise.allSettled(
      sigs.slice(0, 10).map((s) =>
        fetch(SOL_RPC, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }] }),
          signal: AbortSignal.timeout(8_000),
        }).then((r) => r.json())
      )
    );

    return txDetails.map((res, i) => {
      const sig = sigs[i];
      const tx = res.status === "fulfilled" ? res.value?.result : null;

      let amount = 0;
      let type: "send" | "receive" = "receive";

      if (tx?.meta && tx?.transaction) {
        const accountKeys: string[] = tx.transaction.message.accountKeys?.map(
          (k: { pubkey?: string } | string) => typeof k === "string" ? k : k.pubkey ?? ""
        ) ?? [];
        const myIdx = accountKeys.findIndex((k: string) => k === address);
        if (myIdx >= 0) {
          const pre  = (tx.meta.preBalances[myIdx]  ?? 0) as number;
          const post = (tx.meta.postBalances[myIdx] ?? 0) as number;
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

export async function getSplTokens(address: string): Promise<SplToken[]> {
  const [rpcRes, tokenList] = await Promise.all([
    fetch(SOL_RPC, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "getTokenAccountsByOwner",
        params: [address, { programId: TOKEN_PROG }, { encoding: "jsonParsed" }],
      }),
    }).then((r) => r.json()),
    getTokenList(),
  ]);

  const accounts = rpcRes.result?.value ?? [];
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
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${mints}&vs_currencies=usd&include_24hr_change=true`);
      const prices = await r.json();
      for (const t of tokens) {
        const p = prices[t.mint.toLowerCase()];
        if (p) { t.priceUSD = p.usd; t.change24h = p.usd_24h_change; }
      }
    } catch { /* ignore */ }
  }

  return tokens.sort((a, b) => (b.amount * (b.priceUSD ?? 0)) - (a.amount * (a.priceUSD ?? 0)));
}
