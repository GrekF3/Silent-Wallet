export type WalletAccountLabel =
  | "primary"
  | "treasury"
  | "long-term"
  | "operations"
  | "watch"
  | "recovered";

export type WalletAccount = {
  id: string;
  index: number;
  name: string;
  purpose: string;
  labels: WalletAccountLabel[];
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};

export type AccountDraft = {
  name: string;
  purpose?: string;
  labels?: WalletAccountLabel[];
};

export type AccountAddressNetwork = "ethereum" | "bsc" | "bitcoin" | "solana";

export type AccountAddressSlot = {
  id: string;
  accountIndex: number;
  network: AccountAddressNetwork;
  addressIndex: number;
  label: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};
