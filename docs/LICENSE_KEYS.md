# Manual License Keys

Silent Pro currently supports a manual license MVP without Stripe, Paddle, RevenueCat, Apple IAP, Google Play Billing, or any payment processor.

## Environment

```bash
NEXT_PUBLIC_PREMIUM_ENABLED=true
NEXT_PUBLIC_PREMIUM_PURCHASE_URL=https://swallet.site/
NEXT_PUBLIC_DEV_PREMIUM=false
PREMIUM_LICENSE_HASHES=
PREMIUM_LICENSE_SALT=
```

## Create a Hash

1. Choose a license key, for example `SW-PRO-XXXX-XXXX`.
2. Choose a private salt.
3. Hash `licenseKey.trim().toUpperCase() + salt` with SHA-256.
4. Put the hash in `PREMIUM_LICENSE_HASHES`.
5. Put the salt in `PREMIUM_LICENSE_SALT`.

Helper:

```bash
node scripts/hash-license.mjs "SW-PRO-XXXX-XXXX" "your-salt"
```

The app never stores plaintext license keys after validation. Successful entitlements are stored locally.

Current Silent Pro entitlements returned by a valid license:

- `pro.accounts.multiple`
- `pro.accounts.addressSeparation`
- `pro.privacy.profiles`
- `pro.watch.dashboards`
- `pro.exports.csv`
- `pro.transactions.templates`
- `pro.contacts.advanced`
- `pro.reports.tax`

## Security Note

This is not strong anti-piracy. Silent Wallet is open source, so client-side premium gates can be changed. Use a private fork or server-backed entitlements for serious commercial enforcement.
