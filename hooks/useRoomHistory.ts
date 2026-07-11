"use client";

import { useCallback } from "react";

const KEY = "zotracker-room-history";
const MAX_ENTRIES = 5;

// Last-joined rooms in localStorage, newest first.
export function useRoomHistory() {
  const getHistory = useCallback((): string[] => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }, []);

  const addToHistory = useCallback(
    (id: string) => {
      const history = getHistory().filter((h) => h !== id);
      history.unshift(id);
      localStorage.setItem(KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)));
    },
    [getHistory]
  );

  const removeFromHistory = useCallback(
    (id: string) => {
      const history = getHistory().filter((h) => h !== id);
      localStorage.setItem(KEY, JSON.stringify(history));
    },
    [getHistory]
  );

  return { getHistory, addToHistory, removeFromHistory };
}
