import { dataProxyFetch, dataProxyPath } from "@/lib/api";
import type { EcosystemConfigResponse, RevenueEvent } from "./types";

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as unknown;
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function ecosystemPost<T>(path: string, body: unknown): Promise<T> {
  const response = await dataProxyFetch(dataProxyPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function ecosystemGet<T>(path: string): Promise<T> {
  const response = await dataProxyFetch(dataProxyPath(path), { cache: "no-store" });
  return parseResponse<T>(response);
}

export function getEcosystemConfig() {
  return ecosystemGet<EcosystemConfigResponse>("/api/ecosystem/config");
}

export async function logRevenueEvent(event: RevenueEvent): Promise<void> {
  try {
    await ecosystemPost<{ ok: boolean }>("/api/ecosystem/revenue/event", event);
  } catch {
    // Revenue events are intentionally best-effort.
  }
}
