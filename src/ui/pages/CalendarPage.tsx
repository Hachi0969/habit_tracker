import { format, parseISO } from "date-fns";
import { useState } from "react";
import {
  formatDuration,
  periodContaining,
  periodDates,
  shiftPeriod,
  weekdayIndex,
} from "../../domain/index.ts";
import { Button, Card, Empty, ErrorState, Loading, Stat } from "../components/primitives.tsx";
import { useEntries, useEntryMap, useStreak, useToday } from "../hooks/useData.ts";
import { navigate } from "../router.ts";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarPage() {
  const today = useToday();
  const [month, setMonth] = useState(() => periodContaining("month", today));
  const entries = useEntries();
  const byDate = useEntryMap(entries.data);
  const streak = useStreak(entries.data, today);

  if (entries.isPending) return <Loading />;
  if (entries.isError)
    return <ErrorState error={entries.error} onRetry={() => entries.refetch()} />;

  const days = periodDates(month);
  const blanks = weekdayIndex(month.start);
  const inMonth = entries.data.filter((e) => e.date >= month.start && e.date <= month.end);
  const isCurrentMonth = month.start === periodContaining("month", today).start;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Current streak" value={`${streak.current} d`} />
        <Stat label="Longest streak" value={`${streak.longest} d`} />
        <Stat label="Logged this month" value={`${inMonth.length}/${days.length}`} />
      </div>

      <Card
        title={format(parseISO(month.start), "MMMM yyyy")}
        action={
          <div className="flex gap-1">
            <Button
              variant="ghost"
              aria-label="Previous month"
              onClick={() => setMonth(shiftPeriod(month, -1))}
            >
              ‹
            </Button>
            <Button
              variant="ghost"
              aria-label="Next month"
              disabled={isCurrentMonth}
              onClick={() => setMonth(shiftPeriod(month, 1))}
            >
              ›
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Month">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="pb-1 text-xs font-medium text-muted" aria-hidden="true">
              {d}
            </div>
          ))}
          {Array.from({ length: blanks }, (_, i) => (
            <div key={`b${i}`} />
          ))}
          {days.map((date) => {
            const entry = byDate.get(date);
            const future = date > today;
            return (
              <button
                key={date}
                type="button"
                disabled={future}
                onClick={() => navigate("today", { date })}
                aria-label={`${format(parseISO(date), "d MMMM")}${entry ? `, mood ${entry.mood.value} ${entry.mood.label}` : ", no entry"}`}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition disabled:opacity-30 ${
                  entry ? "bg-surface-2 hover:ring-1 hover:ring-muted" : "hover:bg-surface-2"
                } ${date === today ? "ring-2 ring-accent" : ""}`}
              >
                <span className={`tabular-nums ${entry ? "font-semibold text-ink" : "text-muted"}`}>
                  {Number(date.slice(8))}
                </span>
                <span className="h-4 text-sm leading-4" aria-hidden="true">
                  {entry?.mood.face ?? ""}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="History">
        {inMonth.length === 0 ? (
          <Empty title="No entries this month">Tap a day above to log it.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {inMonth.map((e) => (
              <li key={e.date}>
                <button
                  type="button"
                  onClick={() => navigate("today", { date: e.date })}
                  className="flex w-full items-center gap-3 py-2.5 text-left text-sm"
                >
                  <span className="w-14 shrink-0">
                    <span className="block font-semibold">{format(parseISO(e.date), "d MMM")}</span>
                    <span className="text-xs text-muted">{format(parseISO(e.date), "EEE")}</span>
                  </span>
                  <span className="grid flex-1 grid-cols-3 gap-2 text-xs text-muted tabular-nums">
                    <span>
                      <span className="block text-ink">
                        {formatDuration(e.sleep.durationMinutes)}
                      </span>
                      sleep
                    </span>
                    <span>
                      <span className="block text-ink">{e.studyHours} h</span>
                      study
                    </span>
                    <span>
                      <span className="block text-ink">
                        ฿{e.spendingThb.toLocaleString("en-US")}
                      </span>
                      spent
                    </span>
                  </span>
                  <span className="text-lg" aria-label={`Mood ${e.mood.value} ${e.mood.label}`}>
                    {e.mood.face}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
