export type PremiumPlan = "free" | "silent_pro";

export type PremiumEntitlement =
  | "pro.accounts.multiple"
  | "pro.accounts.addressSeparation"
  | "pro.privacy.profiles"
  | "pro.watch.dashboards"
  | "pro.exports.csv"
  | "pro.transactions.templates"
  | "pro.contacts.advanced"
  | "pro.reports.tax";

export type PremiumState = {
  plan: PremiumPlan;
  entitlements: PremiumEntitlement[];
  activatedAt?: number;
  source?: "license" | "dev";
};

export type PremiumValidationResponse =
  | { valid: true; plan: "silent_pro"; entitlements: PremiumEntitlement[] }
  | { valid: false };
