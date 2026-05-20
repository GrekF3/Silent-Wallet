# Silent Pro

Silent Wallet is free to use. Silent Pro unlocks advanced custody operations for people managing meaningful assets.

## Free

- Create and import wallets
- Send and receive
- Basic assets and history
- Default HD account
- Academy
- Basic address book
- Privacy mode and Beginner Mode
- Watch-only mode
- Web3 entry points with disabled states if providers are not configured

## Pro

- Multiple HD accounts
- Account separation by purpose
- Address hygiene workflows
- Additional per-network address slots inside accounts
- Advanced privacy profiles
- Trusted contact workflows
- Watch dashboards
- CSV export
- Tax/report export placeholder
- Transaction notes and templates

Silent Pro should be positioned around this promise:

> Separate accounts by purpose. Reduce accidental linkage. Keep high-value transfers deliberate.

Privacy features reduce screen exposure and help separate activity. They do not make public blockchain transactions anonymous.

## License Model

The current license system is a manual MVP. It validates a license key by hashing the normalized key plus `PREMIUM_LICENSE_SALT` and comparing the result with `PREMIUM_LICENSE_HASHES`.

This is not strong commercial protection because the repo is open source and client-side gates can be modified. Serious premium enforcement should live in a private fork or a server-backed entitlement system later.

No payment processor is implemented. The purchase button uses `NEXT_PUBLIC_PREMIUM_PURCHASE_URL` when configured.
