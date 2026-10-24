import { useState } from "react";
import { ValidationError } from "../../application/ValidationError.ts";
import { Button, Card, ErrorState, FieldError, Loading } from "../components/primitives.tsx";
import { useSaveSettings, useSettings } from "../hooks/useData.ts";
import { useServices } from "../ServicesContext.tsx";
import { BackupSection } from "./settings/BackupSection.tsx";
import { DevicesSection } from "./settings/DevicesSection.tsx";

const input =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink tabular-nums aria-invalid:border-danger";

function GoalsSection() {
  const query = useSettings();
  const save = useSaveSettings();
  const [draft, setDraft] = useState<{ sleep: string; study: string } | null>(null);

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const values = draft ?? {
    sleep: String(query.settings.sleepGoalHours),
    study: String(query.settings.studyGoalHours),
  };
  const errors = save.error instanceof ValidationError ? save.error.fieldErrors : {};

  const onSave = () =>
    save.mutate(
      {
        sleepGoalHours: Number(values.sleep),
        studyGoalHours: Number(values.study),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      { onSuccess: () => setDraft(null) },
    );

  return (
    <Card title="Goals">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="sleep-goal" className="mb-1.5 block text-xs text-muted">
            Sleep goal (hours)
          </label>
          <input
            id="sleep-goal"
            type="number"
            inputMode="decimal"
            step="0.5"
            className={input}
            value={values.sleep}
            aria-invalid={errors.sleepGoalHours ? true : undefined}
            onChange={(e) => setDraft({ ...values, sleep: e.target.value })}
          />
          <FieldError id="sleep-goal-error" message={errors.sleepGoalHours} />
        </div>
        <div>
          <label htmlFor="study-goal" className="mb-1.5 block text-xs text-muted">
            Study goal (hours)
          </label>
          <input
            id="study-goal"
            type="number"
            inputMode="decimal"
            step="0.5"
            className={input}
            value={values.study}
            aria-invalid={errors.studyGoalHours ? true : undefined}
            onChange={(e) => setDraft({ ...values, study: e.target.value })}
          />
          <FieldError id="study-goal-error" message={errors.studyGoalHours} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="primary" onClick={onSave} disabled={!draft || save.isPending}>
          {save.isPending ? "Saving…" : "Save goals"}
        </Button>
        {save.isSuccess && !draft && <span className="text-sm text-good">Saved ✓</span>}
        {save.isError && !(save.error instanceof ValidationError) && (
          <span className="text-sm text-danger">{save.error.message}</span>
        )}
      </div>
    </Card>
  );
}

export function SettingsPage({ onSignOut, email }: { onSignOut?: () => void; email?: string }) {
  const { mode } = useServices();
  return (
    <div className="flex flex-col gap-4">
      <GoalsSection />
      <DevicesSection />
      <BackupSection />
      <Card title="Account">
        {mode === "local" ? (
          <p className="text-sm text-muted">
            Local mode: data is saved in this browser only, with no login. Add Supabase keys to{" "}
            <code className="rounded bg-surface-2 px-1">.env.local</code> to sync to the cloud and
            use the desk display.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm text-muted">Signed in as {email}</p>
            <Button onClick={onSignOut}>Sign out</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
