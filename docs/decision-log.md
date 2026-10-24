# Decision log

Changes to the plan are recorded here with the date, the reason, and the affected requirement IDs.

| # | Date | Decision | Reason | Affects |
|---|------|----------|--------|---------|
| D0 | 2026-10-24 | Open decisions 1–5, 7, 8 accepted with the plan's defaults: TypeScript; entry date = wake-up date (BR4); bedtime = wake time rejected; goals 8 h / 2 h; device refresh 5 min; hosting Vercel or Cloudflare Pages; custom habits deferred to v2.1. | Confirmed by the owner in CLAUDE.md. | BR2, BR4, BR7, FR3 |
| D1 | 2026-10-24 | **Local mode.** When `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are not set, the app runs without login and stores data in this browser (`ld2-entries`, `ld2-settings`) via `LocalStorageEntryRepository`. Devices are disabled in local mode. | The app is usable (and demoable) before the Supabase project exists; the repository interface made this one small class. It also proves the Dependency Inversion design. | FR1, FR10 (cloud only), G2 |
| D2 | 2026-10-24 | Domain date helpers (`src/domain/dates.ts`) are hand-written instead of using date-fns. The UI still uses date-fns for formatting. | The Edge Function (Deno) reuses the domain files and cannot import npm packages without a separate import map; ISO-date arithmetic in UTC is ~40 lines and fully tested. | NFR7 |
| D3 | 2026-10-24 | Added `user_settings.timezone` (default `Asia/Bangkok`, set from the browser when goals are saved). | The Edge Function runs in UTC; it needs the owner's zone to decide what "today" is for `is_today`, streak and `week_study`. | FR11, BR5 |
| D4 | 2026-10-24 | The Edge Function reuses the domain by **copying** the needed files into `supabase/functions/_shared/domain` (`npm run sync:domain`, gitignored, run by `npm run deploy:function`). The script refuses files that import anything outside the domain. | Supabase bundles only the `functions` folder. One source of truth, no drift. | FR11, NFR7 |
| D5 | 2026-10-24 | Simple rate limit on the device endpoint: a device asking again within 15 s gets 429, using the existing `last_seen_at` column. | Plan's threat table asks for a rate limit; no extra table needed. The firmware treats 429 like any temporary failure. | NFR4 |
| D6 | 2026-10-24 | Bedtime and wake time are shown as two separate charts (six charts in total). Bedtimes after midnight are plotted as 24:xx so the line does not jump. | FR6 lists six metrics; one series per chart keeps each readable at 360 px. | FR6 |
| D7 | 2026-10-24 | A tiny hash router (`#/today?date=…`) instead of a router library. | Six screens, no nested routes; keeps the bundle small. | NFR1, NFR2 |
| D8 | 2026-10-24 | Import is two-step: **preview** (validate every row with the Zod schema, show counts, invalid rows with reasons, duplicates, overwrites) then **commit**. "Find old app data in this browser" only works on the same origin as the old app; otherwise export a file from the old app. | Plan: verify counts before saving; never delete the old data. | FR9, UC7 |
| D9 | 2026-10-24 | Added a sixth insight rule, "Sleep and mood" (mood after goal-length vs shorter sleep). | A key user story is "see my mood next to my sleep". Added as a new `InsightRule`; `InsightEngine` unchanged (Open/Closed). | FR13 |

## Still open
- **OLED controller** (decision 6): run `firmware/oled-hello` and record SH1106 vs SSD1306 here.
- **Time budget** (decision 9): 8–10 h/week for 10 weeks — owner to confirm.
