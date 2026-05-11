import type { BridgeProvider, EcosystemProvider, RampProvider, SwapProvider } from "./types";

export type ProviderDescriptor = {
  id: EcosystemProvider;
  label: string;
  kind: "ramp" | "swap" | "bridge";
  thirdParty: boolean;
  homepage: string;
};

export const RAMP_PROVIDERS: Record<RampProvider, ProviderDescriptor> = {
  moonpay: {
    id: "moonpay",
    label: "MoonPay",
    kind: "ramp",
    thirdParty: true,
    homepage: "https://www.moonpay.com",
  },
  transak: {
    id: "transak",
    label: "Transak",
    kind: "ramp",
    thirdParty: true,
    homepage: "https://transak.com",
  },
};

export const SWAP_PROVIDERS: Record<SwapProvider, ProviderDescriptor> = {
  "0x": {
    id: "0x",
    label: "0x",
    kind: "swap",
    thirdParty: true,
    homepage: "https://0x.org",
  },
};

export const BRIDGE_PROVIDERS: Record<BridgeProvider, ProviderDescriptor> = {
  lifi: {
    id: "lifi",
    label: "LI.FI",
    kind: "bridge",
    thirdParty: true,
    homepage: "https://li.fi",
  },
};
