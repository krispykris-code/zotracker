"use client";

import { useCallback, useSyncExternalStore } from "react";

// localStorage as an external store (React 19 idiom).
// Reads are hydration-safe (server snapshot = null); writes through the
// returned setter notify every subscribed component in this tab, and the
// `storage` event keeps other tabs in sync.
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useLocalStorageValue(
  key: string
): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key),
    () => null
  );

  const setValue = useCallback(
    (v: string | null) => {
      if (v === null) localStorage.removeItem(key);
      else localStorage.setItem(key, v);
      emit();
    },
    [key]
  );

  return [value, setValue];
}
