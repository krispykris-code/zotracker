"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SleepRecord } from "@/lib/types";

// Live subscription to a room's records. `loading` is true until the first
// snapshot arrives (which may come instantly from the offline cache).
export function useRoomRecords(
  roomId: string | null,
  direction: "asc" | "desc" = "desc"
) {
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, "rooms", roomId, "records"),
      orderBy("date", direction)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRecords(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SleepRecord[]
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [roomId, direction]);

  return { records, loading, error };
}
