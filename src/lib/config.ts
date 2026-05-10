import type { Network } from "./chains";

const env = (key: string) => process.env[key]?.trim() || "";

const ANKR_API_KEY = env("ANKR_API_KEY");

function ankrRpc(path: string, fallback: string) {
  return ANKR_API_KEY ? `https://rpc.ankr.com/${path}/${ANKR_API_KEY}` : fallback;
}

export const RPC_URLS = {
  ethereum: {
    mainnet: ankrRpc("eth", "https://ethereum.publicnode.com"),
    testnet: ankrRpc("eth_sepolia", "https://ethereum-sepolia.publicnode.com"),
  },
  bsc: {
    mainnet: ankrRpc("bsc", "https://bsc-dataseed1.binance.org"),
    testnet: ankrRpc("bsc_testnet_chapel", "https://bsc-testnet-dataseed.bnbchain.org"),
  },
  solana: {
    mainnet: ankrRpc("solana", "https://api.mainnet-beta.solana.com"),
    testnet: ankrRpc("solana_devnet", "https://api.devnet.solana.com"),
  },
} as const;

export function rpcUrl(chain: "ethereum" | "bsc", network: Network) {
  return RPC_URLS[chain][network];
}

export function solanaRpcUrl(network: Network = "mainnet") {
  return RPC_URLS.solana[network];
}

export function ankrUrl() {
  return ANKR_API_KEY ? `https://rpc.ankr.com/multichain/${ANKR_API_KEY}` : "";
}

export function coinGeckoHeaders(): HeadersInit {
  const key = env("COINGECKO_API_KEY");
  return key ? { "x-cg-demo-api-key": key } : {};
}
