"use client";
import { create } from "zustand";
import type { WalletAddresses } from "./wallet";
import type { Prices } from "./prices";
import type { ChainTx, Network } from "./chains";
import type { EvmToken } from "./tokens";
import type { SplToken } from "./solana";
import { saveSession, clearSession as clearSess } from "./session";

export type View = "dashboard" | "transfer" | "history" | "settings" | "asset";

export type AssetInfo = {
  id:        string;
  symbol:    string;
  name:      string;
  network:   "ethereum" | "bitcoin" | "bsc" | "solana";
  balance:   number;
  priceUSD:  number;
  change24h: number;
  change7d:  number;
  spark7d:   number[];
  image:     string;
  desc:      string;
};

type WalletStore = {
  mnemonic:      string | null;
  addresses:     WalletAddresses | null;
  setSession:    (m: string, a: WalletAddresses) => void;
  clearSession:  () => void;

  network:       Network;
  setNetwork:    (n: Network) => void;

  view:          View;
  setView:       (v: View) => void;
  selectedAsset: AssetInfo | null;
  openAsset:     (a: AssetInfo) => void;
  closeAsset:    () => void;

  assets:        AssetInfo[];
  evmTokens:     EvmToken[];
  splTokens:     SplToken[];
  transactions:  ChainTx[];
  prices:        Prices | null;
  loading:       boolean;
  initialLoaded: boolean;

  setAssets:        (a: AssetInfo[]) => void;
  setTokens:        (evm: EvmToken[], spl: SplToken[]) => void;
  setTxs:           (t: ChainTx[]) => void;
  setPrices:        (p: Prices) => void;
  setLoading:       (l: boolean) => void;
  setInitialLoaded: (v: boolean) => void;

  historyFilter: "all" | "send" | "receive";
  setFilter:     (f: "all" | "send" | "receive") => void;
};

export const useWalletStore = create<WalletStore>((set) => ({
  mnemonic:  null,
  addresses: null,
  setSession: (mnemonic, addresses) => { saveSession(mnemonic, addresses); set({ mnemonic, addresses }); },
  clearSession: () => { clearSess(); set({ mnemonic: null, addresses: null, assets: [], evmTokens: [], splTokens: [], transactions: [], initialLoaded: false }); },

  network:    "mainnet",
  setNetwork: (network) => set({ network, assets: [], evmTokens: [], splTokens: [], transactions: [], initialLoaded: false }),

  view:          "dashboard",
  setView:       (view) => set({ view }),
  selectedAsset: null,
  openAsset:     (a) => set({ selectedAsset: a, view: "asset" }),
  closeAsset:    () => set({ selectedAsset: null, view: "dashboard" }),

  assets:        [],
  evmTokens:     [],
  splTokens:     [],
  transactions:  [],
  prices:        null,
  loading:       false,
  initialLoaded: false,

  setAssets:        (assets)      => set({ assets }),
  setTokens:        (evmTokens, splTokens) => set({ evmTokens, splTokens }),
  setTxs:           (transactions) => set({ transactions }),
  setPrices:        (prices)      => set({ prices }),
  setLoading:       (loading)     => set({ loading }),
  setInitialLoaded: (initialLoaded) => set({ initialLoaded }),

  historyFilter: "all",
  setFilter:     (historyFilter) => set({ historyFilter }),
}));
