"use client";

export interface ToastMessage {
  type: "updating" | "complete" | "error";
  text: string;
}

const STYLES: Record<ToastMessage["type"], string> = {
  updating: "bg-indigo-500/95 border border-indigo-400/60 text-white",
  complete: "bg-emerald-500/95 border border-emerald-400/60 text-white",
  error: "bg-rose-500/95 border border-rose-400/60 text-white",
};

// Centered fixed toast (更新中 / 更新完成 / 錯誤).
export function Toast({ message }: { message: ToastMessage | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className={`fixed top-1/2 left-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-6 py-4 text-base font-medium shadow-2xl animate-[fadeInScale_0.2s_ease-out] ${STYLES[message.type]}`}
    >
      {message.text}
    </div>
  );
}
