"use client";

import { useMemo } from "react";
import type { SleepRecord } from "@/lib/types";
import { computeInsights } from "@/lib/insights";

function fmtHoursDiff(h: number): string {
  const abs = Math.abs(h);
  return h === 0 ? "差不多" : h > 0 ? `多睡 ${abs}h` : `少睡 ${abs}h`;
}

function fmtBedDiff(m: number): string {
  const abs = Math.abs(m);
  return m === 0 ? "就寢時間相同" : m > 0 ? `晚睡 ${abs} 分` : `早睡 ${abs} 分`;
}

// Personal insight cards for the stats page. `records` must already be
// range-filtered, wake-time-complete records of a single person.
export function InsightCards({ records }: { records: SleepRecord[] }) {
  const insights = useMemo(() => computeInsights(records), [records]);
  if (!insights) return null;

  const regularityColor =
    insights.regularity === null
      ? "text-slate-400"
      : insights.regularity.label === "很規律"
        ? "text-emerald-400"
        : insights.regularity.label === "還算規律"
          ? "text-amber-300"
          : "text-rose-400";

  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-slate-400 mb-3">個人洞察</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/60 rounded-2xl p-4 text-center">
          <p className="text-sm text-slate-400 mb-1">平均作息</p>
          <p className="text-base font-bold leading-relaxed">
            🛏 {insights.avgBedtime}
            <br />☀️ {insights.avgWakeTime}
          </p>
        </div>

        <div className="bg-slate-800/60 rounded-2xl p-4 text-center">
          <p className="text-sm text-slate-400 mb-1">就寢規律性</p>
          {insights.regularity ? (
            <>
              <p className={`text-lg font-bold ${regularityColor}`}>
                {insights.regularity.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                ±{insights.regularity.sd} 分鐘
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">
              資料不足
              <br />
              （需至少 3 筆）
            </p>
          )}
        </div>

        <div className="bg-slate-800/60 rounded-2xl p-4 text-center">
          <p className="text-sm text-slate-400 mb-1">週末 vs 週間</p>
          {insights.weekdayWeekend ? (
            <p className="text-base font-bold leading-relaxed">
              {fmtHoursDiff(insights.weekdayWeekend.durationDiffHours)}
              <br />
              <span className="text-sm font-medium text-slate-300">
                {fmtBedDiff(insights.weekdayWeekend.bedtimeDiffMins)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-slate-400 mt-2">
              資料不足
              <br />
              （兩組各需 2 筆）
            </p>
          )}
        </div>

        <div className="bg-slate-800/60 rounded-2xl p-4 text-center">
          <p className="text-sm text-slate-400 mb-1">睡滿 7 小時</p>
          <p
            className={`text-2xl font-bold ${
              insights.goalRate >= 80
                ? "text-emerald-400"
                : insights.goalRate >= 50
                  ? "text-amber-300"
                  : "text-rose-400"
            }`}
          >
            {insights.goalRate}%
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {insights.count} 晚中有{" "}
            {Math.round((insights.goalRate / 100) * insights.count)} 晚達標
          </p>
        </div>
      </div>
    </div>
  );
}
