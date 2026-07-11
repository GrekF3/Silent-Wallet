"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EmptyState } from "@/components/common/EmptyState";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassInput } from "@/components/ui/GlassInput";
import { Icons } from "@/components/ui/Icon";
import { deleteAddressBookContact, useAddressBook } from "@/lib/addressBook/storage";
import type { AddressBookContact } from "@/lib/addressBook/types";
import { shortenAddress } from "@/lib/utils";
import { AddressBookModal } from "./AddressBookModal";
import { useI18n } from "@/lib/i18n";

export function AddressBookView() {
  const { t } = useI18n();
  const contacts = useAddressBook();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AddressBookContact | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return contacts.filter((contact) => !q || `${contact.name} ${contact.address} ${contact.network} ${contact.notes}`.toLowerCase().includes(q));
  }, [contacts, query]);

  const openNew = () => { setEditing(undefined); setModalOpen(true); };
  const openEdit = (contact: AddressBookContact) => { setEditing(contact); setModalOpen(true); };

  return (
    <motion.div className="view-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      style={{ padding: "32px 28px", maxWidth: 720, display: "flex", flexDirection: "column", gap: 22 }}>
      <AnimatePresence>
        {modalOpen && <AddressBookModal contact={editing} onClose={() => setModalOpen(false)} />}
      </AnimatePresence>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <span className="label">{t("Address Book")}</span>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 300, color: "#fff", letterSpacing: 0 }}>{t("Trusted recipients, saved locally.")}</div>
        </div>
        <GlassButton variant="primary" size="md" onClick={openNew}><Icons.plus size={13} color="#000" /> {t("Add")}</GlassButton>
      </div>
      <GlassInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search contacts")} />
      {filtered.length === 0 ? (
        <EmptyState icon="wallet" title={t("No contacts yet.")} body={t("Save trusted recipients before sending larger amounts.")} action={{ label: t("Add contact"), onClick: openNew, icon: "plus" }} />
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {filtered.map((contact) => (
            <GlassCard key={contact.id} hover style={{ padding: 16, borderRadius: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: contact.trusted ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)", flexShrink: 0 }}>
                  {contact.trusted ? <Icons.shield size={16} color="rgba(255,255,255,0.68)" /> : <Icons.wallet size={16} color="rgba(255,255,255,0.36)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 650, color: "#fff" }}>{contact.name}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.34)", textTransform: "uppercase" }}>{contact.network}</span>
                  </div>
                  <div style={{ marginTop: 3, fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.32)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortenAddress(contact.address, 8)}</div>
                  {contact.notes && <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.28)" }}>{contact.notes}</div>}
                </div>
                <GlassButton variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(contact.address)}>{t("Copy")}</GlassButton>
                <GlassButton variant="ghost" size="sm" onClick={() => openEdit(contact)}>{t("Edit")}</GlassButton>
                <GlassButton variant="ghost" size="sm" onClick={() => deleteAddressBookContact(contact.id)}>{t("Delete")}</GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
