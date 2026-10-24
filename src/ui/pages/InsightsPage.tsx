import { useMemo } from "react";
import { InsightEngine, type InsightKind } from "../../domain/index.ts";
import { PeriodBar } from "../components/PeriodBar.tsx";
import { Card, Empty, ErrorState, Loading } from "../components/primitives.tsx";
import { useEntries, useSettings, useToday } from "../hooks/useData.ts";
import { usePeriod } from "../hooks/usePeriod.ts";

const engine = new InsightEngine();

const KIND_LABEL: Record<InsightKind, string> = {
  goal: "Goal",
  consistency: "Consistency",
  pattern: "Pattern",
  correlation: "Cross-metric",
};

export function InsightsPage() {
  const today = useToday();
  const entries = useEntries();
  const { settings } = useSettings();
  const p = usePeriod(entries.data, today, "month");

  const insights = useMemo(
    () => engine.run({ entries: p.inPeriod, summary: p.summary, settings }),
    [p.inPeriod, p.summary, settings],
  );

  if (entries.isPending) return <Loading />;
  if (entries.isError)
    return <ErrorState error={entries.error} onRetry={() => entries.refetch()} />;

  return (
    <div className="flex flex-col gap-4">
      <PeriodBar {...p} />
      {insights.length === 0 ? (
        <Empty title="Not enough data for insights yet">
          Insights need at least 3 logged days in this period (7 for weekday patterns).
          {p.summary.count > 0 && ` You have ${p.summary.count}.`}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight) => (
            <li key={insight.id}>
              <Card
                title={insight.title}
                action={
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                    {KIND_LABEL[insight.kind]}
                  </span>
                }
              >
                <p className="text-sm leading-relaxed text-ink">{insight.text}</p>
                <p className="mt-2 text-xs text-muted">
                  Based on {insight.sampleSize} logged day{insight.sampleSize === 1 ? "" : "s"}
                  {insight.caveat && ` · ${insight.caveat}`}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        Insights describe patterns in your own records. They do not show what causes what.
      </p>
    </div>
  );
}
