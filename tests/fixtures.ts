import { createDailyEntry, type DailyEntry, type DailyEntryInput } from "../src/domain/index.ts";

export function input(overrides: Partial<DailyEntryInput> = {}): DailyEntryInput {
  return {
    date: "2026-10-24",
    bedtime: "23:00",
    wakeTime: "07:00",
    studyHours: 2,
    spendingThb: 150,
    mood: 4,
    ...overrides,
  };
}

export function entry(overrides: Partial<DailyEntryInput> = {}): DailyEntry {
  return createDailyEntry(input(overrides));
}
