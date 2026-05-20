"use client";

import { OnboardingStep } from "./OnboardingStep";

export function FinishStep() {
  return (
    <OnboardingStep
      label="Ready"
      title="No noise. Just Web3."
      body="Start by creating, importing, or watching a wallet. You can adjust guidance, privacy, and account settings later."
    />
  );
}
