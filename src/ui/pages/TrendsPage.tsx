import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { formatDuration } from "../../domain/index.ts";
import { MetricChart } from "../charts/MetricChart.tsx";
import { buildTrendCharts } from "../charts/trendCharts.ts";
import { PeriodBar } from "../components/PeriodBar.tsx";
import { Button, Empty, ErrorState, Loading, Stat } from "../components/primitives.tsx";
import { useEntries, useSettings, useToday } from "../hooks/useData.ts";
import { usePeriod } from "../hooks/usePeriod.ts";
import { navigate } from "../router.ts";

export function TrendsPage() {
  const today = useToday();
  const entries = useEntries();
  const { settings } = useSettings();
  const p = usePeriod(entries.data, today, "week");
  const [showTable, setShowTable] = useState(false);

  const charts = useMemo(
    () => buildTrendCharts(p.period, p.inPeriod, p.summary, settings),
    [p.period, p.inPeriod, p.summary, settings],
  );

  if (entries.isPending) return <Loading />;
  if (entries.isError)
    return <ErrorState error={entries.error} onRetry={() => entries.refetch()} />;
  if (entries.data.length === 0) {
    return (
      <Empty title="No data yet">
        <p>Log your first day and your trends will appear here.</p>
        <Button variant="primary" className="mt-3" onClick={() => navigate("today")}>
          Log today
        </Button>
      </Empty>
    );
  }

  const s = p.summary;
  return (
    <div className="flex flex-col gap-4">
      <PeriodBar {...p} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Avg sleep"
          value={s.avgSleepMinutes === null ? "–" : formatDuration(s.avgSleepMinutes)}
        />
        <Stat
          label="Total study"
          value={`${s.totalStudyHours} h`}
          hint={s.avgStudyHours === null ? undefined : `${s.avgStudyHours} h/day`}
        />
        <Stat label="Total spent" value={`฿${s.totalSpendingThb.toLocaleString("en-US")}`} />
        <Stat label="Avg mood" value={s.avgMood === null ? "–" : `${s.avgMood.toFixed(1)} / 5`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {charts.map((c) => (
          <MetricChart key={c.colorVar} {...c} />
        ))}
      </div>

      <div>
        <Button variant="ghost" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
          {showTable ? "Hide data table" : "Show data table"}
        </Button>
        {showTable && (
          <div className="mt-2 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="text-muted">
                <tr>
                  {["Date", "Bed", "Wake", "Sleep", "Study", "Spent", "Mood"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...p.inPeriod].reverse().map((e) => (
                  <tr key={e.date}>
                    <td className="px-3 py-2">{format(parseISO(e.date), "EEE d MMM")}</td>
                    <td className="px-3 py-2">{e.sleep.bedtime}</td>
                    <td className="px-3 py-2">{e.sleep.wakeTime}</td>
                    <td className="px-3 py-2">{formatDuration(e.sleep.durationMinutes)}</td>
                    <td className="px-3 py-2">{e.studyHours} h</td>
                    <td className="px-3 py-2">฿{e.spendingThb.toLocaleString("en-US")}</td>
                    <td className="px-3 py-2">{e.mood.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {p.inPeriod.length === 0 && (
              <p className="p-3 text-xs text-muted">No entries in this period.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
