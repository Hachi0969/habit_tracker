import { MOOD_LEVELS } from "../../domain/index.ts";

/** Five faces, each with its number and label: mood is never shown by colour alone. */
export function MoodPicker({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Mood"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="grid grid-cols-5 gap-1.5"
    >
      {MOOD_LEVELS.map((level) => {
        const selected = value === level.value;
        return (
          <button
            key={level.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${level.value} ${level.label}`}
            onClick={() => onChange(level.value)}
            className={`flex min-h-16 flex-col items-center justify-center rounded-xl border text-xs transition ${
              selected
                ? "border-mood bg-mood/15 text-ink"
                : "border-line bg-surface-2 text-muted hover:border-muted"
            }`}
          >
            <span className="text-2xl leading-none" aria-hidden="true">
              {level.face}
            </span>
            <span className="mt-1 font-medium tabular-nums">
              {level.value} · {level.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
