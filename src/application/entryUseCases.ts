import {
  DomainError,
  createDailyEntry,
  createSettings,
  entryInputSchema,
  toInput,
  type DailyEntry,
  type IsoDate,
  type Settings,
} from "../domain/index.ts";
import type { EntryRepository, SettingsRepository } from "../infrastructure/repositories.ts";
import { ValidationError } from "./ValidationError.ts";

/** Validate raw input with the shared schema, then let the domain factory have the final say. */
export function parseEntry(raw: unknown): DailyEntry {
  const parsed = entryInputSchema.safeParse(raw);
  if (!parsed.success) throw ValidationError.fromZod(parsed.error);
  try {
    return createDailyEntry(parsed.data);
  } catch (error) {
    if (error instanceof DomainError) throw ValidationError.fromDomain(error);
    throw error;
  }
}

/** UC2/UC3: create or edit the entry for a date. Saving twice for one date updates it (BR1). */
export class LogEntryUseCase {
  private readonly entries: EntryRepository;

  constructor(entries: EntryRepository) {
    this.entries = entries;
  }

  async execute(raw: unknown): Promise<DailyEntry> {
    const entry = parseEntry(raw); // throws before anything is sent to the database
    await this.entries.upsert(entry);
    return entry;
  }
}

/** UC3: remove the entry for a date. */
export class DeleteEntryUseCase {
  private readonly entries: EntryRepository;

  constructor(entries: EntryRepository) {
    this.entries = entries;
  }

  async execute(date: IsoDate): Promise<void> {
    await this.entries.delete(date);
  }
}

/** UC7: export a JSON backup in the v2 format. */
export class ExportBackupUseCase {
  private readonly entries: EntryRepository;

  constructor(entries: EntryRepository) {
    this.entries = entries;
  }

  async execute(
    now: Date = new Date(),
  ): Promise<{ fileName: string; json: string; count: number }> {
    const all = await this.entries.findAll();
    const json = JSON.stringify(
      {
        app: "life-dashboard",
        version: 2,
        exportedAt: now.toISOString(),
        entries: [...all].reverse().map(toInput), // oldest first reads naturally
      },
      null,
      2,
    );
    return {
      fileName: `life-dashboard-v2-backup-${now.toISOString().slice(0, 10)}.json`,
      json,
      count: all.length,
    };
  }
}

export class SaveSettingsUseCase {
  private readonly settings: SettingsRepository;

  constructor(settings: SettingsRepository) {
    this.settings = settings;
  }

  async execute(input: Settings): Promise<Settings> {
    let valid: Settings;
    try {
      valid = createSettings(input);
    } catch (error) {
      if (error instanceof DomainError) throw ValidationError.fromDomain(error);
      throw error;
    }
    await this.settings.save(valid);
    return valid;
  }
}
