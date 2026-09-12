# Account cache isolation and failed reads

Each authenticated user (including an anonymous user) gets a separate local
cache keyed by user ID. Upgrading an anonymous account without changing its
user ID preserves that cache. Signing into another ID selects that account's
cache instead of relabelling every local row as belonging to the new user.

Legacy unscoped records remain in the device-only cache. This change does not
silently assign them to a signed-in account or delete them. Migrating legacy
records into an account requires a separate explicit import design.

An account change remounts the call/report view and invalidates old async call
results. Late cloud reads are checked against both user ID and a monotonically
increasing account epoch, including an A -> B -> A transition. Scheduled uploads
are cancelled on account changes. Failed cloud reads do not trigger uploads,
are shown as errors, and retry after a five-second backoff. Reads explicitly
filter user_id as well as relying on the existing server RLS policies.

No server permissions, table schemas, or production records are changed by
this implementation. Cached browser storage is not encrypted by this feature.

Validation: `node --test eval/sync.test.mjs` uses the real store and sync code
with in-memory storage, auth, clock and database doubles. Five tests cover
account isolation, private-storage fallback, failed-read retry, stale results
and idempotent startup/cancelled uploads. Actual Supabase account switching
and browser validation remain pending.

Remaining separate work: deletion propagation, cloud metadata round-tripping
(coaching/degraded fields), and ownership conflicts in already-existing data.

## Explicit deletion queue

Deleting an existing lesson or generated practice scenario records its ID in
an account-scoped, persisted `pendingDeletes` queue. Pulls exclude those IDs,
so a failed/offline delete cannot immediately resurrect the entry. Push sends
idempotent deletes constrained by both user_id and id, and acknowledges each
ID only after server success. Failed pushes/deletes retry with a five-second
backoff. A local change during an upload triggers another pass rather than
being considered uploaded with the older snapshot.

No delete is inferred from an empty list. The existing device-only wipe action
still sends no remote wipe. Seed scenarios and missing IDs do not queue server
deletes. The normal removal controls retain their existing meaning; no bulk
or administrative deletion capability is introduced.

Nine sync tests cover these paths, including retry, reload, account isolation,
and device-only wiping. Remote deletion was mocked; no production records were
deleted during validation. Another device with a stale copy can still reinsert
an item later because the current server schema has no shared tombstones or
version-based conflict resolution.
