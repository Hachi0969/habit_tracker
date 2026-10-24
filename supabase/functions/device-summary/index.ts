// GET /functions/v1/device-summary   header: x-device-token: <token>
// The ESP32's only door into the system (UC9). Returns ~250 bytes of JSON (NFR3).
//
// The domain files under ../_shared/domain are COPIED from src/domain by
// `npm run sync:domain` (run automatically by `npm run deploy:function`), so the device
// sees exactly the same sleep, streak and summary rules as the web app.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { createDailyEntry, type DailyEntry } from "../_shared/domain/DailyEntry.ts";
import { DEFAULT_SETTINGS, type Settings } from "../_shared/domain/Settings.ts";
import { SummaryBuilder } from "../_shared/domain/SummaryBuilder.ts";
import { todayIn } from "../_shared/domain/dates.ts";
import { DeviceAuthenticator } from "./DeviceAuthenticator.ts";

/** A device asking more often than this gets 429 (simple rate limit using last_seen_at). */
const MIN_INTERVAL_MS = 15_000;
/** Enough history for a long streak while keeping the query small. */
const MAX_ROWS = 400;

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return json({ error: "method not allowed" }, 405);

  // Service-role key: only ever available here, as a function secret. Never in the browser or firmware.
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: { persistSession: false },
    },
  );
  const now = new Date();

  try {
    const authenticator = new DeviceAuthenticator(db);
    const device = await authenticator.authenticate(req.headers.get("x-device-token"));
    if (!device) return json({ error: "unauthorized" }, 401);

    if (device.lastSeenAt && now.getTime() - Date.parse(device.lastSeenAt) < MIN_INTERVAL_MS) {
      return json({ error: "too many requests" }, 429, { "retry-after": "15" });
    }
    await authenticator.markSeen(device.id, now);

    const [settingsResult, entriesResult] = await Promise.all([
      db
        .from("user_settings")
        .select("sleep_goal_hours, study_goal_hours, timezone")
        .eq("user_id", device.userId)
        .maybeSingle(),
      db
        .from("daily_entries")
        .select("date, bedtime, wake_time, study_hours, spending_thb, mood, updated_at")
        .eq("user_id", device.userId)
        .order("date", { ascending: false })
        .limit(MAX_ROWS),
    ]);
    if (settingsResult.error) throw new Error(settingsResult.error.message);
    if (entriesResult.error) throw new Error(entriesResult.error.message);

    const s = settingsResult.data;
    const settings: Settings = s
      ? {
          sleepGoalHours: Number(s.sleep_goal_hours),
          studyGoalHours: Number(s.study_goal_hours),
          timezone: s.timezone,
        }
      : DEFAULT_SETTINGS;

    const rows = entriesResult.data ?? [];
    const entries: DailyEntry[] = rows.flatMap((row) => {
      try {
        return [
          createDailyEntry({
            date: row.date,
            bedtime: row.bedtime,
            wakeTime: row.wake_time,
            studyHours: Number(row.study_hours),
            spendingThb: Number(row.spending_thb),
            mood: row.mood,
          }),
        ];
      } catch {
        return []; // the database constraints make this unreachable, but never crash the device feed
      }
    });

    const today = todayIn(settings.timezone, now);
    const latestRow = rows.find((r) => r.date <= today);
    const summary = new SummaryBuilder().build({
      entries,
      settings,
      today,
      latestUpdatedAt: latestRow?.updated_at ?? null,
    });
    return json(summary);
  } catch (error) {
    console.error("device-summary failed", error);
    return json({ error: "server error" }, 500);
  }
});
