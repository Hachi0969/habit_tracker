import { isIsoDate, type IsoDate } from "./dates.ts";
import { DomainError } from "./errors.ts";
import { Mood } from "./Mood.ts";
import { SleepSpan } from "./SleepSpan.ts";

/** Plain data for one day, as typed in the form or stored in the database. */
export interface DailyEntryInput {
  /** BR4: the date you WOKE UP (the morning the sleep ended). */
  date: IsoDate;
  bedtime: string;
  wakeTime: string;
  studyHours: number;
  spendingThb: number;
  mood: number;
}

/** Immutable entity: one day's record. Composed of a SleepSpan and a Mood. */
export interface DailyEntry {
  readonly date: IsoDate;
  readonly sleep: SleepSpan;
  readonly mood: Mood;
  readonly studyHours: number;
  readonly spendingThb: number;
}

/** Factory: the only way to make a DailyEntry, so every entry obeys BR2-BR4. */
export function createDailyEntry(input: DailyEntryInput): DailyEntry {
  if (!isIsoDate(input.date)) throw new DomainError("Date must be YYYY-MM-DD", "date");

  const sleep = SleepSpan.create(input.bedtime, input.wakeTime);
  const mood = Mood.create(input.mood);

  if (!Number.isFinite(input.studyHours) || input.studyHours < 0 || input.studyHours > 24) {
    throw new DomainError("Study hours must be between 0 and 24", "studyHours");
  }
  if (!Number.isFinite(input.spendingThb) || input.spendingThb < 0) {
    throw new DomainError("Spending must be 0 or more", "spendingThb");
  }

  return Object.freeze({
    date: input.date,
    sleep,
    mood,
    studyHours: round2(input.studyHours),
    spendingThb: round2(input.spendingThb),
  });
}

export function toInput(entry: DailyEntry): DailyEntryInput {
  return {
    date: entry.date,
    bedtime: entry.sleep.bedtime,
    wakeTime: entry.sleep.wakeTime,
    studyHours: entry.studyHours,
    spendingThb: entry.spendingThb,
    mood: entry.mood.value,
  };
}

/** Newest first. */
export function sortByDateDesc<T extends { date: IsoDate }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
