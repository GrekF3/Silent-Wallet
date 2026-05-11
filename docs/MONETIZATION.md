# Web3 Monetization

Silent Wallet monetization is based on transparent provider, referral, and integrator fees. There are no subscriptions, paid accounts, custodial balances, hidden fees, fake revenue dashboards, or wallet-owned tokens.

## Swap Fees

0x Swap API v2 affiliate fees are configured server-side with:

- `swapFeeRecipient`
- `swapFeeBps`
- `swapFeeToken`

Environment variables:

```bash
ZEROX_API_KEY=
ZEROX_API_BASE_URL=https://api.0x.org
ZEROX_VERSION=v2
NEXT_PUBLIC_SWAP_FEE_BPS=30
SILENT_FEE_RECIPIENT_ETH=
SILENT_FEE_RECIPIENT_BSC=
```

Default swap fee is `30` bps, or `0.30%`. The default maximum is `100` bps. A higher max can be explicitly set with `SWAP_FEE_MAX_BPS`, but the code never allows more than `1000` bps.

## Bridge Fees

LI.FI fees use the integrator and fee parameters:

```bash
LIFI_API_KEY=
LIFI_INTEGRATOR=silent-wallet
NEXT_PUBLIC_LIFI_FEE=0.003
```

`NEXT_PUBLIC_LIFI_FEE=0.003` is a decimal fee value passed to LI.FI. Provider, LI.FI, and Silent Wallet fees are shown separately when provider data is available.

## Buy/Sell Providers

MoonPay:

```bash
NEXT_PUBLIC_MOONPAY_ENABLED=false
MOONPAY_ENV=sandbox
MOONPAY_API_KEY=
MOONPAY_SECRET_KEY=
```

MoonPay URLs are signed server-side whenever wallet addresses are included.

Transak:

```bash
NEXT_PUBLIC_TRANSAK_ENABLED=false
TRANSAK_ENV=staging
TRANSAK_API_KEY=
TRANSAK_API_SECRET=
TRANSAK_REFERRER_DOMAIN=
```

Transak uses backend-created widget sessions. Silent Wallet does not build deprecated direct query-param widget URLs.

## Revenue Events

`/api/ecosystem/revenue/event` accepts a minimal optional event shape. Development logs structured events. Production is a no-op unless `REVENUE_EVENT_LOGGING=true`.

Allowed event fields are provider, action, chain, token symbols, fee bps, estimated fee USD, quote IDs, tx hash, and timestamp.
