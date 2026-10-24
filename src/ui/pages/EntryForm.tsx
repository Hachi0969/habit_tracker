import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ValidationError } from "../../application/ValidationError.ts";
import {
  SleepSpan,
  entryInputSchema,
  formatDuration,
  type DailyEntryInput,
  type IsoDate,
} from "../../domain/index.ts";
import { MoodPicker } from "../components/MoodPicker.tsx";
import { Button, FieldError } from "../components/primitives.tsx";
import { Stepper } from "../components/Stepper.tsx";
import { useDeleteEntry, useLogEntry } from "../hooks/useData.ts";

type FormValues = DailyEntryInput;

const label = "mb-1.5 block text-xs font-medium text-muted";
const input =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink aria-invalid:border-danger";

function SleepPreview({ bedtime, wakeTime }: { bedtime: string; wakeTime: string }) {
  let text: string;
  let ok = true;
  try {
    const span = SleepSpan.create(bedtime, wakeTime);
    text = `${formatDuration(span.durationMinutes)} of sleep${span.crossesMidnight ? "" : " (same clock day)"}`;
  } catch (error) {
    ok = false;
    text = error instanceof Error ? error.message : "Check the times";
  }
  return (
    <p
      aria-live="polite"
      className={`mt-2 text-sm font-medium ${ok ? "text-sleep" : "text-danger"}`}
    >
      {text}
    </p>
  );
}

export function EntryForm({
  date,
  defaults,
  isExisting,
}: {
  date: IsoDate;
  defaults: FormValues;
  isExisting: boolean;
}) {
  const log = useLogEntry();
  const remove = useDeleteEntry();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(entryInputSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, setError, formState } = form;
  const errors = formState.errors;
  const [bedtime, wakeTime] = useWatch({ control, name: ["bedtime", "wakeTime"] });

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      await log.mutateAsync({ ...values, date });
      setNotice("Saved ✓");
      form.reset({ ...values, date });
    } catch (error) {
      if (error instanceof ValidationError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof FormValues, { message });
        }
      }
      // Network errors: the form keeps its values; the retry banner below shows.
    }
  });

  const onDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await remove.mutateAsync(date);
    setConfirmDelete(false);
  };

  const saveFailed = log.isError && !(log.error instanceof ValidationError);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bedtime" className={label}>
              Bedtime (last night)
            </label>
            <input
              id="bedtime"
              type="time"
              className={input}
              aria-invalid={errors.bedtime ? true : undefined}
              aria-describedby="bedtime-error"
              {...register("bedtime")}
            />
            <FieldError id="bedtime-error" message={errors.bedtime?.message} />
          </div>
          <div>
            <label htmlFor="wakeTime" className={label}>
              Wake time (this morning)
            </label>
            <input
              id="wakeTime"
              type="time"
              className={input}
              aria-invalid={errors.wakeTime ? true : undefined}
              aria-describedby="wake-error"
              {...register("wakeTime")}
            />
            <FieldError id="wake-error" message={errors.wakeTime?.message} />
          </div>
        </div>
        <SleepPreview bedtime={bedtime} wakeTime={wakeTime} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <label htmlFor="studyHours" className={label}>
          Study
        </label>
        <Controller
          control={control}
          name="studyHours"
          render={({ field }) => (
            <Stepper
              id="studyHours"
              value={field.value}
              onChange={field.onChange}
              unit="h"
              invalid={Boolean(errors.studyHours)}
              describedBy="study-error"
            />
          )}
        />
        <FieldError id="study-error" message={errors.studyHours?.message} />

        <label htmlFor="spendingThb" className={`${label} mt-4`}>
          Spending
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            ฿
          </span>
          <input
            id="spendingThb"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            className={`${input} pl-8 tabular-nums`}
            aria-invalid={errors.spendingThb ? true : undefined}
            aria-describedby="spending-error"
            {...register("spendingThb", { valueAsNumber: true })}
          />
        </div>
        <FieldError id="spending-error" message={errors.spendingThb?.message} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className={label} id="mood-label">
          Mood
        </p>
        <Controller
          control={control}
          name="mood"
          render={({ field }) => (
            <MoodPicker
              value={field.value}
              onChange={field.onChange}
              invalid={Boolean(errors.mood)}
              describedBy="mood-error"
            />
          )}
        />
        <FieldError id="mood-error" message={errors.mood?.message} />
      </div>

      {saveFailed && (
        <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 p-3 text-sm">
          <p className="text-danger">Could not save: {log.error.message}</p>
          <p className="text-muted">Your values are kept. Check your connection and try again.</p>
        </div>
      )}

      {isExisting && (
        <Button variant="danger" onClick={onDelete} disabled={remove.isPending}>
          {confirmDelete ? "Tap again to delete this day" : "Delete entry"}
        </Button>
      )}

      {/* Save stays within thumb reach above the tab bar. */}
      <div className="sticky bottom-16 z-10 -mx-1 flex items-center gap-3 rounded-2xl bg-bg/90 p-1 backdrop-blur md:bottom-4">
        <Button
          type="submit"
          variant="primary"
          className="flex-1 text-base"
          disabled={log.isPending}
        >
          {log.isPending
            ? "Saving…"
            : saveFailed
              ? "Retry save"
              : isExisting
                ? "Update day"
                : "Save day"}
        </Button>
        {notice && !formState.isDirty && (
          <span role="status" className="text-sm font-medium text-good">
            {notice}
          </span>
        )}
      </div>
    </form>
  );
}
