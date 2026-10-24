import type { DailyEntry, IsoDate } from "../domain/index.ts";
import type { BackupFormat, LegacyEntryReader } from "../infrastructure/LegacyEntryReader.ts";
import type { EntryRepository } from "../infrastructure/repositories.ts";
import { parseEntry } from "./entryUseCases.ts";
import { describeError } from "./ValidationError.ts";

export interface ImportProblem {
  /** 1-based row number in the file. */
  row: number;
  date: string;
  reason: string;
}

export interface ImportPreview {
  format: BackupFormat;
  totalRows: number;
  valid: DailyEntry[];
  invalid: ImportProblem[];
  /** Dates that already have an entry here and would be replaced. */
  overwrites: IsoDate[];
  /** Dates that appeared more than once in the file; the last row wins. */
  duplicates: IsoDate[];
}

/**
 * UC7: import legacy or v2 data.
 * Two steps on purpose: preview() validates every row with the Zod schema and reports counts,
 * so the owner can check them before commit() writes anything. Invalid rows are never saved.
 */
export class ImportBackupUseCase {
  private readonly reader: LegacyEntryReader;
  private readonly entries: EntryRepository;

  constructor(reader: LegacyEntryReader, entries: EntryRepository) {
    this.reader = reader;
    this.entries = entries;
  }

  async preview(text: string): Promise<ImportPreview> {
    const { format, rows } = this.reader.parse(text);
    const byDate = new Map<IsoDate, DailyEntry>();
    const duplicates = new Set<IsoDate>();
    const invalid: ImportProblem[] = [];

    rows.forEach((row, index) => {
      try {
        const entry = parseEntry(row);
        if (byDate.has(entry.date)) duplicates.add(entry.date);
        byDate.set(entry.date, entry);
      } catch (error) {
        invalid.push({
          row: index + 1,
          date: typeof row.date === "string" ? row.date : "?",
          reason: describeError(error),
        });
      }
    });

    const existing = new Set((await this.entries.findAll()).map((e) => e.date));
    const valid = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    return {
      format,
      totalRows: rows.length,
      valid,
      invalid,
      overwrites: valid.filter((e) => existing.has(e.date)).map((e) => e.date),
      duplicates: [...duplicates],
    };
  }

  async commit(preview: ImportPreview): Promise<number> {
    await this.entries.upsertMany(preview.valid);
    return preview.valid.length;
  }
}
