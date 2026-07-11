import { describe, it, expect } from "vitest";
import {
  anchorMinutes,
  anchoredToTime,
  computeInsights,
  BED_ANCHOR,
  WAKE_ANCHOR,
} from "../insights";
import type { SleepRecord } from "../types";

function rec(date: string, bedtime: string, wakeTime: string): SleepRecord {
  return {
    id: `${date}_淳予`,
    date,
    bedtime,
    wakeTime,
    person: "淳予",
    createdAt: 0,
  };
}

describe("anchorMinutes / anchoredToTime", () => {
  it("anchors bedtimes to noon", () => {
    expect(anchorMinutes("23:30", BED_ANCHOR)).toBe(690);
    expect(anchorMinutes("01:00", BED_ANCHOR)).toBe(780);
    expect(anchorMinutes("12:00", BED_ANCHOR)).toBe(0);
  });

  it("round-trips back to clock time", () => {
    expect(anchoredToTime(690, BED_ANCHOR)).toBe("23:30");
    expect(anchoredToTime(780, BED_ANCHOR)).toBe("01:00");
    expect(anchoredToTime(0, WAKE_ANCHOR)).toBe("18:00");
  });
});

describe("computeInsights", () => {
  it("returns null for no records", () => {
    expect(computeInsights([])).toBeNull();
  });

  it("averages bedtimes across midnight correctly", () => {
    // 23:00 and 01:00 must average to 00:00 — the whole point of anchoring
    const insights = computeInsights([
      rec("2026-07-13", "23:00", "07:00"),
      rec("2026-07-14", "01:00", "07:00"),
    ])!;
    expect(insights.avgBedtime).toBe("00:00");
    expect(insights.avgWakeTime).toBe("07:00");
  });

  it("regularity requires at least 3 records", () => {
    const two = computeInsights([
      rec("2026-07-13", "23:00", "07:00"),
      rec("2026-07-14", "23:00", "07:00"),
    ])!;
    expect(two.regularity).toBeNull();
  });

  it("identical bedtimes → sd 0, 很規律", () => {
    const insights = computeInsights([
      rec("2026-07-13", "23:00", "07:00"),
      rec("2026-07-14", "23:00", "06:00"),
      rec("2026-07-15", "23:00", "08:00"),
    ])!;
    expect(insights.regularity).toEqual({ sd: 0, label: "很規律" });
  });

  it("scattered bedtimes → 不太規律", () => {
    // 21:00 / 23:00 / 01:00 anchored: 540/660/780, sd ≈ 98
    const insights = computeInsights([
      rec("2026-07-13", "21:00", "07:00"),
      rec("2026-07-14", "23:00", "07:00"),
      rec("2026-07-15", "01:00", "07:00"),
    ])!;
    expect(insights.regularity!.label).toBe("不太規律");
    expect(insights.regularity!.sd).toBeGreaterThan(60);
  });

  it("compares weekday vs weekend when both groups have ≥ 2 records", () => {
    // 2026-07-11 (六), 07-12 (日) weekend; 07-13 (一), 07-14 (二) weekdays
    const insights = computeInsights([
      rec("2026-07-11", "00:00", "09:00"), // weekend 9h, bed 00:00
      rec("2026-07-12", "00:00", "09:00"),
      rec("2026-07-13", "23:00", "07:00"), // weekday 8h, bed 23:00
      rec("2026-07-14", "23:00", "07:00"),
    ])!;
    expect(insights.weekdayWeekend).toEqual({
      durationDiffHours: 1, // 9h - 8h
      bedtimeDiffMins: 60, // 00:00 vs 23:00 → 60 min later
    });
  });

  it("weekday/weekend is null when a group is too small", () => {
    const insights = computeInsights([
      rec("2026-07-11", "23:00", "07:00"), // only 1 weekend record
      rec("2026-07-13", "23:00", "07:00"),
      rec("2026-07-14", "23:00", "07:00"),
    ])!;
    expect(insights.weekdayWeekend).toBeNull();
  });

  it("computes the 7h goal rate", () => {
    const insights = computeInsights([
      rec("2026-07-13", "23:00", "07:00"), // 8h ✓
      rec("2026-07-14", "23:00", "06:00"), // 7h ✓ (boundary)
      rec("2026-07-15", "23:00", "05:00"), // 6h ✗
    ])!;
    expect(insights.goalRate).toBe(67);
  });
});
