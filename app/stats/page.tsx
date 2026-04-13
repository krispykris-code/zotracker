"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { db } from "@/lib/firebase";
import { SleepRecord } from "@/lib/types";
import {
  calcHours,
  calcDuration,
  formatShortDate,
  getPersonChartColor,
} from "@/lib/sleep";

type Range = "7d" | "30d" | "all";

function getRoomId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("room");
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("sv-SE");
}

// ─── Weekly / Monthly averages ───────────────────────
function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  // Find Monday of that week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return `${mon.getMonth() + 1}/${mon.getDate()}`;
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}`;
}

export default function StatsPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [range, setRange] = useState<Range>("7d");
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  useEffect(() => {
    setRoomId(getRoomId());
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

  // ─── Derived data ──────────────────────────────────
  const persons = useMemo(
    () => [...new Set(records.map((r) => r.person))],
    [records]
  );

  const filteredRecords = useMemo(() => {
    let cutoff = "";
    if (range === "7d") cutoff = daysAgo(7);
    else if (range === "30d") cutoff = daysAgo(30);

    return records
      .filter((r) => (cutoff ? r.date >= cutoff : true))
      .filter((r) => (selectedPerson ? r.person === selectedPerson : true));
  }, [records, range, selectedPerson]);

  // ─── Chart data: one point per date, hours per person ─
  const chartData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    for (const r of filteredRecords) {
      if (!dateMap[r.date]) dateMap[r.date] = {};
      dateMap[r.date][r.person] = calcHours(r.bedtime, r.wakeTime);
    }
    const dates = Object.keys(dateMap).sort();
    return dates.map((date) => ({
      date,
      label: formatShortDate(date),
      ...dateMap[date],
    }));
  }, [filteredRecords]);

  const chartPersons = useMemo(() => {
    const set = new Set<string>();
    for (const r of filteredRecords) set.add(r.person);
    return [...set];
  }, [filteredRecords]);

  // ─── Averages ──────────────────────────────────────
  const weeklyAvg = useMemo(() => {
    const groups: Record<string, number[]> = {};
    for (const r of filteredRecords) {
      const wk = getWeekLabel(r.date);
      if (!groups[wk]) groups[wk] = [];
      groups[wk].push(calcHours(r.bedtime, r.wakeTime));
    }
    return Object.entries(groups).map(([week, hours]) => ({
      label: `${week} 週`,
      avg: Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10,
      count: hours.length,
    }));
  }, [filteredRecords]);

  const monthlyAvg = useMemo(() => {
    const groups: Record<string, number[]> = {};
    for (const r of filteredRecords) {
      const mo = getMonthLabel(r.date);
      if (!groups[mo]) groups[mo] = [];
      groups[mo].push(calcHours(r.bedtime, r.wakeTime));
    }
    return Object.entries(groups).map(([month, hours]) => ({
      label: month,
      avg: Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10,
      count: hours.length,
    }));
  }, [filteredRecords]);

  // ─── Overall stats ─────────────────────────────────
  const overallAvg = useMemo(() => {
    if (filteredRecords.length === 0) return 0;
    const total = filteredRecords.reduce(
      (sum, r) => sum + calcHours(r.bedtime, r.wakeTime),
      0
    );
    return Math.round((total / filteredRecords.length) * 10) / 10;
  }, [filteredRecords]);

  const bestDay = useMemo(() => {
    if (filteredRecords.length === 0) return null;
    return filteredRecords.reduce((best, r) => {
      const h = calcHours(r.bedtime, r.wakeTime);
      const bestH = calcHours(best.bedtime, best.wakeTime);
      return h > bestH ? r : best;
    });
  }, [filteredRecords]);

  // ═══════════════════════════════════════════════════
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
          <h1 className="text-xl font-bold">📊 睡眠統計</h1>
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
        {/* Range selector */}
        <div className="flex gap-2 mb-4">
          {(["7d", "30d", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                range === r
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {r === "7d" ? "近 7 天" : r === "30d" ? "近 30 天" : "全部"}
            </button>
          ))}
        </div>

        {/* Person filter */}
        {persons.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedPerson(null)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                !selectedPerson
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              全部
            </button>
            {persons.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPerson(p === selectedPerson ? null : p)}
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

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-800/60 rounded-2xl p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">平均睡眠</p>
            <p className="text-2xl font-bold">
              {overallAvg > 0 ? `${overallAvg}h` : "—"}
            </p>
          </div>
          <div className="bg-slate-800/60 rounded-2xl p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">最佳紀錄</p>
            <p className="text-2xl font-bold">
              {bestDay ? calcDuration(bestDay.bedtime, bestDay.wakeTime) : "—"}
            </p>
            {bestDay && (
              <p className="text-xs text-slate-500 mt-0.5">
                {formatShortDate(bestDay.date)} · {bestDay.person}
              </p>
            )}
          </div>
        </div>

        {/* Trend chart */}
        {chartData.length > 1 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-slate-400 mb-3">
              睡眠趨勢
            </h2>
            <div className="bg-slate-800/60 rounded-2xl p-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    domain={[0, 12]}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={{ stroke: "#334155" }}
                    tickFormatter={(v: number) => `${v}h`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                    formatter={(value) => [`${value}h`, "睡眠"]}
                  />
                  <ReferenceLine
                    y={7}
                    stroke="#34d399"
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    label={{
                      value: "7h",
                      fill: "#34d399",
                      fontSize: 11,
                      position: "right",
                    }}
                  />
                  {chartPersons.map((person) => (
                    <Line
                      key={person}
                      type="monotone"
                      dataKey={person}
                      stroke={getPersonChartColor(person)}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: getPersonChartColor(person) }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {chartPersons.length > 1 && (
                <div className="flex justify-center gap-4 mt-2">
                  {chartPersons.map((p) => (
                    <div key={p} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: getPersonChartColor(p) }}
                      />
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weekly averages */}
        {weeklyAvg.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-slate-400 mb-3">
              每週平均
            </h2>
            <div className="flex flex-col gap-2">
              {weeklyAvg.map((w) => (
                <div
                  key={w.label}
                  className="bg-slate-800/60 rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-sm text-slate-300">{w.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {w.count} 筆
                    </span>
                    <span
                      className={`font-semibold ${
                        w.avg >= 7
                          ? "text-emerald-400"
                          : w.avg >= 6
                            ? "text-amber-300"
                            : "text-rose-400"
                      }`}
                    >
                      {w.avg}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly averages */}
        {monthlyAvg.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-slate-400 mb-3">
              每月平均
            </h2>
            <div className="flex flex-col gap-2">
              {monthlyAvg.map((m) => (
                <div
                  key={m.label}
                  className="bg-slate-800/60 rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-sm text-slate-300">{m.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {m.count} 筆
                    </span>
                    <span
                      className={`font-semibold ${
                        m.avg >= 7
                          ? "text-emerald-400"
                          : m.avg >= 6
                            ? "text-amber-300"
                            : "text-rose-400"
                      }`}
                    >
                      {m.avg}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredRecords.length === 0 && (
          <div className="text-center text-slate-500 mt-16">
            <div className="text-4xl mb-3">📊</div>
            <p>還沒有足夠的資料</p>
            <p className="text-sm mt-1">開始記錄睡眠後，統計數據會自動出現！</p>
          </div>
        )}
      </main>
    </div>
  );
}
