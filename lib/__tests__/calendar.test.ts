import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMonthGrid, getRecentMonths, groupRecordsByDate } from "../calendar";
import type { SleepRecord } from "../types";

describe("getMonthGrid", () => {
  it("always returns 42 cells (6 weeks × 7 days)", () => {
    for (const [y, m] of [
      [2026, 0],
      [2026, 6],
      [2024, 1],
      [2026, 11],
    ]) {
      expect(getMonthGrid(y, m)).toHaveLength(42);
    }
  });

  it("July 2026 starts on a Wednesday → 3 leading nulls", () => {
    const grid = getMonthGrid(2026, 6);
    expect(grid[0]).toBeNull();
    expect(grid[1]).toBeNull();
    expect(grid[2]).toBeNull();
    expect(grid[3]).toEqual(new Date(2026, 6, 1));
    expect(grid[33]).toEqual(new Date(2026, 6, 31));
    expect(grid[34]).toBeNull();
  });

  it("handles leap-year February (2024 has 29 days)", () => {
    const days = getMonthGrid(2024, 1).filter((c) => c !== null);
    expect(days).toHaveLength(29);
    expect(days[28]).toEqual(new Date(2024, 1, 29));
  });

  it("handles non-leap February (2026 has 28 days)", () => {
    expect(getMonthGrid(2026, 1).filter((c) => c !== null)).toHaveLength(28);
  });
});

describe("groupRecordsByDate", () => {
  const rec = (id: string, date: string, person: string): SleepRecord => ({
    id,
    date,
    bedtime: "23:00",
    wakeTime: "07:00",
    person,
    createdAt: 0,
  });

  it("keeps every person's record for the same date", () => {
    const a = rec("a", "2026-07-10", "淳予");
    const b = rec("b", "2026-07-10", "小明");
    const c = rec("c", "2026-07-11", "淳予");
    expect(groupRecordsByDate([a, b, c])).toEqual({
      "2026-07-10": [a, b],
      "2026-07-11": [c],
    });
  });

  it("returns an empty map for no records", () => {
    expect(groupRecordsByDate([])).toEqual({});
  });
});

describe("getRecentMonths", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns newest-first months", () => {
    vi.setSystemTime(new Date(2026, 6, 11));
    expect(getRecentMonths(3)).toEqual([
      { year: 2026, month: 6 },
      { year: 2026, month: 5 },
      { year: 2026, month: 4 },
    ]);
  });

  it("wraps across the year boundary", () => {
    vi.setSystemTime(new Date(2026, 0, 15));
    expect(getRecentMonths(3)).toEqual([
      { year: 2026, month: 0 },
      { year: 2025, month: 11 },
      { year: 2025, month: 10 },
    ]);
  });
});
