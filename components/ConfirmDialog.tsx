"use client";

import { useModalBehavior } from "@/hooks/useModalBehavior";

// App-styled confirmation dialog (replaces native confirm()).
// Visual language matches the room-deletion confirm step.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "確定",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useModalBehavior(onCancel);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-full max-w-xs bg-slate-900 rounded-2xl px-5 py-5">
        <div className="text-center mb-4">
          <span className="text-3xl">⚠️</span>
          <h3 className="font-semibold text-lg mt-2">{title}</h3>
        </div>
        <p className="text-sm text-slate-400 text-center mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
