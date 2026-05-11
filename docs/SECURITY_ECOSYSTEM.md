# Web3 Security

Silent Wallet remains self-custodial in Web3 flows.

## Hard Rules

- Server routes must never accept seed phrases, private keys, mnemonics, recovery phrases, or secret recovery phrases.
- API guards reject request bodies containing sensitive keys such as `mnemonic`, `privateKey`, `seed`, `secret`, `recoveryPhrase`, or `secretRecoveryPhrase`.
- Provider secrets are server-only and are never returned by `/api/ecosystem/config`.
- Users sign approvals, swaps, and bridge transactions locally.
- Silent Wallet does not custody funds.
- Fees are disclosed before execution.

## Quote Safety

Quotes are not guarantees. Provider prices, gas estimates, route availability, and bridge timings can change before the user signs. The confirmation screen should be treated as a final review, not a guaranteed settlement statement.

## Provider Boundaries

MoonPay and Transak are third-party providers. They handle KYC, payment methods, compliance checks, and order status. Silent Wallet only passes public wallet addresses and selected quote/widget parameters.

0x and LI.FI routes receive public addresses, chain IDs, token addresses, amount parameters, slippage/quote parameters, and fee configuration. They do not receive private keys.

## Unsupported Execution

BTC and Solana swap/bridge execution is disabled until local transaction construction, signing, and broadcast are implemented for those flows. Silent Wallet must not route those assets through an EVM signing path.
