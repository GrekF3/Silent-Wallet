import { NextRequest, NextResponse } from "next/server";
import { fetchEvmRawHistory } from "@/lib/serverEvmHistory";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address") ?? "";
  const chain = searchParams.get("chain") ?? "eth";

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const chains: ("eth" | "bsc")[] = chain === "bsc" ? ["bsc"] : chain === "eth" ? ["eth"] : ["eth", "bsc"];
  const result = await fetchEvmRawHistory(address, chains);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
