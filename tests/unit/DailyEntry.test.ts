import { describe, expect, it } from "vitest";
import {
  Mood,
  createDailyEntry,
  entryInputSchema,
  sortByDateDesc,
  toInput,
} from "../../src/domain/index.ts";
import { input } from "../fixtures.ts";

describe("Mood", () => {
  it.each([1, 2, 3, 4, 5])("accepts %i", (v) => {
    expect(Mood.create(v).value).toBe(v);
  });
  it.each([0, 6, 3.5, Number.NaN])("rejects %s", (v) => {
    expect(() => Mood.create(v)).toThrow(/1 to 5/);
  });
  it("names the level and has a face", () => {
    expect(Mood.create(5).label).toBe("Great");
    expect(Mood.create(1).face).toBe("😣");
  });
});

describe("createDailyEntry", () => {
  it("builds an immutable entry with a computed sleep span", () => {
    const e = createDailyEntry(input());
    expect(e.sleep.durationMinutes).toBe(480);
    expect(e.mood.label).toBe("Good");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it.each([
    [{ date: "2026-02-30" }, "date"],
    [{ date: "24/10/2026" }, "date"],
    [{ studyHours: -1 }, "studyHours"],
    [{ studyHours: 24.5 }, "studyHours"],
    [{ spendingThb: -0.01 }, "spendingThb"],
    [{ spendingThb: Number.NaN }, "spendingThb"],
    [{ mood: 6 }, "mood"],
    [{ bedtime: "22:00", wakeTime: "22:00" }, "wakeTime"],
  ])("rejects %o (field %s)", (overrides, field) => {
    expect(() => createDailyEntry(input(overrides))).toThrow(expect.objectContaining({ field }));
  });

  it("accepts the boundary values 0 and 24 study hours", () => {
    expect(createDailyEntry(input({ studyHours: 0 })).studyHours).toBe(0);
    expect(createDailyEntry(input({ studyHours: 24 })).studyHours).toBe(24);
  });

  it("round-trips through toInput (money and hours rounded to 2 decimals)", () => {
    const original = input({ studyHours: 1.256, spendingThb: 99.999 });
    expect(toInput(createDailyEntry(original))).toEqual({
      ...original,
      studyHours: 1.26,
      spendingThb: 100,
    });
  });

  it("sorts newest first", () => {
    const sorted = sortByDateDesc([
      { date: "2026-01-01" },
      { date: "2026-03-01" },
      { date: "2026-02-01" },
    ]);
    expect(sorted.map((x) => x.date)).toEqual(["2026-03-01", "2026-02-01", "2026-01-01"]);
  });
});

describe("entryInputSchema", () => {
  it("accepts a valid entry", () => {
    expect(entryInputSchema.safeParse(input()).success).toBe(true);
  });

  it("puts field-level messages on the right fields", () => {
    const result = entryInputSchema.safeParse(
      input({ mood: 7, studyHours: 30, spendingThb: -5, wakeTime: "23:00" }),
    );
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["mood", "studyHours", "spendingThb"]));
  });

  it("rejects equal bedtime and wake time on wakeTime", () => {
    const result = entryInputSchema.safeParse(input({ bedtime: "22:00", wakeTime: "22:00" }));
    expect(result.error?.issues[0]?.path).toEqual(["wakeTime"]);
  });
});
