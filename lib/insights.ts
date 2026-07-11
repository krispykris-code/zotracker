import type { SleepRecord } from "./types";
import { calcMinutes } from "./sleep";
import { GOOD_SLEEP_MIN } from "./sleepQuality";

// Personal sleep insights, computed from ONE person's complete records
// (wakeTime present; filter with filterComplete first).
//
// Averaging clock times naively breaks across midnight (avg of 23:00 and
// 01:00 must be 00:00, not 12:00). Times are therefore re-anchored before
// averaging: bedtimes relative to noon (bedtimes cluster 21:00–03:00, far
// from noon), wake times relative to 18:00 (wakes cluster 05:00–12:00).
//
// NOTE on record.date semantics: with the smart-defaults flow, a record
// logged in the morning has date = wake day, one logged at night has
// date = bed day. Insights use date as-is; this ambiguity is accepted.

export const BED_ANCHOR = 720; // minutes — noon
export const WAKE_ANCHOR = 1080; // minutes — 18:00

export function anchorMinutes(time: string, anchor: number): number {
  const [h, m] = time.split(":").map(Number);
  let mins = h * 60 + m - anchor;
  if (mins < 0) mins += 1440;
  return mins;
}

export function anchoredToTime(anchored: number, anchor: number): string {
  const mins = Math.round(anchored + anchor) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  const mu = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - mu) ** 2)));
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + "T00:00:00").getDay();
  return day === 0 || day === 6;
}

export type RegularityLabel = "很規律" | "還算規律" | "不太規律";

export interface SleepInsights {
  count: number;
  avgBedtime: string; // "23:42"
  avgWakeTime: string; // "07:15"
  /** null when fewer than 3 records */
  regularity: { sd: number; label: RegularityLabel } | null;
  /** weekend minus weekday; null unless both groups have ≥ 2 records */
  weekdayWeekend: {
    durationDiffHours: number; // + = sleeps longer on weekends
    bedtimeDiffMins: number; // + = goes to bed later on weekends
  } | null;
  /** % of nights with ≥ 7h sleep, 0-100 */
  goalRate: number;
}

export function computeInsights(records: SleepRecord[]): SleepInsights | null {
  if (records.length === 0) return null;

  const beds = records.map((r) => anchorMinutes(r.bedtime, BED_ANCHOR));
  const wakes = records.map((r) => anchorMinutes(r.wakeTime, WAKE_ANCHOR));
  const durations = records.map((r) => calcMinutes(r.bedtime, r.wakeTime));

  const regularitySd = records.length >= 3 ? Math.round(stdDev(beds)) : null;
  const regularity =
    regularitySd === null
      ? null
      : {
          sd: regularitySd,
          label: (regularitySd <= 30
            ? "很規律"
            : regularitySd <= 60
              ? "還算規律"
              : "不太規律") as RegularityLabel,
        };

  const weekend = records.filter((r) => isWeekend(r.date));
  const weekday = records.filter((r) => !isWeekend(r.date));
  let weekdayWeekend: SleepInsights["weekdayWeekend"] = null;
  if (weekend.length >= 2 && weekday.length >= 2) {
    const dur = (group: SleepRecord[]) =>
      mean(group.map((r) => calcMinutes(r.bedtime, r.wakeTime)));
    const bed = (group: SleepRecord[]) =>
      mean(group.map((r) => anchorMinutes(r.bedtime, BED_ANCHOR)));
    weekdayWeekend = {
      durationDiffHours:
        Math.round(((dur(weekend) - dur(weekday)) / 60) * 10) / 10,
      bedtimeDiffMins: Math.round(bed(weekend) - bed(weekday)),
    };
  }

  return {
    count: records.length,
    avgBedtime: anchoredToTime(mean(beds), BED_ANCHOR),
    avgWakeTime: anchoredToTime(mean(wakes), WAKE_ANCHOR),
    regularity,
    weekdayWeekend,
    goalRate: Math.round(
      (durations.filter((d) => d >= GOOD_SLEEP_MIN).length / durations.length) *
        100
    ),
  };
}
