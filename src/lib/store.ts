"use client";
import { create } from "zustand";
import type { WalletAddresses, WalletAddressIndexes, WalletNetworkKey } from "./wallet";
import { DEFAULT_ADDRESS_INDEXES, deriveAddresses, normalizeAddressIndexes } from "./wallet";
import type { Prices } from "./prices";
import type { ChainTx, Network } from "./chains";
import type { EvmToken } from "./tokens";
import type { SplToken } from "./solana";
import { saveSession, saveWatchSession, clearSession as clearSess, type SessionMode } from "./session";

export type View = "dashboard" | "asset" | "transfer" | "history" | "settings" | "ecosystem" | "learn" | "premium" | "accounts" | "addressBook";
export type EcosystemTab = "ramp" | "swap" | "bridge";
export type TransferTab = "send" | "receive";
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

export type TransferIntent = {
  tab: TransferTab;
  assetRef: AssetRef;
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
  spark7dTimestamps: number[];
  image:     string;
  desc:      string;
};

type WalletPrefs = {
  privacyMode: boolean;
  hideZeroBalances: boolean;
  hiddenAssetIds: string[];
  verifiedHistoryOnly: boolean;
};

const PREFS_KEY = "silent_wallet_prefs_v1";
const DEFAULT_PREFS: WalletPrefs = { privacyMode: false, hideZeroBalances: false, hiddenAssetIds: [], verifiedHistoryOnly: true };

function readPrefs(): WalletPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<WalletPrefs>;
    return {
      privacyMode: !!parsed.privacyMode,
      hideZeroBalances: !!parsed.hideZeroBalances,
      hiddenAssetIds: Array.isArray(parsed.hiddenAssetIds) ? parsed.hiddenAssetIds.filter((id) => typeof id === "string") : [],
      verifiedHistoryOnly: parsed.verifiedHistoryOnly !== false,
    };
  } catch {
    return DEFAULT_PREFS;
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
  activeAccountIndex: number;
  activeAddressIndexes: WalletAddressIndexes;
  setSession:    (m: string, a: WalletAddresses, accountIndex?: number, addressIndexes?: WalletAddressIndexes) => void;
  setWatchSession: (name: string, a: WalletAddresses) => void;
  setActiveAccountIndex: (index: number) => void;
  setActiveAddressIndex: (network: WalletNetworkKey, index: number) => void;
  clearSession:  () => void;

  network:       Network;
  setNetwork:    (n: Network) => void;

  view:          View;
  setView:       (v: View) => void;
  transferIntent: TransferIntent | null;
  openTransfer:  (tab?: TransferTab, assetRef?: AssetRef | null) => void;
  clearTransferIntent: () => void;
  ecosystemTab:  EcosystemTab;
  setEcosystemTab: (tab: EcosystemTab) => void;
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
  verifiedHistoryOnly: boolean;

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
  setVerifiedHistoryOnly: (v: boolean) => void;

  historyFilter: "all" | "send" | "receive";
  setFilter:     (f: "all" | "send" | "receive") => void;
};

const initialPrefs = readPrefs();

export const useWalletStore = create<WalletStore>((set) => ({
  sessionMode: "wallet",
  watchName: null,
  mnemonic:  null,
  addresses: null,
  activeAccountIndex: 0,
  activeAddressIndexes: DEFAULT_ADDRESS_INDEXES,
  setSession: (mnemonic, addresses, activeAccountIndex = 0, addressIndexes = DEFAULT_ADDRESS_INDEXES) => {
    const activeAddressIndexes = normalizeAddressIndexes(addressIndexes);
    saveSession(mnemonic, addresses, activeAccountIndex, activeAddressIndexes);
    set({ sessionMode: "wallet", watchName: null, mnemonic, addresses, activeAccountIndex, activeAddressIndexes });
  },
  setWatchSession: (watchName, addresses) => { saveWatchSession(watchName, addresses); set({ sessionMode: "watch", watchName, mnemonic: null, addresses, activeAccountIndex: 0, activeAddressIndexes: DEFAULT_ADDRESS_INDEXES, view: "dashboard" }); },
  setActiveAccountIndex: (activeAccountIndex) => set((state) => {
    if (!state.mnemonic || state.sessionMode === "watch") return {};
    const activeAddressIndexes = DEFAULT_ADDRESS_INDEXES;
    const addresses = deriveAddresses(state.mnemonic, activeAccountIndex, activeAddressIndexes);
    saveSession(state.mnemonic, addresses, activeAccountIndex, activeAddressIndexes);
    return {
      activeAccountIndex,
      activeAddressIndexes,
      addresses,
      assets: [],
      evmTokens: [],
      splTokens: [],
      transactions: [],
      selectedAssetRef: null,
      selectedAsset: null,
      transferIntent: null,
      initialLoaded: false,
      lastUpdated: null,
      loadingState: {
        balances:     { status: "idle" },
        prices:       state.loadingState.prices,
        tokens:       { status: "idle" },
        transactions: { status: "idle" },
      },
    };
  }),
  setActiveAddressIndex: (network, index) => set((state) => {
    if (!state.mnemonic || state.sessionMode === "watch") return {};
    const activeAddressIndexes = normalizeAddressIndexes({ ...state.activeAddressIndexes, [network]: index });
    const addresses = deriveAddresses(state.mnemonic, state.activeAccountIndex, activeAddressIndexes);
    saveSession(state.mnemonic, addresses, state.activeAccountIndex, activeAddressIndexes);
    return {
      activeAddressIndexes,
      addresses,
      assets: [],
      evmTokens: [],
      splTokens: [],
      transactions: [],
      selectedAssetRef: null,
      selectedAsset: null,
      transferIntent: null,
      initialLoaded: false,
      lastUpdated: null,
      loadingState: {
        balances:     { status: "idle" },
        prices:       state.loadingState.prices,
        tokens:       { status: "idle" },
        transactions: { status: "idle" },
      },
    };
  }),
  clearSession: () => { clearSess(); set({ sessionMode: "wallet", watchName: null, mnemonic: null, addresses: null, activeAccountIndex: 0, activeAddressIndexes: DEFAULT_ADDRESS_INDEXES, assets: [], evmTokens: [], splTokens: [], transactions: [], selectedAssetRef: null, selectedAsset: null, transferIntent: null, initialLoaded: false, lastUpdated: null }); },

  network:    "mainnet",
  setNetwork: (network) => set({ network, assets: [], evmTokens: [], splTokens: [], transactions: [], selectedAssetRef: null, selectedAsset: null, transferIntent: null, initialLoaded: false, lastUpdated: null }),

  view:          "dashboard",
  setView:       (view) => set({ view }),
  transferIntent: null,
  openTransfer:  (tab = "send", assetRef = null) => set({ view: "transfer", transferIntent: assetRef ? { tab, assetRef } : null }),
  clearTransferIntent: () => set({ transferIntent: null }),
  ecosystemTab:  "ramp",
  setEcosystemTab: (ecosystemTab) => set({ ecosystemTab, view: "ecosystem" }),
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
  verifiedHistoryOnly: initialPrefs.verifiedHistoryOnly,

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
    const prefs = { privacyMode, hideZeroBalances: state.hideZeroBalances, hiddenAssetIds: state.hiddenAssetIds, verifiedHistoryOnly: state.verifiedHistoryOnly };
    writePrefs(prefs);
    return { privacyMode };
  }),
  setHideZeroBalances: (hideZeroBalances) => set((state) => {
    const prefs = { privacyMode: state.privacyMode, hideZeroBalances, hiddenAssetIds: state.hiddenAssetIds, verifiedHistoryOnly: state.verifiedHistoryOnly };
    writePrefs(prefs);
    return { hideZeroBalances };
  }),
  toggleHiddenAsset: (id) => set((state) => {
    const hiddenAssetIds = state.hiddenAssetIds.includes(id)
      ? state.hiddenAssetIds.filter((assetId) => assetId !== id)
      : [...state.hiddenAssetIds, id];
    writePrefs({ privacyMode: state.privacyMode, hideZeroBalances: state.hideZeroBalances, hiddenAssetIds, verifiedHistoryOnly: state.verifiedHistoryOnly });
    return { hiddenAssetIds };
  }),
  setVerifiedHistoryOnly: (verifiedHistoryOnly) => set((state) => {
    writePrefs({ privacyMode: state.privacyMode, hideZeroBalances: state.hideZeroBalances, hiddenAssetIds: state.hiddenAssetIds, verifiedHistoryOnly });
    return { verifiedHistoryOnly };
  }),

  historyFilter: "all",
  setFilter:     (historyFilter) => set({ historyFilter }),
}));
