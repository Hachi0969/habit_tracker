import { describe, expect, it } from "vitest";
import { RegisterDeviceUseCase } from "../../src/application/deviceUseCases.ts";
import {
  DeleteEntryUseCase,
  ExportBackupUseCase,
  LogEntryUseCase,
  SaveSettingsUseCase,
} from "../../src/application/entryUseCases.ts";
import { ImportBackupUseCase } from "../../src/application/ImportBackupUseCase.ts";
import { ValidationError } from "../../src/application/ValidationError.ts";
import { DEFAULT_SETTINGS } from "../../src/domain/index.ts";
import { InMemoryEntryRepository } from "../../src/infrastructure/InMemoryEntryRepository.ts";
import { LegacyEntryReader } from "../../src/infrastructure/LegacyEntryReader.ts";
import {
  LOCAL_ENTRIES_KEY,
  LocalSettingsRepository,
  LocalStorageEntryRepository,
} from "../../src/infrastructure/localMode.ts";
import type { Device, DeviceRepository } from "../../src/infrastructure/repositories.ts";
import { WebCryptoTokenGenerator } from "../../src/infrastructure/TokenGenerator.ts";
import { entry, input } from "../fixtures.ts";

describe("LogEntryUseCase", () => {
  it("saving twice for one date updates, not duplicates (BR1)", async () => {
    const repo = new InMemoryEntryRepository();
    const log = new LogEntryUseCase(repo);
    await log.execute(input({ studyHours: 1 }));
    await log.execute(input({ studyHours: 3 }));
    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.studyHours).toBe(3);
  });

  it("rejects invalid input with field errors and saves nothing", async () => {
    const repo = new InMemoryEntryRepository();
    const error = await new LogEntryUseCase(repo)
      .execute(input({ mood: 6, studyHours: -1 }))
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(Object.keys((error as ValidationError).fieldErrors)).toEqual(
      expect.arrayContaining(["mood", "studyHours"]),
    );
    expect(await repo.findAll()).toEqual([]);
  });
});

describe("DeleteEntryUseCase", () => {
  it("removes only that date", async () => {
    const repo = new InMemoryEntryRepository([entry(), entry({ date: "2026-10-23" })]);
    await new DeleteEntryUseCase(repo).execute("2026-10-24");
    expect((await repo.findAll()).map((e) => e.date)).toEqual(["2026-10-23"]);
  });
});

describe("ImportBackupUseCase", () => {
  const legacy = JSON.stringify([
    {
      date: "2026-10-01",
      bedtime: "23:00",
      wakeTime: "07:00",
      spending: "120",
      studyHours: "2",
      mood: "4",
      sleepHours: 8,
    },
    {
      date: "2026-10-02",
      bedtime: "22:00",
      wakeTime: "22:00",
      spending: 0,
      studyHours: 1,
      mood: 3,
    },
    {
      date: "2026-10-03",
      bedtime: "00:30",
      wakeTime: "08:00",
      spending: -5,
      studyHours: 1,
      mood: 3,
    },
    {
      date: "2026-10-04",
      bedtime: "23:30",
      wakeTime: "06:30",
      spending: 50,
      studyHours: 0,
      mood: 5,
    },
    {
      date: "2026-10-04",
      bedtime: "23:30",
      wakeTime: "06:30",
      spending: 70,
      studyHours: 0,
      mood: 5,
    },
  ]);

  it("previews legacy data: counts, invalid rows with reasons, duplicates, overwrites", async () => {
    const repo = new InMemoryEntryRepository([entry({ date: "2026-10-01" })]);
    const preview = await new ImportBackupUseCase(new LegacyEntryReader(), repo).preview(legacy);
    expect(preview.format).toBe("legacy");
    expect(preview.totalRows).toBe(5);
    expect(preview.valid.map((e) => e.date)).toEqual(["2026-10-01", "2026-10-04"]);
    expect(preview.invalid.map((p) => [p.row, p.date])).toEqual([
      [2, "2026-10-02"],
      [3, "2026-10-03"],
    ]);
    expect(preview.invalid[0]!.reason).toMatch(/cannot be the same/);
    expect(preview.invalid[1]!.reason).toMatch(/spendingThb/);
    expect(preview.duplicates).toEqual(["2026-10-04"]);
    expect(preview.overwrites).toEqual(["2026-10-01"]);
    // preview never writes
    expect(await repo.findAll()).toHaveLength(1);
  });

  it("commits only valid rows, and values match the old data", async () => {
    const repo = new InMemoryEntryRepository();
    const useCase = new ImportBackupUseCase(new LegacyEntryReader(), repo);
    expect(await useCase.commit(await useCase.preview(legacy))).toBe(2);
    const oct1 = await repo.findByDate("2026-10-01");
    expect(oct1?.spendingThb).toBe(120);
    expect(oct1?.sleep.durationMinutes).toBe(480);
    expect((await repo.findByDate("2026-10-04"))?.spendingThb).toBe(70); // last row wins
  });

  it("round-trips a v2 export", async () => {
    const source = new InMemoryEntryRepository([entry(), entry({ date: "2026-10-20", mood: 1 })]);
    const { json, count } = await new ExportBackupUseCase(source).execute(
      new Date("2026-10-24T00:00:00Z"),
    );
    expect(count).toBe(2);
    const target = new InMemoryEntryRepository();
    const useCase = new ImportBackupUseCase(new LegacyEntryReader(), target);
    const preview = await useCase.preview(json);
    expect(preview.format).toBe("v2");
    await useCase.commit(preview);
    expect(await target.findAll()).toEqual(await source.findAll());
  });

  it("rejects files that are not backups", async () => {
    const useCase = new ImportBackupUseCase(new LegacyEntryReader(), new InMemoryEntryRepository());
    await expect(useCase.preview("not json")).rejects.toThrow(/not valid JSON/);
    await expect(useCase.preview('{"hello":1}')).rejects.toThrow(/Unrecognised/);
  });
});

describe("local mode", () => {
  it("persists entries and settings, and never touches the legacy key", async () => {
    localStorage.clear();
    localStorage.setItem("life-dashboard-entries", "OLD");
    const repo = new LocalStorageEntryRepository(localStorage);
    await repo.upsert(entry());
    expect(JSON.parse(localStorage.getItem(LOCAL_ENTRIES_KEY)!)).toHaveLength(1);
    expect(await new LocalStorageEntryRepository(localStorage).findAll()).toHaveLength(1);

    const settings = new LocalSettingsRepository(localStorage);
    expect(await settings.get()).toEqual(DEFAULT_SETTINGS);
    await new SaveSettingsUseCase(settings).execute({ ...DEFAULT_SETTINGS, studyGoalHours: 3 });
    expect((await settings.get()).studyGoalHours).toBe(3);
    expect(localStorage.getItem("life-dashboard-entries")).toBe("OLD");
  });

  it("rejects invalid settings", async () => {
    const save = new SaveSettingsUseCase(new LocalSettingsRepository(localStorage));
    await expect(save.execute({ ...DEFAULT_SETTINGS, sleepGoalHours: -1 })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("RegisterDeviceUseCase", () => {
  it("returns the token once and stores only its SHA-256 hash", async () => {
    const stored: string[] = [];
    const devices: DeviceRepository = {
      list: async () => [],
      revoke: async () => {},
      create: async (name, tokenHash): Promise<Device> => {
        stored.push(tokenHash);
        return { id: "d1", name, createdAt: "", lastSeenAt: null, revokedAt: null };
      },
    };
    const tokens = new WebCryptoTokenGenerator();
    const { token, device } = await new RegisterDeviceUseCase(devices, tokens).execute(
      " desk ESP32 ",
    );
    expect(device.name).toBe("desk ESP32");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(stored[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(stored[0]).not.toContain(token);
    expect(stored[0]).toBe(await tokens.hash(token));
  });

  it("requires a name", async () => {
    const useCase = new RegisterDeviceUseCase(
      {} as DeviceRepository,
      new WebCryptoTokenGenerator(),
    );
    await expect(useCase.execute("  ")).rejects.toBeInstanceOf(ValidationError);
  });
});
