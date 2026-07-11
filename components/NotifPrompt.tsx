"use client";

export function NotifPrompt({ onEnable }: { onEnable: () => void }) {
  return (
    <div className="mx-5 mt-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
      <span className="text-xl shrink-0">🔔</span>
      <p className="text-indigo-300 text-sm flex-1">
        開啟通知，睡不夠時提醒你早點睡
      </p>
      <button
        onClick={onEnable}
        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 transition-colors"
      >
        開啟
      </button>
    </div>
  );
}
