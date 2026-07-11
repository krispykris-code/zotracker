"use client";

import type { SleepRecord } from "@/lib/types";
import { calcDuration } from "@/lib/sleep";
import { durationColor } from "@/lib/sleepQuality";
import { formatShortDate, formatWeekday } from "@/lib/dates";
import { getPersonChartColor } from "@/lib/personColors";
import { useModalBehavior } from "@/hooks/useModalBehavior";

// Bottom sheet showing every person's record for one calendar day.
// (Calendar cells color by the filtered person; this always shows everyone.)
export function DayDetailSheet({
  dateStr,
  records,
  onClose,
}: {
  dateStr: string;
  records: SleepRecord[];
  onClose: () => void;
}) {
  const ref = useModalBehavior(onClose);
  const title = `${formatShortDate(dateStr)}（${formatWeekday(dateStr)}）`;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} 的睡眠紀錄`}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 rounded-t-2xl px-5 py-5 animate-[slideUp_0.2s_ease-out]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button
            onClick={onClose}
            aria-label="關閉"
            className="text-slate-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {records.length === 0 ? (
          <p className="text-center text-slate-400 py-6">這天沒有紀錄</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto no-scrollbar">
            {records.map((r) => (
              <div
                key={r.id}
                className="bg-slate-800/60 rounded-xl px-3 py-2.5 flex items-center gap-2.5"
              >
                <span
                  aria-hidden
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: getPersonChartColor(r.person) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-medium truncate">
                      {r.person}
                    </span>
                    {r.isMc && (
                      <span className="text-rose-500 text-base leading-none">
                        ●
                      </span>
                    )}
                    {r.wakeTime ? (
                      <span
                        className={`text-base font-semibold ${durationColor(r.bedtime, r.wakeTime)}`}
                      >
                        {calcDuration(r.bedtime, r.wakeTime)}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">
                        待補起床時間
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400">
                    🛏 {r.bedtime}
                    {r.wakeTime ? ` → ☀️ ${r.wakeTime}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
