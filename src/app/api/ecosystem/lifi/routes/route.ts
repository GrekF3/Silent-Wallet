import { NextRequest } from "next/server";
import { handleLifiRoutes } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleLifiRoutes(req);
}
