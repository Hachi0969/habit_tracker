-- Two-account RLS and constraint tests (iteration I2 exit criterion).
-- Run against the local stack:  supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
       ('22222222-2222-2222-2222-222222222222', 'b@test.local');

-- ------------------------------------------------------------ as user A
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into public.daily_entries (date, bedtime, wake_time, study_hours, spending_thb, mood)
values ('2026-10-24', '23:00', '07:00', 2, 100, 4);
insert into public.devices (name, token_hash)
values ('desk ESP32', repeat('a', 64));

select is((select count(*)::int from public.daily_entries), 1, 'A sees their own entry');
select is((select user_id from public.daily_entries limit 1),
          '11111111-1111-1111-1111-111111111111'::uuid, 'user_id defaults to auth.uid()');

select throws_ok(
  $$insert into public.daily_entries (user_id, date, bedtime, wake_time, study_hours, spending_thb, mood)
    values ('22222222-2222-2222-2222-222222222222', '2026-10-24', '23:00', '07:00', 1, 1, 3)$$,
  '42501', null, 'A cannot write a row for B');
select throws_ok(
  $$insert into public.daily_entries (date, bedtime, wake_time, study_hours, spending_thb, mood)
    values ('2026-10-20', '23:00', '07:00', 1, 1, 6)$$,
  '23514', null, 'mood 6 is rejected');
select throws_ok(
  $$insert into public.daily_entries (date, bedtime, wake_time, study_hours, spending_thb, mood)
    values ('2026-10-20', '23:00', '07:00', 25, 1, 3)$$,
  '23514', null, 'study 25 h is rejected');
select throws_ok(
  $$insert into public.daily_entries (date, bedtime, wake_time, study_hours, spending_thb, mood)
    values ('2026-10-20', '23:00', '07:00', 1, -1, 3)$$,
  '23514', null, 'negative spending is rejected');
select throws_ok(
  $$insert into public.daily_entries (date, bedtime, wake_time, study_hours, spending_thb, mood)
    values ('2026-10-20', '22:00', '22:00', 1, 1, 3)$$,
  '23514', null, 'bedtime = wake time is rejected');
select throws_ok(
  $$insert into public.daily_entries (date, bedtime, wake_time, study_hours, spending_thb, mood)
    values ('2026-10-24', '23:00', '07:00', 1, 1, 3)$$,
  '23505', null, 'a second entry for the same date is rejected (BR1)');
select throws_ok(
  $$update public.devices set token_hash = repeat('b', 64)$$,
  '42501', null, 'the browser cannot change a device token hash');

-- ------------------------------------------------------------ as user B
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*)::int from public.daily_entries), 0, 'B cannot see A''s entries');
select is((select count(*)::int from public.devices), 0, 'B cannot see A''s devices');

with changed as (update public.daily_entries set mood = 1 returning 1)
select is((select count(*)::int from changed), 0, 'B cannot update A''s entries');

with removed as (delete from public.daily_entries returning 1)
select is((select count(*)::int from removed), 0, 'B cannot delete A''s entries');

select * from finish();
rollback;
