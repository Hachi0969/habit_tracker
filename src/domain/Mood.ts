import { DomainError } from "./errors.ts";

export const MOOD_LEVELS = [
  { value: 1, label: "Awful", face: "😣" },
  { value: 2, label: "Low", face: "😕" },
  { value: 3, label: "Okay", face: "😐" },
  { value: 4, label: "Good", face: "🙂" },
  { value: 5, label: "Great", face: "😄" },
] as const;

export type MoodValue = 1 | 2 | 3 | 4 | 5;

/** Value object: guarantees the 1-5 range (BR3) and names the level. */
export class Mood {
  readonly value: MoodValue;

  private constructor(value: MoodValue) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: number): Mood {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new DomainError("Mood must be a whole number from 1 to 5", "mood");
    }
    return new Mood(value as MoodValue);
  }

  get label(): string {
    return MOOD_LEVELS[this.value - 1]!.label;
  }

  get face(): string {
    return MOOD_LEVELS[this.value - 1]!.face;
  }
}
