import { z } from "zod";
import { isIsoDate } from "./dates.ts";

/**
 * One Zod schema shared by the form, the LogEntry use case and the import.
 * It mirrors BR2-BR4 so the user sees field-level messages; createDailyEntry() is still
 * the final authority. (Not used by the Edge Function, which cannot import npm packages.)
 */
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { error: "Pick a time" });

export const entryInputSchema = z
  .object({
    date: z.string().refine(isIsoDate, { error: "Pick a valid date" }),
    bedtime: clock,
    wakeTime: clock,
    studyHours: z
      .number({ error: "Enter study hours" })
      .min(0, { error: "Study hours cannot be negative" })
      .max(24, { error: "Study hours cannot be more than 24" }),
    spendingThb: z
      .number({ error: "Enter an amount (0 if nothing)" })
      .min(0, { error: "Spending cannot be negative" })
      .max(99_999_999, { error: "That amount is too large" }),
    mood: z
      .number({ error: "Pick a mood" })
      .int({ error: "Pick a mood" })
      .min(1, { error: "Pick a mood" })
      .max(5, { error: "Pick a mood" }),
  })
  .refine((v) => v.bedtime.slice(0, 5) !== v.wakeTime.slice(0, 5), {
    path: ["wakeTime"],
    error: "Bedtime and wake time cannot be the same",
  });

export type EntryInputSchema = z.infer<typeof entryInputSchema>;

/** v2 backup file format (what Export writes and Import reads). */
export const backupFileSchema = z.object({
  app: z.literal("life-dashboard"),
  version: z.literal(2),
  exportedAt: z.string(),
  entries: z.array(z.unknown()),
});
