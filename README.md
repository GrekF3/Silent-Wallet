# Silent Wallet

Open-source self-custodial crypto wallet for ETH, BTC, BNB Chain, and Solana.

## Status

Beta. The wallet already supports create/import, Observer watch-only mode, privacy balance hiding, balances, prices, token discovery, transaction history, receive, send, testnets, lock/reset, and local encryption.

## Architecture

- **Wallet app:** Next.js + React + TypeScript.
- **Desktop shell:** Tauri 2 for macOS and Windows.
- **Mobile shell:** Capacitor for iOS and Android.
- **Data proxy:** Next.js route handlers under `src/app/api/*`.

Seed phrases and private keys stay on the device. The data proxy only receives public addresses, chain/network parameters, and price/history queries.

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

Tagged releases (`v*.*.*`) run GitHub Actions to build desktop artifacts and an Android beta artifact. Desktop auto-update uses Tauri's updater manifest from GitHub Releases. Replace `REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY` in `src-tauri/tauri.conf.json` before publishing signed releases.

## Security

Never share your secret recovery phrase. See `SECURITY.md` for reporting and scope.

## License

MIT
