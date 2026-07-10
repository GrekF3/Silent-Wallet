import type { AddressBookContact } from "@/lib/addressBook/types";
import type { WalletAccount } from "@/lib/accounts/types";
import type { ChainTx } from "@/lib/chains";
import type { AssetInfo } from "@/lib/store";

function esc(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(esc).join(",")).join("\n");
}

export function addressBookToCsv(contacts: AddressBookContact[]) {
  return buildCsv([
    ["name", "address", "network", "trusted", "notes", "created_at"],
    ...contacts.map((contact) => [
      contact.name,
      contact.address,
      contact.network,
      contact.trusted ? "yes" : "no",
      contact.notes,
      new Date(contact.createdAt).toISOString(),
    ]),
  ]);
}

export function accountsToCsv(accounts: WalletAccount[]) {
  return buildCsv([
    ["name", "index", "purpose", "labels", "archived", "created_at"],
    ...accounts.map((account) => [
      account.name,
      account.index,
      account.purpose,
      account.labels.join(";"),
      account.archived ? "yes" : "no",
      account.createdAt ? new Date(account.createdAt).toISOString() : "",
    ]),
  ]);
}

export function transactionsToCsv(transactions: ChainTx[]) {
  return buildCsv([
    ["hash", "type", "asset", "amount", "amount_usd", "from", "to", "network", "status", "date"],
    ...transactions.map((tx) => [
      tx.hash,
      tx.type,
      tx.asset,
      tx.amount,
      tx.amountUSD,
      tx.from,
      tx.to,
      tx.network ?? "",
      tx.status,
      tx.date.toISOString(),
    ]),
  ]);
}

export function portfolioToCsv(assets: AssetInfo[]) {
  return buildCsv([
    ["symbol", "name", "network", "balance", "price_usd", "value_usd"],
    ...assets.map((asset) => [
      asset.symbol,
      asset.name,
      asset.network,
      asset.balance,
      asset.priceUSD,
      asset.balance * asset.priceUSD,
    ]),
  ]);
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}
