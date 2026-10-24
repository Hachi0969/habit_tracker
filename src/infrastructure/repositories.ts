import type { DailyEntry, IsoDate, Settings } from "../domain/index.ts";

/**
 * Ports. Use cases depend on these interfaces, never on Supabase (Dependency Inversion),
 * so tests can plug in InMemoryEntryRepository and local mode can use localStorage.
 */
export interface EntryRepository {
  /** All entries, newest first. One year is about 365 small rows (NFR2). */
  findAll(): Promise<DailyEntry[]>;
  findByDate(date: IsoDate): Promise<DailyEntry | null>;
  /** Insert or replace the entry for its date (BR1: one entry per date). */
  upsert(entry: DailyEntry): Promise<void>;
  upsertMany(entries: readonly DailyEntry[]): Promise<void>;
  delete(date: IsoDate): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}

export interface Device {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

export interface DeviceRepository {
  list(): Promise<Device[]>;
  /** Stores only the SHA-256 hash of the token, never the token itself. */
  create(name: string, tokenHash: string): Promise<Device>;
  revoke(id: string): Promise<void>;
}
