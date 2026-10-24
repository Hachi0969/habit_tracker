import { DomainError } from "./errors.ts";

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
const DAY_MINUTES = 24 * 60;

/** "HH:MM" (or Postgres "HH:MM:SS") -> minutes after midnight. */
export function parseClock(value: string): number {
  const match = CLOCK.exec(value);
  if (!match) throw new DomainError(`"${value}" is not a time (HH:MM)`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatClock(minutes: number): string {
  const m = ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 450 -> "7 h 30 min" */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Value object: one night's sleep.
 * Information Expert (GRASP): it holds bedtime and wake time, so it owns the duration rule.
 * BR2: if wake time is earlier than bedtime, the sleep crosses midnight.
 */
export class SleepSpan {
  readonly bedtime: string;
  readonly wakeTime: string;
  readonly bedtimeMinutes: number;
  readonly wakeMinutes: number;

  private constructor(bedtime: string, wakeTime: string, bed: number, wake: number) {
    this.bedtime = bedtime;
    this.wakeTime = wakeTime;
    this.bedtimeMinutes = bed;
    this.wakeMinutes = wake;
    Object.freeze(this);
  }

  static create(bedtime: string, wakeTime: string): SleepSpan {
    let bed: number;
    let wake: number;
    try {
      bed = parseClock(bedtime);
    } catch {
      throw new DomainError("Bedtime must be a time like 23:00", "bedtime");
    }
    try {
      wake = parseClock(wakeTime);
    } catch {
      throw new DomainError("Wake time must be a time like 07:00", "wakeTime");
    }
    if (bed === wake) {
      throw new DomainError("Bedtime and wake time cannot be the same", "wakeTime");
    }
    // Normalise "23:00:00" from the database to "23:00".
    return new SleepSpan(formatClock(bed), formatClock(wake), bed, wake);
  }

  get crossesMidnight(): boolean {
    return this.wakeMinutes < this.bedtimeMinutes;
  }

  get durationMinutes(): number {
    return this.crossesMidnight
      ? DAY_MINUTES - this.bedtimeMinutes + this.wakeMinutes
      : this.wakeMinutes - this.bedtimeMinutes;
  }

  get durationHours(): number {
    return this.durationMinutes / 60;
  }
}
