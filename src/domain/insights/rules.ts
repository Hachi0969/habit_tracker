import { WEEKDAY_NAMES, weekdayIndex } from "../dates.ts";
import type { DailyEntry } from "../DailyEntry.ts";
import type { Insight, InsightContext, InsightRule } from "./Insight.ts";

const MIN_ENTRIES = 3;

function percent(part: number, whole: number): number {
  return Math.round((part / whole) * 100);
}

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function daysWord(n: number): string {
  return n === 1 ? "1 day" : `${n} days`;
}

/** Average of `pick` per weekday, only for weekdays that have data. */
function byWeekday(entries: readonly DailyEntry[], pick: (e: DailyEntry) => number) {
  const groups = new Map<number, number[]>();
  for (const e of entries) {
    const day = weekdayIndex(e.date);
    groups.set(day, [...(groups.get(day) ?? []), pick(e)]);
  }
  return [...groups].map(([day, values]) => ({
    day,
    name: WEEKDAY_NAMES[day]!,
    count: values.length,
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  }));
}

/** FR8: most productive weekday (highest average study hours). */
export class MostProductiveWeekdayRule implements InsightRule {
  readonly id = "most-productive-weekday";

  evaluate({ entries }: InsightContext): Insight | null {
    const days = byWeekday(entries, (e) => e.studyHours);
    if (entries.length < 7 || days.length < 2) return null;
    const best = days.reduce((a, b) => (b.avg > a.avg ? b : a));
    if (best.avg <= 0) return null;
    return {
      id: this.id,
      kind: "pattern",
      title: "Most productive day",
      text: `You tended to study most on ${best.name}s: ${fmt(best.avg)} h on average over ${best.count} ${best.name}${best.count === 1 ? "" : "s"}.`,
      sampleSize: entries.length,
      caveat: best.count < 3 ? `Only ${best.count} ${best.name}(s) logged so far.` : null,
    };
  }
}

/** FR8: lowest-spending weekday. */
export class LowestSpendingWeekdayRule implements InsightRule {
  readonly id = "lowest-spending-weekday";

  evaluate({ entries }: InsightContext): Insight | null {
    const days = byWeekday(entries, (e) => e.spendingThb);
    if (entries.length < 7 || days.length < 2) return null;
    const low = days.reduce((a, b) => (b.avg < a.avg ? b : a));
    return {
      id: this.id,
      kind: "pattern",
      title: "Lowest-spending day",
      text: `${low.name}s tended to be your cheapest days: ฿${Math.round(low.avg).toLocaleString("en-US")} on average over ${low.count} ${low.name}${low.count === 1 ? "" : "s"}.`,
      sampleSize: entries.length,
      caveat: low.count < 3 ? `Only ${low.count} ${low.name}(s) logged so far.` : null,
    };
  }
}

/** FR8: share of nights that met the sleep goal. */
export class SleepGoalRateRule implements InsightRule {
  readonly id = "sleep-goal-rate";

  evaluate({ entries, settings }: InsightContext): Insight | null {
    if (entries.length < MIN_ENTRIES) return null;
    const goalMinutes = settings.sleepGoalHours * 60;
    const met = entries.filter((e) => e.sleep.durationMinutes >= goalMinutes).length;
    return {
      id: this.id,
      kind: "goal",
      title: "Sleep goal",
      text: `You reached your ${fmt(settings.sleepGoalHours)} h sleep goal on ${met} of ${entries.length} nights (${percent(met, entries.length)}%).`,
      sampleSize: entries.length,
      caveat: null,
    };
  }
}

/** FR8: study consistency = share of days that met the study goal. */
export class StudyConsistencyRule implements InsightRule {
  readonly id = "study-consistency";

  evaluate({ entries, settings }: InsightContext): Insight | null {
    if (entries.length < MIN_ENTRIES) return null;
    const goal = settings.studyGoalHours;
    const met = entries.filter((e) => e.studyHours >= goal && e.studyHours > 0).length;
    const any = entries.filter((e) => e.studyHours > 0).length;
    return {
      id: this.id,
      kind: "consistency",
      title: "Study consistency",
      text: `You studied at least ${fmt(goal)} h on ${met} of ${entries.length} days (${percent(met, entries.length)}%), and studied at all on ${daysWord(any)}.`,
      sampleSize: entries.length,
      caveat: null,
    };
  }
}

/** FR13 (Could): study after goal-length sleep vs after shorter sleep. Correlation only. */
export class SleepVsStudyRule implements InsightRule {
  readonly id = "sleep-vs-study";

  evaluate({ entries, settings }: InsightContext): Insight | null {
    const goalMinutes = settings.sleepGoalHours * 60;
    const rested = entries.filter((e) => e.sleep.durationMinutes >= goalMinutes);
    const short = entries.filter((e) => e.sleep.durationMinutes < goalMinutes);
    if (rested.length < MIN_ENTRIES || short.length < MIN_ENTRIES) return null;
    const avg = (list: DailyEntry[]) => list.reduce((a, e) => a + e.studyHours, 0) / list.length;
    const a = avg(rested);
    const b = avg(short);
    const relation = Math.abs(a - b) < 0.25 ? "about the same" : a > b ? "more" : "less";
    return {
      id: this.id,
      kind: "correlation",
      title: "Sleep and study",
      text:
        relation === "about the same"
          ? `You studied about the same after ${fmt(settings.sleepGoalHours)} h+ nights (${fmt(a)} h, ${daysWord(rested.length)}) as after shorter nights (${fmt(b)} h, ${daysWord(short.length)}).`
          : `On days after ${fmt(settings.sleepGoalHours)} h+ of sleep you tended to study ${relation}: ${fmt(a)} h (${daysWord(rested.length)}) vs ${fmt(b)} h after shorter nights (${daysWord(short.length)}).`,
      sampleSize: entries.length,
      caveat: "This is a correlation, not proof. Other things in your day may explain it.",
    };
  }
}

/** Sleep vs mood: mood on rested days vs short-sleep days. */
export class SleepVsMoodRule implements InsightRule {
  readonly id = "sleep-vs-mood";

  evaluate({ entries, settings }: InsightContext): Insight | null {
    const goalMinutes = settings.sleepGoalHours * 60;
    const rested = entries.filter((e) => e.sleep.durationMinutes >= goalMinutes);
    const short = entries.filter((e) => e.sleep.durationMinutes < goalMinutes);
    if (rested.length < MIN_ENTRIES || short.length < MIN_ENTRIES) return null;
    const avg = (list: DailyEntry[]) => list.reduce((a, e) => a + e.mood.value, 0) / list.length;
    const a = avg(rested);
    const b = avg(short);
    if (Math.abs(a - b) < 0.3) return null;
    return {
      id: this.id,
      kind: "correlation",
      title: "Sleep and mood",
      text: `Your mood tended to be ${a > b ? "higher" : "lower"} after ${fmt(settings.sleepGoalHours)} h+ nights: ${fmt(a)}/5 (${daysWord(rested.length)}) vs ${fmt(b)}/5 after shorter nights (${daysWord(short.length)}).`,
      sampleSize: entries.length,
      caveat: "This is a correlation, not proof. Other things in your day may explain it.",
    };
  }
}

export function defaultRules(): InsightRule[] {
  return [
    new SleepGoalRateRule(),
    new StudyConsistencyRule(),
    new MostProductiveWeekdayRule(),
    new LowestSpendingWeekdayRule(),
    new SleepVsStudyRule(),
    new SleepVsMoodRule(),
  ];
}
