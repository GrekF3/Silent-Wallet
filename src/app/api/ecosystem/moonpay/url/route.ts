import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { moonPayConfig } from "@/lib/ecosystem/config";
import {
  optionalString,
  optionalUrl,
  validatePublicWalletAddress,
} from "@/lib/ecosystem/guards";
import { jsonError, readGuardedJson } from "@/lib/ecosystem/server";

export const dynamic = "force-dynamic";

function widgetBase(mode: "buy" | "sell", env: "sandbox" | "production") {
  if (mode === "sell") return env === "sandbox" ? "https://sell-sandbox.moonpay.com" : "https://sell.moonpay.com";
  return env === "sandbox" ? "https://buy-sandbox.moonpay.com" : "https://buy.moonpay.com";
}

function currencyCode(value: unknown, fallback: string) {
  const code = optionalString(value, 24) ?? fallback;
  if (!/^[a-z0-9_-]{2,24}$/i.test(code)) throw new Error("Invalid currency code");
  return code;
}

function fiatAmount(value: unknown) {
  const raw = optionalString(value, 32);
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid fiat amount");
  return raw;
}

function signUrl(url: URL, secretKey: string) {
  const signature = createHmac("sha256", secretKey)
    .update(url.search)
    .digest("base64");
  url.searchParams.set("signature", signature);
}

export async function POST(req: NextRequest) {
  try {
    const body = await readGuardedJson(req);
    const config = moonPayConfig();
    if (!config.enabled) return jsonError("MoonPay is not configured", 503);
    const mode = body.mode === "sell" ? "sell" : "buy";
    const walletAddress = validatePublicWalletAddress(body.walletAddress);
    const crypto = currencyCode(body.cryptoCurrencyCode, mode === "sell" ? "eth" : "eth").toLowerCase();
    const fiat = currencyCode(body.fiatCurrency, "usd").toLowerCase();
    const amount = fiatAmount(body.fiatAmount);
    const redirectURL = optionalUrl(body.redirectURL) ?? `${req.nextUrl.origin}/`;

    if (!config.secretKey) {
      return jsonError("MoonPay signing secret is required when passing walletAddress", 503);
    }

    const url = new URL(widgetBase(mode, config.env));
    url.searchParams.set("apiKey", config.apiKey);
    url.searchParams.set("walletAddress", walletAddress);
    url.searchParams.set("currencyCode", crypto);
    url.searchParams.set("baseCurrencyCode", fiat);
    if (amount) url.searchParams.set("baseCurrencyAmount", amount);
    url.searchParams.set("redirectURL", redirectURL);

    signUrl(url, config.secretKey);

    return NextResponse.json({ url: url.toString() }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid MoonPay URL request");
  }
}
