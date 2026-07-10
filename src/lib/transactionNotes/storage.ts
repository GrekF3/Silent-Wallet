"use client";

import { useEffect, useState } from "react";

export type TransactionTemplate = {
  id: string;
  name: string;
  recipient: string;
  assetSymbol: string;
  network: string;
  createdAt: number;
};

const NOTES_KEY = "silent_transaction_notes_v1";
const TEMPLATES_KEY = "silent_transaction_templates_v1";
const EVENT = "silent-transaction-notes-change";

function clean(value: string, max = 240) {
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return /seed phrase|private key|recovery phrase|mnemonic|secret recovery/i.test(text) ? "" : text;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `template_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getTransactionNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, clean(String(value ?? ""))]).filter(([, value]) => value));
  } catch {
    return {};
  }
}

export function setTransactionNote(hash: string, note: string) {
  if (typeof window === "undefined") return;
  const notes = getTransactionNotes();
  const next = clean(note);
  if (next) notes[hash] = next;
  else delete notes[hash];
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  window.dispatchEvent(new Event(EVENT));
}

export function getTransactionTemplates(): TransactionTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<TransactionTemplate>[] : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item.recipient === "string").map((item) => ({
          id: typeof item.id === "string" ? item.id : makeId(),
          name: clean(String(item.name ?? "Template"), 64) || "Template",
          recipient: String(item.recipient ?? "").trim(),
          assetSymbol: clean(String(item.assetSymbol ?? ""), 24),
          network: clean(String(item.network ?? ""), 32),
          createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
        }))
      : [];
  } catch {
    return [];
  }
}

export function addTransactionTemplate(input: Omit<TransactionTemplate, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const next: TransactionTemplate = {
    id: makeId(),
    name: clean(input.name, 64) || "Template",
    recipient: input.recipient.trim(),
    assetSymbol: clean(input.assetSymbol, 24),
    network: clean(input.network, 32),
    createdAt: Date.now(),
  };
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify([next, ...getTransactionTemplates()]));
  window.dispatchEvent(new Event(EVENT));
}

export function deleteTransactionTemplate(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(getTransactionTemplates().filter((template) => template.id !== id)));
  window.dispatchEvent(new Event(EVENT));
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

export function useTransactionNotes() {
  const [notes, setNotes] = useState(getTransactionNotes);
  useEffect(() => subscribe(() => setNotes(getTransactionNotes())), []);
  return notes;
}

export function useTransactionTemplates() {
  const [templates, setTemplates] = useState(getTransactionTemplates);
  useEffect(() => subscribe(() => setTemplates(getTransactionTemplates())), []);
  return templates;
}
