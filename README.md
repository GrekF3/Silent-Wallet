# Silent Wallet

A premium self-custodial crypto wallet with iOS Glass / macOS design aesthetic.

## Features

- **Multi-chain** — ETH, BTC, BNB, SOL
- **ERC-20 / BEP-20 / SPL tokens** — auto-discovered, real prices via CoinGecko
- **Transaction history** — powered by Ankr Advanced API (real on-chain data)
- **Send & Receive** — native assets + ERC-20/BEP-20 tokens with QR codes
- **Session security** — AES-GCM + PBKDF2 (200k iterations), 10-min auto-lock
- **Testnet support** — Sepolia, BSC Testnet with faucet links
- **Instant load** — stale-while-revalidate cache, background refresh

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 + Framer Motion
- viem v2 — EVM transactions
- @scure/bip39, @scure/bip32, @scure/btc-signer — BTC derivation
- tweetnacl + @noble/hashes — Solana SLIP-0010 derivation
- Docker Compose

## Run

```bash
docker compose -f docker-compose.dev.yml up --build
```

Open [http://localhost:3000](http://localhost:3000).

## Security

Private keys are derived client-side from a BIP39 mnemonic. The mnemonic is encrypted with AES-GCM and stored in `localStorage`. The decrypted mnemonic lives only in `sessionStorage` and clears after 10 min of inactivity.

**Never share your secret recovery phrase.**
