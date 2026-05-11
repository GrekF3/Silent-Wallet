# Silent Wallet Web3

Silent Wallet includes a minimalist in-wallet Web3 flow for Buy/Sell, Swap, and Bridge while keeping the wallet self-custodial.

## Features

- **Buy/Sell:** MoonPay and Transak widget entry points. The selected public wallet address, asset, fiat currency, and amount are passed to the provider. KYC and payment handling happen with the third-party provider.
- **Swap:** 0x Swap API v2 same-chain EVM swaps on Ethereum mainnet and BNB Chain mainnet.
- **Bridge:** LI.FI EVM-to-EVM route discovery and executable quote support for Ethereum mainnet and BNB Chain mainnet.

## Supported Execution

| Flow | Ethereum | BNB Chain | Bitcoin | Solana | Testnets |
| --- | --- | --- | --- | --- | --- |
| Buy/Sell | Provider widget | Provider widget | Provider widget address only | Provider widget address only | Provider-dependent |
| Swap | 0x local EVM signing | 0x local EVM signing | Disabled | Disabled | Disabled unless provider support is added |
| Bridge | LI.FI local EVM signing | LI.FI local EVM signing | Disabled | Discovery only when safe, execution disabled | Disabled |

BTC and Solana swap/bridge execution is not faked. It remains disabled until local signing and provider execution paths are implemented correctly.

## Fee Transparency

Silent Wallet adds provider/integrator fee parameters server-side and displays the fee breakdown before confirmation. If a provider returns an exact fee amount, the UI displays the human-readable amount. If exact fee amount is not known before signing, the UI shows the configured bps and fee token.

## Watch-Only Mode

Observer mode can request quotes and open buy/sell widgets with public addresses, but it cannot approve, swap, or bridge because it has no local signing key.

## Local Development

```bash
npm ci
npm run dev
```

Configure providers in `.env.local`, then open the wallet and use the dashboard Buy, Sell, Swap, and Bridge actions.
