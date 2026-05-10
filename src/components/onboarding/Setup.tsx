"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard }   from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput }  from "@/components/ui/GlassInput";
import { Icons }       from "@/components/ui/Icon";
import { generateMnemonic, validateMnemonic, deriveAddresses } from "@/lib/wallet";
import { saveMnemonic } from "@/lib/storage";
import { useWalletStore } from "@/lib/store";

type Tab  = "create" | "import";
type Step = "start" | "phrase" | "confirm" | "password";

function WordGrid({ words }: { words: string[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {words.map((w, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 12px", borderRadius: 12,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderTop: "1px solid rgba(255,255,255,0.16)",
        }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", minWidth: 14, textAlign: "right" }}>{i + 1}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{w}</span>
        </div>
      ))}
    </div>
  );
}

export function Setup({ onDone }: { onDone: () => void }) {
  const { setSession } = useWalletStore();
  const [tab,      setTab]      = useState<Tab>("create");
  const [step,     setStep]     = useState<Step>("start");
  const [mnemonic, setMnemonic] = useState("");
  const [importInput, setImport] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [copied,   setCopied]   = useState(false);

  const words = mnemonic.split(" ").filter(Boolean);

  const handleCreate = () => {
    const m = generateMnemonic();
    setMnemonic(m);
    setStep("phrase");
  };

  const handleImport = () => {
    const m = importInput.trim().toLowerCase();
    if (!validateMnemonic(m)) { setError("Invalid mnemonic phrase"); return; }
    setMnemonic(m);
    setStep("password");
  };

  const handleSave = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== password2) { setError("Passwords don't match"); return; }
    setLoading(true);
    setError("");
    try {
      await saveMnemonic(mnemonic, password);
      const addresses = deriveAddresses(mnemonic);
      setSession(mnemonic, addresses);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save wallet");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#080808" }}>
      {/* Background */}
      <div aria-hidden style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.013) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 24, position: "relative", zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#000", letterSpacing: "-0.03em" }}>S</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 300, color: "#fff", letterSpacing: "-0.01em" }}>Silent Wallet</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.30)", marginTop: 4 }}>Secure · Private · Minimal</div>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── START ─────────────────────────────────────────── */}
          {step === "start" && (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Tabs */}
              <div style={{ display: "flex", padding: 3, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }}>
                {(["create","import"] as Tab[]).map((t) => {
                  const active = tab === t;
                  return (
                    <div key={t} style={{ position: "relative", flex: 1 }}>
                      {active && (
                        <motion.div layoutId="tab-pill" transition={{ type: "spring", stiffness: 420, damping: 36 }}
                          style={{ position: "absolute", inset: 0, borderRadius: 11, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)", borderTop: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)" }}
                        />
                      )}
                      <button onClick={() => { setTab(t); setError(""); }}
                        style={{ position: "relative", zIndex: 1, width: "100%", height: 40, borderRadius: 11, border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "inherit", color: active ? "#fff" : "rgba(255,255,255,0.35)", transition: "color 0.15s" }}>
                        {t === "create" ? "Create Wallet" : "Import Wallet"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <GlassCard elevated style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                {tab === "create" ? (
                  <>
                    <div style={{ display: "flex", gap: 14, padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Icons.shield size={18} color="rgba(255,255,255,0.50)" />
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.50)", lineHeight: 1.5 }}>
                        A new 12-word seed phrase will be generated. Write it down and keep it safe — it's the only way to recover your wallet.
                      </p>
                    </div>
                    <GlassButton variant="primary" size="lg" style={{ width: "100%" }} onClick={handleCreate}>
                      <Icons.plus size={15} color="#000" /> Generate Seed Phrase
                    </GlassButton>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)" }}>
                        Seed Phrase
                      </label>
                      <textarea
                        value={importInput}
                        onChange={(e) => { setImport(e.target.value); setError(""); }}
                        placeholder="Enter your 12 or 24-word seed phrase..."
                        style={{
                          width: "100%", minHeight: 96, padding: "12px 14px", borderRadius: 14,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
                          borderTop: "1px solid rgba(255,255,255,0.18)", color: "#fff", fontSize: 14,
                          fontFamily: "monospace", resize: "vertical", outline: "none",
                          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      />
                    </div>
                    {error && <div style={{ fontSize: 13, color: "rgba(255,100,100,0.80)", padding: "10px 14px", borderRadius: 10, background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.15)" }}>{error}</div>}
                    <GlassButton variant="primary" size="lg" style={{ width: "100%" }} onClick={handleImport} disabled={!importInput.trim()}>
                      Import Wallet
                    </GlassButton>
                  </>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* ── PHRASE ────────────────────────────────────────── */}
          {step === "phrase" && (
            <motion.div key="phrase" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 500, color: "#fff", marginBottom: 6 }}>Your Seed Phrase</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Write these 12 words in order. Never share them.</div>
              </div>
              <GlassCard elevated style={{ padding: 20 }}>
                <WordGrid words={words} />
                <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 6, margin: "16px auto 0", padding: "8px 16px", borderRadius: 10, cursor: "pointer", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: copied ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.35)", fontFamily: "inherit", fontSize: 13, transition: "color 0.15s" }}>
                  <Icons.copy size={13} /> {copied ? "Copied!" : "Copy to clipboard"}
                </button>
              </GlassCard>
              <div style={{ display: "flex", gap: 10 }}>
                <GlassButton variant="ghost" size="lg" style={{ flex: 1 }} onClick={() => setStep("start")}>Back</GlassButton>
                <GlassButton variant="primary" size="lg" style={{ flex: 1 }} onClick={() => setStep("password")}>
                  I've saved it <Icons.chevronR size={14} color="#000" />
                </GlassButton>
              </div>
            </motion.div>
          )}

          {/* ── PASSWORD ──────────────────────────────────────── */}
          {step === "password" && (
            <motion.div key="password" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 500, color: "#fff", marginBottom: 6 }}>Set Password</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Encrypts your seed phrase locally.</div>
              </div>
              <GlassCard elevated style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <GlassInput label="Password" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
                <GlassInput label="Confirm password" type="password" placeholder="Repeat password" value={password2} onChange={(e) => { setPassword2(e.target.value); setError(""); }} />
                {error && <div style={{ fontSize: 13, color: "rgba(255,100,100,0.80)", padding: "10px 14px", borderRadius: 10, background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.15)" }}>{error}</div>}
              </GlassCard>
              <div style={{ display: "flex", gap: 10 }}>
                <GlassButton variant="ghost" size="lg" style={{ flex: 1 }} onClick={() => setStep(tab === "import" ? "start" : "phrase")}>Back</GlassButton>
                <GlassButton variant="primary" size="lg" style={{ flex: 1 }} onClick={handleSave} disabled={loading || !password || !password2}>
                  {loading ? "Creating…" : "Create Wallet"}
                </GlassButton>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
