import * as btc from "@scure/btc-signer";
import { deriveBitcoinKeypair } from "./wallet";
import type { Network } from "./chains";

const DUST_SATS = 546n;

const btcBase = (net: Network) => net === "testnet"
  ? "https://blockstream.info/testnet/api"
  : "https://blockstream.info/api";

type Utxo = {
  txid: string;
  vout: number;
  value: number;
  status?: { confirmed?: boolean };
};

function satsFromBtc(amount: string): bigint {
  const [whole, fraction = ""] = amount.trim().split(".");
  const frac = (fraction + "00000000").slice(0, 8);
  return BigInt(whole || "0") * 100_000_000n + BigInt(frac || "0");
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchUtxos(address: string, net: Network): Promise<Utxo[]> {
  const r = await fetch(`${btcBase(net)}/address/${address}/utxo`, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!r.ok) throw new Error(`BTC UTXO fetch failed: ${r.status}`);
  return await r.json();
}

async function feeRate(net: Network): Promise<number> {
  try {
    const r = await fetch(`${btcBase(net)}/fee-estimates`, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
    const d = await r.json() as Record<string, number>;
    return Math.max(2, Math.ceil(d["2"] ?? d["3"] ?? d["6"] ?? 5));
  } catch {
    return net === "testnet" ? 2 : 8;
  }
}

export function bitcoinAddressForNetwork(mnemonic: string, net: Network, accountIndex = 0, addressIndex = 0): string {
  const key = deriveBitcoinKeypair(mnemonic, accountIndex, addressIndex);
  const btcNetworks = btc as unknown as { NETWORK: unknown; TEST_NETWORK?: unknown };
  const network = net === "testnet" ? (btcNetworks.TEST_NETWORK ?? btcNetworks.NETWORK) : btcNetworks.NETWORK;
  const payment = (btc.p2wpkh as unknown as (pubkey: Uint8Array, network: unknown) => { address?: string })(key.publicKey, network);
  return payment.address ?? key.address;
}

export async function sendBtc(params: { mnemonic: string; to: string; amount: string; net: Network; accountIndex?: number; addressIndex?: number }): Promise<string> {
  const key = deriveBitcoinKeypair(params.mnemonic, params.accountIndex ?? 0, params.addressIndex ?? 0);
  const btcNetworks = btc as unknown as { NETWORK: unknown; TEST_NETWORK?: unknown };
  const network = params.net === "testnet" ? (btcNetworks.TEST_NETWORK ?? btcNetworks.NETWORK) : btcNetworks.NETWORK;
  const payment = (btc.p2wpkh as unknown as (pubkey: Uint8Array, network: unknown) => { script: Uint8Array; address?: string })(key.publicKey, network);
  const signingAddress = payment.address ?? key.address;
  const utxos = (await fetchUtxos(signingAddress, params.net)).sort((a, b) => b.value - a.value);
  const target = satsFromBtc(params.amount);
  if (target <= 0n) throw new Error("Amount must be greater than zero");

  const selected: Utxo[] = [];
  let inputTotal = 0n;
  const rate = await feeRate(params.net);
  for (const utxo of utxos) {
    selected.push(utxo);
    inputTotal += BigInt(utxo.value);
    const estimatedFee = BigInt(Math.ceil((10 + selected.length * 68 + 2 * 31) * rate));
    if (inputTotal >= target + estimatedFee) break;
  }

  const fee = BigInt(Math.ceil((10 + selected.length * 68 + 2 * 31) * rate));
  const change = inputTotal - target - fee;
  if (change < 0n) throw new Error("Insufficient BTC balance for amount and network fee");

  if (!payment.script) throw new Error("Failed to build Bitcoin witness script");
  const changeAddress = signingAddress;
  const Tx = (btc as unknown as { Transaction: new () => unknown }).Transaction;
  const tx = new Tx() as {
    addInput: (input: unknown) => void;
    addOutputAddress: (address: string, amount: bigint, network?: unknown) => void;
    sign: (privateKey: Uint8Array) => void;
    finalize: () => void;
  };
  for (const utxo of selected) {
    tx.addInput({
      txid: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: payment.script, amount: BigInt(utxo.value) },
    });
  }
  tx.addOutputAddress(params.to, target, network);
  if (change > DUST_SATS) tx.addOutputAddress(changeAddress, change, network);
  tx.sign(key.privateKey);
  tx.finalize();

  const signed = tx as unknown as { hex?: string; extract?: () => Uint8Array };
  const hex = typeof signed.hex === "string"
    ? signed.hex
    : signed.extract
      ? toHex(signed.extract())
      : (() => { throw new Error("Bitcoin signer did not produce a raw transaction"); })();
  const r = await fetch(`${btcBase(params.net)}/tx`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: hex,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text || `BTC broadcast failed: ${r.status}`);
  return text.trim();
}
