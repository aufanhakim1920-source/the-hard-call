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

## Resolved: the relabelling was reverted, and aufan's reading was better

The section that used to sit here flagged that seven corrected `cases.json`
expectations contradicted README line 156. `77d20fe` settles it, and against
me. **The seven expectations are restored to exactly what aufan measured** —
`eval/cases.json` now carries main's 41 cases verbatim plus the three new
`inform-hardship-provisions` ones.

Aufan's reading is not "the labels are wrong" and it is not "the labels are
right and the engine is wrong". It is a third thing that is better than either:

> every one of the 11 misses is a hardship-request, not one a statutory notice.
> Under the two-tier rule those are requests: a hint that should prompt the
> worker, starting no clock. The recall number is sitting exactly where the
> unbuilt tier is. Nothing was relabelled.

So the cases were labelled correctly all along — as **requests** — and the
engine could not fire them because the request tier did not exist. Setting them
to expect nothing, as I had, erases the signal that the tier is missing. The
recall number pointing at the gap is more useful than a recall number that
looks better. Kept from that commit of mine: the `existingKeys` plumbing in
`run.mjs` and its unsatisfiable-case warning, and c42/c43/c44.

Everything below this line about the corrections themselves is superseded and
kept only as the record of a wrong call.

## The eval was scoring the engine against the wrong ground truth

`eval/results.json` (gemini-2.5-flash, 40 cases) records `hardship-request` at
recall **0.533** — 15 support, 8 true positives, **7 false negatives**. Read
against `docs/hardship-flag-rules.md`, seven of those eight recorded failures
are the eval's expectations being wrong, not the engine.

The rules doc is explicit. It triggers on "inability to meet obligations over
the **medium term**, a problem they cannot resolve **within about 6 months**".
It does **not** trigger on "temporary difficulty with a stated near-term
recovery". `fixtures/expected/expected_flags.json` says the same thing harder:
on call_002 firing is "a false positive and the single most important failure to
avoid". The cases still expected a fire on exactly that shape.

Corrected, each with the reason in its `note`:

| Case | The customer's words | Was | Now |
|---|---|---|---|
| c01 | "a bit behind… things are pretty tight" | hardship-request | — |
| c02 | "push the payment back a couple of weeks? I get paid on the twentieth" | hardship-request | — |
| c03 | "hours got cut… can it wait till the next one?" | + hardship-request | job-loss |
| c08 | "the funeral's cleaned me out. I'm going to miss this one too" | + hardship-request | bereavement |
| c09 | "the floods took the ground floor… no way I can pay this month" | + hardship-request | disaster |
| c11 | "pay half this month and catch the rest up next month" | hardship-request | — |
| c34 | "put it all on the pokies… nothing left this fortnight" | + hardship-request | gambling |

c01 is the informal register the ABA trains staff on, with no duration and no
statement of inability — the doc makes that register the signal to start
listening, not the trigger. c02 and c11 state the recovery inside the same
sentence. c03, c08 and c34 are a cause plus a single payment.

**c09 and c34 are arguable and marked so in their notes.** A flood or a wiped-out
fortnight names no recovery either, and the turn after usually settles it. They
are scored as single payments here because that is what the customer actually
said about the repayments. Raise both with Laural before the freeze.

The eighth recorded failure, **c24** (a few hours without power scored as
`disaster`), is a real engine false positive and was left alone.

`eval/cases.json` is nominally in this part but TronJuan has been editing it —
please read this table before the next tuning pass, because the recall number
moves for reasons that have nothing to do with the model.

**`eval/results.json` now predates the correction and must not be quoted.** Re-run
`npm run eval` with a key; the per-key recall for `hardship-request` should rise
without the engine changing at all, because seven of its "misses" were correct
refusals.

### inform-hardship-provisions was unscoreable, not merely unscored

It sat at `support: 0` because `eval/run.mjs` hardcoded `existingKeys: []`, and
the ABA duty only exists once a notice has been raised — its precondition could
not be written down. A case may now carry `existingKeys` and `lessons`, and
`run.mjs` warns when a case expects the tip with no notice on record.

Three cases added: c42 fires (fixtures call_003 at 103200ms — the customer asks
outright and the worker substitutes a file note), c43 must not fire (same
question, no notice yet), c44 must not fire (the worker has already named the
process and offered to lodge it). Without c44 the engine could score well by
always firing the tip once a notice exists.

### The transcript is evidence, not instructions

`flags.ts` now carries the guard `report.ts` has had since the verdicts work,
and it is the endpoint that reads the customer's words on every sentence.
Manager `lessons` are no longer introduced as rules that "override your
defaults": they refine wording and caution, they cannot remove the legal tests,
and nothing in them can make the model fire a sign the words do not support.
`eval/flags.test.mjs` asserts the guard is present with and without lessons,
that a lesson still reaches the model, and that a lesson instructing the model
to ignore the period test and invent evidence still produces no sign — the
gates, not the prompt, are what hold that.

## What was verified without a key, and what still needs one

`npm run eval` needs `GEMINI_API_KEY`, which is not available on this machine,
so the real recall after the ground-truth correction is still unmeasured. The
harness itself was exercised end to end offline by replacing `fetch` with a
perfect oracle that answers each request with that case's own ground truth:

- 44/44 cases pass, every key at P/R/F1 1.000. That proves the three gates do
  not block a correct answer, that the scoring, the new warnings and the
  artifact writing all run, and that `existingKeys` really reaches the engine —
  c42 fails without it. It proves nothing whatsoever about Gemini.
- The oracle run also exposed a footgun: `run.mjs` wrote `eval/results.json`
  and `public/eval-results.json` at the end of EVERY run, including a
  `--limit 3` one. `public/eval-results.json` is served by the deployed site, so
  a partial run silently replaced the number a judge reads. A partial run now
  prints its table and publishes nothing. The artifacts committed here are still
  the real 12 Sept gemini-2.5-flash run.

To finish this, from a machine with the key:

```
cp .env.example .env      # then put the real GEMINI_API_KEY in .env, never in chat
npm run eval              # all 44 cases; rewrites both artifacts
```

Expect `hardship-request` recall to rise from 0.533 with no engine change,
because seven of its recorded misses were correct refusals. What is genuinely
new and unmeasured is c42/c43/c44 — whether the model gets the ABA tip's timing
right — and whether c09 and c34 hold up once Laural has ruled on them.

## Report metadata now survives the cloud

Picking up the item `docs/sync-isolation.md` listed as remaining: the report
card's verification metadata round-trips. `scoreUnverified`, `unverified`,
`degraded`, `degradedReason` and `coaching` were dropped on push, so a card
pulled on a second device could not say why its write-up was missing — the
"One thing for next time" box disappeared rather than naming the quota, which
undid the degraded-card work two commits earlier.

The reports table was made in the Supabase dashboard, not from this repo, and
PostgREST rejects the whole upsert on one unknown column. So the client finds
out by being refused: the first rejection naming a column turns the extra
fields off for the session and the rows go up in their legacy shape. A schema
that has not caught up costs the metadata, never the reports.

`supabase/migrations/0001_report_metadata.sql` adds the five columns —
additive, idempotent, all nullable, safe to apply while the current build is
live, and no RLS change since the own-rows policies are row-level. **It is the
first migration in this repo and has not been applied anywhere.** The rest of
the schema still exists only in the dashboard, which is why a client has to
probe for columns at all; giving the whole schema a baseline migration is
separate work and someone else's call before the freeze.

Absent stays absent: a pre-migration row leaves `degraded` and `coaching`
undefined and the reader falls back to item verdicts, and `unverified` and
`handled` are still recomputed from the items rather than trusted.

See `docs/sync-isolation.md` for the detail and the three tests. Still
unverified: the real Supabase schema, an actual two-device round trip, and the
401 on the deployed anon key recorded in the PR description.

## speaker_confidence — laural's contract, implemented

`speaker_confidence: "known" | "inferred" | "unknown"`, optional on a turn,
absent means `known`. Every existing fixture and every transcript written
before today keeps its exact meaning.

Why it is load bearing, in laural's words: only customer turns can raise an
obligation and only staff turns can satisfy one, so a wrong speaker corrupts
the record both ways. A staff line read as the customer starts a 21-day clock
on the bank's own words — `eval/cases.json` c19, *"if you're in hardship there
are options"*, is exactly that line. A customer line read as staff marks a duty
handled that nobody handled, which is a false compliance record and worse than
a miss. And it is the same 429 chain: the rate limit kills attribution, which
corrupts the detector's inputs.

### Where it is enforced

**The live engine** (`api/flags.ts`). A legal sign now needs a supporting turn
that is both not-worker and `known`. The newest line arrives `unknown` from live
dictation and the model's guess fills it in — so that turn is marked `inferred`
server-side regardless of what the client sends, and it cannot raise a notice.
Tips still fire on it, so live coaching is not switched off, it is limited to
what costs nobody a clock. The response now carries `speakerConfidence`.

**The report** (`_shared/reportItems.ts`). Two rules:
- An `inferred` or `unknown` staff turn cannot prove `handled`/`partly`; it is
  dropped from the evidence and the item comes back `unverified`.
- An `inferred` or `unknown` triggering turn records nothing definitive at all —
  not handled, not partly, and **not missed** — with a note saying the speaker
  was never established. A `missed` on a misattributed trigger is still a false
  record, just in the other direction.

That is the "no definitive marks on uncertain attribution" rule living in the
layer rather than in each consumer, so the report card and the UI both get it
without implementing it twice.

**The adapter** (`_shared/reportInput.ts`) accepts `speaker_confidence` per turn
and refuses an unrecognised value rather than falling back to `known` — quietly
trusting a typo is the failure the field exists to prevent. A canonical flag
raised at an inferred turn needs no separate rule: its `raised_at` resolves to
that line, and the trigger rule above catches it.

**The report prompt** marks non-`known` turns as `(speaker inferred, not
established)` / `(speaker unknown)` and tells the model not to rest a judgement
on one. `known` turns render exactly as before.

### One decision that needs laural's sign-off

She wrote that `inferred` "can raise at most a request and never a notice".
Our taxonomy has no request/notice tier — `hardship-request` and `complaint`
are both notices, each carrying a statutory clock (21 and 30 days). So
`inferred` currently raises **no legal sign at all**, which is the strict
reading. If the request tier lands, an inferred turn should raise the request
and stop there. Flagged rather than invented.

### One line crossed into part/live-call, deliberately

`src/lib/engine.ts` patches a dictated line with the answer's speaker. It now
carries the confidence too:

```ts
l.id === lineId && l.speaker === "unknown"
  ? { ...l, speaker: res.speaker, speakerConfidence: res.speakerConfidence }
  : l
```

Without it the session posted to `/api/report` presents every guessed line as
`known` and **the report's attribution gate never fires for live dictation** —
a duty could be marked handled on a customer line misread as staff, the false
compliance record laural called worse than a miss. The live flag path was
already protected because `flags.ts` decides it server-side; the report path
was not, so shipping the contract without this line left it half-wired, which
is worse than not shipping it: the gate exists and quietly does not apply.

`engine.ts` belongs to `part/live-call`, and CONTRIBUTING says to say so first.
Saying so here and in the PR instead, because it is one expression, additive,
and every field it touches is optional. **Revert it freely if you would rather
own it** — the rest of the contract keeps working, minus the live-dictation
protection. The condition `res.speaker !== "unknown"` was also dropped so that
an unresolved guess lands as `"unknown"` rather than as an absent field that
reads as `known`.

Still `part/live-call`'s, untouched here: the manual speaker correction control.
`Line.speakerConfidence` exists, and a person correcting a turn sets the speaker
plus `speakerConfidence: "known"`, which re-enables notices on that turn. That
is the other half of the MVP proposal and it needs UI judgement, not a contract.

`docs/transcript-schema.md` is laural's; the field is implemented to her
message and should land in her table too.

### Still unverified

Overlapping speech in practice mode, which she and Tron are still sizing; the
real two-stream attribution end to end; and whether a Gemini speaker guess is
right often enough to be worth showing at all. None of the tests here say
anything about that — they test what the code does with an attribution, not
how good the attribution is. 32 offline tests touch this contract; 7 of them
fail against the previous code.

## An inferred turn now raises a request, not nothing

`77d20fe` built the request/notice tier and mapped a request onto `kind: "tip"`
— a live prompt that starts no clock. That is exactly the tier laural's
`speaker_confidence` rule needed and which did not exist when it went in, so
`flags.ts` no longer drops a legal sign on an uncertain turn. It downgrades it.

`tierOf()` now answers in three steps:

| supporting turn | tier | what the worker sees |
|---|---|---|
| a **known** customer turn | notice | gold legal card, clock, deadline row |
| **any not-known** turn | request | prompt card, `askNext`, no clock, no deadline |
| **known staff turns only** | none | nothing |

The middle row is the change. Dropping the sign cost the worker the prompt as
well as the clock, which was the price of not having the tier. A request keeps
the prompt and logs nothing as owed: no `dueDate`, and no `dueLabel`/`dueDays`
either, since the live card announces any due date it is handed. Its `detail`
says so in the worker's terms rather than leaving an empty card.

The third row is not the second. Not knowing who spoke is not the same as
knowing it was staff, so which way the model's guess landed does not matter — a
request carries no clock, so the cheaper error is to ask. But a turn we *know*
was staff gets nothing at all, because a request there would imply the customer
asked for something they did not. That is `c19`.

Practice is unaffected: two streams, attribution known by construction, notices
as before. So is the demo — the type box has a "Who said it" control, so the
1:12 paste is a known turn, and there is a test asserting its gold card, 21 days
and today+21 survive all of this.

## One number is now stale, on purpose

`eval/cases.json` has **44** cases; the published run in `eval/results.json` and
`public/eval-results.json` has **n: 41**, because c42/c43/c44 were added after
aufan re-measured. Nothing is wrong with the published numbers — they describe
the 41 cases they were run on — but the suite is ahead of them, which is the
same class of mismatch `77d20fe` set out to remove.

`npm run eval` regenerates both artifacts and needs a key, which this machine
does not have. Until someone re-runs it, quote the published table as a run of
41 cases, not as a run of the suite. A partial run cannot make this worse: a
`--limit` run now publishes nothing.
