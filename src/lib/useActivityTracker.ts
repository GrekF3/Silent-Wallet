"use client";
import { useEffect, useRef, useCallback } from "react";
import { refreshSession, clearSession, readSession } from "./session";
import { useWalletStore } from "./store";

const TIMEOUT   = 10 * 60 * 1000; // 10 min
const CHECK_INT =      30 * 1000;  // check every 30s

export function useActivityTracker(onLock: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    refreshSession();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clearSession();
      useWalletStore.getState().clearSession();
      onLock();
    }, TIMEOUT);
  }, [onLock]);

  useEffect(() => {
    // Attach activity events
    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"] as const;
    const handler = () => resetTimer();
    EVENTS.forEach((e) => window.addEventListener(e, handler, { passive: true }));

    // Visibility: when tab becomes visible, check if session is still valid
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!readSession()) {
          clearSession();
          useWalletStore.getState().clearSession();
          onLock();
        } else {
          resetTimer();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Periodic check (catches minimised app without mousemove)
    const intervalId = setInterval(() => {
      if (!readSession()) {
        clearSession();
        useWalletStore.getState().clearSession();
        onLock();
      }
    }, CHECK_INT);

    // Start timer immediately
    resetTimer();

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, handler));
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(intervalId);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer, onLock]);
}
