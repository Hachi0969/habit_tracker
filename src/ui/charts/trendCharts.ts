import { format, parseISO } from "date-fns";
import {
  formatClock,
  formatDuration,
  periodDates,
  type DailyEntry,
  type Period,
  type PeriodSummary,
  type Settings,
} from "../../domain/index.ts";
import type { ChartPoint, MetricChartProps } from "./MetricChart.tsx";

const NOON = 12 * 60;
const DAY = 24 * 60;

function series(
  period: Period,
  byDate: Map<string, DailyEntry>,
  pick: (e: DailyEntry) => number,
): ChartPoint[] {
  return periodDates(period).map((date) => {
    const e = byDate.get(date);
    return {
      date: format(parseISO(date), "EEE d MMM"),
      label: period.kind === "week" ? format(parseISO(date), "EEE") : String(Number(date.slice(8))),
      value: e ? pick(e) : null,
    };
  });
}

const hours = (v: number) => `${Math.round(v * 10) / 10} h`;
const baht = (v: number) => `฿${Math.round(v).toLocaleString("en-US")}`;
/** Bedtimes after midnight are plotted as 24:xx so the line does not jump across the chart. */
const unwrapBedtime = (m: number) => (m < NOON ? m + DAY : m);

/** Round clock-axis ticks: every 30 min for a narrow range, otherwise every hour. */
function timeAxis(points: ChartPoint[]): Pick<MetricChartProps, "yDomain" | "yTicks"> {
  const values = points.flatMap((p) => (p.value === null ? [] : [p.value]));
  if (values.length === 0) return {};
  const range = Math.max(...values) - Math.min(...values);
  const step = range <= 120 ? 30 : 60;
  const lo = Math.floor(Math.min(...values) / step) * step;
  const hi = Math.max(lo + step, Math.ceil(Math.max(...values) / step) * step);
  const ticks = Array.from({ length: (hi - lo) / step + 1 }, (_, i) => lo + i * step);
  return { yDomain: [lo, hi], yTicks: ticks };
}

/** Builds the six charts of FR6. Titles state the finding (UI design principle). */
export function buildTrendCharts(
  period: Period,
  entries: readonly DailyEntry[],
  summary: PeriodSummary,
  settings: Settings,
): MetricChartProps[] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const n = summary.count;
  const days = `${n} of ${summary.daysInPeriod} days logged`;
  const bedtimes = series(period, byDate, (e) => unwrapBedtime(e.sleep.bedtimeMinutes));
  const wakes = series(period, byDate, (e) => e.sleep.wakeMinutes);

  return [
    {
      title:
        summary.avgSleepMinutes === null
          ? "Sleep duration"
          : `Sleep averaged ${formatDuration(summary.avgSleepMinutes)}`,
      subtitle: `Hours per night · goal ${settings.sleepGoalHours} h · ${days}`,
      data: series(period, byDate, (e) => Math.round(e.sleep.durationHours * 100) / 100),
      kind: "bar",
      colorVar: "--sleep",
      yLabel: "hours",
      formatValue: hours,
      goal: { value: settings.sleepGoalHours, label: "goal" },
    },
    {
      title:
        summary.avgBedtimeMinutes === null
          ? "Bedtime"
          : `Bedtime averaged ${formatClock(summary.avgBedtimeMinutes)}`,
      subtitle: `Clock time you went to bed · ${days}`,
      data: bedtimes,
      kind: "line",
      colorVar: "--bedtime",
      yLabel: "time",
      formatValue: (v) => formatClock(v),
      ...timeAxis(bedtimes),
    },
    {
      title:
        summary.avgWakeMinutes === null
          ? "Wake time"
          : `Woke around ${formatClock(summary.avgWakeMinutes)} on average`,
      subtitle: `Clock time you woke up · ${days}`,
      data: wakes,
      kind: "line",
      colorVar: "--wake",
      yLabel: "time",
      formatValue: (v) => formatClock(v),
      ...timeAxis(wakes),
    },
    {
      title: n ? `Studied ${hours(summary.totalStudyHours)} in total` : "Study",
      subtitle: `Hours per day · goal ${settings.studyGoalHours} h · ${days}`,
      data: series(period, byDate, (e) => e.studyHours),
      kind: "bar",
      colorVar: "--study",
      yLabel: "hours",
      formatValue: hours,
      ...(settings.studyGoalHours > 0 && {
        goal: { value: settings.studyGoalHours, label: "goal" },
      }),
    },
    {
      title: n
        ? `Spent ${baht(summary.totalSpendingThb)} (${baht(summary.avgSpendingThb ?? 0)} per logged day)`
        : "Spending",
      subtitle: `Thai baht per day · ${days}`,
      data: series(period, byDate, (e) => e.spendingThb),
      kind: "bar",
      colorVar: "--spend",
      yLabel: "THB",
      formatValue: baht,
    },
    {
      title: summary.avgMood === null ? "Mood" : `Mood averaged ${summary.avgMood.toFixed(1)} / 5`,
      subtitle: `1 = awful, 5 = great · ${days}`,
      data: series(period, byDate, (e) => e.mood.value),
      kind: "line",
      colorVar: "--mood",
      yLabel: "mood",
      formatValue: (v) => String(v),
      yDomain: [1, 5],
      yTicks: [1, 2, 3, 4, 5],
    },
  ];
}
