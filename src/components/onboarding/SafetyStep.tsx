"use client";

import { Icons } from "@/components/ui/Icon";
import { OnboardingStep } from "./OnboardingStep";

export function SafetyStep() {
  return (
    <OnboardingStep
      label="Safety"
      title="Small habits protect large assets."
      body="Crypto transfers are usually final. Silent Wallet will help you slow down before risky actions, but you stay in control."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          "Write your seed phrase offline.",
          "Never paste it into websites or chats.",
          "Test a small transfer first when an address is new.",
        ].map((text) => (
          <div key={text} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)", fontSize: 13 }}>
            <Icons.shield size={14} color="rgba(255,255,255,0.46)" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </OnboardingStep>
  );
}
