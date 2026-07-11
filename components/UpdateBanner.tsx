"use client";

export function UpdateBanner({
  onUpdate,
  onDismiss,
}: {
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-5 mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
      <span className="text-xl shrink-0">🆕</span>
      <p className="text-emerald-300 text-sm flex-1">有新功能可用</p>
      <button
        onClick={onUpdate}
        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 transition-colors active:scale-95"
      >
        立即更新
      </button>
      <button
        onClick={onDismiss}
        className="text-emerald-300/50 hover:text-emerald-300 text-sm shrink-0"
      >
        ✕
      </button>
    </div>
  );
}
