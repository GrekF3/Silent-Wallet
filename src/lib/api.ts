import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

const DATA_PROXY_URL = process.env.NEXT_PUBLIC_DATA_PROXY_URL?.replace(/\/$/, "") ?? "";
const DEFAULT_NATIVE_DATA_PROXY_URL = "https://app.swallet.site";

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function dataProxyPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = DATA_PROXY_URL || (isTauriRuntime() ? DEFAULT_NATIVE_DATA_PROXY_URL : "");
  return `${baseUrl}${normalized}`;
}

/**
 * Tauri's Rust HTTP client avoids WebView CORS differences on Windows.
 * Browser and local Next.js development keep using the native Web fetch.
 */
export function dataProxyFetch(input: string | URL | Request, init?: RequestInit) {
  return isTauriRuntime() ? tauriFetch(input, init) : fetch(input, init);
}
