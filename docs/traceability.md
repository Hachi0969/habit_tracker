# Traceability: requirement → use case → code → test

Status: ✅ automated test passes · 🧪 test written, needs Supabase/hardware to run · ☑ manual checklist

| Req | Use case | Code | Test | Status |
|-----|----------|------|------|--------|
| FR1 sign up / in / out | UC1 | `infrastructure/AuthService.ts`, `ui/pages/LoginPage.tsx` | Manual: sign up, confirm email, sign in, sign out | ☑ |
| FR2 create entry | UC2 | `application/entryUseCases.ts` `LogEntryUseCase`, `ui/pages/EntryForm.tsx` | `tests/component/ui.test.tsx` "saves a valid day"; `tests/integration/useCases.test.ts` | ✅ |
| FR3 sleep duration across midnight | UC2 | `domain/SleepSpan.ts` | `tests/unit/SleepSpan.test.ts` (23:00→07:00 = 480, 00:30→08:00 = 450, 22:15→05:45 = 450, 22:00→22:00 rejected) | ✅ |
| FR4 edit / delete, one per date | UC3 | `LogEntryUseCase`, `DeleteEntryUseCase`, DB `unique(user_id,date)` | "saving twice for one date updates" (integration); `supabase/tests/rls.test.sql` duplicate date | ✅ / 🧪 |
| FR5 month calendar with mood | UC4 | `ui/pages/CalendarPage.tsx` | Manual in browser (360 px, dark + light) | ☑ |
| FR6 six charts | UC5 | `ui/charts/trendCharts.ts`, `MetricChart.tsx` | "empty chart state appears" (component); manual visual check | ✅ / ☑ |
| FR7 weekly / monthly summaries | UC5 | `domain/PeriodSummaryCalculator.ts`, `domain/Period.ts` | `tests/unit/calculators.test.ts` "matches hand-calculated sample data" | ✅ |
| FR8 insights | UC6 | `domain/insights/*` | `tests/unit/insights.test.ts` | ✅ |
| FR9 import legacy / export JSON | UC7 | `application/ImportBackupUseCase.ts`, `infrastructure/LegacyEntryReader.ts` | Integration: legacy preview counts + reasons, values match old data, v2 round-trip | ✅ |
| FR10 register / revoke device | UC8 | `application/deviceUseCases.ts`, `ui/pages/settings/DevicesSection.tsx` | Integration: token returned once, only SHA-256 hash stored; RLS test: browser cannot change hash | ✅ / 🧪 |
| FR11 device summary endpoint | UC9 | `supabase/functions/device-summary`, `domain/SummaryBuilder.ts` | Unit: payload shape, `is_today`, < 1 KB; `tests/contract/deviceSummary.test.ts` (200 / 401 / revoked) | ✅ / 🧪 |
| FR12 three rotating OLED pages | UC10 | `firmware/esp32-display` | Device checklist below | ☑ |
| FR13 cross-metric analysis | UC6 | `SleepVsStudyRule`, `SleepVsMoodRule` | `tests/unit/insights.test.ts` | ✅ |
| NFR4 own rows only | — | `supabase/migrations/*_init.sql` RLS | `supabase/tests/rls.test.sql` (two accounts) | 🧪 |
| NFR6 invalid values rejected by app and DB | — | `domain/entrySchema.ts`, `createDailyEntry`, DB checks | Unit tests + `rls.test.sql` mood 6 / study 25 / negative spending | ✅ / 🧪 |
| BR6 no causal wording, sample size shown | UC6 | `InsightEngine` guard | "never uses causal wording" + "drops a rule's insight that uses causal wording" | ✅ |

## Device checklist (FR12, NFR5)
- [ ] `oled-hello` shows a frame touching all four edges (controller confirmed).
- [ ] Pages rotate about every 5 s: Today → Mood + streak → Week.
- [ ] Turn off the router: the last values stay, stale marker appears (top-right triangle).
- [ ] Revoke the device in Settings: the display shows "auth error" within 5 minutes.
- [ ] Log an entry on the phone: the display shows it within 5 minutes.
