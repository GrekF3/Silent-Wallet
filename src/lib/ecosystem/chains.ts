import type { EcosystemChain, EcosystemChainKey, EcosystemToken } from "./types";

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
      evmToken("ethereum", 1, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "WETH", "Wrapped Ether", 18),
      evmToken("ethereum", 1, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "USDC", "USD Coin", 6),
      evmToken("ethereum", 1, "0xdAC17F958D2ee523a2206206994597C13D831ec7", "USDT", "Tether USD", 6),
      evmToken("ethereum", 1, "0x6B175474E89094C44Da98b954EedeAC495271d0F", "DAI", "Dai Stablecoin", 18),
    ];
  }
  if (chainId === 56) {
    return [
      nativeToken("bsc", 56, "BNB", "BNB"),
      evmToken("bsc", 56, "0x55d398326f99059fF775485246999027B3197955", "USDT", "Tether USD", 18),
      evmToken("bsc", 56, "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", "USDC", "USD Coin", 18),
      evmToken("bsc", 56, "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", "BUSD", "Binance USD", 18),
      evmToken("bsc", 56, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "WBNB", "Wrapped BNB", 18),
    ];
  }
  return [];
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
