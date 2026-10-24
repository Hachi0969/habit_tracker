/** Number input with big − / + buttons, so study hours take one or two taps. */
export function Stepper({
  id,
  value,
  onChange,
  step = 0.5,
  min = 0,
  max = 24,
  unit,
  invalid,
  describedBy,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const safe = Number.isFinite(value) ? value : 0;
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n / step) * step));
  const btn =
    "flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 text-xl text-ink disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={btn}
        aria-label={`Decrease by ${step}`}
        disabled={safe <= min}
        onClick={() => onChange(clamp(safe - step))}
      >
        −
      </button>
      <div className="relative flex-1">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ""}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
          className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 pr-10 text-center text-lg font-semibold text-ink tabular-nums aria-invalid:border-danger"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
          {unit}
        </span>
      </div>
      <button
        type="button"
        className={btn}
        aria-label={`Increase by ${step}`}
        disabled={safe >= max}
        onClick={() => onChange(clamp(safe + step))}
      >
        +
      </button>
    </div>
  );
}
