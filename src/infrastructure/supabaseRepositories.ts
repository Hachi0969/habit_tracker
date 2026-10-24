import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SETTINGS,
  createDailyEntry,
  sortByDateDesc,
  type DailyEntry,
  type IsoDate,
  type Settings,
} from "../domain/index.ts";
import type {
  Device,
  DeviceRepository,
  EntryRepository,
  SettingsRepository,
} from "./repositories.ts";

/** Row shape of public.daily_entries (snake_case, as in migration 0001). */
interface EntryRow {
  date: string;
  bedtime: string;
  wake_time: string;
  study_hours: number | string;
  spending_thb: number | string;
  mood: number;
}

const ENTRY_COLUMNS = "date, bedtime, wake_time, study_hours, spending_thb, mood";

function toEntry(row: EntryRow): DailyEntry {
  return createDailyEntry({
    date: row.date,
    bedtime: row.bedtime,
    wakeTime: row.wake_time,
    studyHours: Number(row.study_hours),
    spendingThb: Number(row.spending_thb),
    mood: row.mood,
  });
}

function toRow(entry: DailyEntry, userId: string) {
  return {
    user_id: userId,
    date: entry.date,
    bedtime: entry.sleep.bedtime,
    wake_time: entry.sleep.wakeTime,
    study_hours: entry.studyHours,
    spending_thb: entry.spendingThb,
    mood: entry.mood.value,
  };
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export class SupabaseEntryRepository implements EntryRepository {
  private readonly db: SupabaseClient;
  private readonly userId: string;

  constructor(db: SupabaseClient, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  async findAll(): Promise<DailyEntry[]> {
    // RLS already limits rows to this user; the filter documents intent and uses the index.
    const rows = check(
      await this.db
        .from("daily_entries")
        .select(ENTRY_COLUMNS)
        .eq("user_id", this.userId)
        .order("date", { ascending: false }),
    );
    return sortByDateDesc((rows as EntryRow[]).map(toEntry));
  }

  async findByDate(date: IsoDate): Promise<DailyEntry | null> {
    const row = check(
      await this.db
        .from("daily_entries")
        .select(ENTRY_COLUMNS)
        .eq("user_id", this.userId)
        .eq("date", date)
        .maybeSingle(),
    );
    return row ? toEntry(row as EntryRow) : null;
  }

  async upsert(entry: DailyEntry): Promise<void> {
    await this.upsertMany([entry]);
  }

  async upsertMany(entries: readonly DailyEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const rows = entries.map((e) => toRow(e, this.userId));
    check(await this.db.from("daily_entries").upsert(rows, { onConflict: "user_id,date" }));
  }

  async delete(date: IsoDate): Promise<void> {
    check(await this.db.from("daily_entries").delete().eq("user_id", this.userId).eq("date", date));
  }
}

export class SupabaseSettingsRepository implements SettingsRepository {
  private readonly db: SupabaseClient;
  private readonly userId: string;

  constructor(db: SupabaseClient, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  async get(): Promise<Settings> {
    const row = check(
      await this.db
        .from("user_settings")
        .select("sleep_goal_hours, study_goal_hours, timezone")
        .eq("user_id", this.userId)
        .maybeSingle(),
    ) as { sleep_goal_hours: number; study_goal_hours: number; timezone: string } | null;
    if (!row) return { ...DEFAULT_SETTINGS };
    return {
      sleepGoalHours: Number(row.sleep_goal_hours),
      studyGoalHours: Number(row.study_goal_hours),
      timezone: row.timezone,
    };
  }

  async save(settings: Settings): Promise<void> {
    check(
      await this.db.from("user_settings").upsert({
        user_id: this.userId,
        sleep_goal_hours: settings.sleepGoalHours,
        study_goal_hours: settings.studyGoalHours,
        timezone: settings.timezone,
      }),
    );
  }
}

interface DeviceRow {
  id: string;
  name: string;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
}

const DEVICE_COLUMNS = "id, name, created_at, last_seen_at, revoked_at";

function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
  };
}

export class SupabaseDeviceRepository implements DeviceRepository {
  private readonly db: SupabaseClient;
  private readonly userId: string;

  constructor(db: SupabaseClient, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  async list(): Promise<Device[]> {
    const rows = check(
      await this.db
        .from("devices")
        .select(DEVICE_COLUMNS)
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false }),
    );
    return (rows as DeviceRow[]).map(toDevice);
  }

  async create(name: string, tokenHash: string): Promise<Device> {
    const row = check(
      await this.db
        .from("devices")
        .insert({ user_id: this.userId, name, token_hash: tokenHash })
        .select(DEVICE_COLUMNS)
        .single(),
    );
    return toDevice(row as DeviceRow);
  }

  async revoke(id: string): Promise<void> {
    check(
      await this.db
        .from("devices")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", this.userId)
        .eq("id", id),
    );
  }
}
