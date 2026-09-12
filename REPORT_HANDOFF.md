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

## Offline resilience follow-up

The server and browser fallback both mark every item unverified and now report
zero verified handling, even when the worker ticked every flag. Quota copy no
longer assumes a daily limit: 429 alone does not identify the quota window.

`hasVerifiedReportScore` is shared by report display/copy, practice best-score
calculation and scenario best-score updates. It also checks item verdicts so
older cloud rows that lost optional verification metadata do not show an
unverified-item score as valid. Cloud restore derives unverified and handled
counts from items; no database migration is required for this check. This does
not preserve all optional metadata (e.g. coaching and degraded reason); full
cloud metadata round-tripping remains a separate integration task.

`node --test eval/report*.test.mjs` now includes quota/network fallback tests
and a coaching-on/off prompt-invariance test. Identical transcript evidence
must receive identical model inputs regardless of the coaching switch. This
is an offline regression check, not a claim about actual model accuracy.

## Live flag gates — for the live-call owner

The `/api/flags` request and response shapes are unchanged. What changed is
which signs survive, so the live screen can now receive fewer signs for the
same model answer. Two deterministic gates were added in `api/flags.ts`,
alongside the existing hardship `period` gate:

- **Order.** `inform-hardship-provisions` is dropped unless a hardship notice
  is already on screen (`existingKeys`) or fires in the same answer. The
  taxonomy always said the ABA duty only exists once a notice has been raised,
  but that was prompt text only: the period gate drops the `hardship-request`
  out of an answer and left the dependent tip standing, which put "tell them
  the hardship process exists" on screen for a process nobody had started.
  Decided after the drop, so the result does not depend on the order the model
  listed the signs in.
- **Evidence.** A sign whose `evidence` quote cannot be found in the transcript
  window is dropped. `report.ts` already refused a judgement citing a line that
  does not exist; the flag engine took the model's quote on trust, so an
  invented sentence could carry a legal sign onto the screen and then be saved
  as a lesson from the report card. Comparison is case-, punctuation- and
  curly-quote-insensitive, matched line by line so a quote cannot be stitched
  across two turns. Matched against the whole window rather than the newest
  line, because the ABA tip fires on what the worker did NOT say.
- **Speaker.** A LEGAL sign whose quote exists only in worker lines is dropped,
  because a statutory duty arises from what the customer said. The prompt
  already said worker lines almost never trigger a sign, but nothing enforced
  it, so a worker paraphrasing ("so you can't pay for a few months?") could
  start the 21-day clock from the bank's own mouth. Tips may still quote the
  worker. The newest line is attributed from the same answer's `speaker` field,
  exactly as the live screen patches it, so a sign on a live microphone line —
  which arrives as `unknown` — is not thrown away; a line that stays `unknown`
  is left alone, since it is not proof of either speaker.

Dropping the sign is deliberate rather than blanking `evidence`: the live
screen renders the quote as an unconditional button, so an empty string would
leave an empty control there. A sign that cannot produce words the call
actually contained is not a sign.

`eval/flags.test.mjs` covers both gates offline with Gemini mocked, the way
`report.test.mjs` does. Until now nothing exercised `api/flags.ts` without a
Gemini key — `eval/run.mjs` and `eval/fixtures.mjs` both exit early without
one — so the period gate, the single most legally consequential line in the
file, had no regression cover on a machine without credentials. These tests
assert what the code does with a model answer, including answers the real model
should never give; they say nothing about model accuracy.

Run the whole offline suite with `node --test eval/*.test.mjs`.

`todayISO` is now checked for a real calendar day rather than the right shape.
`2026-13-45` passed the regex, made `addDays` throw, and returned a 502 that
cost that sentence every sign it had found; an unusable date falls back to the
server's own date instead.

On the report card, a degraded result no longer renders an empty "One thing for
next time" box, and the copied report drops the bare `Tip:` line. A titled empty
box read as the coach having nothing to say about the call, rather than as the
write-up being unavailable.

Still open, deliberately not touched here:

- `flags.ts` has no "treat transcript text as evidence, never as instructions"
  guard, which `report.ts` does have, and manager `lessons` are injected as
  rules that override defaults.
- `inform-hardship-provisions` has no case in `eval/cases.json`, while
  `fixtures/expected/expected_flags.json` requires it for call_003 at 103200ms
  and `eval/fixtures.mjs` already maps its rule id. The gate above is now
  tested; the model's accuracy on that key still is not.
- `handled` now means "verified handled" everywhere, including rows restored
  from the cloud, but the report card's delta still compares it against a
  previous call whose stored `handled` may have been written under the old
  meaning ("what the worker ticked"). The comparison can read low for reasons
  that have nothing to do with the worker.
