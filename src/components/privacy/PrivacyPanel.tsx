"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Icons } from "@/components/ui/Icon";
import { useWalletStore } from "@/lib/store";
import { setPrivacyPreferences, usePrivacyPreferences } from "@/lib/privacy/preferences";
import { updateUserExperience, useUserExperience } from "@/lib/userExperience/mode";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} style={{ width: 44, height: 26, borderRadius: 999, border: `1px solid ${on ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.10)"}`, background: on ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.06)", position: "relative", cursor: "pointer", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 150ms ease" }} />
    </button>
  );
}

function Row({ icon, title, body, on, onClick }: { icon: keyof typeof Icons; title: string; body: string; on: boolean; onClick: () => void }) {
  const Icon = Icons[icon];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ width: 32, height: 32, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <Icon size={14} color="rgba(255,255,255,0.42)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.84)" }}>{title}</div>
        <div style={{ marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.30)", lineHeight: 1.45 }}>{body}</div>
      </div>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}

export function PrivacyPanel() {
  const { privacyMode, setPrivacyMode } = useWalletStore();
  const prefs = usePrivacyPreferences();
  const ux = useUserExperience();

  return (
    <GlassCard elevated style={{ padding: "16px 18px 2px", borderRadius: 22 }}>
      <div style={{ fontSize: 16, fontWeight: 650, color: "#fff" }}>Privacy controls</div>
      <div style={{ marginTop: 4, marginBottom: 4, fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.5 }}>
        Privacy mode hides sensitive information on your screen. Account separation helps reduce accidental linkage, but it does not make blockchain transactions anonymous.
      </div>
      <Row icon="eyeOff" title="Hide balances" body="Mask portfolio values on screen." on={privacyMode} onClick={() => setPrivacyMode(!privacyMode)} />
      <Row icon="wallet" title="Hide addresses partially" body="Keep public addresses shorter in busy screens." on={prefs.hideAddresses} onClick={() => setPrivacyPreferences({ hideAddresses: !prefs.hideAddresses })} />
      <Row icon="clock" title="Hide recent activity values" body="Show activity without visible amounts." on={prefs.hideActivityValues} onClick={() => setPrivacyPreferences({ hideActivityValues: !prefs.hideActivityValues })} />
      <Row icon="help" title="Beginner Mode" body="Use simpler wording and clearer transaction explanations." on={ux.beginnerMode} onClick={() => updateUserExperience({ beginnerMode: !ux.beginnerMode })} />
      <Row icon="globe" title="Reduce provider calls" body="Avoid optional Web3 provider calls where possible." on={prefs.reduceProviderCalls} onClick={() => setPrivacyPreferences({ reduceProviderCalls: !prefs.reduceProviderCalls })} />
      <Row icon="info" title="Show provider notices" body="Explain when a third-party provider is not configured." on={prefs.showProviderNotices} onClick={() => setPrivacyPreferences({ showProviderNotices: !prefs.showProviderNotices })} />
      <Row icon="wallet" title="Address hygiene reminders" body="Show reminders before mixing account contexts." on={prefs.onchainTaggingOptIn} onClick={() => setPrivacyPreferences({ onchainTaggingOptIn: !prefs.onchainTaggingOptIn })} />
    </GlassCard>
  );
}
