import { backupFileSchema } from "../domain/index.ts";

/** localStorage key used by the old app in ../life-dashboard. Read only, never written. */
export const LEGACY_STORAGE_KEY = "life-dashboard-entries";

export type BackupFormat = "legacy" | "v2";

export interface RawBackup {
  format: BackupFormat;
  /** Candidate rows in DailyEntryInput shape. Still unvalidated: the use case runs Zod on each. */
  rows: Record<string, unknown>[];
}

/**
 * Adapter: turns either backup format into DailyEntryInput-shaped rows.
 *  - legacy (old app): [{ date, bedtime, wakeTime, spending, studyHours, mood, sleepHours }]
 *    with numbers sometimes stored as strings. sleepHours is ignored: v2 computes it.
 *  - v2 (this app's export): { app: "life-dashboard", version: 2, entries: [...] }
 */
export class LegacyEntryReader {
  parse(text: string): RawBackup {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("This file is not valid JSON.");
    }

    if (Array.isArray(json)) {
      return { format: "legacy", rows: json.map(adaptLegacyRow) };
    }
    const v2 = backupFileSchema.safeParse(json);
    if (v2.success) {
      return { format: "v2", rows: v2.data.entries.map(asRecord) };
    }
    throw new Error("Unrecognised file. Use an old Life Dashboard backup or a v2 export.");
  }

  /** Reads the old app's data if it lives in this browser (same origin only). */
  readFromStorage(storage: Storage): string | null {
    try {
      return storage.getItem(LEGACY_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toNumber(value: unknown): unknown {
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
}

function adaptLegacyRow(value: unknown): Record<string, unknown> {
  const row = asRecord(value);
  return {
    date: row.date,
    bedtime: row.bedtime,
    wakeTime: row.wakeTime,
    studyHours: toNumber(row.studyHours),
    spendingThb: toNumber(row.spending),
    mood: toNumber(row.mood),
  };
}
