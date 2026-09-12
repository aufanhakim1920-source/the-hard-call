# Report card handoff

Shawn's branch: `part/report-lessons`.

The report now supports `unverified` when the model omits a judgement,
duplicates it, or cannot cite a worker response for handled/partly.
Ticking a sign never substitutes for transcript evidence. Missing worker
responses are unverified, not automatically missed.

## API changes to coordinate with live-call and detection owners

Legacy request shape remains `{ session, lessons }`. Signs should preserve `lineId`
pointing to the triggering transcript line. This avoids treating detector
latency as the start of the worker's response window.

Response additions:

- `items[].verdict` can now be `unverified`.
- `items[].evidence` contains `{ lineId, offsetMs }` references.
- `unverified` counts these items separately from `missed`.
- `scoreUnverified` tells consumers to withhold the numeric score. The legacy
  numeric `score` remains in the payload for compatibility; it is not a
  verified score when this flag is true.

The report screen resolves quotes from the current in-memory session. New
evidence fields persist references and offsets only, not transcript quotes.
Old reports without these optional fields remain renderable.

## Still pending

- Legal-rule and real-model evaluation remain separate from schema integration.
- Cause-based sign keys/titles remain in the detector and saved reports.
  The prompt requests cause-free prose but this is not a privacy guarantee.
- The model still produces the score and semantic judgement. Reference
  validation proves that a worker line exists, not that the judgement is correct.
- Actual Gemini accuracy and visual/browser verification are not covered by
  the local automated tests. Deploy the frontend and report function together
  after review; the hosted function has not been changed by this work.

## Validation

`node --test eval/report.test.mjs` runs offline tests, including a mocked
Gemini response through the report endpoint. No real customer data or API
key is required. Run `npm run build` and `npm run lint` for frontend checks.

## Canonical transcript integration

The report endpoint additionally accepts `{ transcript, flags }`, where
`transcript` is exactly `{ call_id, turns }` from `docs/transcript-schema.md`
and `flags` is an explicit array of events using `raised_at`. The existing
live-call request remains supported. The live UI is not switched to this new
input by this change; its owner can adopt it when the detector emits events.

Example: send a fixture as `transcript` and the corresponding `.flags` array
from `fixtures/expected/flag_events.example.json` as `flags`. Production input
must contain actual detector output, not fixture expectations.

- `staff` maps to `worker`; turn index IDs (`t0`, `t1`, ...) connect evidence.
- `start_ms` remains an exact relative offset; duration comes from `end_ms`.
- Missing flags, malformed turns, duplicate IDs and unresolved `raised_at`
  references return HTTP 400. Missing flags never silently mean no detections.
- Fixture annotations and prewritten `resolution` judgements are ignored.
- Canonical empty flags produce empty `items`, `missedByAI` and `deadlines`,
  with score withheld, without calling Gemini. This reports the supplied
  detector result; it does not prove the detector was correct or the call good.
- Canonical non-empty flags constrain evaluation to those obligations.
- Relative timestamps cannot establish calendar due dates. The adapter retains
  deadline metadata internally but creates no `dueDate`; calendar deadlines
  require a separately agreed real event date/time contract. Legacy deadlines
  remain supported. This is still an integration limitation.

Run `node --test eval/report.test.mjs eval/report-input.test.mjs` for offline
adapter and endpoint tests. Call 002 is tested first; call 003 uses a mocked
Gemini response to verify output wiring, not model accuracy. `npm run eval:fixtures -- call_002` is the separate real-detector test and requires a
local Gemini key. The attempted run here skipped because no key was configured.

## Detector branch integration check

The actual rules detector from `origin/part/detection` was exported to a
scratch directory and compiled without merging its unreviewed branch into
this report PR. Run `node eval/detector-report.mjs /path/to/compiled/index.js`
to repeat the integration check with that module.

Verified with detector commit `fcd0791`:

- call_002: zero real detector flags, zero report items, no Gemini request.
- call_001: three flags; call_003: two flags.
- Batch results equal streaming finalisation for all three calls.
- call_003 informs at 45000ms and escalates at 103200ms.
- A worker-response variant at 64600ms changes the detector's resolution with
  customer utterances unchanged. This is a proposed demo test, not evidence of
  actual coaching effectiveness or completed statutory obligations.
- The report endpoint was exercised with mocked Gemini responses. Missing model
  judgements stay unverified even if detector resolution says satisfied.

The Gemini-based legacy detector still needs credentials for a fresh run.
The rules detector above requires no credentials. Neither the actual report
model nor browser integration was exercised here.

Still coordinate the proposed request/notice/ephemeral-cue contract with Laural.
It is not present in this detector version. No global privacy guarantee is
made: legacy sign categories and free-text report fields still need work.
