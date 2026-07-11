import type { SleepRecord } from "./types";

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

// All records grouped by date — every person, unlike the calendar cell
// coloring which shows only the filtered person. Powers the day detail sheet.
export function groupRecordsByDate(
  records: SleepRecord[]
): Record<string, SleepRecord[]> {
  const map: Record<string, SleepRecord[]> = {};
  for (const r of records) {
    (map[r.date] ??= []).push(r);
  }
  return map;
}
