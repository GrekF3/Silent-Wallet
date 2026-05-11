import { NextRequest, NextResponse } from "next/server";
import { isRecord, optionalString, validateNumberRange } from "@/lib/ecosystem/guards";
import { jsonError, readGuardedJson } from "@/lib/ecosystem/server";
import type { EcosystemProvider, RevenueEvent } from "@/lib/ecosystem/types";

export const dynamic = "force-dynamic";

const PROVIDERS = new Set<EcosystemProvider>(["0x", "lifi", "moonpay", "transak"]);
const ACTIONS = new Set(["quote", "approve", "execute", "complete", "open_widget"]);

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/[^a-z0-9_. -]/gi, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeEvent(body: Record<string, unknown>): RevenueEvent {
  const providerRaw = optionalString(body.provider, 24);
  const actionRaw = optionalString(body.action, 24);
  if (!providerRaw || !PROVIDERS.has(providerRaw as EcosystemProvider)) throw new Error("Invalid provider");
  if (!actionRaw || !ACTIONS.has(actionRaw)) throw new Error("Invalid action");
  const feeBps = validateNumberRange(body.feeBps, "fee bps", 0, 1000);
  const estimatedFeeUsd = validateNumberRange(body.estimatedFeeUsd, "estimated fee USD", 0, 1_000_000);
  return {
    provider: providerRaw as EcosystemProvider,
    action: actionRaw as RevenueEvent["action"],
    chain: optionalString(body.chain, 40),
    tokenSymbols: stringList(body.tokenSymbols),
    feeBps,
    estimatedFeeUsd,
    quoteId: optionalString(body.quoteId, 120),
    providerQuoteId: optionalString(body.providerQuoteId, 120),
    txHash: optionalString(body.txHash, 100),
    timestamp: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await readGuardedJson(req);
    if (!isRecord(body)) return jsonError("Invalid event");
    const event = normalizeEvent(body);
    const shouldLog = process.env.NODE_ENV !== "production" || process.env.REVENUE_EVENT_LOGGING === "true";
    if (shouldLog) console.info("silent-wallet.revenue", event);
    return NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid revenue event");
  }
}
