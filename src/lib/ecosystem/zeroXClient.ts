import { ecosystemPost } from "./client";
import type { SwapQuoteRequest, SwapQuoteResponse } from "./types";

export function getZeroXPrice(request: SwapQuoteRequest) {
  return ecosystemPost<SwapQuoteResponse>("/api/ecosystem/0x/price", request);
}

export function getZeroXQuote(request: SwapQuoteRequest) {
  return ecosystemPost<SwapQuoteResponse>("/api/ecosystem/0x/quote", request);
}
