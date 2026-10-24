import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  PeriodSummaryCalculator,
  StreakCalculator,
  SummaryBuilder,
  averageBedtime,
  createSettings,
  periodContaining,
} from "../../src/domain/index.ts";
import { entry } from "../fixtures.ts";

describe("PeriodSummaryCalculator", () => {
  const calc = new PeriodSummaryCalculator();
  const week = periodContaining("week", "2026-10-24");

  it("matches hand-calculated sample data", () => {
    const entries = [
      entry({
        date: "2026-10-19",
        bedtime: "23:00",
        wakeTime: "07:00",
        studyHours: 2,
        spendingThb: 100,
        mood: 4,
      }),
      entry({
        date: "2026-10-20",
        bedtime: "01:00",
        wakeTime: "07:00",
        studyHours: 3,
        spendingThb: 200,
        mood: 2,
      }),
      entry({ date: "2026-10-26", studyHours: 10 }), // next week: excluded
    ];
    const s = calc.summarize(entries, week);
    expect(s.count).toBe(2);
    expect(s.daysInPeriod).toBe(7);
    expect(s.avgSleepMinutes).toBe(420); // (480 + 360) / 2
    expect(s.avgBedtimeMinutes).toBe(0); // 23:00 and 01:00 average to midnight
    expect(s.avgWakeMinutes).toBe(420);
    expect(s.totalStudyHours).toBe(5);
    expect(s.avgStudyHours).toBe(2.5);
    expect(s.totalSpendingThb).toBe(300);
    expect(s.avgSpendingThb).toBe(150);
    expect(s.avgMood).toBe(3);
  });

  it("returns nulls for an empty period", () => {
    const s = calc.summarize([], week);
    expect(s.count).toBe(0);
    expect(s.avgSleepMinutes).toBeNull();
    expect(s.avgBedtimeMinutes).toBeNull();
    expect(s.avgMood).toBeNull();
    expect(s.totalStudyHours).toBe(0);
  });

  it("averages evening bedtimes normally", () => {
    expect(averageBedtime([22 * 60, 23 * 60])).toBe(22.5 * 60);
    expect(averageBedtime([])).toBeNull();
  });
});

describe("StreakCalculator", () => {
  const streaks = new StreakCalculator();

  it("counts back from today", () => {
    expect(streaks.current(["2026-10-22", "2026-10-23", "2026-10-24"], "2026-10-24")).toBe(3);
  });

  it("counts back from yesterday when today is not logged yet", () => {
    expect(streaks.current(["2026-10-22", "2026-10-23"], "2026-10-24")).toBe(2);
  });

  it("stops at a gap", () => {
    const dates = ["2026-10-20", "2026-10-22", "2026-10-23", "2026-10-24"];
    expect(streaks.current(dates, "2026-10-24")).toBe(3);
  });

  it("is 0 when neither today nor yesterday is logged", () => {
    expect(streaks.current(["2026-10-21"], "2026-10-24")).toBe(0);
    expect(streaks.current([], "2026-10-24")).toBe(0);
  });

  it("finds the longest run", () => {
    const dates = ["2026-01-01", "2026-01-02", "2026-01-05", "2026-01-06", "2026-01-07"];
    expect(streaks.longest(dates)).toBe(3);
    expect(streaks.longest([])).toBe(0);
  });
});

describe("Settings", () => {
  it("has the BR7 defaults", () => {
    expect(DEFAULT_SETTINGS.sleepGoalHours).toBe(8);
    expect(DEFAULT_SETTINGS.studyGoalHours).toBe(2);
  });

  it("rejects silly goals", () => {
    expect(() => createSettings({ ...DEFAULT_SETTINGS, sleepGoalHours: 0 })).toThrow(/Sleep goal/);
    expect(() => createSettings({ ...DEFAULT_SETTINGS, studyGoalHours: 25 })).toThrow(/Study goal/);
    expect(createSettings({ ...DEFAULT_SETTINGS, studyGoalHours: 0 }).studyGoalHours).toBe(0);
  });
});

describe("SummaryBuilder", () => {
  const builder = new SummaryBuilder();

  it("builds the device payload from the latest entry", () => {
    const entries = [
      entry({ date: "2026-10-24", studyHours: 2.5, bedtime: "23:30", wakeTime: "06:42", mood: 4 }),
      entry({ date: "2026-10-23", studyHours: 1 }),
      entry({ date: "2026-10-17", studyHours: 9 }), // outside the 7-day window
    ];
    const s = builder.build({
      entries,
      settings: DEFAULT_SETTINGS,
      today: "2026-10-24",
      latestUpdatedAt: "2026-10-24T12:05:00Z",
    });
    expect(s).toEqual({
      date: "2026-10-24",
      is_today: true,
      study_hours: 2.5,
      study_goal_hours: 2,
      sleep_hours: 7.2,
      sleep_goal_hours: 8,
      mood: 4,
      streak: 2,
      week_study: [0, 0, 0, 0, 0, 1, 2.5],
      updated_at: "2026-10-24T12:05:00Z",
    });
    expect(JSON.stringify(s).length).toBeLessThan(1024); // NFR3
  });

  it("flags is_today false when only older entries exist", () => {
    const s = builder.build({
      entries: [entry({ date: "2026-10-22" })],
      settings: DEFAULT_SETTINGS,
      today: "2026-10-24",
    });
    expect(s.date).toBe("2026-10-22");
    expect(s.is_today).toBe(false);
    expect(s.streak).toBe(0);
  });

  it("ignores future-dated entries and handles no data", () => {
    const s = builder.build({
      entries: [entry({ date: "2026-12-01" })],
      settings: DEFAULT_SETTINGS,
      today: "2026-10-24",
    });
    expect(s.date).toBeNull();
    expect(s.mood).toBeNull();
    expect(s.week_study).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});
