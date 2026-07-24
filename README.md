# Silent Wallet - **Open Source Crypto Wallet**

Open-source self-custodial crypto wallet for ETH, BTC, BNB Chain, Solana, and TRON/TRC-20.

Silent Wallet is built to feel calm and useful for real people. The free wallet stays strong: create, import, watch, send, receive, default account, basic portfolio, basic history, Academy, address book, privacy mode, and beginner guidance are not premium features.

## Status

Beta. The wallet supports create/import, Observer watch-only mode, beginner onboarding, Academy, local HD accounts, local address book, privacy controls, balances, prices, token discovery, transaction history, receive, send, testnets, lock/reset, and local encryption.

## Architecture

- **Wallet app:** Next.js + React + TypeScript.
- **Desktop shell:** Tauri 2 for macOS and Windows.
- **Mobile shell:** Capacitor for iOS and Android.
- **Data proxy:** Next.js route handlers under `src/app/api/*`.
- **Web3 proxy:** Provider route handlers under `src/app/api/ecosystem/*`.

Seed phrases and private keys stay on the device. The data proxy only receives public addresses, chain/network parameters, and price/history queries.

## Product Experience

- **Home:** calm command center with active account context, portfolio value, network state, quick actions, assets, recent activity, and clear empty states.
- **Accounts:** local HD account manager for purpose-based accounts such as Main, Treasury, Long Term, Operations, and Watch. Metadata only is stored locally.
- **Address slots:** Silent Pro can derive additional per-network addresses inside an account. The app stores only labels and address indexes, never private keys.
- **Beginner Mode:** optional local preference that adds simpler explanations and stronger transaction prompts.
- **Academy:** short practical articles about wallets, seed phrases, gas, addresses, swaps, bridges, and scams.
- **Address Book:** local contacts, labels, notes, trusted markers, and send-flow warnings.
- **Privacy Panel:** hides balances, addresses, and activity values on screen. Account separation helps reduce accidental linkage, but it does not make blockchain transactions anonymous.

## Silent Pro

Silent Pro unlocks advanced custody operations: multiple HD accounts, account separation, privacy profiles, trusted transfer workflows, watch dashboards, CSV exports, transaction templates, and reporting placeholders.

Core wallet usage and core security features stay free. The current license system is a manual MVP without Stripe, Paddle, RevenueCat, Apple IAP, Google Play Billing, or any payment processor.

Environment:

```bash
NEXT_PUBLIC_PREMIUM_ENABLED=true
NEXT_PUBLIC_PREMIUM_PURCHASE_URL=https://swallet.site/
NEXT_PUBLIC_DEV_PREMIUM=false
PREMIUM_LICENSE_HASHES=
PREMIUM_LICENSE_SALT=
NEXT_PUBLIC_DEFAULT_BEGINNER_MODE=true
```

Create a manual license hash:

```bash
node scripts/hash-license.mjs "SW-PRO-XXXX-XXXX" "your-salt"
```

Put the printed hash in `PREMIUM_LICENSE_HASHES` and the salt in `PREMIUM_LICENSE_SALT`.

## Web3

Silent Wallet includes an optional Web3 view for transparent commission-based:

- **Buy/Sell:** MoonPay and Transak third-party widget flows.
- **Swap:** 0x Swap API v2 same-chain EVM swaps.
- **Bridge:** LI.FI EVM-to-EVM route/quote flows.

The wallet stays self-custodial. Provider routes may receive public addresses, chain IDs, token addresses, amounts, quote parameters, and provider configuration requests only. Private keys and seed phrases never leave the device.

### Fees

Swap and bridge monetization is disclosed before confirmation. The default Silent Wallet swap fee is `30` bps (`0.30%`), capped at `100` bps unless explicitly configured higher, and never above `1000` bps. LI.FI uses `NEXT_PUBLIC_LIFI_FEE`, defaulting to `0.003`.

Provider fees, LI.FI fees, and Silent Wallet fees are shown separately when provider data is available. If an exact fee amount is unavailable before quote execution, the UI shows the bps and token instead.

### Provider Setup

Add provider credentials to `.env.local`:

```bash
NEXT_PUBLIC_ECOSYSTEM_ENABLED=true
NEXT_PUBLIC_SWAP_FEE_BPS=30
NEXT_PUBLIC_LIFI_FEE=0.003

ZEROX_API_KEY=
ZEROX_API_BASE_URL=https://api.0x.org
ZEROX_VERSION=v2
SILENT_FEE_RECIPIENT_ETH=
SILENT_FEE_RECIPIENT_BSC=

LIFI_API_KEY=
LIFI_INTEGRATOR=silent-wallet

NEXT_PUBLIC_MOONPAY_ENABLED=false
MOONPAY_ENV=sandbox
MOONPAY_API_KEY=
MOONPAY_SECRET_KEY=

NEXT_PUBLIC_TRANSAK_ENABLED=false
TRANSAK_ENV=staging
TRANSAK_API_KEY=
TRANSAK_API_SECRET=
TRANSAK_REFERRER_DOMAIN=
```

MoonPay URL signing happens server-side with `MOONPAY_SECRET_KEY`. Transak widget URLs are created server-side through backend sessions; direct legacy query-param links are not used.

### Watch-Only Behavior

Observer mode can open Buy/Sell provider widgets because those flows use public wallet addresses. Swap and Bridge execution is disabled because observer sessions cannot sign transactions.

### Supported Chains

Executable swaps and bridges currently support Ethereum mainnet and BNB Chain mainnet. BTC and Solana Buy/Sell address handoff is allowed where the provider supports it, but BTC/SOL swap and bridge execution is disabled until local non-EVM signing is implemented. Testnet swap/bridge execution is disabled unless provider support is added.

More details:

- `docs/ECOSYSTEM.md`
- `docs/MONETIZATION.md`
- `docs/SECURITY_ECOSYSTEM.md`
- `docs/PRODUCT_EXPERIENCE.md`
- `docs/SILENT_PRO.md`
- `docs/LICENSE_KEYS.md`

## Storage

- Web development uses encrypted browser storage.
- Android/iOS use Capacitor Secure Storage.
- Desktop uses Tauri Stronghold for the encrypted wallet payload.
- The live unlocked session is intentionally short-lived and cleared on lock/timeout.

## Development

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

Use the dashboard Buy, Sell, Swap, and Bridge buttons to open the Web3 view during local development.

## Builds

```bash
npm run lint
npm run typecheck
npm run build:web
npm run build:app
npm run tauri:build
npm run cap:sync
```

Native app builds should set `NEXT_PUBLIC_DATA_PROXY_URL` to the hosted data proxy URL, for example:

```bash
NEXT_PUBLIC_DATA_PROXY_URL=https://api.silent.example npm run build:app
```

## Releases

Tagged releases (`v*.*.*`) run GitHub Actions to build desktop artifacts and an Android beta artifact. Desktop auto-update uses Tauri's updater manifest from GitHub Releases. Release notes are read from `CHANGELOG.md` and included in `latest.json`, so older app builds can show a changelog before downloading.

The in-app update notice is closeable. On desktop it uses Tauri's signed updater package; outside Tauri it falls back to `NEXT_PUBLIC_UPDATE_DOWNLOAD_URL`.

macOS releases need Apple Developer ID signing and notarization to open without Gatekeeper warnings. Add these GitHub Actions secrets before publishing a public macOS build: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`.

Updating over the same app identifier (`app.silent.wallet`) is intended to preserve wallet data. Avoid uninstall options that remove app data unless the seed phrase is backed up.

## Security

Never share your secret recovery phrase. See `SECURITY.md` for reporting and scope.

## License

MIT
