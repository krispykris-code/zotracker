import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getYesterdaySleep } from "../notifications";
import type { SleepRecord } from "../types";

function rec(overrides: Partial<SleepRecord>): SleepRecord {
  return {
    id: "2026-07-10_淳予",
    date: "2026-07-10",
    bedtime: "23:00",
    wakeTime: "07:00",
    person: "淳予",
    createdAt: 0,
    ...overrides,
  };
}

describe("getYesterdaySleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 11, 9, 0)); // yesterday = 2026-07-10
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("flags under-7h sleep from yesterday", () => {
    const records = [rec({ bedtime: "01:00", wakeTime: "07:00" })]; // 6h
    expect(getYesterdaySleep(records, "淳予")).toEqual({
      sleptUnder7h: true,
      duration: 360,
    });
  });

  it("exactly 7h does not nag", () => {
    const records = [rec({ bedtime: "00:00", wakeTime: "07:00" })]; // 420
    expect(getYesterdaySleep(records, "淳予")).toEqual({
      sleptUnder7h: false,
      duration: 420,
    });
  });

  it("no record for yesterday → no nag", () => {
    const records = [rec({ date: "2026-07-09" })];
    expect(getYesterdaySleep(records, "淳予")).toEqual({
      sleptUnder7h: false,
      duration: null,
    });
  });

  it("only matches the requested person", () => {
    const records = [rec({ person: "小明", bedtime: "02:00" })];
    expect(getYesterdaySleep(records, "淳予")).toEqual({
      sleptUnder7h: false,
      duration: null,
    });
  });

  it("pending wake time (empty string) → no nag (NaN comparison, locked)", () => {
    const records = [rec({ wakeTime: "" })];
    const result = getYesterdaySleep(records, "淳予");
    expect(result.sleptUnder7h).toBe(false);
    expect(result.duration).toBeNaN();
  });
});
