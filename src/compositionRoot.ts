import { LegacyEntryReader } from "./infrastructure/LegacyEntryReader.ts";
import type {
  DeviceRepository,
  EntryRepository,
  SettingsRepository,
} from "./infrastructure/repositories.ts";
import { WebCryptoTokenGenerator } from "./infrastructure/TokenGenerator.ts";
import { RegisterDeviceUseCase, RevokeDeviceUseCase } from "./application/deviceUseCases.ts";
import {
  DeleteEntryUseCase,
  ExportBackupUseCase,
  LogEntryUseCase,
  SaveSettingsUseCase,
} from "./application/entryUseCases.ts";
import { ImportBackupUseCase } from "./application/ImportBackupUseCase.ts";
import {
  LocalSettingsRepository,
  LocalStorageEntryRepository,
} from "./infrastructure/localMode.ts";
import { getSupabase } from "./infrastructure/supabaseClient.ts";
import {
  SupabaseDeviceRepository,
  SupabaseEntryRepository,
  SupabaseSettingsRepository,
} from "./infrastructure/supabaseRepositories.ts";

export type DataMode = "local" | "cloud";

/**
 * Composition root: the one place that picks concrete classes and wires them into use cases.
 * The UI receives a Services object and never imports Supabase or localStorage code itself.
 */

/** Everything the UI may call. Built once per signed-in user. */
export interface Services {
  mode: DataMode;
  entries: EntryRepository;
  settings: SettingsRepository;
  devices: DeviceRepository | null;
  logEntry: LogEntryUseCase;
  deleteEntry: DeleteEntryUseCase;
  importBackup: ImportBackupUseCase;
  exportBackup: ExportBackupUseCase;
  saveSettings: SaveSettingsUseCase;
  registerDevice: RegisterDeviceUseCase | null;
  revokeDevice: RevokeDeviceUseCase | null;
  legacyReader: LegacyEntryReader;
}

export function buildServices(
  mode: DataMode,
  entries: EntryRepository,
  settings: SettingsRepository,
  devices: DeviceRepository | null,
): Services {
  const legacyReader = new LegacyEntryReader();
  return {
    mode,
    entries,
    settings,
    devices,
    logEntry: new LogEntryUseCase(entries),
    deleteEntry: new DeleteEntryUseCase(entries),
    importBackup: new ImportBackupUseCase(legacyReader, entries),
    exportBackup: new ExportBackupUseCase(entries),
    saveSettings: new SaveSettingsUseCase(settings),
    registerDevice: devices
      ? new RegisterDeviceUseCase(devices, new WebCryptoTokenGenerator())
      : null,
    revokeDevice: devices ? new RevokeDeviceUseCase(devices) : null,
    legacyReader,
  };
}

/** No Supabase keys: everything stays in this browser. Devices need the cloud, so they are off. */
export function createLocalServices(storage: Storage = window.localStorage): Services {
  return buildServices(
    "local",
    new LocalStorageEntryRepository(storage),
    new LocalSettingsRepository(storage),
    null,
  );
}

export function createCloudServices(userId: string): Services {
  const db = getSupabase();
  return buildServices(
    "cloud",
    new SupabaseEntryRepository(db, userId),
    new SupabaseSettingsRepository(db, userId),
    new SupabaseDeviceRepository(db, userId),
  );
}
