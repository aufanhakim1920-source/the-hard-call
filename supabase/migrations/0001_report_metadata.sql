-- Report verification metadata.
--
-- The reports table predates this file: the schema was created in the Supabase
-- dashboard, not from this repo, so this is an ADDITIVE migration and asserts
-- nothing about the rest of the table. It adds only the columns the client now
-- round-trips, so a card pulled on another device can still say that its score
-- was never verified and why the write-up is missing.
--
-- Until this runs, src/lib/sync.ts detects the missing columns on its first
-- upsert and writes the legacy row shape instead, so reports keep syncing.
--
-- Idempotent: safe to run more than once, and safe to run while the old client
-- is still deployed — every column is nullable and nothing reads them yet.
--
-- Row Level Security is unchanged. The existing own-rows policies are
-- row-level, so new columns inherit them; no policy is added or altered here.

alter table public.reports add column if not exists score_unverified boolean;
alter table public.reports add column if not exists unverified integer;
alter table public.reports add column if not exists degraded boolean;
-- 'quota' or 'unreachable'. Left as free text rather than an enum so an older
-- client writing an unknown reason cannot fail the whole upsert; the client
-- treats anything it does not recognise as absent.
alter table public.reports add column if not exists degraded_reason text;
-- Null means the call's coaching mode was not recorded, which is not the same
-- as coaching having been off. Read it as `coaching is false`, never as `not coaching`.
alter table public.reports add column if not exists coaching boolean;
