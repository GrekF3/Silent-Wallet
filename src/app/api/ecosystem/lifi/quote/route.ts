import { NextRequest } from "next/server";
import { handleLifiQuote } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleLifiQuote(req);
}
