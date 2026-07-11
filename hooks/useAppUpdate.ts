"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/lib/version";
import { useLocalStorageValue } from "./useLocalStorageValue";
import type { ToastMessage } from "@/components/Toast";

type ShowToast = (
  type: ToastMessage["type"],
  text: string,
  autoHideMs?: number
) => void;

// Version check + update banner.
// The banner shows when the stored version is outdated (derived state);
// a 4s auto-update timer runs alongside it (cancellable via dismiss).
// A sessionStorage flag persists the "更新完成" toast across the reload.
export function useAppUpdate(showToast: ShowToast) {
  const [storedVersion, setStoredVersion] =
    useLocalStorageValue("zotracker-version");
  const [name] = useLocalStorageValue("zotracker-name");
  const [room] = useLocalStorageValue("zotracker-room");
  const [dismissed, setDismissed] = useState(false);
  const [showLatestMessage, setShowLatestMessage] = useState(false);
  const autoUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasUserData = Boolean(name || room);
  // storedVersion === null on an existing pre-version-tracking device →
  // treat as outdated; on a brand-new device the effect below stamps the
  // current version silently before anything is shown.
  const outdated =
    storedVersion === null ? hasUserData : storedVersion !== APP_VERSION;
  const showUpdateBanner = outdated && !dismissed;

  const applyUpdate = useCallback(() => {
    if (autoUpdateTimer.current) clearTimeout(autoUpdateTimer.current);
    showToast("updating", "🔄 更新中...");
    setDismissed(true);
    localStorage.setItem("zotracker-version", APP_VERSION);
    sessionStorage.setItem("zotracker-update-complete", "1");
    setTimeout(() => window.location.reload(), 800);
  }, [showToast]);

  const dismissUpdateBanner = useCallback(() => {
    if (autoUpdateTimer.current) clearTimeout(autoUpdateTimer.current);
    setDismissed(true);
  }, []);

  // Manual "檢查更新" from the settings modal.
  const checkUpdate = useCallback(() => {
    if (localStorage.getItem("zotracker-version") === APP_VERSION) {
      setShowLatestMessage(true);
      setTimeout(() => setShowLatestMessage(false), 3000);
    } else {
      applyUpdate();
    }
  }, [applyUpdate]);

  // Brand-new user → stamp current version silently (no banner).
  useEffect(() => {
    if (storedVersion === null && !hasUserData) {
      setStoredVersion(APP_VERSION);
    }
  }, [storedVersion, hasUserData, setStoredVersion]);

  // Outdated with a known previous version → auto-update after 4s.
  useEffect(() => {
    if (storedVersion !== null && storedVersion !== APP_VERSION) {
      autoUpdateTimer.current = setTimeout(applyUpdate, 4000);
      return () => {
        if (autoUpdateTimer.current) clearTimeout(autoUpdateTimer.current);
      };
    }
  }, [storedVersion, applyUpdate]);

  // Show the "更新完成" toast right after the post-update reload.
  useEffect(() => {
    if (sessionStorage.getItem("zotracker-update-complete")) {
      sessionStorage.removeItem("zotracker-update-complete");
      showToast("complete", "✓ 更新完成！", 3000);
    }
  }, [showToast]);

  return {
    showUpdateBanner,
    showLatestMessage,
    applyUpdate,
    dismissUpdateBanner,
    checkUpdate,
  };
}
