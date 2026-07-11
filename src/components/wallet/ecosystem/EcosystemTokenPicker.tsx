"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CryptoIcon } from "@/components/ui/CryptoIcon";
import { Icons } from "@/components/ui/Icon";
import { formatCrypto, formatUSD } from "@/lib/utils";
import type { EcosystemToken } from "@/lib/ecosystem/types";

const CHAIN_LABEL: Record<string, string> = {
  ethereum: "ETH",
  bsc: "BSC",
  bitcoin: "BTC",
  solana: "SOL",
};

type DropdownMetrics = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

export function EcosystemTokenPicker({
  label,
  selected,
  tokens,
  onSelect,
  disabled,
}: {
  label: string;
  selected: EcosystemToken;
  tokens: EcosystemToken[];
  onSelect: (token: EcosystemToken) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownMetrics, setDropdownMetrics] = useState<DropdownMetrics | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tokens.filter((token) => !q || token.symbol.toLowerCase().includes(q) || token.name.toLowerCase().includes(q));
  }, [query, tokens]);

  const updateDropdownPosition = useCallback(() => {
    const anchor = rootRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportGap = 12;
    const gutter = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(rect.width, viewportWidth - viewportGap * 2);
    const left = Math.min(Math.max(rect.left, viewportGap), Math.max(viewportGap, viewportWidth - viewportGap - width));
    const availableBelow = viewportHeight - rect.bottom - viewportGap;
    const availableAbove = rect.top - viewportGap;
    const placeAbove = availableBelow < 260 && availableAbove > availableBelow;
    const availableHeight = Math.max(120, (placeAbove ? availableAbove : availableBelow) - gutter);

    setDropdownMetrics({
      left,
      width,
      maxHeight: Math.min(340, availableHeight),
      ...(placeAbove ? { bottom: viewportHeight - rect.top + gutter } : { top: rect.bottom + gutter }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const dropdown = (
    <AnimatePresence>
      {open && dropdownMetrics && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          style={{
            position: "fixed",
            zIndex: 9998,
            left: dropdownMetrics.left,
            width: dropdownMetrics.width,
            top: dropdownMetrics.top,
            bottom: dropdownMetrics.bottom,
            maxHeight: dropdownMetrics.maxHeight,
            borderRadius: 16,
            overflow: "hidden",
            background: "rgba(12,12,12,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 18px 54px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.10)",
            backdropFilter: "blur(36px)",
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search token"
              autoFocus
              style={{ width: "100%", height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.055)", color: "#fff", font: "inherit", fontSize: 13, padding: "0 12px", outline: "none" }}
            />
          </div>
          <div style={{ maxHeight: Math.max(120, dropdownMetrics.maxHeight - 59), overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: 5 }}>
            {filtered.map((token) => (
              <button
                type="button"
                key={token.id}
                onClick={() => { onSelect(token); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 11px", borderRadius: 12, border: 0, background: token.id === selected.id ? "rgba(255,255,255,0.08)" : "transparent", color: "#fff", fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}
              >
                <CryptoIcon symbol={token.symbol} image={token.logoURI} size={30} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 650 }}>{token.symbol}</span>
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 5, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.42)" }}>{CHAIN_LABEL[token.chainKey]}</span>
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.30)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{token.name}</span>
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", textAlign: "right" }}>
                  {token.balance !== undefined ? formatCrypto(token.balance, 5) : token.priceUSD ? formatUSD(token.priceUSD) : ""}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.30)" }}>No tokens found</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <span className="label" style={{ paddingLeft: 2, marginBottom: 8 }}>{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        style={{
          width: "100%",
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          borderTop: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.055)",
          color: "#fff",
          padding: "10px 13px",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.48 : 1,
          fontFamily: "inherit",
        }}
      >
        <CryptoIcon symbol={selected.symbol} image={selected.logoURI} size={34} />
        <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{selected.symbol}</span>
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: "rgba(255,255,255,0.065)", color: "rgba(255,255,255,0.44)" }}>{CHAIN_LABEL[selected.chainKey]}</span>
          </span>
          <span style={{ display: "block", marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.30)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected.balance !== undefined ? `${formatCrypto(selected.balance, 5)} available` : selected.name}
          </span>
        </span>
        <Icons.chevronD size={14} color="rgba(255,255,255,0.34)" />
      </button>

      {typeof document !== "undefined" ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
