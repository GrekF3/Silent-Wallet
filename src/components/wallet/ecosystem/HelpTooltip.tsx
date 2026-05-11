"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icons } from "@/components/ui/Icon";

export function HelpTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLButtonElement | null>(null);

  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(280, window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
      const preferredTop = rect.bottom + 8;
      const top = preferredTop + 150 > window.innerHeight
        ? Math.max(12, rect.top - 158)
        : preferredTop;
      setPosition({ top, left });
    }
    setOpen(true);
  };

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={() => open ? setOpen(false) : show()}
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.09)",
          background: "rgba(255,255,255,0.045)",
          color: "rgba(255,255,255,0.40)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "help",
          padding: 0,
        }}
      >
        <Icons.help size={13} />
      </button>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <motion.span
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "fixed",
                left: position.left,
                top: position.top,
                zIndex: 240,
                width: "min(280px, calc(100vw - 24px))",
                maxHeight: "min(180px, calc(100vh - 24px))",
                overflowY: "auto",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                borderTop: "1px solid rgba(255,255,255,0.20)",
                background: "rgba(12,12,12,0.98)",
                color: "rgba(255,255,255,0.62)",
                boxShadow: "0 16px 44px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.08)",
                backdropFilter: "blur(28px)",
                fontSize: 12,
                lineHeight: 1.45,
                textAlign: "left",
                pointerEvents: "none",
              }}
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
