// Server-side transaction history via Ankr Advanced API
// Ankr free tier: 500 req/day, covers ETH + BSC + more
import { NextRequest, NextResponse } from "next/server";

const ANKR_KEY  = "79258ce7f7ee046decc3b5292a24eb4bf7c910d7e39b691384c7ce0cfb839a01";
const ANKR_URL  = `https://rpc.ankr.com/multichain/${ANKR_KEY}`;

type AnkrTx = {
  hash: string;
  from: string;
  to: string;
  value: string;         // hex
  timestamp: string;     // hex
  blockchain: string;
  status: string;        // "1" = ok
};
type AnkrTransfer = {
  fromAddress:      string;
  toAddress:        string;
  contractAddress:  string;
  value:            string;       // human-readable (e.g. "1")
  valueRawInteger:  string;       // raw integer as string
  blockchain:       string;
  tokenName:        string;
  tokenSymbol:      string;
  tokenDecimals:    number;
  thumbnail:        string;
  transactionHash:  string;
  blockHeight:      number;
  timestamp:        number;       // unix seconds (integer)
  direction:        string;       // "in" | "out"
};

async function ankrPost(method: string, params: Record<string, unknown>) {
  const r = await fetch(ANKR_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal:  AbortSignal.timeout(20_000),
  });
  const d = await r.json() as { result?: unknown; error?: unknown };
  if (!d.result) throw new Error(JSON.stringify(d.error));
  return d.result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address  = searchParams.get("address") ?? "";
  const chain    = searchParams.get("chain") ?? "eth"; // "eth" | "bsc" | "all"

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const blockchains = chain === "bsc" ? ["bsc"] : chain === "eth" ? ["eth"] : ["eth", "bsc"];

  try {
    // Fetch native txs + token transfers in parallel
    const [nativeResult, tokenResult] = await Promise.allSettled([
      ankrPost("ankr_getTransactionsByAddress", {
        blockchain: blockchains,
        address,
        pageSize:   50,
        descOrder:  true,
      }),
      ankrPost("ankr_getTokenTransfers", {
        blockchain: blockchains,
        address,
        pageSize:   50,
        descOrder:  true,
      }),
    ]);

    const nativeTxs: AnkrTx[] =
      nativeResult.status === "fulfilled"
        ? ((nativeResult.value as { transactions?: AnkrTx[] }).transactions ?? [])
        : [];

    const tokenTxs: AnkrTransfer[] =
      tokenResult.status === "fulfilled"
        ? ((tokenResult.value as { transfers?: AnkrTransfer[] }).transfers ?? [])
        : [];

    // Normalise native transactions
    const native = nativeTxs.map((tx) => ({
      hash:         tx.hash,
      from:         tx.from ?? "",
      to:           tx.to  ?? "",
      value:        tx.value ?? "0x0",    // hex
      timeStamp:    String(parseInt(tx.timestamp ?? "0x0", 16)),
      isError:      tx.status === "1" ? "0" : "1",
      type:         "native",
      chain:        tx.blockchain,
    }));

    // Normalise token transfers
    const tokens = tokenTxs.map((tx) => ({
      hash:          tx.transactionHash,
      from:          tx.fromAddress ?? "",
      to:            tx.toAddress   ?? "",
      value:         tx.valueRawInteger ?? "0",  // raw decimal integer string
      timeStamp:     String(tx.timestamp),        // already unix seconds
      tokenSymbol:   tx.tokenSymbol,
      tokenDecimal:  String(tx.tokenDecimals),
      tokenName:     tx.tokenName,
      tokenImage:    tx.thumbnail,
      type:          "token",
      chain:         tx.blockchain,
    }));

    // Deduplicate by hash
    const seen = new Set<string>();
    const all  = [...native, ...tokens].filter((tx) => {
      if (!tx.hash || seen.has(tx.hash)) return false;
      seen.add(tx.hash);
      return true;
    });

    return NextResponse.json({ transactions: all });

  } catch (e) {
    // Ankr failed — fall back to Blockscout ETH (reliable for ETH)
    if (chain === "eth") {
      try {
        const r = await fetch(
          `https://eth.blockscout.com/api/v2/addresses/${address}/transactions?limit=30`,
          { signal: AbortSignal.timeout(9_000) }
        );
        const d = await r.json() as { items?: Record<string, unknown>[] };
        const items = (d.items ?? []).map((tx) => ({
          hash:      tx.hash as string,
          from:      (tx.from as { hash: string } | undefined)?.hash ?? "",
          to:        (tx.to   as { hash: string } | undefined)?.hash ?? "",
          value:     (tx.value as string) ?? "0",
          timeStamp: String(Math.floor(new Date((tx.timestamp as string) ?? 0).getTime() / 1000)),
          type:      "native",
          chain:     "eth",
        }));
        return NextResponse.json({ transactions: items });
      } catch { /* ignore */ }
    }
    console.error("txs API error:", e);
    return NextResponse.json({ transactions: [], error: "Failed to fetch" });
  }
}
