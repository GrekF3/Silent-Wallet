import { NextRequest, NextResponse } from "next/server";
import { fetchAllEvmTokensServer } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const eth = searchParams.get("eth") ?? "";
  const bsc = searchParams.get("bsc") ?? "";

  if (!/^0x[0-9a-fA-F]{40}$/.test(eth) || !/^0x[0-9a-fA-F]{40}$/.test(bsc)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const tokens = await fetchAllEvmTokensServer(eth, bsc);
  return NextResponse.json({ tokens }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
