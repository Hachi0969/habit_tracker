# Life Dashboard v2

Log sleep, study, spending and mood once a day (in under 20 seconds on a phone), see charts and
cautious insights, and show today's summary on an ESP32 desk display.

Built from the plan *Life Dashboard v2 – Software Engineering & OOAD Plan*. Design changes are in
[docs/decision-log.md](docs/decision-log.md); requirement → test links in
[docs/traceability.md](docs/traceability.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:5174
```

With no `.env.local` the app runs in **local mode**: no login, data stays in this browser.
To use the cloud backend, copy `.env.example` to `.env.local` and fill in the Supabase URL and
**publishable** key (see "Supabase setup" below).

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript, whole project |
| `npm run lint` | oxlint |
| `npm test` | Vitest: unit, integration, component (contract tests skip without a server) |
| `npm run coverage` | Tests + domain coverage gate (80 % lines) |
| `npm run build` | Production build in `dist/` |
| `npm run deploy:function` | Copy domain files into the Edge Function and deploy it |

## Architecture

Dependencies point down only.

```
src/
  ui/              React pages, components, charts, hooks   → calls use cases via hooks
  application/     LogEntry, DeleteEntry, ImportBackup, ExportBackup, SaveSettings,
                   RegisterDevice, RevokeDevice             → depend on repository interfaces
  infrastructure/  EntryRepository (interface) + Supabase / InMemory / LocalStorage versions,
                   LegacyEntryReader, TokenGenerator, AuthService
  domain/          Pure TypeScript: SleepSpan, Mood, DailyEntry + createDailyEntry,
                   Period, PeriodSummaryCalculator, StreakCalculator, InsightEngine + rules,
                   SummaryBuilder. No React, no Supabase.
  compositionRoot.ts   the one place that picks concrete classes
supabase/
  migrations/      schema, constraints, RLS
  tests/           two-account RLS test (pgTAP)
  functions/device-summary/   the ESP32's only door
firmware/
  oled-hello/      I1 spike: confirm SH1106 vs SSD1306
  esp32-display/   WifiManager, SummaryClient, SummaryStore, PageRenderer, PageScheduler
```

Patterns: Repository, Factory (`createDailyEntry`), Adapter (`LegacyEntryReader`), Strategy
(`InsightRule`), DTO (`DeviceSummary`). Sleep duration, summaries and insights are computed, never stored.

## Supabase setup

1. Create a project at supabase.com. Auth → enable email confirmation, minimum password length 8.
2. Install the Supabase CLI, then from this folder:
   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push                 # applies supabase/migrations
   npm run deploy:function          # deploys device-summary (no JWT: the device token is the credential)
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function automatically.
   The service-role key must never be put in `.env.local` or the firmware.
3. Put the project URL and publishable (anon) key in `.env.local`, restart `npm run dev`, sign up.
4. Import your old data: in the **old** app use *Export*, then in v2 **Settings → Import file…**.
   Check the preview counts before confirming. The old app's data is never touched.
5. RLS tests locally: `supabase start && supabase test db`.

## Deploy the web app
Any static host. `vercel.json` (Vercel) and `public/_headers` (Cloudflare Pages) add the Content
Security Policy. Set the two `VITE_SUPABASE_*` variables in the host's settings.

## Desk display
See [docs/device.md](docs/device.md).
