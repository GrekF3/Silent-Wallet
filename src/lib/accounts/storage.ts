"use client";

import { useEffect, useMemo, useState } from "react";
import type { AccountAddressNetwork, AccountAddressSlot, AccountDraft, WalletAccount, WalletAccountLabel } from "./types";

const KEY = "silent_wallet_accounts_v1";
const ADDRESS_KEY = "silent_wallet_address_slots_v1";
const EVENT = "silent-wallet-accounts-change";
const ADDRESS_EVENT = "silent-wallet-address-slots-change";

export const DEFAULT_ACCOUNT: WalletAccount = {
  id: "account-0",
  index: 0,
  name: "Main",
  purpose: "Default signing account",
  labels: ["primary"],
  archived: false,
  createdAt: 0,
  updatedAt: 0,
};

export const ACCOUNT_TEMPLATES: AccountDraft[] = [
  { name: "Treasury", purpose: "High-value storage and deliberate transfers.", labels: ["treasury"] },
  { name: "Long Term", purpose: "Hold assets without mixing daily activity.", labels: ["long-term"] },
  { name: "Operations", purpose: "Day-to-day Web3 activity and smaller transfers.", labels: ["operations"] },
  { name: "Watch", purpose: "Separate account for monitoring and public receiving.", labels: ["watch"] },
];

const ALLOWED_LABELS = new Set<WalletAccountLabel>(["primary", "treasury", "long-term", "operations", "watch", "recovered"]);

function clean(value: string, max = 72) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanLabels(value: unknown): WalletAccountLabel[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WalletAccountLabel => typeof item === "string" && ALLOWED_LABELS.has(item as WalletAccountLabel));
}

function makeId(index: number) {
  return `account-${index}`;
}

function makeAddressId(accountIndex: number, network: AccountAddressNetwork, addressIndex: number) {
  return `${accountIndex}:${network}:${addressIndex}`;
}

function normalizeAccount(item: Partial<WalletAccount>, fallbackIndex: number): WalletAccount | null {
  const index = typeof item.index === "number" && Number.isInteger(item.index) && item.index >= 0 ? item.index : fallbackIndex;
  const name = clean(String(item.name ?? ""), 48) || (index === 0 ? "Main" : `Account ${index + 1}`);
  return {
    id: typeof item.id === "string" && item.id.trim() ? clean(item.id, 80) : makeId(index),
    index,
    name,
    purpose: clean(String(item.purpose ?? ""), 120) || (index === 0 ? "Default signing account" : "Separate account for clearer wallet operations."),
    labels: cleanLabels(item.labels),
    archived: !!item.archived && index !== 0,
    createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
  };
}

function sortAccounts(accounts: WalletAccount[]) {
  return [...accounts].sort((a, b) => a.index - b.index);
}

function readStoredAccounts(): WalletAccount[] {
  if (typeof window === "undefined") return [DEFAULT_ACCOUNT];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<WalletAccount>[] : [];
    const normalized = Array.isArray(parsed)
      ? parsed.map((item, fallbackIndex) => normalizeAccount(item, fallbackIndex)).filter((item): item is WalletAccount => !!item)
      : [];
    const withoutDefault = normalized.filter((item) => item.index !== 0);
    return sortAccounts([DEFAULT_ACCOUNT, ...withoutDefault]);
  } catch {
    return [DEFAULT_ACCOUNT];
  }
}

function writeAccounts(accounts: WalletAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(sortAccounts(accounts).filter((account) => account.index !== 0)));
  window.dispatchEvent(new Event(EVENT));
}

export function getWalletAccounts() {
  return readStoredAccounts();
}

export function getWalletAccount(index: number) {
  return readStoredAccounts().find((account) => account.index === index) ?? DEFAULT_ACCOUNT;
}

export function nextWalletAccountIndex() {
  return readStoredAccounts().reduce((max, account) => Math.max(max, account.index), 0) + 1;
}

export function createWalletAccount(input: AccountDraft) {
  const now = Date.now();
  const index = nextWalletAccountIndex();
  const account: WalletAccount = {
    id: makeId(index),
    index,
    name: clean(input.name, 48) || `Account ${index + 1}`,
    purpose: clean(input.purpose ?? "", 120) || "Separate account for clearer wallet operations.",
    labels: input.labels?.filter((label) => ALLOWED_LABELS.has(label)) ?? [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  writeAccounts([...readStoredAccounts(), account]);
  return account;
}

export function upsertRecoveredWalletAccounts(indexes: number[]) {
  const existing = readStoredAccounts();
  const existingIndexes = new Set(existing.map((account) => account.index));
  const now = Date.now();
  const recovered = indexes
    .filter((index) => Number.isInteger(index) && index > 0 && !existingIndexes.has(index))
    .map((index) => ({
      id: makeId(index),
      index,
      name: `Account ${index + 1}`,
      purpose: "Recovered from this seed phrase.",
      labels: ["recovered"] as WalletAccountLabel[],
      archived: false,
      createdAt: now,
      updatedAt: now,
    }));

  if (!recovered.length) return existing;
  const next = sortAccounts([...existing, ...recovered]);
  writeAccounts(next);
  return next;
}

export function updateWalletAccount(index: number, patch: Partial<Pick<WalletAccount, "name" | "purpose" | "labels" | "archived">>) {
  if (index === 0 && patch.archived) return;
  const accounts = readStoredAccounts().map((account) => account.index === index
    ? {
        ...account,
        name: patch.name !== undefined ? (clean(patch.name, 48) || account.name) : account.name,
        purpose: patch.purpose !== undefined ? clean(patch.purpose, 120) : account.purpose,
        labels: patch.labels !== undefined ? patch.labels.filter((label) => ALLOWED_LABELS.has(label)) : account.labels,
        archived: index === 0 ? false : (patch.archived ?? account.archived),
        updatedAt: Date.now(),
      }
    : account);
  writeAccounts(accounts);
}

export function defaultAddressSlot(accountIndex: number, network: AccountAddressNetwork): AccountAddressSlot {
  return {
    id: makeAddressId(accountIndex, network, 0),
    accountIndex,
    network,
    addressIndex: 0,
    label: "Primary",
    archived: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

function normalizeAddressSlot(item: Partial<AccountAddressSlot>): AccountAddressSlot | null {
  const accountIndex = typeof item.accountIndex === "number" && Number.isInteger(item.accountIndex) && item.accountIndex >= 0 ? item.accountIndex : null;
  const addressIndex = typeof item.addressIndex === "number" && Number.isInteger(item.addressIndex) && item.addressIndex >= 0 ? item.addressIndex : null;
  const network = item.network;
  if (accountIndex === null || addressIndex === null || !["ethereum", "bsc", "bitcoin", "solana", "tron"].includes(String(network))) return null;
  return {
    id: typeof item.id === "string" && item.id.trim() ? clean(item.id, 100) : makeAddressId(accountIndex, network as AccountAddressNetwork, addressIndex),
    accountIndex,
    network: network as AccountAddressNetwork,
    addressIndex,
    label: clean(String(item.label ?? ""), 48) || (addressIndex === 0 ? "Primary" : `Address ${addressIndex + 1}`),
    archived: !!item.archived && addressIndex !== 0,
    createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
  };
}

function readAddressSlots(): AccountAddressSlot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ADDRESS_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<AccountAddressSlot>[] : [];
    return Array.isArray(parsed)
      ? parsed.map(normalizeAddressSlot).filter((item): item is AccountAddressSlot => !!item && item.addressIndex !== 0)
      : [];
  } catch {
    return [];
  }
}

function writeAddressSlots(slots: AccountAddressSlot[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(slots.filter((slot) => slot.addressIndex !== 0)));
  window.dispatchEvent(new Event(ADDRESS_EVENT));
}

export function getAccountAddressSlots(accountIndex: number, network: AccountAddressNetwork) {
  const slots = readAddressSlots()
    .filter((slot) => slot.accountIndex === accountIndex && slot.network === network && !slot.archived)
    .sort((a, b) => a.addressIndex - b.addressIndex);
  return [defaultAddressSlot(accountIndex, network), ...slots];
}

export function createAccountAddressSlot(accountIndex: number, network: AccountAddressNetwork) {
  const existing = readAddressSlots().filter((slot) => slot.accountIndex === accountIndex && slot.network === network);
  const nextIndex = existing.reduce((max, slot) => Math.max(max, slot.addressIndex), 0) + 1;
  const now = Date.now();
  const slot: AccountAddressSlot = {
    id: makeAddressId(accountIndex, network, nextIndex),
    accountIndex,
    network,
    addressIndex: nextIndex,
    label: `Address ${nextIndex + 1}`,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  writeAddressSlots([...readAddressSlots(), slot]);
  return slot;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function subscribeAddressSlots(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(ADDRESS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ADDRESS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useWalletAccounts() {
  const [accounts, setAccounts] = useState(getWalletAccounts);
  useEffect(() => subscribe(() => setAccounts(getWalletAccounts())), []);
  return accounts;
}

export function useAccountAddressSlots(accountIndex: number, network: AccountAddressNetwork) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    return subscribeAddressSlots(() => setVersion((value) => value + 1));
  }, []);
  return useMemo(() => {
    void version;
    return getAccountAddressSlots(accountIndex, network);
  }, [accountIndex, network, version]);
}
