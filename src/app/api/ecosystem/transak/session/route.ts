import { NextRequest, NextResponse } from "next/server";
import { transakConfig } from "@/lib/ecosystem/config";
import {
  optionalString,
  optionalUrl,
  validatePublicWalletAddress,
} from "@/lib/ecosystem/guards";
import { asRecord, jsonError, readGuardedJson, stringField } from "@/lib/ecosystem/server";

export const dynamic = "force-dynamic";

function apiBase(env: "staging" | "production") {
  return env === "production" ? "https://api-gateway.transak.com" : "https://api-gateway-stg.transak.com";
}

function product(value: unknown) {
  if (value === "BUY" || value === "SELL" || value === "BUY,SELL") return value;
  return "BUY";
}

function safeCurrency(value: unknown, fallback: string, max = 24) {
  const raw = optionalString(value, max) ?? fallback;
  if (!/^[a-z0-9_, -]{2,40}$/i.test(raw)) throw new Error("Invalid currency value");
  return raw.replace(/\s+/g, "");
}

function fiatAmount(value: unknown) {
  const raw = optionalString(value, 32);
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid fiat amount");
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    const body = await readGuardedJson(req);
    const config = transakConfig();
    if (!config.enabled) return jsonError("Transak is not configured", 503);
    const walletAddress = validatePublicWalletAddress(body.walletAddress);
    const cryptoCurrencyCode = safeCurrency(body.cryptoCurrencyCode, "ETH");
    const fiatCurrency = safeCurrency(body.fiatCurrency, "USD", 8);
    const network = optionalString(body.network, 40);
    const amount = fiatAmount(body.fiatAmount);
    const redirectURL = optionalUrl(body.redirectURL) ?? `${req.nextUrl.origin}/`;

    const widgetParams: Record<string, string> = {
      apiKey: config.apiKey,
      referrerDomain: config.referrerDomain,
      productsAvailed: product(body.mode === "sell" ? "SELL" : body.productsAvailed),
      walletAddress,
      cryptoCurrencyCode,
      fiatCurrency,
      redirectURL,
    };
    if (amount) widgetParams.fiatAmount = amount;
    if (network) widgetParams.network = network;

    const providerResponse = await fetch(`${apiBase(config.env)}/api/v2/auth/session`, {
      method: "POST",
      headers: {
        "access-token": config.accessToken,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({ widgetParams }),
    });
    const raw = await providerResponse.json().catch(() => ({})) as unknown;
    if (!providerResponse.ok) {
      return NextResponse.json({ error: "Transak session request failed", details: raw }, { status: providerResponse.status });
    }
    const widgetUrl = stringField(asRecord(asRecord(raw)?.data)?.widgetUrl);
    if (!widgetUrl) return jsonError("Transak did not return a widget URL", 502);
    return NextResponse.json({ widgetUrl }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid Transak session request");
  }
}
