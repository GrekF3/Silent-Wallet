"use client";

import { useState } from "react";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { usePremium } from "@/lib/premium/entitlements";
import { setTransactionNote, useTransactionNotes } from "@/lib/transactionNotes/storage";
import { LockedFeature } from "@/components/premium/LockedFeature";

export function TransactionNotes({ hash }: { hash: string }) {
  const premium = usePremium();
  const notes = useTransactionNotes();
  const [draft, setDraft] = useState(notes[hash] ?? "");

  if (!premium.hasEntitlement("pro.transactions.templates")) {
    return <LockedFeature entitlement="pro.transactions.templates" title="Transaction notes" description="Attach local notes to transaction hashes." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
      <GlassInput label="Transaction note" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Local note" />
      <GlassButton variant="default" size="sm" onClick={() => setTransactionNote(hash, draft)} style={{ alignSelf: "flex-end" }}>Save note</GlassButton>
    </div>
  );
}
