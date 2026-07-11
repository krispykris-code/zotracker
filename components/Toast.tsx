"use client";

import type { ToastMessage } from "@/hooks/useAppUpdate";

// Centered fixed toast for update states (更新中 / 更新完成).
export function Toast({ message }: { message: ToastMessage | null }) {
  if (!message) return null;
  return (
    <div
      className={`fixed top-1/2 left-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-6 py-4 text-base font-medium shadow-2xl animate-[fadeInScale_0.2s_ease-out] ${
        message.type === "updating"
          ? "bg-indigo-500/95 border border-indigo-400/60 text-white"
          : "bg-emerald-500/95 border border-emerald-400/60 text-white"
      }`}
    >
      {message.text}
    </div>
  );
}
