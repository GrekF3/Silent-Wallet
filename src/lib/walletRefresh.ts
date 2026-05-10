"use client";

let refreshHandler: (() => void) | null = null;

export function setWalletRefreshHandler(handler: (() => void) | null) {
  refreshHandler = handler;
}

export function refreshWalletData() {
  refreshHandler?.();
}
