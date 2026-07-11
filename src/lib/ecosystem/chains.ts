import type { EcosystemChain, EcosystemChainKey, EcosystemToken } from "./types";
import { VERIFIED_EVM_TOKENS } from "../tokenVerification";

export const ZEROX_NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export const LIFI_NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

export const ECOSYSTEM_CHAINS: EcosystemChain[] = [
  {
    id: "ethereum-mainnet",
    key: "ethereum",
    chainId: 1,
    name: "Ethereum",
    network: "mainnet",
    chainType: "evm",
    nativeSymbol: "ETH",
    nativeName: "Ether",
    executable: true,
    swapSupported: true,
    bridgeSupported: true,
    rampSupported: true,
    explorerTxUrl: "https://etherscan.io/tx/",
  },
  {
    id: "bsc-mainnet",
    key: "bsc",
    chainId: 56,
    name: "BNB Chain",
    network: "mainnet",
    chainType: "evm",
    nativeSymbol: "BNB",
    nativeName: "BNB",
    executable: true,
    swapSupported: true,
    bridgeSupported: true,
    rampSupported: true,
    explorerTxUrl: "https://bscscan.com/tx/",
  },
  {
    id: "ethereum-sepolia",
    key: "ethereum",
    chainId: 11155111,
    name: "Ethereum Sepolia",
    network: "testnet",
    chainType: "evm",
    nativeSymbol: "ETH",
    nativeName: "Sepolia Ether",
    executable: false,
    swapSupported: false,
    bridgeSupported: false,
    rampSupported: false,
    explorerTxUrl: "https://sepolia.etherscan.io/tx/",
    unsupportedReason: "unsupported_testnet",
  },
  {
    id: "bsc-testnet",
    key: "bsc",
    chainId: 97,
    name: "BNB Chain Testnet",
    network: "testnet",
    chainType: "evm",
    nativeSymbol: "tBNB",
    nativeName: "Testnet BNB",
    executable: false,
    swapSupported: false,
    bridgeSupported: false,
    rampSupported: false,
    explorerTxUrl: "https://testnet.bscscan.com/tx/",
    unsupportedReason: "unsupported_testnet",
  },
  {
    id: "bitcoin-mainnet",
    key: "bitcoin",
    name: "Bitcoin",
    network: "mainnet",
    chainType: "btc",
    nativeSymbol: "BTC",
    nativeName: "Bitcoin",
    executable: false,
    swapSupported: false,
    bridgeSupported: false,
    rampSupported: true,
    explorerTxUrl: "https://blockstream.info/tx/",
    unsupportedReason: "local_signing_unavailable",
  },
  {
    id: "solana-mainnet",
    key: "solana",
    name: "Solana",
    network: "mainnet",
    chainType: "solana",
    nativeSymbol: "SOL",
    nativeName: "Solana",
    executable: false,
    swapSupported: false,
    bridgeSupported: false,
    rampSupported: true,
    explorerTxUrl: "https://solscan.io/tx/",
    unsupportedReason: "local_signing_unavailable",
  },
];

export const ZEROX_SUPPORTED_CHAIN_IDS = [1, 56] as const;
export const LIFI_EXECUTABLE_CHAIN_IDS = [1, 56] as const;

export function getSupportedEcosystemChains() {
  return ECOSYSTEM_CHAINS;
}

export function ecosystemChainById(chainId: number): EcosystemChain | undefined {
  return ECOSYSTEM_CHAINS.find((chain) => chain.chainId === chainId);
}

export function chainKeyFromId(chainId: number): EcosystemChainKey | null {
  return ecosystemChainById(chainId)?.key ?? null;
}

export function chainIdFromKey(key: EcosystemChainKey): number | null {
  if (key === "ethereum") return 1;
  if (key === "bsc") return 56;
  return null;
}

export function isZeroXSupportedChain(chainId: number): boolean {
  return ZEROX_SUPPORTED_CHAIN_IDS.includes(chainId as 1 | 56);
}

export function isLifiExecutableChain(chainId: number): boolean {
  return LIFI_EXECUTABLE_CHAIN_IDS.includes(chainId as 1 | 56);
}

export function isNativeTokenAddress(address: string): boolean {
  const lower = address.toLowerCase();
  return lower === ZEROX_NATIVE_TOKEN.toLowerCase() || lower === LIFI_NATIVE_TOKEN.toLowerCase();
}

export function toZeroXTokenAddress(token: EcosystemToken): string {
  return token.isNative ? ZEROX_NATIVE_TOKEN : token.address;
}

export function toLifiTokenAddress(token: EcosystemToken): string {
  return token.isNative ? LIFI_NATIVE_TOKEN : token.address;
}

export function defaultTokensForChain(chainId: number): EcosystemToken[] {
  if (chainId === 1) {
    return [
      nativeToken("ethereum", 1, "ETH", "Ether"),
      ...verifiedDefaults("ethereum", 1, ["WETH", "USDC", "USDT", "DAI"]),
    ];
  }
  if (chainId === 56) {
    return [
      nativeToken("bsc", 56, "BNB", "BNB"),
      ...verifiedDefaults("bsc", 56, ["USDT", "USDC", "BUSD", "WBNB"]),
    ];
  }
  return [];
}

function verifiedDefaults(chainKey: "ethereum" | "bsc", chainId: number, symbols: string[]): EcosystemToken[] {
  return symbols.flatMap((symbol) => {
    const token = VERIFIED_EVM_TOKENS.find((candidate) => candidate.network === chainKey && candidate.symbol === symbol);
    return token ? [evmToken(chainKey, chainId, token.contract, token.symbol, token.name, token.decimals)] : [];
  });
}

function nativeToken(chainKey: EcosystemChainKey, chainId: number, symbol: string, name: string): EcosystemToken {
  return {
    id: `${chainKey}:native`,
    chainKey,
    chainId,
    address: ZEROX_NATIVE_TOKEN,
    symbol,
    name,
    decimals: 18,
    isNative: true,
    source: "default",
  };
}

function evmToken(
  chainKey: EcosystemChainKey,
  chainId: number,
  address: `0x${string}`,
  symbol: string,
  name: string,
  decimals: number,
): EcosystemToken {
  return {
    id: `${chainKey}:${address.toLowerCase()}`,
    chainKey,
    chainId,
    address,
    symbol,
    name,
    decimals,
    isNative: false,
    source: "default",
  };
}
