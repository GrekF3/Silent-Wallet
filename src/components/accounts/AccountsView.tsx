"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassInput } from "@/components/ui/GlassInput";
import { Skeleton } from "@/components/common/Skeleton";
import { Icons } from "@/components/ui/Icon";
import { createWalletAccount, useWalletAccounts } from "@/lib/accounts/storage";
import type { WalletAccount } from "@/lib/accounts/types";
import { usePremium } from "@/lib/premium/entitlements";
import { useWalletStore } from "@/lib/store";
import { formatUSD } from "@/lib/utils";

function AccountRow({
  account,
  active,
  locked,
  activeBalance,
  assetCount,
  activeLoading,
  onUse,
}: {
  account: WalletAccount;
  active: boolean;
  locked: boolean;
  activeBalance: string;
  assetCount: number;
  activeLoading: boolean;
  onUse: () => void;
}) {
  return (
    <GlassCard hover style={{ padding: 14, borderRadius: 18, background: active ? "rgba(255,255,255,0.065)" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={onUse}
          style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          {locked ? <Icons.lock size={16} color="rgba(255,255,255,0.38)" /> : <Icons.wallet size={16} color="rgba(255,255,255,0.58)" />}
        </button>

        <button type="button" onClick={onUse} style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", color: "#fff", font: "inherit", cursor: "pointer", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.name}</span>
          </div>
          {active && activeLoading ? (
            <div style={{ marginTop: 7 }}><Skeleton width={92} height={10} radius={6} /></div>
          ) : (
            <div style={{ marginTop: 3, fontSize: 12, color: "rgba(255,255,255,0.32)" }}>
              {active ? `${assetCount} ${assetCount === 1 ? "asset" : "assets"}` : locked ? "Silent Pro" : "Switch to view balances"}
            </div>
          )}
        </button>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 650, color: active ? "#fff" : "rgba(255,255,255,0.34)", fontVariantNumeric: "tabular-nums" }}>
            {active && activeLoading ? <Skeleton width={74} height={14} radius={7} /> : active ? activeBalance : "—"}
          </div>
          {!active && (
            <button
              type="button"
              onClick={onUse}
              style={{ marginTop: 4, border: 0, background: "transparent", color: "rgba(255,255,255,0.42)", cursor: "pointer", font: "inherit", fontSize: 12 }}
            >
              Use
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function AddAccountModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 170, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, background: "rgba(0,0,0,0.66)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onClick={(event) => event.stopPropagation()}
        style={{ width: "min(420px, 100%)" }}
      >
        <GlassCard elevated style={{ padding: 18, borderRadius: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <Icons.wallet size={17} color="rgba(255,255,255,0.62)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 750, color: "#fff" }}>Add account</div>
              <div style={{ marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.30)" }}>A new derived account starts with no visible balance.</div>
            </div>
            <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icons.x size={15} color="rgba(255,255,255,0.52)" />
            </button>
          </div>

          <GlassInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Treasury" autoFocus />

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <GlassButton variant="ghost" size="md" style={{ flex: 1 }} onClick={onClose}>Cancel</GlassButton>
            <GlassButton variant="primary" size="md" style={{ flex: 1 }} onClick={() => onCreate(name)}>
              <Icons.plus size={13} color="#000" /> Add
            </GlassButton>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

export function AccountsView() {
  const premium = usePremium();
  const accounts = useWalletAccounts();
  const {
    assets,
    evmTokens,
    splTokens,
    hiddenAssetIds,
    privacyMode,
    activeAccountIndex,
    setActiveAccountIndex,
    sessionMode,
    setView,
    loading,
    initialLoaded,
  } = useWalletStore();
  const [addOpen, setAddOpen] = useState(false);
  const proAccounts = premium.hasEntitlement("pro.accounts.multiple");
  const visibleAccounts = accounts.filter((account) => !account.archived);
  const activeLoading = loading || !initialLoaded;

  const activePortfolio = useMemo(() => {
    const nativeAssets = assets
      .filter((asset) => !hiddenAssetIds.includes(`native:${asset.id}`))
      .map((asset) => ({ balance: asset.balance, value: asset.balance * asset.priceUSD }));
    const evmAssets = evmTokens
      .filter((token) => !hiddenAssetIds.includes(`evm:${token.chain}:${token.contract.toLowerCase()}`))
      .map((token) => ({ balance: token.balance, value: token.valueUSD }));
    const solanaAssets = splTokens
      .filter((token) => !hiddenAssetIds.includes(`spl:${token.mint}`))
      .map((token) => ({ balance: token.amount, value: token.amount * (token.priceUSD ?? 0) }));
    const all = [...nativeAssets, ...evmAssets, ...solanaAssets];
    return {
      total: all.reduce((sum, asset) => sum + asset.value, 0),
      assetCount: all.filter((asset) => asset.balance > 0).length,
    };
  }, [assets, evmTokens, hiddenAssetIds, splTokens]);

  const createAccount = (name: string) => {
    const account = createWalletAccount({ name: name.trim() || `Account ${visibleAccounts.length + 1}` });
    setAddOpen(false);
    setActiveAccountIndex(account.index);
  };

  const openAddAccount = () => {
    if (sessionMode === "watch") return;
    if (!proAccounts) {
      setView("premium");
      return;
    }
    setAddOpen(true);
  };

  return (
    <motion.div className="view-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}
      style={{ padding: "30px 20px", maxWidth: 620, display: "flex", flexDirection: "column", gap: 18 }}>
      <AnimatePresence>
        {addOpen && <AddAccountModal onClose={() => setAddOpen(false)} onCreate={createAccount} />}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <span className="label">Accounts</span>
          <div style={{ marginTop: 8, fontSize: 30, fontWeight: 300, color: "#fff", letterSpacing: 0 }}>Accounts</div>
        </div>
        <GlassButton variant="primary" size="md" onClick={openAddAccount} disabled={sessionMode === "watch"}>
          <Icons.plus size={13} color="#000" /> Add account
        </GlassButton>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {visibleAccounts.map((account) => {
          const active = account.index === activeAccountIndex;
          const recovered = account.labels.includes("recovered");
          const locked = account.index !== 0 && !proAccounts && !recovered;
          return (
            <AccountRow
              key={account.id}
              account={account}
              active={active}
              locked={locked}
              activeBalance={privacyMode ? "••••" : formatUSD(activePortfolio.total)}
              assetCount={activePortfolio.assetCount}
              activeLoading={active && activeLoading}
              onUse={() => {
                if (locked) {
                  setView("premium");
                  return;
                }
                if (!active) setActiveAccountIndex(account.index);
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
