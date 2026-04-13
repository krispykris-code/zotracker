"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SleepRecord } from "@/lib/types";
import {
  getMonthGrid,
  getRecentMonths,
  getSleepBgColor,
  getSleepTextColor,
  dateToStr,
  isSameDay,
} from "@/lib/calendar";

function getRoomId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("room");
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function CalendarPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  useEffect(() => {
    setRoomId(getRoomId());
    const savedName = localStorage.getItem("zotracker-name");
    if (savedName) setSelectedPerson(savedName);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, "rooms", roomId, "records"),
      orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecords(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SleepRecord[]
      );
    });
    return () => unsub();
  }, [roomId]);

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
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold">📅 行事曆</h1>
          <p className="text-xs text-slate-500 mt-0.5">Room: {roomId}</p>
        </div>
        <Link
          href={`/?room=${roomId}`}
          className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-xl transition-colors active:scale-95"
        >
          ← 返回
        </Link>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-4">
        {/* Person filter */}
        {persons.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            {persons.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPerson(p)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedPerson === p
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
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
                    className="text-center text-xs text-slate-500 py-1"
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
                  return (
                    <div
                      key={idx}
                      className={`relative aspect-square rounded-lg ${bgColor} ${
                        isToday ? "ring-2 ring-indigo-400" : ""
                      } flex items-start justify-start p-1`}
                    >
                      <span
                        className={`text-sm font-medium ${textColor} leading-none`}
                      >
                        {date.getDate()}
                      </span>
                      {record?.isMc && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
