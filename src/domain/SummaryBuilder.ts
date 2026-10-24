import { addDays, type IsoDate } from "./dates.ts";
import type { DailyEntry } from "./DailyEntry.ts";
import type { Settings } from "./Settings.ts";
import { StreakCalculator } from "./StreakCalculator.ts";

/** DTO: the minimal payload the ESP32 needs (snake_case because it goes over the wire). */
export interface DeviceSummary {
  date: IsoDate | null;
  is_today: boolean;
  study_hours: number | null;
  study_goal_hours: number;
  sleep_hours: number | null;
  sleep_goal_hours: number;
  mood: number | null;
  streak: number;
  /** Study hours for the 7 days ending today, oldest first. Missing days are 0. */
  week_study: number[];
  updated_at: string | null;
}

export interface SummaryBuilderInput {
  entries: readonly DailyEntry[];
  settings: Settings;
  today: IsoDate;
  /** When the latest entry was last saved (from the database), if known. */
  latestUpdatedAt?: string | null;
}

export class SummaryBuilder {
  private readonly streaks: StreakCalculator;

  constructor(streaks: StreakCalculator = new StreakCalculator()) {
    this.streaks = streaks;
  }

  build({ entries, settings, today, latestUpdatedAt = null }: SummaryBuilderInput): DeviceSummary {
    // Ignore entries dated in the future (for example a typo) so "latest" stays honest.
    const past = entries.filter((e) => e.date <= today);
    const latest = past.reduce<DailyEntry | null>(
      (best, e) => (best === null || e.date > best.date ? e : best),
      null,
    );
    const studyByDate = new Map(past.map((e) => [e.date, e.studyHours]));

    return {
      date: latest?.date ?? null,
      is_today: latest?.date === today,
      study_hours: latest ? latest.studyHours : null,
      study_goal_hours: settings.studyGoalHours,
      sleep_hours: latest ? Math.round(latest.sleep.durationHours * 10) / 10 : null,
      sleep_goal_hours: settings.sleepGoalHours,
      mood: latest ? latest.mood.value : null,
      streak: this.streaks.current(
        past.map((e) => e.date),
        today,
      ),
      week_study: Array.from({ length: 7 }, (_, i) => studyByDate.get(addDays(today, i - 6)) ?? 0),
      updated_at: latest ? latestUpdatedAt : null,
    };
  }
}
