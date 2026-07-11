import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calcMinutes,
  calcDuration,
  calcHours,
  smartDefaults,
  timeStr,
  todayStr,
  getPersonChartColor,
} from "../sleep";

describe("calcMinutes", () => {
  it("computes same-day duration", () => {
    expect(calcMinutes("01:30", "09:15")).toBe(465);
    expect(calcMinutes("00:00", "07:00")).toBe(420);
  });

  it("wraps overnight durations across midnight", () => {
    expect(calcMinutes("23:00", "07:00")).toBe(480);
    expect(calcMinutes("22:00", "06:30")).toBe(510);
    expect(calcMinutes("23:59", "00:01")).toBe(2);
  });

  it("returns 1440 for equal bed and wake time (known quirk, locked)", () => {
    // mins <= 0 always adds 24h, so identical times count as a full day.
    expect(calcMinutes("12:00", "12:00")).toBe(1440);
  });
});

describe("calcDuration", () => {
  it("formats hours and minutes", () => {
    expect(calcDuration("01:30", "09:15")).toBe("7h 45m");
  });

  it("omits minutes when they are zero", () => {
    expect(calcDuration("23:00", "07:00")).toBe("8h");
  });
});

describe("calcHours", () => {
  it("rounds to one decimal", () => {
    expect(calcHours("23:00", "06:30")).toBe(7.5);
    expect(calcHours("23:00", "06:25")).toBe(7.4); // 445 min = 7.4166…
  });
});

describe("smartDefaults", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("assumes just-woke-up between 06:00 and 13:59 (wake = now, bed = 8h ago)", () => {
    vi.setSystemTime(new Date(2026, 6, 11, 8, 30));
    expect(smartDefaults()).toEqual({
      date: "2026-07-11",
      bedtime: "00:30",
      wakeTime: "08:30",
    });
  });

  it("includes 06:00 in the morning branch, bedtime crossing to previous evening", () => {
    vi.setSystemTime(new Date(2026, 6, 11, 6, 0));
    expect(smartDefaults()).toEqual({
      date: "2026-07-11",
      bedtime: "22:00", // 8h before 06:00, previous calendar day
      wakeTime: "06:00",
    });
  });

  it("assumes going-to-bed from 14:00 onward (bed = now, wake empty)", () => {
    vi.setSystemTime(new Date(2026, 6, 11, 14, 0));
    expect(smartDefaults()).toEqual({
      date: "2026-07-11",
      bedtime: "14:00",
      wakeTime: "",
    });
  });

  it("treats late night before 06:00 as going-to-bed", () => {
    vi.setSystemTime(new Date(2026, 6, 11, 5, 59));
    expect(smartDefaults()).toEqual({
      date: "2026-07-11",
      bedtime: "05:59",
      wakeTime: "",
    });
  });
});

describe("timeStr / todayStr", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats HH:MM from a Date", () => {
    expect(timeStr(new Date(2026, 6, 11, 9, 5))).toBe("09:05");
    expect(timeStr(new Date(2026, 6, 11, 23, 59))).toBe("23:59");
  });

  it("todayStr returns local YYYY-MM-DD", () => {
    vi.setSystemTime(new Date(2026, 6, 11, 23, 30));
    expect(todayStr()).toBe("2026-07-11");
  });
});

describe("getPersonChartColor", () => {
  it("is stable per name and distinct across names", () => {
    const a = getPersonChartColor("淳予");
    const b = getPersonChartColor("小明");
    expect(getPersonChartColor("淳予")).toBe(a);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
