import { sortByDateDesc, type DailyEntry, type IsoDate } from "../domain/index.ts";
import type { EntryRepository } from "./repositories.ts";

/** Keeps entries in a Map keyed by date, so BR1 holds by construction. Used by tests. */
export class InMemoryEntryRepository implements EntryRepository {
  protected readonly byDate = new Map<IsoDate, DailyEntry>();

  constructor(initial: readonly DailyEntry[] = []) {
    for (const e of initial) this.byDate.set(e.date, e);
  }

  async findAll(): Promise<DailyEntry[]> {
    return sortByDateDesc([...this.byDate.values()]);
  }

  async findByDate(date: IsoDate): Promise<DailyEntry | null> {
    return this.byDate.get(date) ?? null;
  }

  async upsert(entry: DailyEntry): Promise<void> {
    this.byDate.set(entry.date, entry);
    this.persist();
  }

  async upsertMany(entries: readonly DailyEntry[]): Promise<void> {
    for (const e of entries) this.byDate.set(e.date, e);
    this.persist();
  }

  async delete(date: IsoDate): Promise<void> {
    this.byDate.delete(date);
    this.persist();
  }

  /** Hook for subclasses that save somewhere. */
  protected persist(): void {}
}
