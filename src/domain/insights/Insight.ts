import type { DailyEntry } from "../DailyEntry.ts";
import type { PeriodSummary } from "../PeriodSummaryCalculator.ts";
import type { Settings } from "../Settings.ts";

export type InsightKind = "pattern" | "goal" | "consistency" | "correlation";

/** Derived: a statement backed by data. BR6: always carries its sample size. */
export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  text: string;
  sampleSize: number;
  caveat: string | null;
}

export interface InsightContext {
  /** Entries inside the period being analysed. */
  entries: readonly DailyEntry[];
  summary: PeriodSummary;
  settings: Settings;
}

/** Strategy: one rule = one kind of insight. Return null when there is not enough data. */
export interface InsightRule {
  readonly id: string;
  evaluate(context: InsightContext): Insight | null;
}
