import { NextRequest, NextResponse } from "next/server";
import { getSplTokensServer } from "@/lib/solana";
import type { Network } from "@/lib/chains";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address") ?? "";
  const network = (searchParams.get("network") === "testnet" ? "testnet" : "mainnet") satisfies Network;

  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const tokens = await getSplTokensServer(address, network);
    return NextResponse.json({ tokens }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json({
      tokens: [],
      error: error instanceof Error ? error.message : "SPL token discovery failed",
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
