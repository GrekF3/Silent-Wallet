// AES-GCM encryption via native Web Crypto — no deps
const STORAGE_KEY = "silent_wallet_v1";
const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.slice().buffer, iterations: 200_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function saveMnemonic(mnemonic: string, password: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);
  const ct   = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(mnemonic));

  const payload = {
    salt: Array.from(salt),
    iv:   Array.from(iv),
    ct:   Array.from(new Uint8Array(ct)),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function loadMnemonic(password: string): Promise<string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("No wallet found");

  const { salt, iv, ct } = JSON.parse(raw);
  const key = await deriveKey(password, new Uint8Array(salt));

  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      new Uint8Array(ct)
    );
    return dec.decode(pt);
  } catch {
    throw new Error("Wrong password");
  }
}

export function hasWallet(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

export function deleteWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}
