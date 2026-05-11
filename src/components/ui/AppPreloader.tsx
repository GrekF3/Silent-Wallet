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
        gap: 14,
        background: "#080808",
      }}
    >
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <BrandLogo size={62} label="Silent" orientation="column" reveal="always" />
      </motion.div>
      <motion.div
        aria-live="polite"
        animate={{ backgroundPosition: ["0% 50%", "120% 50%", "0% 50%"] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          fontSize: 12,
          fontWeight: 520,
          letterSpacing: 0,
          color: "transparent",
          backgroundImage: "linear-gradient(100deg, rgba(255,255,255,0.26), rgba(255,255,255,0.86), rgba(255,255,255,0.26))",
          backgroundSize: "220% 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {label}
      </motion.div>
    </motion.div>
  );
}
