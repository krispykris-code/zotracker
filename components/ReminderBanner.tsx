"use client";

// Shown when yesterday's sleep was under 7 hours.
export function ReminderBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-5 mt-4 bg-amber-400/10 border border-amber-400/30 rounded-2xl px-4 py-3 flex items-start gap-3">
      <span className="text-2xl shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="text-amber-300 font-medium text-sm">
          昨天睡不到 7 小時！
        </p>
        <p className="text-amber-300/70 text-xs mt-0.5">
          今天記得早點上床，好好保護你的睡眠 💤
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-amber-300/50 hover:text-amber-300 text-sm shrink-0"
      >
        ✕
      </button>
    </div>
  );
}
