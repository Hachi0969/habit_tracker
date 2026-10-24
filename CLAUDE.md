# Life Dashboard v2 – project brief for Claude Code

Owner: Min. Rebuild of the old app in `../life-dashboard` (React + Vite + localStorage, single 1,200-line App.jsx). Keep the old folder untouched; it is the source for the one-time data import.
Full plan (requirements, OOAD, diagrams): "Life Dashboard v2 – Software Engineering & OOAD Plan" doc, exported by the owner. This file is the short version. Explain each step to the owner; they want to understand the code, not just get it working.

## Goal
Log sleep, study, spending, mood once a day (under 20 s on a phone) -> charts + cautious insights -> ESP32 + OLED desk display shows today's summary.

## Decisions (confirmed)
- TypeScript, React 19 + Vite, Tailwind CSS, Recharts, TanStack Query, React Hook Form + Zod, date-fns.
- Backend: Supabase (Postgres + Auth + RLS + Edge Function `device-summary`). Hosting: Vercel or Cloudflare Pages.
- Entry date = the date the owner WAKES UP (sleep ending that morning).
- Bedtime == wake time is invalid. Wake < bedtime means sleep crosses midnight.
- Default goals: sleep 8 h, study 2 h (editable in Settings). Device refresh every 5 min.
- Mood 1-5, study 0-24 h, spending THB >= 0. One entry per (user, date).
- Custom habits, AI summaries, multi-user: NOT in v2.0.
- Light weight + good looking: dark theme by default, mobile-first (360 px), few charts.
- OLED model/controller unknown (likely 128x64 SH1106, "1.3 OLED IIC"). Confirm with a hello-world spike in iteration I1; use U8g2.

## Architecture (dependencies point down only)
- `src/domain/` pure TS, no React/Supabase: SleepSpan, Mood, DailyEntry + createDailyEntry(), PeriodSummaryCalculator, InsightEngine + InsightRule (Strategy), StreakCalculator, SummaryBuilder. Unit-tested (Vitest), target 80% coverage.
- `src/application/` use cases: LogEntry, DeleteEntry, ImportBackup, RegisterDevice. Depend on interfaces only.
- `src/infrastructure/` Supabase client, EntryRepository (interface) + SupabaseEntryRepository + InMemoryEntryRepository, DeviceRepository, LegacyEntryReader.
- `src/ui/` pages (Login, Today, Calendar, Trends, Insights, Settings), components, hooks, charts. No business rules, no direct DB calls.
- `supabase/migrations/`, `supabase/functions/device-summary/`, `firmware/esp32-display/`, `tests/`, `docs/`.
- Sleep duration, summaries, insights are computed, never stored.

## Database (migration 0001)
- `daily_entries(id, user_id, date, bedtime time, wake_time time, study_hours numeric(4,2) 0..24, spending_thb numeric(10,2) >=0, mood smallint 1..5, created_at, updated_at, unique(user_id,date))`
- `devices(id, user_id, name, token_hash unique, last_seen_at, revoked_at)` – store only a SHA-256 hash; show the token once.
- `user_settings(user_id pk, sleep_goal_hours default 8, study_goal_hours default 2)`
- RLS on every table: `user_id = (select auth.uid())`.

## Device endpoint
`GET /functions/v1/device-summary`, header `x-device-token`. Returns ~300 bytes: date, is_today, study_hours, study_goal_hours, sleep_hours, sleep_goal_hours, mood, streak, week_study[7], updated_at. 401 for unknown/revoked token. ESP32 keeps last values + stale marker on failure; HTTPS with certificate validation (never skip verification). OLED pages: Today, Mood+streak, Week bars; rotate ~5 s.

## Security rules
- Browser gets only the publishable key. Service-role key lives only as an Edge Function secret.
- No secrets in git: `.env*` and firmware `secrets.h` are gitignored (commit `secrets.example.h`).
- Validate every import row with the Zod schema. No raw HTML rendering.
- Never delete the old localStorage data; verify import counts/values first.

## Process
Iterative, small increments. Plan: I0 setup (wk1), I1 domain + UI shell + OLED spike (wk2), I2 Supabase + login + RLS tests (wk3), I3 entry/calendar/history (wk4-5), I4 charts + insights (wk6), I5 import + deploy (wk7), I6 device (wk8-9), I7 hardening + demo (wk10).
Definition of done: type check, lint, tests pass; works at 360 px dark/light with loading/empty/error states; no secrets committed; design changes noted in `docs/decision-log.md`.
Git: feature branches, conventional commits.

## Start here
Iteration I0/I1: scaffold Vite + React + TS + Tailwind in this folder, add Vitest + oxlint + CI, then build `src/domain/SleepSpan` with tests (23:00->07:00 = 480 min; 00:30->08:00 = 450 min; 22:15->05:45 = 450 min; 22:00->22:00 invalid).
