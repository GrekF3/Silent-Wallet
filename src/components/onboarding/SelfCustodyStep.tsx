"use client";

import { Icons } from "@/components/ui/Icon";
import { OnboardingStep } from "./OnboardingStep";

export function SelfCustodyStep() {
  return (
    <OnboardingStep
      label="Self-custody"
      title="Your keys stay with you."
      body="Silent Wallet does not create an account for your seed phrase. If you create or import a wallet, the recovery phrase stays on this device."
    >
      <div style={{ display: "grid", gap: 10 }}>
        {[
          "No server backup of your seed phrase.",
          "No one can reset your wallet for you.",
          "You sign transactions locally.",
        ].map((text) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.54)" }}>
            <Icons.check size={14} color="rgba(255,255,255,0.62)" /> {text}
          </div>
        ))}
      </div>
    </OnboardingStep>
  );
}
