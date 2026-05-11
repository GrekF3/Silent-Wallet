import { NextRequest } from "next/server";
import { handleZeroX } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleZeroX(req, "price");
}
