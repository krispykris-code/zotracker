import { calcMinutes } from "./sleep";

// Sleep-quality thresholds — the single source of truth.
// Green ≥ 7h, amber ≥ 6h, red < 6h, everywhere in the app.
export const GOOD_SLEEP_MIN = 420;
export const OK_SLEEP_MIN = 360;

// Text color for a duration shown next to a record (list, day detail).
export function durationColor(bedtime: string, wakeTime: string): string {
  const mins = calcMinutes(bedtime, wakeTime);
  if (mins >= GOOD_SLEEP_MIN) return "text-emerald-400";
  if (mins >= OK_SLEEP_MIN) return "text-amber-300";
  return "text-rose-400";
}

// Same scale for values already expressed in hours (stats averages).
export function hoursColor(hours: number): string {
  if (hours >= GOOD_SLEEP_MIN / 60) return "text-emerald-400";
  if (hours >= OK_SLEEP_MIN / 60) return "text-amber-300";
  return "text-rose-400";
}

// Calendar cell tinting (background + day-number text).
export function getSleepBgColor(bedtime: string, wakeTime: string): string {
  if (!bedtime || !wakeTime) return "bg-slate-800/30";
  const mins = calcMinutes(bedtime, wakeTime);
  if (mins >= GOOD_SLEEP_MIN) return "bg-emerald-500/30";
  if (mins >= OK_SLEEP_MIN) return "bg-amber-400/30";
  return "bg-rose-500/30";
}

export function getSleepTextColor(bedtime: string, wakeTime: string): string {
  if (!bedtime || !wakeTime) return "text-slate-500";
  const mins = calcMinutes(bedtime, wakeTime);
  if (mins >= GOOD_SLEEP_MIN) return "text-emerald-200";
  if (mins >= OK_SLEEP_MIN) return "text-amber-200";
  return "text-rose-200";
}
