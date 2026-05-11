import type { Network } from "@/lib/chains";

export type EcosystemProvider = RampProvider | SwapProvider | BridgeProvider;
export type RampProvider = "moonpay" | "transak";
export type SwapProvider = "0x";
export type BridgeProvider = "lifi";

export type EcosystemChainKey = "ethereum" | "bsc" | "bitcoin" | "solana";
export type EcosystemChainType = "evm" | "btc" | "solana";

export type UnsupportedReason =
  | "provider_not_configured"
  | "unsupported_chain"
  | "unsupported_token"
  | "unsupported_testnet"
  | "local_signing_unavailable"
  | "watch_only"
  | "missing_fee_recipient"
  | "missing_wallet";

export type EcosystemChain = {
  id: string;
  key: EcosystemChainKey;
  chainId?: number;
  name: string;
  network: Network;
  chainType: EcosystemChainType;
  nativeSymbol: string;
  nativeName: string;
  executable: boolean;
  swapSupported: boolean;
  bridgeSupported: boolean;
  rampSupported: boolean;
  explorerTxUrl?: string;
  unsupportedReason?: UnsupportedReason;
};

export type EcosystemToken = {
  id: string;
  chainKey: EcosystemChainKey;
  chainId?: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isNative: boolean;
  balance?: number;
  priceUSD?: number;
  source?: "wallet" | "default" | "provider";
  unsupportedReason?: UnsupportedReason;
};

export type ProviderFee = {
  label: string;
  provider?: EcosystemProvider;
  type?: string;
  amount?: string;
  amountRaw?: string;
  token?: string;
  tokenAddress?: string;
  decimals?: number;
  usd?: number;
  bps?: number;
};

export type FeeBreakdown = {
  silentFee?: ProviderFee;
  providerFees: ProviderFee[];
  integratorFee?: ProviderFee;
  lifiFee?: ProviderFee;
  networkFee?: ProviderFee;
  notes: string[];
  totalUsd?: number;
};

export type SilentFeeConfig = {
  enabled: boolean;
  bps: number;
  maxBps: number;
  recipient?: string;
  token?: string;
};

export type ExecutionWarning = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
};

export type EvmTransactionRequest = {
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: string;
  gas?: string;
  gasPrice?: string;
};

export type SwapQuoteRequest = {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  taker: string;
  slippageBps?: number;
  feeBps?: number;
  swapFeeToken?: string;
  sellTokenSymbol?: string;
  buyTokenSymbol?: string;
  sellTokenDecimals?: number;
  buyTokenDecimals?: number;
};

export type SwapQuoteResponse = {
  provider: SwapProvider;
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount?: string;
  price?: string;
  guaranteedPrice?: string;
  allowanceTarget?: `0x${string}`;
  transaction?: EvmTransactionRequest;
  fees: FeeBreakdown;
  warnings: ExecutionWarning[];
  issues?: unknown;
  quoteId?: string;
  raw?: unknown;
};

export type BridgeRouteRequest = {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
  order?: "CHEAPEST" | "FASTEST";
};

export type BridgeRoute = {
  id: string;
  provider: BridgeProvider;
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  toAmount?: string;
  fromAmountUSD?: string;
  toAmountUSD?: string;
  tool?: string;
  toolDetails?: string;
  estimatedTimeSeconds?: number;
  fees: FeeBreakdown;
  warnings: ExecutionWarning[];
  raw?: unknown;
};

export type BridgeRouteResponse = {
  provider: BridgeProvider;
  routes: BridgeRoute[];
  warnings: ExecutionWarning[];
};

export type BridgeQuoteResponse = {
  provider: BridgeProvider;
  id?: string;
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  toAmount?: string;
  transaction?: EvmTransactionRequest;
  approvalTarget?: `0x${string}`;
  fees: FeeBreakdown;
  warnings: ExecutionWarning[];
  raw?: unknown;
};

export type EcosystemConfigResponse = {
  zeroXEnabled: boolean;
  lifiEnabled: boolean;
  moonPayEnabled: boolean;
  transakEnabled: boolean;
  defaultSwapFeeBps: number;
  lifiFee: number;
  supportedChains: EcosystemChain[];
};

export type RampUrlRequest = {
  provider: RampProvider;
  mode: "buy" | "sell";
  walletAddress: string;
  cryptoCurrencyCode?: string;
  fiatCurrency?: string;
  fiatAmount?: string;
  network?: string;
  redirectURL?: string;
};

export type RevenueEvent = {
  provider: EcosystemProvider;
  action: "quote" | "approve" | "execute" | "complete" | "open_widget";
  chain?: string;
  tokenSymbols?: string[];
  feeBps?: number;
  estimatedFeeUsd?: number;
  quoteId?: string;
  providerQuoteId?: string;
  txHash?: string;
  timestamp?: string;
};
