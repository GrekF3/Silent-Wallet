"use client";
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icons } from "./Icon";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

const Ctx = createContext<(msg: string, type?: ToastType) => void>(() => {});

export function useToast() { return useContext(Ctx); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2800);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div style={{
        position:  "fixed",
        bottom:    28,
        left:      "50%",
        transform: "translateX(-50%)",
        zIndex:    9999,
        display:   "flex",
        flexDirection: "column",
        gap:       8,
        alignItems: "center",
        pointerEvents: "none",
      }}>
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{    opacity: 0, y: -8,  scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          10,
                padding:      "11px 18px",
                borderRadius: 14,
                background:   "rgba(22,22,22,0.92)",
                border:       "1px solid rgba(255,255,255,0.12)",
                borderTop:    "1px solid rgba(255,255,255,0.22)",
                boxShadow:    "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)",
                backdropFilter: "blur(24px)",
                pointerEvents: "auto",
                whiteSpace:   "nowrap",
              }}
            >
              <span style={{ color: t.type === "error" ? "rgba(255,100,100,0.9)" : "rgba(255,255,255,0.9)" }}>
                {t.type === "success" && <Icons.check size={15} />}
                {t.type === "error"   && <Icons.info  size={15} />}
                {t.type === "info"    && <Icons.info  size={15} />}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>
                {t.message}
              </span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Close toast"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.38)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  marginLeft: 2,
                }}
              >
                <Icons.x size={11} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
