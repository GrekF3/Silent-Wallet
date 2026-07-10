"use client";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Setup }    from "@/components/onboarding/Setup";
import { Lock }     from "@/components/onboarding/Lock";
import { AppPreloader } from "@/components/ui/AppPreloader";
import { AppUpdateNotice } from "@/components/ui/AppUpdateNotice";
import { hasWallet } from "@/lib/storage";
import { readSession } from "@/lib/session";
import { useWalletStore } from "@/lib/store";
import { hasCompletedOnboarding } from "@/lib/userExperience/mode";

type Screen = "loading" | "onboarding" | "setup" | "lock" | "app";

export default function Home() {
  const { addresses, setSession, setWatchSession } = useWalletStore();
  const [screen, setScreen] = useState<Screen>("loading");

  const goLock = useCallback(() => setScreen("lock"), []);

  useEffect(() => {
    let nextScreen: Screen = hasCompletedOnboarding() ? "setup" : "onboarding";

    // 1. Already in memory (e.g. hot-module-reload)
    if (addresses) nextScreen = "app";

    // 2. Check sessionStorage — valid within 10 min
    const sess = !addresses ? readSession() : null;
    if (sess && !addresses) {
      if (sess.mode === "watch") {
        setWatchSession(sess.watchName ?? "Observer", sess.addresses);
      } else if (sess.mnemonic) {
        setSession(sess.mnemonic, sess.addresses, sess.accountIndex, sess.addressIndexes);
      }
      nextScreen = "app";
    }

    // 3. Encrypted wallet on disk but no live session
    if (!addresses && !sess && hasWallet()) nextScreen = "lock";

    queueMicrotask(() => setScreen(nextScreen));
  }, [addresses, setSession, setWatchSession]);

  if (screen === "loading") {
    return <AppPreloader label="Opening wallet" />;
  }

  return (
    <>
      {screen === "setup" && <Setup onDone={() => setScreen("app")} />}
      {screen === "onboarding" && <OnboardingFlow onDone={() => setScreen("setup")} />}
      {screen === "lock" && <Lock onUnlock={() => setScreen("app")} />}
      {screen === "app" && <AppShell onLock={goLock} />}
      <AppUpdateNotice />
    </>
  );
}
