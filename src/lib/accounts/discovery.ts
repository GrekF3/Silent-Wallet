"use client";

import { bitcoinAddressForNetwork } from "@/lib/bitcoin";
import { getBnbBalance, getBtcBalance, getEthBalance, type Network } from "@/lib/chains";
import { getSolBalance, getSplTokens } from "@/lib/solana";
import { getTrc20Tokens, getTrxBalance } from "@/lib/tron";
import { fetchAllEvmTokens } from "@/lib/tokens";
import { deriveAddresses } from "@/lib/wallet";
import { upsertRecoveredWalletAccounts } from "./storage";

type DiscoveryOptions = {
  maxAccounts?: number;
  emptyGap?: number;
  network?: Network;
};

export type AccountDiscoveryResult = {
  scanned: number;
  recoveredIndexes: number[];
};

const DEFAULT_MAX_ACCOUNTS = 8;
const DEFAULT_EMPTY_GAP = 3;
const DISCOVERY_TIMEOUT = 9_000;

async function settleWithTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), DISCOVERY_TIMEOUT)),
    ]);
  } catch {
    return fallback;
  }
}

async function scanAccount(mnemonic: string, accountIndex: number, network: Network) {
  const addresses = deriveAddresses(mnemonic, accountIndex);
  const bitcoinAddress = bitcoinAddressForNetwork(mnemonic, network, accountIndex, 0);

  const [eth, bnb, btc, sol, trx] = await Promise.all([
    settleWithTimeout(getEthBalance(addresses.ethereum, network), 0),
    settleWithTimeout(getBnbBalance(addresses.bsc, network), 0),
    settleWithTimeout(getBtcBalance(bitcoinAddress, network), 0),
    settleWithTimeout(getSolBalance(addresses.solana, network), 0),
    settleWithTimeout(getTrxBalance(addresses.tron, network), 0),
  ]);

  if (eth > 0 || bnb > 0 || btc > 0 || sol > 0 || trx > 0) return true;
  if (network !== "mainnet") return false;

  const [evmTokens, splTokens, trc20Tokens] = await Promise.all([
    settleWithTimeout(fetchAllEvmTokens(addresses.ethereum, addresses.bsc), []),
    settleWithTimeout(getSplTokens(addresses.solana, network), []),
    settleWithTimeout(getTrc20Tokens(addresses.tron, network), []),
  ]);

  return evmTokens.length > 0 || splTokens.length > 0 || trc20Tokens.some((token) => token.balance > 0);
}

export async function discoverMnemonicAccounts(
  mnemonic: string,
  options: DiscoveryOptions = {},
): Promise<AccountDiscoveryResult> {
  const maxAccounts = Math.max(1, options.maxAccounts ?? DEFAULT_MAX_ACCOUNTS);
  const emptyGap = Math.max(1, options.emptyGap ?? DEFAULT_EMPTY_GAP);
  const network = options.network ?? "mainnet";
  const recoveredIndexes: number[] = [];
  let emptyAfterLastFound = 0;
  let scanned = 0;

  for (let index = 0; index < maxAccounts; index += 1) {
    scanned = index + 1;
    const found = await scanAccount(mnemonic, index, network);
    if (found) {
      emptyAfterLastFound = 0;
      if (index > 0) recoveredIndexes.push(index);
    } else if (index > 0) {
      emptyAfterLastFound += 1;
      if (recoveredIndexes.length > 0 && emptyAfterLastFound >= emptyGap) break;
    }
  }

  if (recoveredIndexes.length > 0) upsertRecoveredWalletAccounts(recoveredIndexes);
  return { scanned, recoveredIndexes };
}
