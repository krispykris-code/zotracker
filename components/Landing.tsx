"use client";

import { useState } from "react";
import { JoinRoomOverlay } from "./JoinRoomOverlay";

// Landing screen shown when there is no room in the URL.
export function Landing({
  onCreateRoom,
  onJoinRoom,
}: {
  onCreateRoom: () => void;
  onJoinRoom: (input: string) => void;
}) {
  const [showJoinInput, setShowJoinInput] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 gap-8">
      <div className="text-center">
        <div className="text-5xl mb-4">🌙</div>
        <h1 className="text-3xl font-bold mb-2">ZoTracker</h1>
        <p className="text-slate-400">和朋友一起記錄睡眠</p>
      </div>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={onCreateRoom}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-6 rounded-2xl text-lg transition-colors active:scale-95"
        >
          建立房間
        </button>
        <button
          onClick={() => setShowJoinInput(true)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-6 rounded-2xl text-lg transition-colors active:scale-95"
        >
          加入房間
        </button>
      </div>

      {showJoinInput && (
        <JoinRoomOverlay
          onJoin={onJoinRoom}
          onClose={() => setShowJoinInput(false)}
        />
      )}

      <p className="text-slate-500 text-sm text-center max-w-xs">
        建立房間後分享連結給朋友，
        <br />
        就能一起記錄和查看彼此的睡眠！
      </p>
    </div>
  );
}
