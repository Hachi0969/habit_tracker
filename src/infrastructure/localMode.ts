import {
  DEFAULT_SETTINGS,
  createDailyEntry,
  toInput,
  type DailyEntry,
  type DailyEntryInput,
  type Settings,
} from "../domain/index.ts";
import { InMemoryEntryRepository } from "./InMemoryEntryRepository.ts";
import type { SettingsRepository } from "./repositories.ts";

/**
 * Local mode: used when no Supabase keys are configured, so the app works offline on one
 * browser with no login. Uses NEW keys; the old app's "life-dashboard-entries" key is never
 * written or deleted.
 */
export const LOCAL_ENTRIES_KEY = "ld2-entries";
export const LOCAL_SETTINGS_KEY = "ld2-settings";

export class LocalStorageEntryRepository extends InMemoryEntryRepository {
  private readonly storage: Storage;

  constructor(storage: Storage) {
    super(readEntries(storage));
    this.storage = storage;
  }

  protected override persist(): void {
    const rows = [...this.byDate.values()].map(toInput);
    this.storage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(rows));
  }
}

function readEntries(storage: Storage): DailyEntry[] {
  try {
    const rows = JSON.parse(storage.getItem(LOCAL_ENTRIES_KEY) ?? "[]") as DailyEntryInput[];
    return rows.flatMap((row) => {
      try {
        return [createDailyEntry(row)];
      } catch {
        return []; // a corrupted row is skipped rather than breaking the app
      }
    });
  } catch {
    return [];
  }
}

export class LocalSettingsRepository implements SettingsRepository {
  private readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async get(): Promise<Settings> {
    try {
      const saved = JSON.parse(
        this.storage.getItem(LOCAL_SETTINGS_KEY) ?? "null",
      ) as Settings | null;
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async save(settings: Settings): Promise<void> {
    this.storage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  }
}
