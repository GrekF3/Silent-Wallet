import { NextResponse } from "next/server";
import { safeEcosystemConfig } from "@/lib/ecosystem/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(safeEcosystemConfig(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
