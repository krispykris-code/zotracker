"use client";

import { useSyncExternalStore } from "react";

// The URL never changes during a page's lifetime (navigation reloads),
// so this store never notifies subscribers.
const emptySubscribe = () => () => {};

function readRoomId(): string | null {
  return new URLSearchParams(window.location.search).get("room");
}

// Room ID from the URL, hydration-safe: server snapshot is null, the real
// value appears right after hydration without a mismatch error.
export function useRoomId(): string | null {
  return useSyncExternalStore(emptySubscribe, readRoomId, () => null);
}
