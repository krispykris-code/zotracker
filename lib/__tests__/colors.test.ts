import { describe, it, expect } from "vitest";
import { durationColor } from "../sleep";
import { getSleepBgColor, getSleepTextColor } from "../calendar";

// Threshold contract: >= 420 min (7h) = green, >= 360 min (6h) = amber, else red.
// These boundaries drive the record list, stats page, and calendar tinting.

describe("durationColor", () => {
  it("boundary at 7h (420 min)", () => {
    expect(durationColor("23:00", "06:00")).toBe("text-emerald-400"); // 420
    expect(durationColor("23:00", "05:59")).toBe("text-amber-300"); // 419
  });

  it("boundary at 6h (360 min)", () => {
    expect(durationColor("00:00", "06:00")).toBe("text-amber-300"); // 360
    expect(durationColor("00:00", "05:59")).toBe("text-rose-400"); // 359
  });

  it("empty wakeTime yields red (NaN falls through — callers must guard)", () => {
    // Locked current behavior: calcMinutes("23:00","") is NaN, every
    // comparison is false, so the fallback branch returns rose.
    expect(durationColor("23:00", "")).toBe("text-rose-400");
  });
});

describe("getSleepBgColor", () => {
  it("boundary at 7h", () => {
    expect(getSleepBgColor("23:00", "06:00")).toBe("bg-emerald-500/30");
    expect(getSleepBgColor("23:00", "05:59")).toBe("bg-amber-400/30");
  });

  it("boundary at 6h", () => {
    expect(getSleepBgColor("00:00", "06:00")).toBe("bg-amber-400/30");
    expect(getSleepBgColor("00:00", "05:59")).toBe("bg-rose-500/30");
  });

  it("missing time falls back to slate", () => {
    expect(getSleepBgColor("", "")).toBe("bg-slate-800/30");
    expect(getSleepBgColor("23:00", "")).toBe("bg-slate-800/30");
  });
});

describe("getSleepTextColor", () => {
  it("boundary at 7h", () => {
    expect(getSleepTextColor("23:00", "06:00")).toBe("text-emerald-200");
    expect(getSleepTextColor("23:00", "05:59")).toBe("text-amber-200");
  });

  it("boundary at 6h", () => {
    expect(getSleepTextColor("00:00", "06:00")).toBe("text-amber-200");
    expect(getSleepTextColor("00:00", "05:59")).toBe("text-rose-200");
  });

  it("missing time falls back to slate", () => {
    expect(getSleepTextColor("", "")).toBe("text-slate-500");
    expect(getSleepTextColor("23:00", "")).toBe("text-slate-500");
  });
});
