import { format, parseISO } from "date-fns";
import type { Period, PeriodKind } from "../../domain/index.ts";
import { Button, Segmented } from "./primitives.tsx";

const KINDS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

export function periodLabel(period: Period): string {
  if (period.kind === "month") return format(parseISO(period.start), "MMMM yyyy");
  return `${format(parseISO(period.start), "d MMM")} – ${format(parseISO(period.end), "d MMM yyyy")}`;
}

/** Filters live in one row above the content. */
export function PeriodBar({
  kind,
  setKind,
  period,
  back,
  forward,
  canGoForward,
}: {
  kind: PeriodKind;
  setKind: (k: PeriodKind) => void;
  period: Period;
  back: () => void;
  forward: () => void;
  canGoForward: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Segmented label="Period" value={kind} options={KINDS} onChange={setKind} />
      <div className="flex items-center gap-1">
        <Button variant="ghost" aria-label="Previous period" onClick={back}>
          ‹
        </Button>
        <span className="min-w-36 text-center text-sm font-medium tabular-nums">
          {periodLabel(period)}
        </span>
        <Button variant="ghost" aria-label="Next period" onClick={forward} disabled={!canGoForward}>
          ›
        </Button>
      </div>
    </div>
  );
}
