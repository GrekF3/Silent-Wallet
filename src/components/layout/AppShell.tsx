"use client";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useWalletStore } from "@/lib/store";
import { ToastProvider }       from "@/components/ui/Toast";
import { Header }              from "./Header";
import { useActivityTracker }  from "@/lib/useActivityTracker";
import { Dashboard }    from "@/components/wallet/Dashboard";
import { AssetDetail }  from "@/components/wallet/AssetDetail";
import { TransferView } from "@/components/wallet/TransferView";
import { HistoryView }  from "@/components/wallet/HistoryView";
import { SettingsView } from "@/components/wallet/SettingsView";

const PAGE: Variants = {
  initial: { opacity: 0, y: 8  },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -6 },
};

export function AppShell({ onLock }: { onLock: () => void }) {
  const { view } = useWalletStore();
  useActivityTracker(onLock);

  const renderView = () => {
    switch (view) {
      case "dashboard": return <Dashboard />;
      case "asset":     return <AssetDetail />;
      case "transfer":  return <TransferView />;
      case "history":   return <HistoryView />;
      case "settings":  return <SettingsView />;
    }
  };

  return (
    <ToastProvider>
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", width:"100vw", overflow:"hidden", background:"#080808", position:"relative" }}>

        {/* Atmosphere */}
        <div aria-hidden style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
          backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.013) 1px, transparent 1px)",
          backgroundSize:"24px 24px" }}
        />
        <div aria-hidden style={{ position:"fixed", top:-200, right:-150, zIndex:0, pointerEvents:"none",
          width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(255,255,255,0.018) 0%, transparent 70%)" }}
        />

        {/* Header */}
        <Header />

        {/* Main */}
        <main style={{ flex:1, overflowY:"auto", overflowX:"hidden", position:"relative", zIndex:1 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              variants={PAGE}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.18 }}
              style={{ minHeight:"100%" }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ToastProvider>
  );
}
