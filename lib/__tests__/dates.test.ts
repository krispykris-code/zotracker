import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatShortDate,
  formatWeekday,
  todayStr,
  dateToStr,
  isSameDay,
  daysAgo,
  yesterdayStr,
  getWeekLabel,
  getMonthLabel,
} from "../dates";

describe("formatShortDate", () => {
  it("formats M/D without leading zeros", () => {
    expect(formatShortDate("2026-07-11")).toBe("7/11");
    expect(formatShortDate("2026-01-05")).toBe("1/5");
    expect(formatShortDate("2026-12-31")).toBe("12/31");
  });
});

describe("formatWeekday", () => {
  it("returns Taiwanese weekday characters", () => {
    expect(formatWeekday("2026-07-11")).toBe("六"); // Saturday
    expect(formatWeekday("2026-07-12")).toBe("日"); // Sunday
    expect(formatWeekday("2026-07-13")).toBe("一"); // Monday
  });
});

describe("dateToStr", () => {
  it("zero-pads month and day", () => {
    expect(dateToStr(new Date(2026, 6, 5))).toBe("2026-07-05");
    expect(dateToStr(new Date(2026, 11, 31))).toBe("2026-12-31");
    expect(dateToStr(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("todayStr / dateToStr equivalence", () => {
  // todayStr (sv-SE locale trick) and dateToStr (manual padStart) are two
  // implementations of the same YYYY-MM-DD format. This lock guarantees the
  // planned consolidation onto dateToStr cannot change behavior.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    new Date(2026, 6, 11, 0, 0, 1),
    new Date(2026, 6, 11, 23, 59, 59),
    new Date(2026, 0, 1, 12, 0),
    new Date(2026, 11, 31, 23, 30),
  ])("agree at %s", (moment) => {
    vi.setSystemTime(moment);
    expect(todayStr()).toBe(dateToStr(new Date()));
  });
});

describe("daysAgo / yesterdayStr", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 11, 9, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes offsets in local time", () => {
    expect(daysAgo(7)).toBe("2026-07-04");
    expect(daysAgo(30)).toBe("2026-06-11");
    expect(yesterdayStr()).toBe("2026-07-10");
  });

  it("crosses month boundaries", () => {
    vi.setSystemTime(new Date(2026, 7, 3, 9, 0)); // Aug 3
    expect(daysAgo(7)).toBe("2026-07-27");
  });
});

describe("getWeekLabel / getMonthLabel", () => {
  it("labels the Monday of the containing week", () => {
    expect(getWeekLabel("2026-07-11")).toBe("7/6"); // Saturday → Mon 7/6
    expect(getWeekLabel("2026-07-12")).toBe("7/6"); // Sunday belongs to prior Monday
    expect(getWeekLabel("2026-07-13")).toBe("7/13"); // Monday is its own label
  });

  it("labels year/month", () => {
    expect(getMonthLabel("2026-07-11")).toBe("2026/7");
    expect(getMonthLabel("2026-12-01")).toBe("2026/12");
  });
});

describe("isSameDay", () => {
  it("compares calendar days ignoring time", () => {
    expect(
      isSameDay(new Date(2026, 6, 11, 1, 0), new Date(2026, 6, 11, 23, 0))
    ).toBe(true);
    expect(isSameDay(new Date(2026, 6, 11), new Date(2026, 6, 12))).toBe(false);
    expect(isSameDay(new Date(2026, 6, 11), new Date(2025, 6, 11))).toBe(false);
  });
});
