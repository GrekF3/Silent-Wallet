import { ecosystemPost } from "./client";
import type { RampUrlRequest } from "./types";

export function createMoonPayUrl(request: Omit<RampUrlRequest, "provider">) {
  return ecosystemPost<{ url: string }>("/api/ecosystem/moonpay/url", request);
}

export function createTransakSession(request: Omit<RampUrlRequest, "provider">) {
  return ecosystemPost<{ widgetUrl: string }>("/api/ecosystem/transak/session", request);
}
