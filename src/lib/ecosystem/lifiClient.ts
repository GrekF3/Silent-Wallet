import { ecosystemPost } from "./client";
import type { BridgeQuoteResponse, BridgeRouteRequest, BridgeRouteResponse } from "./types";

export function getLifiRoutes(request: BridgeRouteRequest) {
  return ecosystemPost<BridgeRouteResponse>("/api/ecosystem/lifi/routes", request);
}

export function getLifiQuote(request: BridgeRouteRequest) {
  return ecosystemPost<BridgeQuoteResponse>("/api/ecosystem/lifi/quote", request);
}
