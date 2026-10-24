import { addDays, type IsoDate } from "./dates.ts";

/**
 * BR5: a streak is the number of consecutive dates with an entry, ending today,
 * or ending yesterday if today is not logged yet (so the streak does not drop to 0 at breakfast).
 */
export class StreakCalculator {
  current(loggedDates: Iterable<IsoDate>, today: IsoDate): number {
    const dates = new Set(loggedDates);
    let day = dates.has(today) ? today : addDays(today, -1);
    let streak = 0;
    while (dates.has(day)) {
      streak += 1;
      day = addDays(day, -1);
    }
    return streak;
  }

  /** Longest run of consecutive logged dates anywhere in the history. */
  longest(loggedDates: Iterable<IsoDate>): number {
    const sorted = [...new Set(loggedDates)].sort();
    let best = 0;
    let run = 0;
    let previous: IsoDate | null = null;
    for (const date of sorted) {
      run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1;
      best = Math.max(best, run);
      previous = date;
    }
    return best;
  }
}
