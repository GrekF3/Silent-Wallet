"use client";

import { useEffect, useState } from "react";

export type PrivacyPreferences = {
  hideAddresses: boolean;
  hideActivityValues: boolean;
  reduceProviderCalls: boolean;
  showProviderNotices: boolean;
  onchainTaggingOptIn: boolean;
};

const KEY = "silent_privacy_preferences_v1";
const EVENT = "silent-privacy-preferences-change";

const DEFAULTS: PrivacyPreferences = {
  hideAddresses: false,
  hideActivityValues: false,
  reduceProviderCalls: false,
  showProviderNotices: true,
  onchainTaggingOptIn: false,
};

export function getPrivacyPreferences(): PrivacyPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<PrivacyPreferences> : {};
    return {
      hideAddresses: !!parsed.hideAddresses,
      hideActivityValues: !!parsed.hideActivityValues,
      reduceProviderCalls: !!parsed.reduceProviderCalls,
      showProviderNotices: parsed.showProviderNotices === undefined ? true : !!parsed.showProviderNotices,
      onchainTaggingOptIn: !!parsed.onchainTaggingOptIn,
    };
  } catch {
    return DEFAULTS;
  }
}

export function setPrivacyPreferences(patch: Partial<PrivacyPreferences>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify({ ...getPrivacyPreferences(), ...patch }));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function usePrivacyPreferences() {
  const [preferences, setPreferences] = useState(getPrivacyPreferences);
  useEffect(() => subscribe(() => setPreferences(getPrivacyPreferences())), []);
  return preferences;
}
