"use client";

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  http,
  type Hash,
} from "viem";
import { bsc, mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { rpcUrl } from "@/lib/config";
import { derivePrivateKey } from "@/lib/wallet";
import { isNativeTokenAddress } from "./chains";
import type { BridgeQuoteResponse, EvmTransactionRequest, SwapQuoteResponse } from "./types";

type ExecutableChainId = 1 | 56;

function assertExecutableChainId(chainId: number): ExecutableChainId {
  if (chainId === 1 || chainId === 56) return chainId;
  throw new Error("Local EVM execution is not available for this chain");
}

function privateKeyHex(privateKey: Uint8Array): `0x${string}` {
  return `0x${Buffer.from(privateKey).toString("hex")}`;
}

function chainForId(chainId: ExecutableChainId) {
  return chainId === 56 ? bsc : mainnet;
}

function rpcForId(chainId: ExecutableChainId) {
  return chainId === 56 ? rpcUrl("bsc", "mainnet") : rpcUrl("ethereum", "mainnet");
}

export function explorerForChain(chainId: number, hash: string) {
  if (chainId === 56) return `https://bscscan.com/tx/${hash}`;
  if (chainId === 1) return `https://etherscan.io/tx/${hash}`;
  return "";
}

export function isNativeEcosystemToken(address: string) {
  return isNativeTokenAddress(address);
}

export async function getErc20Allowance(params: {
  chainId: number;
  tokenAddress: `0x${string}`;
  owner: `0x${string}`;
  spender: `0x${string}`;
}): Promise<bigint> {
  const chainId = assertExecutableChainId(params.chainId);
  const client = createPublicClient({ chain: chainForId(chainId), transport: http(rpcForId(chainId)) });
  return client.readContract({
    address: params.tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [params.owner, params.spender],
  });
}

export async function approveErc20Exact(params: {
  mnemonic: string;
  chainId: number;
  tokenAddress: `0x${string}`;
  spender: `0x${string}`;
  amount: string;
}): Promise<Hash> {
  const chainId = assertExecutableChainId(params.chainId);
  const privateKey = derivePrivateKey(params.mnemonic);
  const account = privateKeyToAccount(privateKeyHex(privateKey));
  const client = createWalletClient({ account, chain: chainForId(chainId), transport: http(rpcForId(chainId)) });
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [params.spender, BigInt(params.amount)],
  });
  return client.sendTransaction({ to: params.tokenAddress, data });
}

export async function sendEvmTransaction(params: {
  mnemonic: string;
  chainId: number;
  transaction: EvmTransactionRequest;
}): Promise<Hash> {
  const chainId = assertExecutableChainId(params.chainId);
  const privateKey = derivePrivateKey(params.mnemonic);
  const account = privateKeyToAccount(privateKeyHex(privateKey));
  const client = createWalletClient({ account, chain: chainForId(chainId), transport: http(rpcForId(chainId)) });
  return client.sendTransaction({
    to: params.transaction.to,
    data: params.transaction.data,
    value: BigInt(params.transaction.value ?? "0"),
  });
}

export async function executeZeroXQuote(params: {
  mnemonic: string;
  quote: SwapQuoteResponse;
}): Promise<Hash> {
  if (!params.quote.transaction) throw new Error("Quote is missing transaction data");
  return sendEvmTransaction({
    mnemonic: params.mnemonic,
    chainId: params.quote.chainId,
    transaction: params.quote.transaction,
  });
}

export async function executeLifiQuote(params: {
  mnemonic: string;
  quote: BridgeQuoteResponse;
}): Promise<Hash> {
  if (!params.quote.transaction) throw new Error("Route is missing transaction data");
  return sendEvmTransaction({
    mnemonic: params.mnemonic,
    chainId: params.quote.fromChainId,
    transaction: params.quote.transaction,
  });
}
