import { describe, expect, it } from "vitest";
import type { ChainTx } from "./chains";
import {
  isHiddenUnverifiedIncoming,
  transactionVerification,
  verifiedEvmToken,
  verifiedTokenAmountUSD,
  visibleHistoryTransactions,
  withTransactionVerification,
} from "./tokenVerification";

function tx(overrides: Partial<ChainTx> = {}): ChainTx {
  return {
    hash: "0xhash",
    type: "receive",
    asset: "ETH",
    amount: 1,
    amountUSD: 1,
    from: "0xfrom",
    to: "0xto",
    date: new Date("2026-01-01T00:00:00.000Z"),
    status: "confirmed",
    network: "ethereum",
    ...overrides,
  };
}

describe("verified token registry", () => {
  it("matches a token by both network and contract", () => {
    const ethereumUsdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    expect(verifiedEvmToken("ethereum", ethereumUsdt)?.symbol).toBe("USDT");
    expect(verifiedEvmToken("bsc", ethereumUsdt)).toBeUndefined();
  });

  it("does not trust a copied symbol on another contract", () => {
    const spoof = tx({ isToken: true, asset: "USDT", tokenSymbol: "USDT", tokenContract: "0x0000000000000000000000000000000000000001" });
    expect(transactionVerification(spoof)).toBe("unverified");
    expect(withTransactionVerification({ ...spoof, verification: "verified" }).verification).toBe("unverified");
    expect(verifiedTokenAmountUSD("ethereum", spoof.tokenContract, 500_000)).toBe(0);
    expect(verifiedTokenAmountUSD("ethereum", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 12.5)).toBe(12.5);
  });
});

describe("history visibility", () => {
  const native = tx();
  const verifiedIncoming = tx({ isToken: true, asset: "USDT", tokenContract: "0xdAC17F958D2ee523a2206206994597C13D831ec7" });
  const unverifiedIncoming = tx({ hash: "0xspam", isToken: true, asset: "US5T", tokenContract: "0x0000000000000000000000000000000000000002" });
  const unverifiedOutgoing = tx({ hash: "0xout", type: "send", isToken: true, asset: "CUSTOM", tokenContract: "0x0000000000000000000000000000000000000003" });

  it("always keeps native and verified transactions visible", () => {
    expect(visibleHistoryTransactions([native, verifiedIncoming], true)).toEqual([native, verifiedIncoming]);
  });

  it("hides only unverified incoming transfers when enabled", () => {
    const visible = visibleHistoryTransactions([native, verifiedIncoming, unverifiedIncoming, unverifiedOutgoing], true);
    expect(visible).toEqual([native, verifiedIncoming, unverifiedOutgoing]);
    expect(isHiddenUnverifiedIncoming(unverifiedIncoming, true)).toBe(true);
    expect(isHiddenUnverifiedIncoming(unverifiedOutgoing, true)).toBe(false);
  });

  it("shows every transaction when the preference is disabled", () => {
    expect(visibleHistoryTransactions([unverifiedIncoming, unverifiedOutgoing], false)).toEqual([unverifiedIncoming, unverifiedOutgoing]);
  });
});
