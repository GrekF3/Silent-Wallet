// Session lives in sessionStorage (tab-specific, cleared on browser close)
// Mnemonic is stored as plaintext for the session window — acceptable since
// sessionStorage is same-origin/same-tab only and not persisted to disk.

import type { WalletAddresses, WalletAddressIndexes } from "./wallet";
import { DEFAULT_ADDRESS_INDEXES, normalizeAddressIndexes, normalizeWalletAddresses } from "./wallet";

const KEY     = "silent_session_v1";
const TIMEOUT = 10 * 60 * 1000; // 10 minutes

export type SessionMode = "wallet" | "watch";

type Session = {
  mode?:        SessionMode;
  watchName?:   string;
  mnemonic:     string | null;
  addresses:    WalletAddresses;
  accountIndex?: number;
  addressIndexes?: Partial<WalletAddressIndexes>;
  lastActivity: number;
};

export function saveSession(mnemonic: string, addresses: WalletAddresses, accountIndex = 0, addressIndexes: WalletAddressIndexes = DEFAULT_ADDRESS_INDEXES): void {
  const s: Session = { mode: "wallet", mnemonic, addresses, accountIndex, addressIndexes, lastActivity: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(s));
}

export function saveWatchSession(watchName: string, addresses: WalletAddresses): void {
  const s: Session = { mode: "watch", watchName, mnemonic: null, addresses, accountIndex: 0, addressIndexes: DEFAULT_ADDRESS_INDEXES, lastActivity: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(s));
}

export function readSession(): { mode: SessionMode; watchName?: string; mnemonic: string | null; addresses: WalletAddresses; accountIndex: number; addressIndexes: WalletAddressIndexes } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s: Session = JSON.parse(raw);
    if (Date.now() - s.lastActivity > TIMEOUT) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return {
      mode: s.mode ?? "wallet",
      watchName: s.watchName,
      mnemonic: s.mnemonic,
      addresses: normalizeWalletAddresses(s.addresses),
      accountIndex: typeof s.accountIndex === "number" ? s.accountIndex : 0,
      addressIndexes: normalizeAddressIndexes(s.addressIndexes),
    };
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
