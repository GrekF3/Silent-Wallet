"use client";

import { useEffect, useState } from "react";

export type LearnArticle = {
  slug: string;
  title: string;
  summary: string;
  category: "basics" | "safety" | "web3";
  readTime: string;
  body: string[];
};

const COMPLETED_KEY = "silent_learn_completed_v1";
const EVENT = "silent-learn-progress-change";

export const LEARN_ARTICLES: LearnArticle[] = [
  {
    slug: "what-is-a-wallet",
    title: "What is a wallet?",
    summary: "A wallet lets you hold keys, view balances, and sign transactions.",
    category: "basics",
    readTime: "2 min",
    body: [
      "A crypto wallet does not hold coins like a bank app holds money. It holds keys.",
      "Those keys let you prove that you control assets on a blockchain.",
      "Silent Wallet helps you create, import, watch, send, and receive without taking custody of your assets.",
    ],
  },
  {
    slug: "wallet-vs-exchange",
    title: "Wallet vs exchange",
    summary: "A wallet gives you control. An exchange account is managed by a company.",
    category: "basics",
    readTime: "2 min",
    body: [
      "An exchange can be useful for buying or selling, but it usually controls the account.",
      "A self-custodial wallet gives you direct control of your keys.",
      "That control is powerful. It also means recovery and transaction checks are your responsibility.",
    ],
  },
  {
    slug: "self-custody",
    title: "What is self-custody?",
    summary: "You control the wallet. No company can recover it for you.",
    category: "basics",
    readTime: "2 min",
    body: [
      "Self-custody means your keys stay with you.",
      "Silent Wallet does not have a copy of your seed phrase or private key.",
      "If you lose your seed phrase and device access, nobody can reset the wallet for you.",
    ],
  },
  {
    slug: "seed-phrase-safety",
    title: "What is a seed phrase?",
    summary: "Your seed phrase is the master key to your wallet.",
    category: "safety",
    readTime: "2 min",
    body: [
      "Your seed phrase is the master key to your wallet.",
      "Anyone who has it can access your assets.",
      "Silent Wallet will never ask you to send it anywhere.",
      "Do not store it in chats, screenshots, cloud notes, or email.",
    ],
  },
  {
    slug: "gas-fees",
    title: "What are gas fees?",
    summary: "Gas is the network cost for processing a transaction.",
    category: "basics",
    readTime: "2 min",
    body: [
      "A network fee pays validators or miners to process your transaction.",
      "Fees change with network demand.",
      "Silent Wallet shows estimates when they are available, but the final fee is set by the network.",
    ],
  },
  {
    slug: "addresses",
    title: "What is an address?",
    summary: "An address is where someone can send assets on a specific network.",
    category: "basics",
    readTime: "2 min",
    body: [
      "A wallet can have different addresses for different networks.",
      "Always check the network before receiving or sending.",
      "If you send to the wrong network or address, the transaction usually cannot be reversed.",
    ],
  },
  {
    slug: "evm",
    title: "What is EVM?",
    summary: "EVM chains share a common Ethereum-style transaction system.",
    category: "web3",
    readTime: "2 min",
    body: [
      "EVM means Ethereum Virtual Machine.",
      "Ethereum and BNB Chain are examples of EVM networks.",
      "They often use similar address formats, but assets still live on their own networks.",
    ],
  },
  {
    slug: "swaps",
    title: "What is a swap?",
    summary: "A swap exchanges one asset for another on the same chain or through a provider.",
    category: "web3",
    readTime: "2 min",
    body: [
      "A swap lets you trade one token for another.",
      "Quotes can change before you sign.",
      "Review the asset, network, fees, and recipient contract before confirming.",
    ],
  },
  {
    slug: "bridges",
    title: "What is a bridge?",
    summary: "A bridge moves value between networks using third-party routing.",
    category: "web3",
    readTime: "2 min",
    body: [
      "A bridge helps move assets between chains.",
      "Bridges can take longer than normal transfers and involve extra provider risk.",
      "Start small if you are using a bridge for the first time.",
    ],
  },
  {
    slug: "common-scams",
    title: "How to avoid common scams",
    summary: "Slow down when someone pressures you to sign, share, or rush.",
    category: "safety",
    readTime: "3 min",
    body: [
      "No support agent needs your seed phrase.",
      "Do not trust urgent DMs, fake airdrops, or links that ask you to import your wallet.",
      "Read transaction prompts carefully. If you do not understand what you are signing, stop.",
    ],
  },
  {
    slug: "before-sending",
    title: "What to do before sending crypto",
    summary: "Check the network, address, asset, amount, and fee before you sign.",
    category: "safety",
    readTime: "2 min",
    body: [
      "Confirm the recipient address and network.",
      "Use your address book for people and wallets you trust.",
      "For large transfers, send a small test amount first.",
    ],
  },
];

function readCompletedSet() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export function getCompletedLearnArticles() {
  return [...readCompletedSet()];
}

export function markLearnArticleRead(slug: string) {
  if (typeof window === "undefined") return;
  const next = new Set(readCompletedSet());
  next.add(slug);
  localStorage.setItem(COMPLETED_KEY, JSON.stringify([...next]));
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

export function useLearnProgress() {
  const [completed, setCompleted] = useState(getCompletedLearnArticles);
  useEffect(() => subscribe(() => setCompleted(getCompletedLearnArticles())), []);
  return completed;
}
