"use client";

import { useMemo, useState } from "react";
import { useRoomHistory } from "@/hooks/useRoomHistory";
import { useModalBehavior } from "@/hooks/useModalBehavior";

// Overlay for joining a room by pasted link / room ID, with quick access
// to recently joined rooms.
export function JoinRoomOverlay({
  onJoin,
  onClose,
}: {
  onJoin: (input: string) => void;
  onClose: () => void;
}) {
  const [joinInput, setJoinInput] = useState("");
  const [historyVersion, setHistoryVersion] = useState(0);
  const { getHistory, removeFromHistory } = useRoomHistory();

  // localStorage read, refreshed via historyVersion after removals.
  // Only rendered client-side (after a click), so this is SSR-safe.
  const history = useMemo(
    () => getHistory(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getHistory, historyVersion]
  );

  const handleJoin = () => {
    if (!joinInput.trim()) return;
    onJoin(joinInput.trim());
  };

  const ref = useModalBehavior(onClose);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="加入房間"
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-slate-900 rounded-2xl px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">加入房間</h3>
          <button
            onClick={onClose}
            aria-label="關閉"
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          貼上朋友分享的連結或房間 ID
        </p>
        <input
          type="text"
          value={joinInput}
          onChange={(e) => setJoinInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="連結或房間 ID"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-3"
        />
        <button
          onClick={handleJoin}
          disabled={!joinInput.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
        >
          加入
        </button>

        {/* Room history */}
        {history.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-400 mb-2">最近加入的房間</p>
            <div className="flex flex-col gap-1">
              {history.map((rid) => (
                <div
                  key={rid}
                  className="flex items-center bg-slate-800 rounded-lg"
                >
                  <button
                    onClick={() => onJoin(rid)}
                    className="flex-1 text-left text-sm text-slate-300 px-3 py-2.5 hover:text-white transition-colors"
                  >
                    {rid}
                  </button>
                  <button
                    onClick={() => {
                      removeFromHistory(rid);
                      setHistoryVersion((v) => v + 1);
                    }}
                    aria-label={`移除 ${rid}`}
                    className="text-slate-400 hover:text-rose-400 px-3 py-2.5 text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
