"use client";

import type { SleepRecord } from "@/lib/types";
import { calcDuration } from "@/lib/sleep";
import { durationColor } from "@/lib/sleepQuality";
import { formatShortDate, formatWeekday } from "@/lib/dates";

export function RecordCard({
  record,
  isOwn,
  onEdit,
  onDelete,
}: {
  record: SleepRecord;
  isOwn: boolean;
  onEdit: (r: SleepRecord) => void;
  onDelete: (id: string) => void;
}) {
  const r = record;
  return (
    <div className="bg-slate-800/60 rounded-xl px-3 py-2 flex items-center gap-2.5">
      {/* Date badge */}
      <div className="w-12 h-12 rounded-lg bg-slate-700/80 flex flex-col items-center justify-center shrink-0">
        <span className="text-base font-semibold text-slate-200 leading-none">
          {formatShortDate(r.date)}
        </span>
        <span className="text-xs text-slate-400 leading-none mt-1">
          {formatWeekday(r.date)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-medium truncate">{r.person}</span>
          {r.isMc && (
            <span className="text-rose-500 text-lg leading-none">●</span>
          )}
          {r.wakeTime ? (
            <span
              className={`text-lg font-semibold ${durationColor(r.bedtime, r.wakeTime)}`}
            >
              {calcDuration(r.bedtime, r.wakeTime)}
            </span>
          ) : (
            <span className="text-sm text-slate-400">待補起床時間</span>
          )}
        </div>
        <div className="text-lg text-slate-400">
          🛏 {r.bedtime}
          {r.wakeTime ? ` → ☀️ ${r.wakeTime}` : ""}
        </div>
      </div>

      {/* Edit / Delete (own records only) */}
      {isOwn && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(r)}
            aria-label="編輯紀錄"
            className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-xl text-slate-300 rounded-lg transition-colors active:scale-95"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(r.id)}
            aria-label="刪除紀錄"
            className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-rose-500/20 text-xl text-slate-400 hover:text-rose-400 rounded-lg transition-colors active:scale-95"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
