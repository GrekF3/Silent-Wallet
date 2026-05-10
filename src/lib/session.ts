// Session lives in sessionStorage (tab-specific, cleared on browser close)
// Mnemonic is stored as plaintext for the session window — acceptable since
// sessionStorage is same-origin/same-tab only and not persisted to disk.

import type { WalletAddresses } from "./wallet";

const KEY     = "silent_session_v1";
const TIMEOUT = 10 * 60 * 1000; // 10 minutes

type Session = {
  mnemonic:     string;
  addresses:    WalletAddresses;
  lastActivity: number;
};

export function saveSession(mnemonic: string, addresses: WalletAddresses): void {
  const s: Session = { mnemonic, addresses, lastActivity: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(s));
}

export function readSession(): { mnemonic: string; addresses: WalletAddresses } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s: Session = JSON.parse(raw);
    if (Date.now() - s.lastActivity > TIMEOUT) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return { mnemonic: s.mnemonic, addresses: s.addresses };
  } catch { return null; }
}

export function refreshSession(): void {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const s: Session = JSON.parse(raw);
    s.lastActivity = Date.now();
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

export function hasSession(): boolean {
  return readSession() !== null;
}

export function clearSession(): void {
  sessionStorage.removeItem(KEY);
}
