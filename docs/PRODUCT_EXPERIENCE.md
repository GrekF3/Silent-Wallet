# Product Experience

Silent Wallet is a calm self-custodial wallet for real people and serious holders.

## Principles

- Free wallet usage must feel excellent.
- Core security is never premium-gated.
- Seed phrases, private keys, and recovery material stay on the device.
- No ads, hidden tracking, fake metrics, or aggressive crypto growth mechanics.
- Copy should stay short, human, and practical.

## UX Areas

- **Home:** portfolio value, active account context, network state, quick actions, assets, recent activity, and empty states.
- **Accounts:** purpose-based HD accounts derived locally from the same mnemonic. Index `0` remains the default account and preserves existing addresses.
- **Address slots:** additional per-network addresses are derived locally. The app stores address indexes and labels only.
- **Onboarding:** asks the user's crypto experience and stores Beginner Mode locally.
- **Beginner Mode:** adds simple explanations for gas, receiving, sending, provider disabled states, and seed phrase handling.
- **Academy:** short practical articles, searchable and local. It is reachable from Web3 and Settings instead of being a main navigation pillar.
- **Address Book:** local trusted contacts and notes. It never stores private wallet material.
- **Privacy Panel:** screen privacy controls and address hygiene reminders. It does not make blockchain activity anonymous.

## Safety Behavior

Silent Wallet no longer has a standalone Safety Center. Practical safety stays where it matters:

- Seed phrase warnings during create/import/export flows
- Transaction review warnings before sending
- Trusted recipient checks from the local address book
- Watch-only signing warnings
- Sensitive-data guards on API routes
