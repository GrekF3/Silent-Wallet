const FORBIDDEN_KEYS = new Set([
  "mnemonic",
  "seed",
  "seedphrase",
  "secretrecoveryphrase",
  "privatekey",
  "recoveryphrase",
  "keystore",
  "walletsecret",
  "secret",
]);

export type SensitiveGuardResult = { ok: true } | { ok: false; key: string };

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function detectForbiddenSensitiveKeys(value: unknown): SensitiveGuardResult {
  const seen = new WeakSet<object>();

  const visit = (node: unknown): SensitiveGuardResult => {
    if (!node || typeof node !== "object") return { ok: true };
    if (seen.has(node)) return { ok: true };
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const result = visit(item);
        if (!result.ok) return result;
      }
      return { ok: true };
    }

    for (const [key, nested] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.has(normalizeKey(key))) return { ok: false, key };
      const result = visit(nested);
      if (!result.ok) return result;
    }
    return { ok: true };
  };

  return visit(value);
}

export function assertNoForbiddenSensitiveKeys(value: unknown): void {
  const result = detectForbiddenSensitiveKeys(value);
  if (!result.ok) {
    throw new Error("Request contains sensitive wallet material and was rejected.");
  }
}

export function sensitiveRequestError() {
  return "Sensitive wallet material must stay on this device.";
}
