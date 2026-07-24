import type { ChainTx } from "./chains";

export type EvmTokenNetwork = "ethereum" | "bsc";
export type VerifiedTokenNetwork = EvmTokenNetwork | "tron";
export type TransactionVerification = "native" | "verified" | "unverified";

export type VerifiedToken = {
  network: VerifiedTokenNetwork;
  contract: string;
  symbol: string;
  name: string;
  decimals: number;
  cgId?: string;
  usdPeg?: boolean;
};

export type VerifiedEvmToken = VerifiedToken & {
  network: EvmTokenNetwork;
  contract: `0x${string}`;
};

// Contract addresses are the identity. Symbols and names are display metadata only.
export const TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export const VERIFIED_EVM_TOKENS: readonly VerifiedEvmToken[] = [
  { network: "ethereum", contract: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, cgId: "weth" },
  { network: "ethereum", contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, cgId: "usd-coin", usdPeg: true },
  { network: "ethereum", contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, cgId: "tether", usdPeg: true },
  { network: "ethereum", contract: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, cgId: "dai", usdPeg: true },

  { network: "bsc", contract: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18, cgId: "tether", usdPeg: true },
  { network: "bsc", contract: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, cgId: "usd-coin", usdPeg: true },
  { network: "bsc", contract: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", symbol: "BUSD", name: "Binance USD", decimals: 18, cgId: "binance-usd", usdPeg: true },
  { network: "bsc", contract: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, cgId: "dai", usdPeg: true },
  { network: "bsc", contract: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE", name: "PancakeSwap", decimals: 18, cgId: "pancakeswap-token" },
  { network: "bsc", contract: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH", name: "Ethereum (BEP-20)", decimals: 18, cgId: "ethereum" },
  { network: "bsc", contract: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", symbol: "BTCB", name: "Bitcoin BEP-20", decimals: 18, cgId: "bitcoin" },
  { network: "bsc", contract: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", symbol: "ADA", name: "Cardano (BEP-20)", decimals: 18, cgId: "cardano" },
  { network: "bsc", contract: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402", symbol: "DOT", name: "Polkadot (BEP-20)", decimals: 18, cgId: "polkadot" },
  { network: "bsc", contract: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", symbol: "LINK", name: "ChainLink (BEP-20)", decimals: 18, cgId: "chainlink" },
  { network: "bsc", contract: "0xCC42724C6683B7E57334c4E856f4c9965ED682bD", symbol: "MATIC", name: "Polygon (BEP-20)", decimals: 18, cgId: "matic-network" },
  { network: "bsc", contract: "0x1CE0c2827e2ef14D5C4f29a091d735A204794041", symbol: "AVAX", name: "Avalanche (BEP-20)", decimals: 18, cgId: "avalanche-2" },
  { network: "bsc", contract: "0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", symbol: "SOL", name: "Solana (BEP-20)", decimals: 18, cgId: "solana" },
  { network: "bsc", contract: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", symbol: "XRP", name: "XRP (BEP-20)", decimals: 18, cgId: "ripple" },
  { network: "bsc", contract: "0xCE7de646e7208a4Ef112cb6ed5038FA6cC6b12e3", symbol: "TRX", name: "TRON (BEP-20)", decimals: 6, cgId: "tron" },
  { network: "bsc", contract: "0x2859e4544C4bB03966803b044A93563Bd2D0DD4D", symbol: "SHIB", name: "Shiba Inu (BEP-20)", decimals: 18, cgId: "shiba-inu" },
  { network: "bsc", contract: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1", symbol: "UNI", name: "Uniswap (BEP-20)", decimals: 18, cgId: "uniswap" },
  { network: "bsc", contract: "0x85EAC5Ac2F758618Dfa09bDbe0cf174e7d574D5B", symbol: "TWT", name: "Trust Wallet Token", decimals: 18, cgId: "trust-wallet-token" },
  { network: "bsc", contract: "0xfb6115445Bff7b52FeB98650C87f44907E58f802", symbol: "AAVE", name: "Aave (BEP-20)", decimals: 18, cgId: "aave" },
  { network: "bsc", contract: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", decimals: 18, cgId: "wbnb" },
] as const;

export const VERIFIED_TOKENS: readonly VerifiedToken[] = [
  ...VERIFIED_EVM_TOKENS,
  { network: "tron", contract: TRON_USDT_CONTRACT, symbol: "USDT", name: "Tether USD (TRC-20)", decimals: 6, cgId: "tether", usdPeg: true },
] as const;

const TOKEN_BY_NETWORK_AND_CONTRACT = new Map(
  VERIFIED_TOKENS.map((token) => [`${token.network}:${token.contract.toLowerCase()}`, token] as const),
);

export function verifiedEvmToken(network: string | undefined, contract: string | undefined): VerifiedEvmToken | undefined {
  if ((network !== "ethereum" && network !== "bsc") || !contract) return undefined;
  return TOKEN_BY_NETWORK_AND_CONTRACT.get(`${network}:${contract.toLowerCase()}`) as VerifiedEvmToken | undefined;
}

export function verifiedToken(network: string | undefined, contract: string | undefined): VerifiedToken | undefined {
  if ((network !== "ethereum" && network !== "bsc" && network !== "tron") || !contract) return undefined;
  return TOKEN_BY_NETWORK_AND_CONTRACT.get(`${network}:${contract.toLowerCase()}`);
}

export function verifiedTokenAmountUSD(network: string | undefined, contract: string | undefined, amount: number): number {
  return verifiedToken(network, contract)?.usdPeg ? Math.abs(amount) : 0;
}

export function transactionVerification(tx: Pick<ChainTx, "isToken" | "network" | "tokenContract">): TransactionVerification {
  if (!tx.isToken) return "native";
  return verifiedToken(tx.network, tx.tokenContract) ? "verified" : "unverified";
}

export function withTransactionVerification<T extends ChainTx>(tx: T): T {
  return { ...tx, verification: transactionVerification(tx) };
}

export function isHiddenUnverifiedIncoming(tx: ChainTx, verifiedHistoryOnly: boolean): boolean {
  return verifiedHistoryOnly && tx.type === "receive" && transactionVerification(tx) === "unverified";
}

export function visibleHistoryTransactions(transactions: ChainTx[], verifiedHistoryOnly: boolean): ChainTx[] {
  return transactions.filter((tx) => !isHiddenUnverifiedIncoming(tx, verifiedHistoryOnly));
}
