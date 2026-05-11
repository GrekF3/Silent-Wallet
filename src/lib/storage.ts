// AES-GCM encryption via native Web Crypto — no deps
import nacl from "tweetnacl";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { deleteNativeSecret, hasNativeWalletMarker, readNativeSecret, writeNativeSecret } from "./nativeStorage";

const STORAGE_KEY = "silent_wallet_v1";
const enc = new TextEncoder();
const dec = new TextDecoder();

type LegacyPayload = {
  salt: number[];
  iv: number[];
  ct: number[];
};

type SecretboxPayload = {
  v: 2;
  alg: "secretbox-pbkdf2-sha256";
  salt: number[];
  nonce: number[];
  ct: number[];
};

function hasSubtleCrypto() {
  return typeof globalThis.crypto?.subtle?.importKey === "function";
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  return nacl.randomBytes(length);
}

function bufferBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Array.from(bytes));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!hasSubtleCrypto()) throw new Error("Web Crypto is unavailable");
  const subtle = globalThis.crypto.subtle;
  const base = await subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt: salt.slice().buffer, iterations: 200_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function deriveSecretboxKey(password: string, salt: Uint8Array): Uint8Array {
  return pbkdf2(sha256, enc.encode(password), salt, { c: 200_000, dkLen: 32 });
}

export async function saveMnemonic(mnemonic: string, password: string): Promise<void> {
  const salt = randomBytes(16);

  if (!hasSubtleCrypto()) {
    const nonce = randomBytes(24);
    const key = deriveSecretboxKey(password, salt);
    const ct = nacl.secretbox(enc.encode(mnemonic), nonce, key);
    const payload: SecretboxPayload = {
      v: 2,
      alg: "secretbox-pbkdf2-sha256",
      salt: Array.from(salt),
      nonce: Array.from(nonce),
      ct: Array.from(ct),
    };
    const encoded = JSON.stringify(payload);
    if (!(await writeNativeSecret(encoded, password))) localStorage.setItem(STORAGE_KEY, encoded);
    return;
  }

  const iv   = randomBytes(12);
  const key  = await deriveKey(password, salt);
  const ct   = await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv: bufferBytes(iv) }, key, enc.encode(mnemonic));

  const payload = {
    v: 1,
    alg: "aes-gcm-pbkdf2-sha256",
    salt: Array.from(salt),
    iv:   Array.from(iv),
    ct:   Array.from(new Uint8Array(ct)),
  };
  const encoded = JSON.stringify(payload);
  if (!(await writeNativeSecret(encoded, password))) localStorage.setItem(STORAGE_KEY, encoded);
}

export async function loadMnemonic(password: string): Promise<string> {
  const raw = await readNativeSecret(password) ?? localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("No wallet found");

  const payload = JSON.parse(raw) as LegacyPayload | SecretboxPayload | (LegacyPayload & { v?: 1; alg?: string });
  const salt = new Uint8Array(payload.salt);

  if ("v" in payload && payload.v === 2) {
    const key = deriveSecretboxKey(password, salt);
    const opened = nacl.secretbox.open(new Uint8Array(payload.ct), new Uint8Array(payload.nonce), key);
    if (!opened) throw new Error("Wrong password");
    return dec.decode(opened);
  }

  if (!hasSubtleCrypto()) {
    throw new Error("This wallet was encrypted with Web Crypto. Open it via HTTPS or localhost once, then re-save the wallet to migrate it for IP access.");
  }

  const key = await deriveKey(password, salt);

  try {
    const pt = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bufferBytes(new Uint8Array(payload.iv)) },
      key,
      bufferBytes(new Uint8Array(payload.ct))
    );
    return dec.decode(pt);
  } catch {
    throw new Error("Wrong password");
  }
}

export function hasWallet(): boolean {
  return !!localStorage.getItem(STORAGE_KEY) || hasNativeWalletMarker();
}

export async function deleteWallet(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
  await deleteNativeSecret();
}
