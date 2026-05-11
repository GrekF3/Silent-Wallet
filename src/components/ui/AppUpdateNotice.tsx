"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
import { APP_VERSION, DEFAULT_UPDATE_DOWNLOAD_URL, compareVersions, parseReleaseNotes } from "@/lib/appUpdate";
import { Icons } from "@/components/ui/Icon";

type Notice =
  | {
      kind: "available";
      currentVersion: string;
      version: string;
      bodyLines: string[];
      update: Update | null;
    }
  | {
      kind: "updated";
      currentVersion: string;
      previousVersion: string;
      bodyLines: string[];
    };

type DownloadState =
  | { status: "idle" }
  | { status: "downloading"; received: number; total?: number }
  | { status: "installing" }
  | { status: "installed" }
  | { status: "error"; message: string };

const SEEN_VERSION_KEY = "silent_seen_app_version_v1";
const DISMISSED_UPDATE_KEY = "silent_dismissed_update_version_v1";
const DISMISSED_UPDATED_KEY = "silent_dismissed_updated_version_v1";

function isTauriRuntime() {
  return typeof window !== "undefined" && Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__");
}

async function runtimeVersion() {
  if (!isTauriRuntime()) return APP_VERSION;

  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch {
    return APP_VERSION;
  }
}

function downloadProgressLabel(state: DownloadState) {
  if (state.status !== "downloading") return null;
  if (!state.total || state.total <= 0) return "Downloading...";
  return `Downloading ${Math.min(100, Math.round((state.received / state.total) * 100))}%`;
}

const smallButton: CSSProperties = {
  height: 34,
  padding: "0 12px",
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.72)",
  font: "inherit",
  fontSize: 12,
  fontWeight: 650,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  cursor: "pointer",
};

export function AppUpdateNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdates() {
      const currentVersion = await runtimeVersion();
      const previousVersion = localStorage.getItem(SEEN_VERSION_KEY);

      if (previousVersion && compareVersions(currentVersion, previousVersion) > 0) {
        const dismissedUpdated = localStorage.getItem(DISMISSED_UPDATED_KEY);
        if (dismissedUpdated !== currentVersion && !cancelled) {
          setNotice({
            kind: "updated",
            currentVersion,
            previousVersion,
            bodyLines: parseReleaseNotes(undefined, currentVersion),
          });
        }
      }

      localStorage.setItem(SEEN_VERSION_KEY, currentVersion);

      if (!isTauriRuntime()) return;

      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check({ timeout: 12_000 });
        if (!update || cancelled) return;

        const dismissedUpdate = localStorage.getItem(DISMISSED_UPDATE_KEY);
        if (dismissedUpdate === update.version) return;

        setNotice({
          kind: "available",
          currentVersion: update.currentVersion || currentVersion,
          version: update.version,
          bodyLines: parseReleaseNotes(update.body, update.version),
          update,
        });
      } catch {
        // Update checks should never block wallet usage.
      }
    }

    checkForUpdates();
    return () => { cancelled = true; };
  }, []);

  const progressLabel = useMemo(() => downloadProgressLabel(downloadState), [downloadState]);

  const dismiss = useCallback(() => {
    if (notice?.kind === "available") localStorage.setItem(DISMISSED_UPDATE_KEY, notice.version);
    if (notice?.kind === "updated") localStorage.setItem(DISMISSED_UPDATED_KEY, notice.currentVersion);
    setNotice(null);
    setDownloadState({ status: "idle" });
  }, [notice]);

  const startDownload = useCallback(async () => {
    if (!notice || notice.kind !== "available") return;

    if (!notice.update) {
      window.open(DEFAULT_UPDATE_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
      return;
    }

    let received = 0;
    try {
      setDownloadState({ status: "downloading", received: 0 });
      await notice.update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          received = 0;
          setDownloadState({ status: "downloading", received, total: event.data.contentLength });
        }
        if (event.event === "Progress") {
          received += event.data.chunkLength;
          setDownloadState((state) => ({
            status: "downloading",
            received,
            total: state.status === "downloading" ? state.total : undefined,
          }));
        }
        if (event.event === "Finished") setDownloadState({ status: "installing" });
      }, { timeout: 120_000 });
      setDownloadState({ status: "installed" });
    } catch (error) {
      setDownloadState({ status: "error", message: error instanceof Error ? error.message : "Update failed" });
    }
  }, [notice]);

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          className="app-update-notice-wrap"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        >
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              borderTop: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(13,13,13,0.92)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08)",
              backdropFilter: "blur(26px)",
              padding: 16,
              pointerEvents: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 34, height: 34, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.70)", flexShrink: 0 }}>
                {notice.kind === "available" ? <Icons.download size={16} /> : <Icons.check size={16} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                    {notice.kind === "available" ? `Silent Wallet ${notice.version}` : `Updated to ${notice.currentVersion}`}
                  </div>
                  <button type="button" onClick={dismiss} aria-label="Close update notice" style={{ width: 28, height: 28, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.045)", color: "rgba(255,255,255,0.42)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <Icons.x size={13} />
                  </button>
                </div>
                <div style={{ marginTop: 3, fontSize: 12, color: "rgba(255,255,255,0.36)" }}>
                  {notice.kind === "available"
                    ? `You are running ${notice.currentVersion}. A newer signed build is available.`
                    : `Previous version: ${notice.previousVersion}`}
                </div>
              </div>
            </div>

            {notice.bodyLines.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {notice.bodyLines.map((line, index) => (
                  <div key={line} style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.58)" }}>
                    <span style={{ minWidth: 14, color: "rgba(255,255,255,0.28)", fontVariantNumeric: "tabular-nums" }}>{index + 1}.</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            )}

            {notice.kind === "available" && (
              <div style={{ marginTop: 13, padding: "9px 10px", borderRadius: 12, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 11, lineHeight: 1.45, color: "rgba(255,255,255,0.34)" }}>
                Updating over the same app keeps wallet data. Avoid uninstall options that remove app data if you have not backed up the seed phrase.
              </div>
            )}

            {downloadState.status === "error" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,100,100,0.82)" }}>
                {downloadState.message}
              </div>
            )}

            {downloadState.status === "installed" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.64)" }}>
                Update installed. Restart Silent Wallet to finish.
              </div>
            )}

            {notice.kind === "available" && downloadState.status !== "installed" && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>
                  {progressLabel || "Signed updater package"}
                </span>
                <button
                  type="button"
                  onClick={startDownload}
                  disabled={downloadState.status === "downloading" || downloadState.status === "installing"}
                  style={{
                    ...smallButton,
                    background: "rgba(255,255,255,0.88)",
                    color: "#050505",
                    opacity: downloadState.status === "downloading" || downloadState.status === "installing" ? 0.64 : 1,
                    cursor: downloadState.status === "downloading" || downloadState.status === "installing" ? "default" : "pointer",
                  }}
                >
                  <Icons.download size={14} color="#050505" />
                  {downloadState.status === "installing" ? "Installing" : "Download update"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
