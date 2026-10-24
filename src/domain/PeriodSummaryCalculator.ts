import type { DailyEntry } from "./DailyEntry.ts";
import { periodContains, periodLength, type Period } from "./Period.ts";

/** Derived, never stored. Averages are null when the period has no entries. */
export interface PeriodSummary {
  period: Period;
  count: number;
  daysInPeriod: number;
  avgSleepMinutes: number | null;
  avgBedtimeMinutes: number | null;
  avgWakeMinutes: number | null;
  totalStudyHours: number;
  avgStudyHours: number | null;
  totalSpendingThb: number;
  avgSpendingThb: number | null;
  avgMood: number | null;
}

const DAY = 24 * 60;
const NOON = 12 * 60;

export class PeriodSummaryCalculator {
  summarize(entries: readonly DailyEntry[], period: Period): PeriodSummary {
    const inPeriod = entries.filter((e) => periodContains(period, e.date));
    const count = inPeriod.length;
    const totalStudy = sum(inPeriod.map((e) => e.studyHours));
    const totalSpending = sum(inPeriod.map((e) => e.spendingThb));

    return {
      period,
      count,
      daysInPeriod: periodLength(period),
      avgSleepMinutes: average(inPeriod.map((e) => e.sleep.durationMinutes)),
      avgBedtimeMinutes: averageBedtime(inPeriod.map((e) => e.sleep.bedtimeMinutes)),
      avgWakeMinutes: average(inPeriod.map((e) => e.sleep.wakeMinutes)),
      totalStudyHours: round(totalStudy, 2),
      avgStudyHours: count ? round(totalStudy / count, 2) : null,
      totalSpendingThb: round(totalSpending, 2),
      avgSpendingThb: count ? round(totalSpending / count, 2) : null,
      avgMood: count ? round(sum(inPeriod.map((e) => e.mood.value)) / count, 2) : null,
    };
  }
}

/**
 * Bedtimes wrap around midnight: the plain average of 23:00 and 01:00 would be 12:00.
 * Shifting times before noon by +24 h makes them 23:00 and 25:00, average 24:00 = 00:00.
 */
export function averageBedtime(minutes: readonly number[]): number | null {
  const avg = average(minutes.map((m) => (m < NOON ? m + DAY : m)));
  return avg === null ? null : avg % DAY;
}

function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function average(values: readonly number[]): number | null {
  return values.length ? sum(values) / values.length : null;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
