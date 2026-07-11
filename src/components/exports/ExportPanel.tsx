"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import { useAddressBook } from "@/lib/addressBook/storage";
import { useWalletAccounts } from "@/lib/accounts/storage";
import { accountsToCsv, addressBookToCsv, downloadCsv, portfolioToCsv, transactionsToCsv } from "@/lib/exports/csv";
import { usePremium } from "@/lib/premium/entitlements";
import { useWalletStore } from "@/lib/store";
import { LockedFeature } from "@/components/premium/LockedFeature";
import { visibleHistoryTransactions } from "@/lib/tokenVerification";

export function ExportPanel() {
  const premium = usePremium();
  const contacts = useAddressBook();
  const accounts = useWalletAccounts();
  const { transactions, assets, verifiedHistoryOnly } = useWalletStore();
  const visibleTransactions = visibleHistoryTransactions(transactions, verifiedHistoryOnly);

  if (!premium.hasEntitlement("pro.exports.csv")) {
    return <LockedFeature entitlement="pro.exports.csv" title="CSV export" description="Export address book, visible history, and portfolio snapshots without private keys." />;
  }

  return (
    <GlassCard elevated style={{ padding: 18, borderRadius: 22 }}>
      <div style={{ fontSize: 16, fontWeight: 650, color: "#fff", marginBottom: 4 }}>CSV export</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", marginBottom: 14 }}>Exports never include seed phrases or private keys.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        <GlassButton variant="default" size="md" onClick={() => downloadCsv("silent-accounts.csv", accountsToCsv(accounts))}>
          <Icons.download size={13} /> Accounts
        </GlassButton>
        <GlassButton variant="default" size="md" onClick={() => downloadCsv("silent-address-book.csv", addressBookToCsv(contacts))}>
          <Icons.download size={13} /> Address book
        </GlassButton>
        <GlassButton variant="default" size="md" onClick={() => downloadCsv("silent-transactions.csv", transactionsToCsv(visibleTransactions))}>
          <Icons.download size={13} /> History
        </GlassButton>
        <GlassButton variant="default" size="md" onClick={() => downloadCsv("silent-portfolio.csv", portfolioToCsv(assets))}>
          <Icons.download size={13} /> Portfolio
        </GlassButton>
      </div>
    </GlassCard>
  );
}
