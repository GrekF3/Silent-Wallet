"use client";

import { GlassInput } from "@/components/ui/GlassInput";
import { formatCrypto } from "@/lib/utils";
import type { EcosystemToken } from "@/lib/ecosystem/types";
import { EcosystemTokenPicker } from "./EcosystemTokenPicker";

export function TokenAmountInput({
  amount,
  onAmountChange,
  selected,
  tokens,
  onTokenChange,
  tokenLabel,
  amountLabel,
  disabled,
}: {
  amount: string;
  onAmountChange: (value: string) => void;
  selected: EcosystemToken;
  tokens: EcosystemToken[];
  onTokenChange: (token: EcosystemToken) => void;
  tokenLabel: string;
  amountLabel: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
      <EcosystemTokenPicker label={tokenLabel} selected={selected} tokens={tokens} onSelect={onTokenChange} disabled={disabled} />
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <GlassInput
          label={amountLabel}
          type="number"
          min="0"
          placeholder="0.00"
          suffix={selected.symbol}
          value={amount}
          disabled={disabled}
          onChange={(e) => onAmountChange(e.target.value)}
          style={{ height: 56, borderRadius: 16 }}
        />
        {selected.balance !== undefined && (
          <button
            type="button"
            onClick={() => onAmountChange(String(selected.balance ?? 0))}
            disabled={disabled}
            style={{ alignSelf: "flex-end", border: 0, background: "none", color: "rgba(255,255,255,0.34)", font: "inherit", fontSize: 11, cursor: disabled ? "not-allowed" : "pointer" }}
          >
            Max {formatCrypto(selected.balance, 5)}
          </button>
        )}
      </div>
    </div>
  );
}
