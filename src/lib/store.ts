"use client";
import { create } from "zustand";
import type { WalletAddresses } from "./wallet";
import type { Prices } from "./prices";
import type { ChainTx, Network } from "./chains";
import type { EvmToken } from "./tokens";
import type { SplToken } from "./solana";
import { saveSession, saveWatchSession, clearSession as clearSess, type SessionMode } from "./session";

export type View = "dashboard" | "transfer" | "history" | "settings" | "asset";
export type LoadStatus = "idle" | "loading" | "refreshing" | "ready" | "partial" | "error";
export type DataSource = "balances" | "prices" | "tokens" | "transactions";

export type SourceState = {
  status: LoadStatus;
  error?: string;
  updatedAt?: number;
};

export type WalletLoadingState = Record<DataSource, SourceState>;

export type AssetRef = {
  kind: "native" | "evm" | "spl";
  id: string;
  network: AssetInfo["network"];
};

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

type WalletPrefs = {
  privacyMode: boolean;
  hideZeroBalances: boolean;
  hiddenAssetIds: string[];
};

const PREFS_KEY = "silent_wallet_prefs_v1";

function readPrefs(): WalletPrefs {
  if (typeof window === "undefined") return { privacyMode: false, hideZeroBalances: false, hiddenAssetIds: [] };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { privacyMode: false, hideZeroBalances: false, hiddenAssetIds: [] };
    const parsed = JSON.parse(raw) as Partial<WalletPrefs>;
    return {
      privacyMode: !!parsed.privacyMode,
      hideZeroBalances: !!parsed.hideZeroBalances,
      hiddenAssetIds: Array.isArray(parsed.hiddenAssetIds) ? parsed.hiddenAssetIds.filter((id) => typeof id === "string") : [],
    };
  } catch {
    return { privacyMode: false, hideZeroBalances: false, hiddenAssetIds: [] };
  }
}

function writePrefs(prefs: WalletPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

type WalletStore = {
  sessionMode:   SessionMode;
  watchName:     string | null;
  mnemonic:      string | null;
  addresses:     WalletAddresses | null;
  setSession:    (m: string, a: WalletAddresses) => void;
  setWatchSession: (name: string, a: WalletAddresses) => void;
  clearSession:  () => void;

  network:       Network;
  setNetwork:    (n: Network) => void;

  view:          View;
  setView:       (v: View) => void;
  selectedAssetRef: AssetRef | null;
  selectedAsset: AssetInfo | null;
  openAsset:     (a: AssetInfo) => void;
  closeAsset:    () => void;

  assets:        AssetInfo[];
  evmTokens:     EvmToken[];
  splTokens:     SplToken[];
  transactions:  ChainTx[];
  prices:        Prices | null;
  loading:       boolean;
  loadingState:  WalletLoadingState;
  initialLoaded: boolean;
  lastUpdated:   number | null;
  privacyMode:   boolean;
  hideZeroBalances: boolean;
  hiddenAssetIds: string[];

  setAssets:        (a: AssetInfo[]) => void;
  setTokens:        (evm: EvmToken[], spl: SplToken[]) => void;
  setTxs:           (t: ChainTx[]) => void;
  setPrices:        (p: Prices) => void;
  setLoading:       (l: boolean) => void;
  setSourceState:   (source: DataSource, state: Partial<SourceState>) => void;
  setInitialLoaded: (v: boolean) => void;
  markUpdated:      () => void;
  setPrivacyMode:   (v: boolean) => void;
  setHideZeroBalances: (v: boolean) => void;
  toggleHiddenAsset: (id: string) => void;

  historyFilter: "all" | "send" | "receive";
  setFilter:     (f: "all" | "send" | "receive") => void;
};

const initialPrefs = readPrefs();

export const useWalletStore = create<WalletStore>((set) => ({
  sessionMode: "wallet",
  watchName: null,
  mnemonic:  null,
  addresses: null,
  setSession: (mnemonic, addresses) => { saveSession(mnemonic, addresses); set({ sessionMode: "wallet", watchName: null, mnemonic, addresses }); },
  setWatchSession: (watchName, addresses) => { saveWatchSession(watchName, addresses); set({ sessionMode: "watch", watchName, mnemonic: null, addresses, view: "dashboard" }); },
  clearSession: () => { clearSess(); set({ sessionMode: "wallet", watchName: null, mnemonic: null, addresses: null, assets: [], evmTokens: [], splTokens: [], transactions: [], selectedAssetRef: null, selectedAsset: null, initialLoaded: false, lastUpdated: null }); },

  network:    "mainnet",
  setNetwork: (network) => set({ network, assets: [], evmTokens: [], splTokens: [], transactions: [], selectedAssetRef: null, selectedAsset: null, initialLoaded: false, lastUpdated: null }),

  view:          "dashboard",
  setView:       (view) => set({ view }),
  selectedAssetRef: null,
  selectedAsset: null,
  openAsset:     (a) => set({ selectedAssetRef: { kind: "native", id: a.id, network: a.network }, selectedAsset: a, view: "asset" }),
  closeAsset:    () => set({ selectedAssetRef: null, selectedAsset: null, view: "dashboard" }),

  assets:        [],
  evmTokens:     [],
  splTokens:     [],
  transactions:  [],
  prices:        null,
  loading:       false,
  loadingState:  {
    balances:     { status: "idle" },
    prices:       { status: "idle" },
    tokens:       { status: "idle" },
    transactions: { status: "idle" },
  },
  initialLoaded: false,
  lastUpdated:   null,
  privacyMode:   initialPrefs.privacyMode,
  hideZeroBalances: initialPrefs.hideZeroBalances,
  hiddenAssetIds: initialPrefs.hiddenAssetIds,

  setAssets:        (assets)      => set((state) => {
    const selectedAsset = state.selectedAssetRef?.kind === "native"
      ? assets.find((a) => a.id === state.selectedAssetRef?.id) ?? state.selectedAsset
      : state.selectedAsset;
    return { assets, selectedAsset };
  }),
  setTokens:        (evmTokens, splTokens) => set({ evmTokens, splTokens }),
  setTxs:           (transactions) => set({ transactions }),
  setPrices:        (prices)      => set({ prices }),
  setLoading:       (loading)     => set({ loading }),
  setSourceState:   (source, patch) => set((state) => ({
    loadingState: {
      ...state.loadingState,
      [source]: { ...state.loadingState[source], ...patch },
    },
  })),
  setInitialLoaded: (initialLoaded) => set({ initialLoaded }),
  markUpdated:      () => set({ lastUpdated: Date.now() }),
  setPrivacyMode:   (privacyMode) => set((state) => {
    const prefs = { privacyMode, hideZeroBalances: state.hideZeroBalances, hiddenAssetIds: state.hiddenAssetIds };
    writePrefs(prefs);
    return { privacyMode };
  }),
  setHideZeroBalances: (hideZeroBalances) => set((state) => {
    const prefs = { privacyMode: state.privacyMode, hideZeroBalances, hiddenAssetIds: state.hiddenAssetIds };
    writePrefs(prefs);
    return { hideZeroBalances };
  }),
  toggleHiddenAsset: (id) => set((state) => {
    const hiddenAssetIds = state.hiddenAssetIds.includes(id)
      ? state.hiddenAssetIds.filter((assetId) => assetId !== id)
      : [...state.hiddenAssetIds, id];
    writePrefs({ privacyMode: state.privacyMode, hideZeroBalances: state.hideZeroBalances, hiddenAssetIds });
    return { hiddenAssetIds };
  }),

  historyFilter: "all",
  setFilter:     (historyFilter) => set({ historyFilter }),
}));
