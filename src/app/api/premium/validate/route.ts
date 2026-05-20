import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SILENT_PRO_ENTITLEMENTS } from "@/lib/premium/config";
import { assertNoForbiddenSensitiveKeys, sensitiveRequestError } from "@/lib/security/sensitiveGuards";

export const dynamic = "force-dynamic";

function normalizeLicenseKey(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function licenseHashes() {
  return (process.env.PREMIUM_LICENSE_HASHES ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as unknown;

  try {
    assertNoForbiddenSensitiveKeys(body);
  } catch {
    return NextResponse.json({ error: sensitiveRequestError() }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ valid: false }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (process.env.NEXT_PUBLIC_DEV_PREMIUM === "true" && process.env.NODE_ENV !== "production") {
    return NextResponse.json({ valid: true, plan: "silent_pro", entitlements: SILENT_PRO_ENTITLEMENTS }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const licenseKey = normalizeLicenseKey((body as { licenseKey?: unknown }).licenseKey);
  const salt = process.env.PREMIUM_LICENSE_SALT ?? "";
  if (!licenseKey || !salt) {
    return NextResponse.json({ valid: false }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const valid = licenseHashes().includes(sha256(`${licenseKey}${salt}`).toLowerCase());
  return NextResponse.json(valid
    ? { valid: true, plan: "silent_pro", entitlements: SILENT_PRO_ENTITLEMENTS }
    : { valid: false },
  { headers: { "Cache-Control": "private, no-store" } });
}
