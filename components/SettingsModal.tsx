"use client";

import { useState } from "react";
import { APP_VERSION, APP_LAST_UPDATED } from "@/lib/version";

// Room settings: room ID, version info, manual update check, and the
// two-step room deletion flow (owns the confirm step internally).
export function SettingsModal({
  roomId,
  showLatestMessage,
  onCheckUpdate,
  onDeleteRoom,
  onClose,
}: {
  roomId: string;
  showLatestMessage: boolean;
  onCheckUpdate: () => void;
  onDeleteRoom: () => void;
  onClose: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-slate-900 rounded-2xl px-5 py-5">
        {!showDeleteConfirm ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">房間設定</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">房間 ID：{roomId}</p>

            {/* Divider */}
            <div className="border-t border-slate-800 my-4" />

            {/* Version info */}
            <div className="text-sm text-slate-400 space-y-1 mb-3">
              <div>Version: {APP_VERSION}</div>
              <div>Last Updated: {APP_LAST_UPDATED}</div>
            </div>

            <button
              onClick={onCheckUpdate}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors active:scale-95 mb-2"
            >
              檢查更新
            </button>

            {showLatestMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm text-center py-2 rounded-xl mb-3">
                ✓ 目前已經是最新版本
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-800 my-4" />

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold py-3 rounded-xl transition-colors active:scale-95"
            >
              刪除此房間所有資料
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-4">
              <span className="text-3xl">⚠️</span>
              <h3 className="font-semibold text-lg mt-2">確定要刪除嗎？</h3>
            </div>
            <p className="text-sm text-slate-400 text-center mb-5">
              此操作會永久刪除房間內所有人的睡眠紀錄，且無法復原。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
              >
                取消
              </button>
              <button
                onClick={onDeleteRoom}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
              >
                確定刪除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
