"use client";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Setup }    from "@/components/onboarding/Setup";
import { Lock }     from "@/components/onboarding/Lock";
import { hasWallet } from "@/lib/storage";
import { readSession, clearSession } from "@/lib/session";
import { useWalletStore } from "@/lib/store";

type Screen = "loading" | "setup" | "lock" | "app";

export default function Home() {
  const { addresses, setSession } = useWalletStore();
  const [screen, setScreen] = useState<Screen>("loading");

  const goLock = useCallback(() => setScreen("lock"), []);

  useEffect(() => {
    // 1. Already in memory (e.g. hot-module-reload)
    if (addresses) { setScreen("app"); return; }

    // 2. Check sessionStorage — valid within 10 min
    const sess = readSession();
    if (sess) {
      setSession(sess.mnemonic, sess.addresses);
      setScreen("app");
      return;
    }

    // 3. Encrypted wallet on disk but no live session
    if (hasWallet()) { setScreen("lock"); return; }

    // 4. First launch
    setScreen("setup");
  }, []);

  if (screen === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#000" }}>S</span>
        </div>
      </div>
    );
  }

  if (screen === "setup") return <Setup onDone={() => setScreen("app")} />;
  if (screen === "lock")  return <Lock onUnlock={() => setScreen("app")} />;
  return <AppShell onLock={goLock} />;
}
