import { useMemo, useState } from "react";
import {
  PeriodSummaryCalculator,
  periodContaining,
  periodContains,
  shiftPeriod,
  type DailyEntry,
  type IsoDate,
  type PeriodKind,
} from "../../domain/index.ts";

const calculator = new PeriodSummaryCalculator();

/** Selected week/month plus the entries and summary inside it. Shared by Trends and Insights. */
export function usePeriod(
  entries: readonly DailyEntry[] | undefined,
  today: IsoDate,
  initial: PeriodKind,
) {
  const [kind, setKindState] = useState<PeriodKind>(initial);
  const [offset, setOffset] = useState(0);

  const period = useMemo(
    () => shiftPeriod(periodContaining(kind, today), offset),
    [kind, today, offset],
  );
  const inPeriod = useMemo(
    () => (entries ?? []).filter((e) => periodContains(period, e.date)),
    [entries, period],
  );
  const summary = useMemo(() => calculator.summarize(inPeriod, period), [inPeriod, period]);

  return {
    kind,
    setKind: (k: PeriodKind) => {
      setKindState(k);
      setOffset(0);
    },
    period,
    inPeriod,
    summary,
    canGoForward: offset < 0,
    back: () => setOffset((o) => o - 1),
    forward: () => setOffset((o) => Math.min(0, o + 1)),
  };
}
