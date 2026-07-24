import { NextRequest, NextResponse } from "next/server";
import { getTrxBalanceServer, isTronAddress } from "@/lib/tron";
import type { Network } from "@/lib/chains";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim() ?? "";
  const network: Network = request.nextUrl.searchParams.get("network") === "testnet" ? "testnet" : "mainnet";
  if (!isTronAddress(address)) {
    return NextResponse.json({ error: "Invalid TRON address" }, { status: 400 });
  }
  try {
    const balance = await getTrxBalanceServer(address, network);
    return NextResponse.json({ balance }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TRON balance failed" },
      { status: 502 },
    );
  }
}
