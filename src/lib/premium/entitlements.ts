"use client";

import { useEffect, useState } from "react";
import { dataProxyPath } from "@/lib/api";
import { premiumEnabled, premiumPurchaseUrl } from "./config";
import { getStoredPremiumState, removePremiumLicenseState, savePremiumLicenseState, subscribePremium } from "./storage";
import type { PremiumEntitlement, PremiumValidationResponse } from "./types";

export function hasEntitlement(entitlement: PremiumEntitlement): boolean {
  return getStoredPremiumState().entitlements.includes(entitlement);
}

export function usePremium() {
  const [state, setState] = useState(getStoredPremiumState);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => subscribePremium(() => setState(getStoredPremiumState())), []);

  const validateLicense = async (licenseKey: string) => {
    setValidating(true);
    setMessage("");
    try {
      const response = await fetch(dataProxyPath("/api/premium/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey }),
      });
      const body = await response.json().catch(() => ({ valid: false })) as PremiumValidationResponse | { error?: string };
      if (!response.ok || !("valid" in body) || !body.valid) {
        setMessage("This license key could not be verified.");
        return false;
      }
      savePremiumLicenseState(body.entitlements);
      setMessage("Silent Pro is active.");
      return true;
    } catch {
      setMessage("This license key could not be verified.");
      return false;
    } finally {
      setValidating(false);
    }
  };

  const removeLicense = () => {
    removePremiumLicenseState();
    setMessage("License removed.");
  };

  return {
    ...state,
    enabled: premiumEnabled(),
    isPro: state.plan === "silent_pro",
    validating,
    message,
    purchaseUrl: premiumPurchaseUrl(),
    hasEntitlement: (entitlement: PremiumEntitlement) => state.entitlements.includes(entitlement),
    validateLicense,
    removeLicense,
  };
}
