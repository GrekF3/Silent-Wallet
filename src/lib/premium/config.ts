import type { PremiumEntitlement } from "./types";

export const SILENT_PRO_ENTITLEMENTS: PremiumEntitlement[] = [
  "pro.accounts.multiple",
  "pro.accounts.addressSeparation",
  "pro.privacy.profiles",
  "pro.watch.dashboards",
  "pro.exports.csv",
  "pro.transactions.templates",
  "pro.contacts.advanced",
  "pro.reports.tax",
];

export const FREE_FEATURES = [
  "Create wallet",
  "Import wallet",
  "Send and receive",
  "Basic assets and history",
  "Academy",
  "Basic address book",
  "Privacy mode",
  "Beginner mode",
  "Watch-only mode",
  "Default HD account",
  "Web3 entry points with disabled states",
];

export const SILENT_PRO_FEATURES = [
  "Multiple HD accounts from the same seed",
  "Account separation for treasury, long term, and operations",
  "Advanced privacy profiles",
  "Watch dashboards",
  "CSV export",
  "Tax/report export placeholder",
  "Trusted contact workflows",
  "Transaction templates",
  "Advanced local notes and organization",
];

export function premiumEnabled() {
  const raw = process.env.NEXT_PUBLIC_PREMIUM_ENABLED;
  return raw === undefined ? true : ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export function devPremiumEnabled() {
  return ["1", "true", "yes", "on"].includes((process.env.NEXT_PUBLIC_DEV_PREMIUM ?? "").toLowerCase());
}

export function premiumPurchaseUrl() {
  return process.env.NEXT_PUBLIC_PREMIUM_PURCHASE_URL?.trim() ?? "";
}
