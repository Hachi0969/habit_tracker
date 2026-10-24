import { format, parseISO } from "date-fns";
import { addDays, isIsoDate, toInput, type DailyEntryInput } from "../../domain/index.ts";
import { ErrorState, Loading } from "../components/primitives.tsx";
import { useEntries, useEntryMap, useStreak, useToday } from "../hooks/useData.ts";
import { navigate } from "../router.ts";
import { EntryForm } from "./EntryForm.tsx";

export function TodayPage({ params }: { params: URLSearchParams }) {
  const today = useToday();
  const requested = params.get("date");
  const date = requested && isIsoDate(requested) ? requested : today;
  const entries = useEntries();
  const byDate = useEntryMap(entries.data);
  const streak = useStreak(entries.data, today);

  const go = (d: string) => navigate("today", d === today ? undefined : { date: d });

  if (entries.isPending) return <Loading />;
  if (entries.isError)
    return <ErrorState error={entries.error} onRetry={() => entries.refetch()} />;

  const existing = byDate.get(date);
  // Pre-fill with the most recent earlier night's times so a normal day needs no typing.
  const previous = entries.data.find((e) => e.date < date);
  const defaults: DailyEntryInput = existing
    ? toInput(existing)
    : {
        date,
        bedtime: previous?.sleep.bedtime ?? "23:00",
        wakeTime: previous?.sleep.wakeTime ?? "07:00",
        studyHours: 0,
        spendingThb: 0,
        mood: Number.NaN, // must be picked
      };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(addDays(date, -1))}
          className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-lg"
          aria-label="Previous day"
        >
          ‹
        </button>
        <label className="relative flex-1">
          <span className="sr-only">Date (the morning you woke up)</span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => isIsoDate(e.target.value) && go(e.target.value)}
            className="absolute inset-0 opacity-0"
          />
          <span className="flex h-11 flex-col items-center justify-center rounded-xl border border-line bg-surface text-center leading-tight">
            <span className="text-sm font-semibold">
              {date === today ? "Today" : format(parseISO(date), "EEEE")}
            </span>
            <span className="text-xs text-muted">{format(parseISO(date), "d MMM yyyy")}</span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => go(addDays(date, 1))}
          disabled={date >= today}
          className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-lg disabled:opacity-40"
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      <p className="flex items-center justify-between text-xs text-muted">
        <span>
          {existing ? "Editing a saved day" : "New entry"} · date = the morning you woke up
        </span>
        <span className="font-medium text-ink">🔥 {streak.current}-day streak</span>
      </p>

      <EntryForm
        key={date /* a new date mounts a fresh form; saving keeps the same one */}
        date={date}
        defaults={defaults}
        isExisting={Boolean(existing)}
      />
    </div>
  );
}
