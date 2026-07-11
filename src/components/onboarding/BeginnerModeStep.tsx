"use client";

import { GlassButton } from "@/components/ui/GlassButton";
import { Icons } from "@/components/ui/Icon";
import type { CryptoExperience } from "@/lib/userExperience/mode";
import { OnboardingStep } from "./OnboardingStep";
import { useI18n } from "@/lib/i18n";

const OPTIONS: { value: CryptoExperience; title: string; body: string }[] = [
  { value: "new", title: "I'm new", body: "Show clearer explanations and stronger transaction prompts." },
  { value: "basics", title: "I know the basics", body: "Keep guidance available without slowing everything down." },
  { value: "experienced", title: "I'm experienced", body: "Keep the wallet cleaner and faster." },
];

export function BeginnerModeStep({
  value,
  onChange,
}: {
  value: CryptoExperience;
  onChange: (value: CryptoExperience) => void;
}) {
  const { t } = useI18n();
  return (
    <OnboardingStep
      label="Start"
      title="Are you new to crypto?"
      body="Silent Wallet adapts the amount of guidance it shows. You can change this later."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "13px 14px", borderRadius: 14, background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.045)", border: `1px solid ${active ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.08)"}`, color: "#fff", font: "inherit", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: active ? "#fff" : "rgba(255,255,255,0.05)", color: active ? "#000" : "rgba(255,255,255,0.34)", flexShrink: 0 }}>
                {active && <Icons.check size={13} color="#000" />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 650 }}>{t(option.title)}</span>
                <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.34)" }}>{t(option.body)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <GlassButton variant="default" size="md" onClick={() => onChange(value === "experienced" ? "new" : "experienced")}>
        <Icons.eye size={13} /> {t("Beginner Mode")} {t(value === "experienced" ? "off" : "on")}
      </GlassButton>
    </OnboardingStep>
  );
}
