"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SleepRecord } from "@/lib/types";
import {
  getMonthGrid,
  getRecentMonths,
  groupRecordsByDate,
} from "@/lib/calendar";
import { getSleepBgColor, getSleepTextColor } from "@/lib/sleepQuality";
import { dateToStr, isSameDay } from "@/lib/dates";
import { useRoomId } from "@/hooks/useRoomId";
import { useRoomRecords } from "@/hooks/useRoomRecords";
import { useLocalStorageValue } from "@/hooks/useLocalStorageValue";
import { AppHeader } from "@/components/AppHeader";
import { PersonFilter } from "@/components/PersonFilter";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DayDetailSheet } from "@/components/DayDetailSheet";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function CalendarPage() {
  const roomId = useRoomId();
  const { records, loading, error } = useRoomRecords(roomId, "asc");
  const [savedName] = useLocalStorageValue("zotracker-name");
  // Defaults to the current user; switching chips overrides it.
  const [personOverride, setPersonOverride] = useState<string | null>(null);
  const selectedPerson = personOverride ?? savedName;
  // Tapped day → detail sheet with everyone's records for that date.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ─── Person list ──────────────────────────────────
  const persons = useMemo(
    () => [...new Set(records.map((r) => r.person))],
    [records]
  );

  // ─── Filtered records by selected person ──────────
  const recordMap = useMemo(() => {
    const map: Record<string, SleepRecord> = {};
    for (const r of records) {
      if (selectedPerson && r.person !== selectedPerson) continue;
      map[r.date] = r;
    }
    return map;
  }, [records, selectedPerson]);

  // ─── All records per date (every person) ──────────
  const allByDate = useMemo(() => groupRecordsByDate(records), [records]);

  // ─── Months to display ─────────────────────────────
  const months = useMemo(() => getRecentMonths(3), []);
  const today = useMemo(() => new Date(), []);

  if (!roomId) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        找不到房間 ID
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col max-w-lg mx-auto w-full">
      <AppHeader
        title={<h1 className="text-xl font-bold">📅 行事曆</h1>}
        subtitle={`Room: ${roomId}`}
        actions={
          <Link
            href={`/?room=${roomId}`}
            className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-xl transition-colors active:scale-95"
          >
            ← 返回
          </Link>
        }
      />

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-4">
        {error && (
          <p className="text-center text-rose-400 text-sm mb-3">
            連線異常，顯示的可能是離線資料
          </p>
        )}
        {loading && <LoadingSpinner />}
        {!loading && (
          <>
        {records.length === 0 && (
          <div className="text-center text-slate-400 mt-4 mb-6">
            <div className="text-4xl mb-3">📅</div>
            <p>這個房間還沒有任何紀錄</p>
            <p className="text-sm mt-1">開始記錄後，月曆會用顏色標示每天的睡眠！</p>
          </div>
        )}
        {/* Person filter */}
        {persons.length > 0 && (
          <PersonFilter
            persons={persons}
            selected={selectedPerson}
            onSelect={setPersonOverride}
            className="mb-3"
          />
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-5 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/30"></span>
            <span>≥7h</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-400/30"></span>
            <span>6-7h</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-rose-500/30"></span>
            <span>&lt;6h</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            <span>MC</span>
          </div>
        </div>

        {/* Months */}
        {months.map(({ year, month }) => {
          const grid = getMonthGrid(year, month);
          return (
            <div key={`${year}-${month}`} className="mb-6">
              <h2 className="text-base font-semibold text-slate-300 mb-3">
                {year} 年 {month + 1} 月
              </h2>
              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    className="text-center text-xs text-slate-400 py-1"
                  >
                    {w}
                  </div>
                ))}
              </div>
              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {grid.map((date, idx) => {
                  if (!date) {
                    return <div key={idx} className="aspect-square"></div>;
                  }
                  const dateStr = dateToStr(date);
                  const record = recordMap[dateStr];
                  const bgColor = record
                    ? getSleepBgColor(record.bedtime, record.wakeTime)
                    : "bg-slate-800/30";
                  const textColor = record
                    ? getSleepTextColor(record.bedtime, record.wakeTime)
                    : "text-slate-500";
                  const isToday = isSameDay(date, today);
                  const dayCount = allByDate[dateStr]?.length ?? 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(dateStr)}
                      aria-label={`${month + 1}月${date.getDate()}日，${dayCount} 筆紀錄`}
                      className={`relative aspect-square rounded-lg ${bgColor} ${
                        isToday ? "ring-2 ring-indigo-400" : ""
                      } flex items-start justify-start p-1 active:scale-95 transition-transform`}
                    >
                      <span
                        className={`text-sm font-medium ${textColor} leading-none`}
                      >
                        {date.getDate()}
                      </span>
                      {record?.isMc && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
          </>
        )}
      </main>

      {selectedDate && (
        <DayDetailSheet
          dateStr={selectedDate}
          records={allByDate[selectedDate] ?? []}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
