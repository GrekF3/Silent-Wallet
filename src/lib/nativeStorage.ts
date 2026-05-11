"use client";

const MARKER_KEY = "silent_wallet_native_marker_v1";
const STRONGHOLD_CLIENT = "silent-wallet";
const STRONGHOLD_STORE_KEY = "wallet";
const enc = new TextEncoder();
const dec = new TextDecoder();

function hasWindow() {
  return typeof window !== "undefined";
}

function isTauriRuntime() {
  return hasWindow() && "__TAURI_INTERNALS__" in window;
}

async function isCapacitorNative() {
  if (!hasWindow()) return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function readNativeSecret(password: string): Promise<string | null> {
  if (await isCapacitorNative()) {
    const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
    await SecureStorage.setKeyPrefix("silent_");
    return SecureStorage.getItem(STRONGHOLD_STORE_KEY);
  }

  if (isTauriRuntime()) {
    try {
      const { Stronghold } = await import("@tauri-apps/plugin-stronghold");
      const { appDataDir, join } = await import("@tauri-apps/api/path");
      const path = await join(await appDataDir(), "silent.stronghold");
      const stronghold = await Stronghold.load(path, password);
      const client = await stronghold.loadClient(STRONGHOLD_CLIENT).catch(() => stronghold.createClient(STRONGHOLD_CLIENT));
      const store = client.getStore();
      const value = await store.get(STRONGHOLD_STORE_KEY);
      await stronghold.unload();
      return value ? dec.decode(value) : null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function writeNativeSecret(payload: string, password: string): Promise<boolean> {
  if (await isCapacitorNative()) {
    const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
    await SecureStorage.setKeyPrefix("silent_");
    await SecureStorage.setItem(STRONGHOLD_STORE_KEY, payload);
    localStorage.setItem(MARKER_KEY, "1");
    return true;
  }

  if (isTauriRuntime()) {
    const { Stronghold } = await import("@tauri-apps/plugin-stronghold");
    const { appDataDir, join } = await import("@tauri-apps/api/path");
    const path = await join(await appDataDir(), "silent.stronghold");
    const stronghold = await Stronghold.load(path, password);
    const client = await stronghold.loadClient(STRONGHOLD_CLIENT).catch(() => stronghold.createClient(STRONGHOLD_CLIENT));
    const store = client.getStore();
    await store.insert(STRONGHOLD_STORE_KEY, Array.from(enc.encode(payload)));
    await stronghold.save();
    await stronghold.unload();
    localStorage.setItem(MARKER_KEY, "1");
    return true;
  }

  return false;
}

export async function deleteNativeSecret(): Promise<void> {
  if (!hasWindow()) return;
  localStorage.removeItem(MARKER_KEY);

  if (await isCapacitorNative()) {
    const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
    await SecureStorage.setKeyPrefix("silent_");
    await SecureStorage.removeItem(STRONGHOLD_STORE_KEY);
    return;
  }

  if (isTauriRuntime()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_wallet_snapshot");
    } catch {
      // The marker is already gone; a stale encrypted snapshot cannot unlock without the password.
    }
  }
}

export function hasNativeWalletMarker(): boolean {
  return hasWindow() && localStorage.getItem(MARKER_KEY) === "1";
}
