"use client";

import { useEffect, useState } from "react";
import type { AddressBookContact, AddressBookNetwork } from "./types";
import { isTronAddress } from "../tron";

const KEY = "silent_address_book_v1";
const EVENT = "silent-address-book-change";

function cleanText(value: string, max = 180) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function hasSensitiveText(value: string) {
  const text = value.toLowerCase();
  return /seed phrase|private key|recovery phrase|mnemonic|secret recovery/.test(text);
}

export function sanitizeAddressBookText(value: string, max = 180) {
  const cleaned = cleanText(value, max);
  return hasSensitiveText(cleaned) ? "" : cleaned;
}

export function isValidAddressBookAddress(address: string) {
  const value = address.trim();
  return /^0x[0-9a-fA-F]{40}$/.test(value)
    || /^(bc1|tb1|[13mn2])[a-zA-HJ-NP-Z0-9]{25,80}$/.test(value)
    || isTronAddress(value)
    || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export function inferAddressNetwork(address: string): AddressBookNetwork {
  const value = address.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(value)) return "ethereum";
  if (/^(bc1|tb1|[13mn2])[a-zA-HJ-NP-Z0-9]{25,80}$/.test(value)) return "bitcoin";
  if (isTronAddress(value)) return "tron";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return "solana";
  return "any";
}

function readContacts(): AddressBookContact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<AddressBookContact>[] : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((contact) => typeof contact.address === "string" && isValidAddressBookAddress(contact.address))
      .map((contact) => ({
        id: typeof contact.id === "string" ? contact.id : makeId(),
        name: sanitizeAddressBookText(String(contact.name ?? "Contact"), 80) || "Contact",
        address: contact.address!.trim(),
        network: normalizeNetwork(contact.network),
        notes: sanitizeAddressBookText(String(contact.notes ?? ""), 280),
        trusted: !!contact.trusted,
        createdAt: typeof contact.createdAt === "number" ? contact.createdAt : Date.now(),
        updatedAt: typeof contact.updatedAt === "number" ? contact.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

function normalizeNetwork(value: unknown): AddressBookNetwork {
  return value === "ethereum" || value === "bsc" || value === "bitcoin" || value === "solana" || value === "tron" || value === "any" ? value : "any";
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `contact_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function writeContacts(contacts: AddressBookContact[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(contacts));
  window.dispatchEvent(new Event(EVENT));
}

export function getAddressBookContacts() {
  return readContacts();
}

export function findAddressBookContact(address: string, network?: AddressBookNetwork) {
  const value = address.trim().toLowerCase();
  return readContacts().find((contact) => {
    const sameAddress = contact.address.toLowerCase() === value;
    const sameNetwork = !network || contact.network === "any" || network === "any" || contact.network === network;
    return sameAddress && sameNetwork;
  });
}

export function upsertAddressBookContact(input: {
  id?: string;
  name: string;
  address: string;
  network?: AddressBookNetwork;
  notes?: string;
  trusted?: boolean;
}) {
  const address = input.address.trim();
  if (!isValidAddressBookAddress(address)) throw new Error("Enter a valid Ethereum, BNB Chain, Bitcoin, Solana, or TRON address.");

  const contacts = readContacts();
  const now = Date.now();
  const existing = input.id ? contacts.find((contact) => contact.id === input.id) : undefined;
  const next: AddressBookContact = {
    id: existing?.id ?? makeId(),
    name: sanitizeAddressBookText(input.name, 80) || "Contact",
    address,
    network: normalizeNetwork(input.network ?? inferAddressNetwork(address)),
    notes: sanitizeAddressBookText(input.notes ?? "", 280),
    trusted: !!input.trusted,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  writeContacts(existing ? contacts.map((contact) => contact.id === next.id ? next : contact) : [next, ...contacts]);
  return next;
}

export function deleteAddressBookContact(id: string) {
  writeContacts(readContacts().filter((contact) => contact.id !== id));
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

export function useAddressBook() {
  const [contacts, setContacts] = useState(readContacts);
  useEffect(() => subscribe(() => setContacts(readContacts())), []);
  return contacts;
}
