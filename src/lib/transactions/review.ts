import type { AddressBookContact } from "@/lib/addressBook/types";
import type { ChainTx } from "@/lib/chains";

export type TransactionReviewWarning = {
  id: string;
  tone: "info" | "warning";
  message: string;
};

export type TransactionReviewInput = {
  amount: number;
  amountText: string;
  assetSymbol: string;
  assetBalance: number;
  recipient: string;
  networkLabel: string;
  estimatedFee?: string;
  amountUSD?: number;
  totalText?: string;
  watchOnly?: boolean;
  addressBookContact?: AddressBookContact;
  transactions: ChainTx[];
};

export function buildTransactionWarnings(input: TransactionReviewInput): TransactionReviewWarning[] {
  const warnings: TransactionReviewWarning[] = [];
  const recipient = input.recipient.toLowerCase();
  const previousSends = input.transactions.some((tx) => tx.type === "send" && tx.to.toLowerCase() === recipient);

  if (input.watchOnly) {
    warnings.push({ id: "watch-only", tone: "warning", message: "Observer mode can view activity, but it cannot sign transactions." });
  }

  if (!input.addressBookContact) {
    warnings.push({
      id: "unsaved-recipient",
      tone: "warning",
      message: `You are sending ${input.amountText} ${input.assetSymbol} to an address that is not saved in your address book.`,
    });
  } else if (!input.addressBookContact.trusted) {
    warnings.push({
      id: "untrusted-contact",
      tone: "info",
      message: `${input.addressBookContact.name} is saved, but not marked as trusted.`,
    });
  }

  if (!previousSends) {
    warnings.push({
      id: "first-send",
      tone: "info",
      message: "This looks like the first time sending to this address. A small test transfer is safer for large amounts.",
    });
  }

  if (input.assetBalance > 0 && input.amount / input.assetBalance >= 0.8) {
    warnings.push({
      id: "large-amount",
      tone: "warning",
      message: "This transfer is a large part of your visible balance.",
    });
  }

  return warnings;
}
