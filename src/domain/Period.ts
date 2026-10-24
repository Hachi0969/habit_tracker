import {
  addDays,
  daysBetween,
  endOfMonth,
  startOfMonth,
  weekdayIndex,
  type IsoDate,
} from "./dates.ts";

export type PeriodKind = "week" | "month";

/** Value object: selects which entries belong together. Weeks run Monday to Sunday. */
export interface Period {
  readonly kind: PeriodKind;
  readonly start: IsoDate;
  readonly end: IsoDate;
}

export function periodContaining(kind: PeriodKind, date: IsoDate): Period {
  if (kind === "week") {
    const start = addDays(date, -weekdayIndex(date));
    return { kind, start, end: addDays(start, 6) };
  }
  return { kind, start: startOfMonth(date), end: endOfMonth(date) };
}

/** The period `steps` periods before (negative) or after (positive) this one. */
export function shiftPeriod(period: Period, steps: number): Period {
  if (period.kind === "week") return periodContaining("week", addDays(period.start, steps * 7));
  const [y, m] = period.start.split("-").map(Number) as [number, number];
  const target = new Date(Date.UTC(y, m - 1 + steps, 1)).toISOString().slice(0, 10);
  return periodContaining("month", target);
}

export function periodContains(period: Period, date: IsoDate): boolean {
  return date >= period.start && date <= period.end;
}

export function periodLength(period: Period): number {
  return daysBetween(period.start, period.end) + 1;
}

export function periodDates(period: Period): IsoDate[] {
  return Array.from({ length: periodLength(period) }, (_, i) => addDays(period.start, i));
}
