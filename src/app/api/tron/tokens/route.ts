import { NextRequest, NextResponse } from "next/server";
import { getTrc20TokensServer, isTronAddress } from "@/lib/tron";
import type { Network } from "@/lib/chains";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim() ?? "";
  const network: Network = request.nextUrl.searchParams.get("network") === "testnet" ? "testnet" : "mainnet";
  if (!isTronAddress(address)) {
    return NextResponse.json({ error: "Invalid TRON address" }, { status: 400 });
  }
  try {
    const tokens = await getTrc20TokensServer(address, network);
    return NextResponse.json({ tokens }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TRC-20 lookup failed" },
      { status: 502 },
    );
  }
}
