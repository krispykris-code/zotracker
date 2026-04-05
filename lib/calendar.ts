import { calcMinutes } from "./sleep";

// ─── Month grid generation ───────────────────────────
// Returns 42 cells (6 weeks × 7 days) — Sunday to Saturday.
// Cells outside the given month are null.
export function getMonthGrid(
  year: number,
  month: number // 0-11
): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  // Leading nulls
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  // Trailing nulls to fill 42 cells
  while (cells.length < 42) {
    cells.push(null);
  }
  return cells;
}

// Returns recent n months in reverse chronological order (newest first)
export function getRecentMonths(n: number): { year: number; month: number }[] {
  const today = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

// Returns background color class based on sleep duration
export function getSleepBgColor(bedtime: string, wakeTime: string): string {
  if (!bedtime || !wakeTime) return "bg-slate-800/30";
  const mins = calcMinutes(bedtime, wakeTime);
  if (mins >= 420) return "bg-emerald-500/30"; // >= 7h
  if (mins >= 360) return "bg-amber-400/30"; // >= 6h
  return "bg-rose-500/30"; // < 6h
}

export function getSleepTextColor(bedtime: string, wakeTime: string): string {
  if (!bedtime || !wakeTime) return "text-slate-500";
  const mins = calcMinutes(bedtime, wakeTime);
  if (mins >= 420) return "text-emerald-200";
  if (mins >= 360) return "text-amber-200";
  return "text-rose-200";
}

// Format date to YYYY-MM-DD matching Firestore record format
export function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
