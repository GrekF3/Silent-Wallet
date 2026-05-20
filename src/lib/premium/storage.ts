"use client";

import type { PremiumEntitlement, PremiumState } from "./types";
import { SILENT_PRO_ENTITLEMENTS, devPremiumEnabled } from "./config";

const KEY = "silent_premium_state_v1";
const EVENT = "silent-premium-change";

const FREE_STATE: PremiumState = { plan: "free", entitlements: [] };

function normalizeEntitlements(value: unknown): PremiumEntitlement[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(SILENT_PRO_ENTITLEMENTS);
  return value.filter((item): item is PremiumEntitlement => typeof item === "string" && allowed.has(item as PremiumEntitlement));
}

export function getStoredPremiumState(): PremiumState {
  if (devPremiumEnabled()) {
    return { plan: "silent_pro", entitlements: SILENT_PRO_ENTITLEMENTS, activatedAt: Date.now(), source: "dev" };
  }
  if (typeof window === "undefined") return FREE_STATE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return FREE_STATE;
    const parsed = JSON.parse(raw) as Partial<PremiumState>;
    if (parsed.plan !== "silent_pro") return FREE_STATE;
    return {
      plan: "silent_pro",
      entitlements: normalizeEntitlements(parsed.entitlements),
      activatedAt: typeof parsed.activatedAt === "number" ? parsed.activatedAt : undefined,
      source: parsed.source === "license" ? "license" : undefined,
    };
  } catch {
    return FREE_STATE;
  }
}

export function savePremiumLicenseState(entitlements: PremiumEntitlement[]) {
  if (typeof window === "undefined") return;
  const state: PremiumState = {
    plan: "silent_pro",
    entitlements: normalizeEntitlements(entitlements),
    activatedAt: Date.now(),
    source: "license",
  };
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(EVENT));
}

export function removePremiumLicenseState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribePremium(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
