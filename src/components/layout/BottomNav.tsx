"use client";

import { motion } from "framer-motion";
import { Icons } from "@/components/ui/Icon";
import { useWalletStore, type View } from "@/lib/store";

type NavItem = {
  id: View;
  label: string;
  icon: keyof typeof Icons;
};

const NAV: NavItem[] = [
  { id: "dashboard", label: "Home",     icon: "grid"     },
  { id: "transfer",  label: "Transfer", icon: "swap"     },
  { id: "history",   label: "History",  icon: "clock"    },
  { id: "settings",  label: "Settings", icon: "settings" },
];

export function BottomNav() {
  const { view, setView, sessionMode } = useWalletStore();
  const activeNav = (view === "asset" ? "dashboard" : view) as View;
  const items = sessionMode === "watch" ? NAV.filter((item) => item.id !== "transfer") : NAV;

  return (
    <nav className="bottom-nav" aria-label="Primary mobile navigation">
      {items.map((item) => {
        const Icon = Icons[item.icon];
        const active = activeNav === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className="bottom-nav-item"
            data-active={active ? "true" : "false"}
            onClick={() => setView(item.id)}
            aria-current={active ? "page" : undefined}
          >
            {active && (
              <motion.span
                layoutId="bottom-nav-pill"
                transition={{ type: "spring", stiffness: 430, damping: 34 }}
                className="bottom-nav-pill"
              />
            )}
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
