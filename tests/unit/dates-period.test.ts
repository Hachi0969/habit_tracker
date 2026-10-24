import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  endOfMonth,
  isIsoDate,
  periodContaining,
  periodContains,
  periodDates,
  periodLength,
  shiftPeriod,
  todayIn,
  weekdayIndex,
} from "../../src/domain/index.ts";

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isIsoDate("2026-10-24")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate(20261024)).toBe(false);
  });

  it("does arithmetic across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-01", "2026-10-24")).toBe(23);
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
  });

  it("uses Monday as day 0", () => {
    expect(weekdayIndex("2026-10-19")).toBe(0);
    expect(weekdayIndex("2026-10-25")).toBe(6);
  });

  it("finds today in a time zone", () => {
    const now = new Date("2026-10-24T20:00:00Z");
    expect(todayIn("Asia/Bangkok", now)).toBe("2026-10-25");
    expect(todayIn("UTC", now)).toBe("2026-10-24");
  });
});

describe("Period", () => {
  it("builds Monday-Sunday weeks", () => {
    const week = periodContaining("week", "2026-10-24");
    expect(week).toEqual({ kind: "week", start: "2026-10-19", end: "2026-10-25" });
    expect(periodLength(week)).toBe(7);
    expect(periodDates(week)[0]).toBe("2026-10-19");
  });

  it("builds months and shifts them", () => {
    const oct = periodContaining("month", "2026-10-24");
    expect(oct).toEqual({ kind: "month", start: "2026-10-01", end: "2026-10-31" });
    expect(shiftPeriod(oct, -10).start).toBe("2025-12-01");
    expect(shiftPeriod(oct, 4).end).toBe("2027-02-28");
  });

  it("shifts weeks and checks membership", () => {
    const week = periodContaining("week", "2026-10-24");
    expect(shiftPeriod(week, -1).start).toBe("2026-10-12");
    expect(periodContains(week, "2026-10-25")).toBe(true);
    expect(periodContains(week, "2026-10-26")).toBe(false);
  });
});
