"use client";

import { useState } from "react";
import { calcDuration } from "@/lib/sleep";
import { durationColor } from "@/lib/sleepQuality";

export interface RecordFormValues {
  date: string;
  bedtime: string;
  wakeTime: string;
  isMc: boolean;
}

// Bottom-sheet form for adding/editing a record. Mounted fresh each time it
// opens, so it owns its field state, seeded from `initial`.
export function RecordForm({
  initial,
  isEditing,
  onSave,
  onClose,
}: {
  initial: RecordFormValues;
  isEditing: boolean;
  onSave: (values: RecordFormValues) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(initial.date);
  const [bedtime, setBedtime] = useState(initial.bedtime);
  const [wakeTime, setWakeTime] = useState(initial.wakeTime);
  const [isMc, setIsMc] = useState(initial.isMc);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* Form card */}
      <div className="relative w-full max-w-lg bg-slate-900 rounded-t-2xl px-5 py-5 animate-[slideUp_0.2s_ease-out]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">
            {isEditing ? "編輯紀錄" : "新增紀錄"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Date */}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-400">日期</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
            />
          </label>

          {/* Bedtime & Wake time */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">🛏 上床時間</span>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">☀️ 起床時間</span>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
              />
            </label>
          </div>

          {/* MC checkbox */}
          <button
            type="button"
            onClick={() => setIsMc((v) => !v)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors active:scale-[0.98] ${
              isMc
                ? "bg-rose-500/10 border-rose-500/50"
                : "bg-slate-800 border-slate-700 hover:border-slate-600"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center text-sm ${
                isMc ? "bg-rose-500 text-white" : "border border-slate-600"
              }`}
            >
              {isMc && "●"}
            </span>
            <span
              className={`text-base ${isMc ? "text-rose-300" : "text-slate-300"}`}
            >
              MC 生理期
            </span>
          </button>

          {/* Preview */}
          <div className="text-center py-2">
            {bedtime && wakeTime ? (
              <>
                <span className="text-sm text-slate-400">預估睡眠時長：</span>
                <span
                  className={`text-lg font-bold ${durationColor(bedtime, wakeTime)}`}
                >
                  {calcDuration(bedtime, wakeTime)}
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-400">
                填入上床和起床時間後，自動計算睡眠時長
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={() => onSave({ date, bedtime, wakeTime, isMc })}
            disabled={!bedtime}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-4 rounded-2xl transition-colors active:scale-95"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
