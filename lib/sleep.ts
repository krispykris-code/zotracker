import { todayStr, timeStr } from "./dates";
import type { SleepRecord } from "./types";

export function calcDuration(bedtime: string, wakeTime: string): string {
  const mins = calcMinutes(bedtime, wakeTime);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function calcMinutes(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60; // overnight
  return mins;
}

export function calcHours(bedtime: string, wakeTime: string): number {
  return Math.round((calcMinutes(bedtime, wakeTime) / 60) * 10) / 10;
}

// Records still waiting for a wake time (empty string) have no duration —
// stats math must go through this or every average becomes NaN.
export function filterComplete(records: SleepRecord[]): SleepRecord[] {
  return records.filter((r) => r.wakeTime);
}

export function smartDefaults(): {
  date: string;
  bedtime: string;
  wakeTime: string;
} {
  const now = new Date();
  const hour = now.getHours();
  const nowTime = timeStr(now);

  if (hour >= 6 && hour < 14) {
    const bed = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    return { date: todayStr(), bedtime: timeStr(bed), wakeTime: nowTime };
  } else {
    return { date: todayStr(), bedtime: nowTime, wakeTime: "" };
  }
}
