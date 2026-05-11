"use client";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function AppPreloader({ label = "Syncing wallet" }: { label?: string }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "#080808",
      }}
    >
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          position: "relative",
        }}
      >
        <BrandLogo size={62} label="Silent" orientation="column" reveal="always" />
        <motion.span
          aria-hidden
          animate={{ x: ["-18%", "118%"], opacity: [0, 1, 0] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: 0, right: 0, bottom: -10, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)" }}
        />
      </motion.div>
      <motion.div
        animate={{ opacity: [0.24, 0.54, 0.24] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ fontSize: 12, fontWeight: 500, letterSpacing: 0, color: "rgba(255,255,255,0.42)" }}
      >
        {label}
      </motion.div>
    </motion.div>
  );
}
