import { describe, expect, it } from "vitest";

/**
 * Contract test for the device-summary Edge Function (UC9). Runs only when pointed at a server:
 *   supabase start && supabase functions serve device-summary --no-verify-jwt
 *   DEVICE_SUMMARY_URL=http://127.0.0.1:54321/functions/v1/device-summary \
 *   DEVICE_TOKEN=<token from Settings> REVOKED_DEVICE_TOKEN=<a revoked token> npm test
 */
// Vitest runs in Node; declared here so browser code does not get Node types.
declare const process: { env: Record<string, string | undefined> };

const url = process.env.DEVICE_SUMMARY_URL;
const token = process.env.DEVICE_TOKEN;
const revoked = process.env.REVOKED_DEVICE_TOKEN;

describe.skipIf(!url)("device-summary contract", () => {
  it("returns 401 without a token", async () => {
    expect((await fetch(url!)).status).toBe(401);
  });

  it.skipIf(!revoked)("returns 401 for a revoked token", async () => {
    expect((await fetch(url!, { headers: { "x-device-token": revoked! } })).status).toBe(401);
  });

  it.skipIf(!token)("returns the summary under 1 KB for a valid token", async () => {
    const res = await fetch(url!, { headers: { "x-device-token": token! } });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeLessThan(1024);
    const body = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(
      [
        "date",
        "is_today",
        "mood",
        "sleep_goal_hours",
        "sleep_hours",
        "streak",
        "study_goal_hours",
        "study_hours",
        "updated_at",
        "week_study",
      ].sort(),
    );
    expect(body.week_study).toHaveLength(7);
  });
});
