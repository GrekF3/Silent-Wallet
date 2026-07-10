"use client";

import { findAddressBookContact } from "@/lib/addressBook/storage";
import type { AddressBookNetwork } from "@/lib/addressBook/types";
import { shortenAddress } from "@/lib/utils";

export function AddressLabel({ address, network }: { address: string; network?: AddressBookNetwork }) {
  const contact = findAddressBookContact(address, network);
  return (
    <span title={address} style={{ fontFamily: contact ? "inherit" : "monospace" }}>
      {contact ? contact.name : shortenAddress(address, 5)}
    </span>
  );
}
