import { HDNodeWallet, Wallet } from "ethers";
import * as bip39 from "@scure/bip39";
import { HDKey } from "@scure/bip32";
import { p2wpkh } from "@scure/btc-signer";
import * as btc from "@scure/btc-signer";
import { deriveSolanaKeypair } from "./solana";

export type WalletAddresses = {
  ethereum: `0x${string}`;
  bitcoin:  string;
  bsc:      `0x${string}`;
  solana:   string;
};

const BTC_PATH = "m/84'/0'/0'/0/0";

export function generateMnemonic(): string {
  return Wallet.createRandom().mnemonic!.phrase;
}

export function validateMnemonic(phrase: string): boolean {
  try {
    HDNodeWallet.fromPhrase(phrase.trim());
    return true;
  } catch { return false; }
}

export function deriveAddresses(mnemonic: string): WalletAddresses {
  const phrase = mnemonic.trim();

  const ethWallet  = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/60'/0'/0/0");
  const ethAddress = ethWallet.address as `0x${string}`;

  const seed   = bip39.mnemonicToSeedSync(phrase);
  const master = HDKey.fromMasterSeed(seed);
  const btcKey = master.derive(BTC_PATH);
  const btcAddr = p2wpkh(btcKey.publicKey!, btc.NETWORK).address!;

  const { address: solAddr } = deriveSolanaKeypair(phrase);

  return { ethereum: ethAddress, bitcoin: btcAddr, bsc: ethAddress, solana: solAddr };
}

export function derivePrivateKey(mnemonic: string): Uint8Array {
  const ethWallet = HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, "m/44'/60'/0'/0/0");
  return Buffer.from(ethWallet.privateKey.slice(2), "hex");
}
