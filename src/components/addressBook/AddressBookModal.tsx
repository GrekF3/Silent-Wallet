"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassInput } from "@/components/ui/GlassInput";
import { Icons } from "@/components/ui/Icon";
import { inferAddressNetwork, upsertAddressBookContact } from "@/lib/addressBook/storage";
import type { AddressBookContact, AddressBookNetwork } from "@/lib/addressBook/types";

const NETWORK_OPTIONS: { id: AddressBookNetwork; label: string }[] = [
  { id: "any", label: "Auto" },
  { id: "ethereum", label: "Ethereum" },
  { id: "bsc", label: "BNB Chain" },
  { id: "bitcoin", label: "Bitcoin" },
  { id: "solana", label: "Solana" },
  { id: "tron", label: "TRON (TRC-20)" },
];

function NetworkDropdown({ value, onChange }: { value: AddressBookNetwork; onChange: (value: AddressBookNetwork) => void }) {
  const [open, setOpen] = useState(false);
  const active = NETWORK_OPTIONS.find((item) => item.id === value) ?? NETWORK_OPTIONS[0];

  return (
    <div style={{ position: "relative" }}>
      <span className="label">Network</span>
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        style={{ width: "100%", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", borderTop: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.052)", color: "#fff", padding: "0 12px", font: "inherit", cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Icons.globe size={14} color="rgba(255,255,255,0.44)" />
          <span style={{ fontSize: 13, fontWeight: 650 }}>{active.label}</span>
        </span>
        <Icons.chevronD size={13} color="rgba(255,255,255,0.34)" />
      </button>
      {open && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 8px)", zIndex: 230, padding: 8, borderRadius: 16, background: "rgba(12,12,12,0.98)", border: "1px solid rgba(255,255,255,0.12)", borderTop: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 18px 48px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.08)", backdropFilter: "blur(38px)" }}>
          {NETWORK_OPTIONS.map((item) => {
            const selected = item.id === value;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { onChange(item.id); setOpen(false); }}
                style={{ width: "100%", height: 38, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", borderRadius: 11, border: "none", background: selected ? "rgba(255,255,255,0.08)" : "transparent", color: selected ? "#fff" : "rgba(255,255,255,0.46)", font: "inherit", fontSize: 13, cursor: "pointer" }}
              >
                {item.label}
                {selected && <Icons.check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AddressBookModal({
  contact,
  onClose,
}: {
  contact?: AddressBookContact;
  onClose: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [address, setAddress] = useState(contact?.address ?? "");
  const [network, setNetwork] = useState<AddressBookNetwork>(contact?.network ?? "any");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [trusted, setTrusted] = useState(contact?.trusted ?? false);
  const [error, setError] = useState("");

  const save = () => {
    try {
      upsertAddressBookContact({ id: contact?.id, name, address, network: network === "any" ? inferAddressNetwork(address) : network, notes, trusted });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save contact.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.70)", backdropFilter: "blur(12px)", overflowY: "auto" }}>
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} onClick={(event) => event.stopPropagation()} style={{ width: "min(500px, 100%)", margin: "auto" }}>
        <GlassCard elevated style={{ padding: 22, borderRadius: 22, overflow: "visible" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 650, color: "#fff" }}>{contact ? "Edit contact" : "Add contact"}</div>
            <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.x size={15} color="rgba(255,255,255,0.52)" />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <GlassInput label="Name" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="Treasury" />
            <GlassInput label="Address" value={address} onChange={(event) => { setAddress(event.target.value); setError(""); }} placeholder="0x..., bc1..., Solana, or T..." />
            <NetworkDropdown value={network} onChange={setNetwork} />
            <GlassInput label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Local note, never private keys" />
            <button type="button" onClick={() => setTrusted((value) => !value)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 13, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.62)", font: "inherit", cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 22, height: 22, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: trusted ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>{trusted && <Icons.check size={12} />}</span>
              Mark as trusted
            </button>
            {error && <div style={{ fontSize: 13, color: "rgba(255,120,120,0.84)" }}>{error}</div>}
            <GlassButton variant="primary" size="lg" onClick={save} disabled={!name.trim() || !address.trim()}>Save contact</GlassButton>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
