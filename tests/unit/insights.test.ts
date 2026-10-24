import { describe, expect, it } from "vitest";
import {
  CAUSAL_WORDING,
  DEFAULT_SETTINGS,
  InsightEngine,
  PeriodSummaryCalculator,
  addDays,
  periodContaining,
  type DailyEntry,
  type InsightContext,
  type InsightRule,
} from "../../src/domain/index.ts";
import { entry } from "../fixtures.ts";

function context(entries: DailyEntry[]): InsightContext {
  const period = periodContaining("month", "2026-10-15");
  return {
    entries,
    summary: new PeriodSummaryCalculator().summarize(entries, period),
    settings: DEFAULT_SETTINGS,
  };
}

/** 14 days from Monday 2026-10-05. Long sleep on even days, with more study and better mood. */
function twoWeeks(): DailyEntry[] {
  return Array.from({ length: 14 }, (_, i) =>
    entry({
      date: addDays("2026-10-05", i),
      bedtime: i % 2 === 0 ? "22:30" : "01:00",
      wakeTime: "07:00",
      studyHours: i % 7 === 1 ? 4 : i % 2 === 0 ? 3 : 1, // Tuesdays are 4 h
      spendingThb: i % 7 === 6 ? 20 : 200, // Sundays are cheap
      mood: i % 2 === 0 ? 5 : 2,
    }),
  );
}

describe("InsightEngine", () => {
  it("produces every default insight for two weeks of data", () => {
    const insights = new InsightEngine().run(context(twoWeeks()));
    expect(insights.map((i) => i.id)).toEqual([
      "sleep-goal-rate",
      "study-consistency",
      "most-productive-weekday",
      "lowest-spending-weekday",
      "sleep-vs-study",
      "sleep-vs-mood",
    ]);
    const byId = Object.fromEntries(insights.map((i) => [i.id, i]));
    expect(byId["sleep-goal-rate"]!.text).toBe(
      "You reached your 8 h sleep goal on 7 of 14 nights (50%).",
    );
    expect(byId["most-productive-weekday"]!.text).toContain("Tuesdays");
    expect(byId["lowest-spending-weekday"]!.text).toContain("Sundays");
    expect(byId["sleep-vs-study"]!.text).toContain("tended to study more");
    expect(byId["sleep-vs-mood"]!.text).toContain("higher");
  });

  it("always shows the sample size and never uses causal wording (BR6)", () => {
    for (const insight of new InsightEngine().run(context(twoWeeks()))) {
      expect(insight.sampleSize).toBe(14);
      expect(insight.text).not.toMatch(CAUSAL_WORDING);
    }
  });

  it("returns nothing with too little data", () => {
    expect(new InsightEngine().run(context([entry()]))).toEqual([]);
  });

  it("adds a small-sample caveat under 14 days", () => {
    const few = twoWeeks().slice(0, 4);
    const goal = new InsightEngine().run(context(few)).find((i) => i.id === "sleep-goal-rate");
    expect(goal?.caveat).toMatch(/only 4 days/);
  });

  it("drops a rule's insight that uses causal wording (Open/Closed guard)", () => {
    const bad: InsightRule = {
      id: "bad",
      evaluate: () => ({
        id: "bad",
        kind: "pattern",
        title: "x",
        text: "Coffee causes study",
        sampleSize: 5,
        caveat: null,
      }),
    };
    const good: InsightRule = {
      id: "good",
      evaluate: () => ({
        id: "good",
        kind: "pattern",
        title: "y",
        text: "fine",
        sampleSize: 30,
        caveat: null,
      }),
    };
    expect(new InsightEngine([bad, good]).run(context([])).map((i) => i.id)).toEqual(["good"]);
  });

  it("says 'about the same' when study does not differ", () => {
    const flat = twoWeeks().map((e, i) =>
      entry({ date: e.date, bedtime: i % 2 ? "01:00" : "22:00", studyHours: 2 }),
    );
    const insight = new InsightEngine().run(context(flat)).find((i) => i.id === "sleep-vs-study");
    expect(insight?.text).toContain("about the same");
  });
});
