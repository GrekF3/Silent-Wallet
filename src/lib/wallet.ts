import { HDNodeWallet, Wallet } from "ethers";
import * as bip39 from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import { p2wpkh } from "@scure/btc-signer";
import * as btc from "@scure/btc-signer";
import { TronWeb } from "tronweb";
import { deriveSolanaKeypair } from "./solana";

export type WalletAddresses = {
  ethereum: `0x${string}`;
  bitcoin:  string;
  bsc:      `0x${string}`;
  solana:   string;
  tron:     string;
};

export type WalletNetworkKey = keyof WalletAddresses;
export type WalletAddressIndexes = Record<WalletNetworkKey, number>;

function safeAccountIndex(accountIndex = 0) {
  return Number.isInteger(accountIndex) && accountIndex >= 0 ? accountIndex : 0;
}

function safeAddressIndex(addressIndex = 0) {
  return Number.isInteger(addressIndex) && addressIndex >= 0 ? addressIndex : 0;
}

function pathAccountIndex(accountIndex = 0, addressIndex = 0) {
  const account = safeAccountIndex(accountIndex);
  const address = safeAddressIndex(addressIndex);
  if (address === 0) return account;
  return 10_000 + account * 1_000 + address;
}

export const DEFAULT_ADDRESS_INDEXES: WalletAddressIndexes = {
  ethereum: 0,
  bsc: 0,
  bitcoin: 0,
  solana: 0,
  tron: 0,
};

export function normalizeAddressIndexes(value?: Partial<WalletAddressIndexes> | null): WalletAddressIndexes {
  return {
    ethereum: safeAddressIndex(value?.ethereum),
    bsc: safeAddressIndex(value?.bsc),
    bitcoin: safeAddressIndex(value?.bitcoin),
    solana: safeAddressIndex(value?.solana),
    tron: safeAddressIndex(value?.tron),
  };
}

export function evmDerivationPath(accountIndex = 0, addressIndex = 0) {
  return `m/44'/60'/0'/0/${pathAccountIndex(accountIndex, addressIndex)}`;
}

export function bitcoinDerivationPath(accountIndex = 0, addressIndex = 0) {
  return `m/84'/0'/${pathAccountIndex(accountIndex, addressIndex)}'/0/0`;
}

export function tronDerivationPath(accountIndex = 0, addressIndex = 0) {
  return `m/44'/195'/0'/0/${pathAccountIndex(accountIndex, addressIndex)}`;
}

export function generateMnemonic(): string {
  return Wallet.createRandom().mnemonic!.phrase;
}

export function validateMnemonic(phrase: string): boolean {
  try {
    HDNodeWallet.fromPhrase(phrase.trim());
    return true;
  } catch { return false; }
}

export function deriveAddresses(mnemonic: string, accountIndex = 0, addressIndexes?: Partial<WalletAddressIndexes> | null): WalletAddresses {
  const phrase = mnemonic.trim();
  const index = safeAccountIndex(accountIndex);
  const slots = normalizeAddressIndexes(addressIndexes);

  const ethWallet  = HDNodeWallet.fromPhrase(phrase, undefined, evmDerivationPath(index, slots.ethereum));
  const ethAddress = ethWallet.address as `0x${string}`;
  const bscWallet  = slots.bsc === slots.ethereum
    ? ethWallet
    : HDNodeWallet.fromPhrase(phrase, undefined, evmDerivationPath(index, slots.bsc));
  const bscAddress = bscWallet.address as `0x${string}`;

  const seed   = bip39.mnemonicToSeedSync(phrase);
  const master = HDKey.fromMasterSeed(seed);
  const btcKey = master.derive(bitcoinDerivationPath(index, slots.bitcoin));
  const btcAddr = p2wpkh(btcKey.publicKey!, btc.NETWORK).address!;

  const { address: solAddr } = deriveSolanaKeypair(phrase, index, slots.solana);
  const tronWallet = HDNodeWallet.fromPhrase(phrase, undefined, tronDerivationPath(index, slots.tron));
  const tronAddress = TronWeb.address.fromPrivateKey(tronWallet.privateKey);
  if (!tronAddress) throw new Error("Failed to derive TRON address");

  return { ethereum: ethAddress, bitcoin: btcAddr, bsc: bscAddress, solana: solAddr, tron: tronAddress };
}

export function normalizeWalletAddresses(value: Partial<WalletAddresses> | null | undefined): WalletAddresses {
  return {
    ethereum: (value?.ethereum ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    bitcoin: value?.bitcoin ?? "",
    bsc: (value?.bsc ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    solana: value?.solana ?? "",
    tron: value?.tron ?? "",
  };
}

export function deriveNetworkAddress(mnemonic: string, network: WalletNetworkKey, accountIndex = 0, addressIndex = 0): string {
  const addresses = deriveAddresses(mnemonic, accountIndex, { ...DEFAULT_ADDRESS_INDEXES, [network]: addressIndex });
  return addresses[network];
}

export function derivePrivateKey(mnemonic: string, accountIndex = 0, addressIndex = 0): Uint8Array {
  const ethWallet = HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, evmDerivationPath(accountIndex, addressIndex));
  return Buffer.from(ethWallet.privateKey.slice(2), "hex");
}

export function deriveTronPrivateKey(mnemonic: string, accountIndex = 0, addressIndex = 0): Uint8Array {
  const tronWallet = HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, tronDerivationPath(accountIndex, addressIndex));
  return Buffer.from(tronWallet.privateKey.slice(2), "hex");
}

export function deriveBitcoinKeypair(mnemonic: string, accountIndex = 0, addressIndex = 0): { privateKey: Uint8Array; publicKey: Uint8Array; address: string } {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const master = HDKey.fromMasterSeed(seed);
  const key = master.derive(bitcoinDerivationPath(accountIndex, addressIndex));
  const privateKey = key.privateKey;
  const publicKey = key.publicKey;
  if (!privateKey || !publicKey) throw new Error("Failed to derive Bitcoin key");
  return { privateKey, publicKey, address: p2wpkh(publicKey, btc.NETWORK).address! };
}
