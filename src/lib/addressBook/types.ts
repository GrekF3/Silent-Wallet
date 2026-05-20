export type AddressBookNetwork = "ethereum" | "bsc" | "bitcoin" | "solana" | "any";

export type AddressBookContact = {
  id: string;
  name: string;
  address: string;
  network: AddressBookNetwork;
  notes: string;
  trusted: boolean;
  createdAt: number;
  updatedAt: number;
};
