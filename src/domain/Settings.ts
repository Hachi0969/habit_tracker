import { DomainError } from "./errors.ts";

export interface Settings {
  sleepGoalHours: number;
  studyGoalHours: number;
  /** IANA zone used to decide what "today" is on the server and the device. */
  timezone: string;
}

/** BR7: defaults until the owner changes them. */
export const DEFAULT_SETTINGS: Settings = Object.freeze({
  sleepGoalHours: 8,
  studyGoalHours: 2,
  timezone: "Asia/Bangkok",
});

export function createSettings(input: Settings): Settings {
  if (!(input.sleepGoalHours > 0 && input.sleepGoalHours <= 16)) {
    throw new DomainError("Sleep goal must be between 0 and 16 hours", "sleepGoalHours");
  }
  if (!(input.studyGoalHours >= 0 && input.studyGoalHours <= 24)) {
    throw new DomainError("Study goal must be between 0 and 24 hours", "studyGoalHours");
  }
  return Object.freeze({ ...input });
}
