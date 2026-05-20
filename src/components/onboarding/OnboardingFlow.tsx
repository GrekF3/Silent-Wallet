"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { GlassButton } from "@/components/ui/GlassButton";
import { Icons } from "@/components/ui/Icon";
import { completeOnboarding, skipOnboarding, type CryptoExperience } from "@/lib/userExperience/mode";
import { BeginnerModeStep } from "./BeginnerModeStep";
import { SelfCustodyStep } from "./SelfCustodyStep";
import { SafetyStep } from "./SafetyStep";
import { FinishStep } from "./FinishStep";

export function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<CryptoExperience>("new");
  const steps = [
    <BeginnerModeStep key="beginner" value={experience} onChange={setExperience} />,
    <SelfCustodyStep key="self" />,
    <SafetyStep key="safety" />,
    <FinishStep key="finish" />,
  ];

  const finish = () => {
    completeOnboarding(experience, experience !== "experienced");
    onDone();
  };

  const skip = () => {
    skipOnboarding();
    onDone();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#080808" }}>
      <div aria-hidden style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.013) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", maxWidth: 470, position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <BrandLogo size={54} label="Silent Wallet" orientation="column" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.18 }}>
            {steps[step]}
          </motion.div>
        </AnimatePresence>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button type="button" onClick={skip} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.32)", font: "inherit", fontSize: 13, cursor: "pointer" }}>
            Skip intro
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step > 0 && <GlassButton variant="ghost" size="md" onClick={() => setStep((value) => value - 1)}>Back</GlassButton>}
            <GlassButton variant="primary" size="md" onClick={() => step === steps.length - 1 ? finish() : setStep((value) => value + 1)}>
              {step === steps.length - 1 ? "Start" : "Continue"} <Icons.chevronR size={13} color="#000" />
            </GlassButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
