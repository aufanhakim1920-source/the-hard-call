# Detection layer

Transcript in → flag events out. Sits between the live call and the report card.

## Running the tests

```bash
npm i -D tsx                        # once, if not already present
npx tsx eval/run-detector.ts        # fixtures, must pass
npx tsx eval/cross-check-cases.ts   # agreement with the sign engine's cases
```

No API key, no network, no rate limit. Expected output:

```
call_001  3 events  [obligation] NCC_72_ORAL_NOTICE @51200ms -> satisfied (evidence @86600ms)
call_002  0 events
call_003  3 events  [request] HARDSHIP_REQUEST @16500ms superseded by f_003_02 -> missed
                    [obligation] NCC_72_ORAL_NOTICE @45000ms -> missed
call_004  1 event   [request] HARDSHIP_REQUEST @14600ms -> satisfied (evidence @23500ms)
all fixtures pass
```

## Three kinds of event

`obligation` is asserted and deadline-bearing. `request` is a low-bar prompt to
ask the threshold question. `cue` is an ephemeral routing signal that is never
persisted — the sign engine emits those, this layer emits none.

Full contract: **`docs/event-schema.md`**. Read that before consuming events.

`eval/smoke.ts` does the same through the live streaming path.

## How it decides

### The notice (high bar)

The legal test from `docs/hardship-flag-rules.md` has two halves, and **both must
appear in the same customer turn** before anything fires:

1. **Difficulty** — the customer says they cannot meet the repayment.
2. **Medium term** — it is not resolvable in the near term.

A **recovery** signal anywhere nearby suppresses the flag. "I'll be square once
the 20th lands" is a timing problem, not a hardship notice, however much
hardship vocabulary surrounds it. That rule is what makes `call_002` emit zero
flags despite containing "struggling" and "couldn't afford".

What is deliberately **not** in the difficulty lexicon: illness, surgery, job
loss, being signed off work. Those are the *cause*. Keeping them out is what
stops a life event from being treated as a legal trigger on its own — and it is
the same reason `call_003` raises at 45000ms (where she says she cannot cover
the repayment for four or five months) rather than at 26300ms (where she
mentions surgery).

### The request (low bar)

A `request` fires on an explicit ask to change the repayment ("push it back",
"pause it", "pay half", "need more time") or on difficulty language with no
duration signal either way. It makes no legal claim and starts no clock, so a
hint is enough — the consequence is one clarifying question.

It fires even alongside a stated near-term recovery: "push it back, I get paid on
the 20th" is a real request and not a notice (`call_004`). It does **not** fire
when the customer asks for nothing and settles the question themselves — in
`call_002` there is nothing left to ask, which is why it stays at zero events.

A request that later becomes an obligation carries `superseded_by`. **Do not
score a superseded request** — score the obligation it became, or one failure
gets counted twice.

## Two modes

| Mode | Behaviour | Cost |
|---|---|---|
| `rules` (default) | Deterministic. Fires only when both halves of the test are explicit. `unclear` candidates never fire. | Zero |
| `hybrid` | Same, but `unclear` candidates go to an adjudicator for the inability-vs-delay call. Clear cases still skip the model. | ~0–1 model calls per call |

Given the shared free-tier quota, `rules` mode is what runs in the demo. Hybrid
is the upgrade path and the answer to "does this generalise beyond your three
fixtures".

Failure policy in hybrid: if the model is rate-limited or down, the adjudicator
returns *no flag* rather than guessing. The deterministic pass has already
caught every unambiguous notice, so a 429 degrades recall on genuinely
ambiguous calls instead of inventing obligations.

## Agreement with the sign engine

`eval/cross-check-cases.ts` runs this layer over `eval/cases.json`. Current
state: **28/29 agree, zero false positives.** Every hard negative stays silent,
including `c19` (a *worker* line containing the word "hardship") and `c35`
(distress with no money ask).

The one gap is `c41` — "Don't worry about it, I'll be fine in a month" — where
inability is implied and brushed off. Rules mode stays silent; that implicature
needs the model tier, and the case's own note says the live engine doesn't fire
on it either.

Eleven patterns were added to `DIFFICULTY` after that cross-check ("can't keep
up", "haven't got it", "nothing left", "money's stretched" and similar). Each is
a real way customers phrase inability, and none fire on any hard negative in
that set.

## Privacy, enforced in code not in policy

`adjudicate.ts` asks the model exactly one question and its response schema is:

```json
{ "is_hardship_notice": true, "basis": "inability", "confidence": 0.9 }
```

There is no field for the cause, so the model cannot return "illness" or
"gambling" — there is nowhere to put it. **Do not add one.**

Two invariants in `eval/run-detector.ts` back that up: every fixture asserts
`must_not_emit_kinds: ["cue"]`, and any event with `kind: "cue"` and
`persist: true` fails. A regression that starts classifying the customer in this
layer breaks a test rather than shipping quietly.

The precise privacy claim — and why the earlier absolute wording over-claimed —
is in `docs/event-schema.md`.

Flags reference the transcript by `{speaker, start_ms}` rather than copying the
customer's words, so the sensitive utterance is never duplicated into the flag
store.

## Flag lifecycle

A flag is `raised` when an obligation triggers and only `resolved` by evidence —
acknowledging it in the UI does nothing.

- `satisfied` — a staff turn discharged it; `resolution.evidence` points at that turn.
- `missed` — the call ended and nothing discharged it.
- `unverified` — discharged after the call by a system action, so no transcript
  evidence can settle it. `NCC_72_WRITTEN_NOTICE_30D` is the worked example.

`escalated_at` marks a later turn that makes an already-raised obligation more
urgent without creating a new one. In `call_003` the duty to inform is raised
with the notice at 45000ms and escalated at 103200ms, where the customer
directly asks whether a process exists and doesn't get an answer.

## Files

| File | Role |
|---|---|
| `src/detector/lexicon.ts` | Stage 1. Deterministic candidate detection. Pure functions, no I/O. |
| `src/detector/rules.ts` | The rule table: `rule_id` → obligation, deadline, authority. Deadlines never come from a model. |
| `src/detector/detect.ts` | Stage 2 + 3. Raises flags, resolves them. `detect()` for batch, `LiveDetector` for streaming. |
| `src/detector/adjudicate.ts` | Optional Gemini adjudicator + the prompt. |
| `src/lib/speaker.ts` | The repo's only speaker normaliser. Canonical is `staff`; `worker` is the engine spelling. Also `caseToTranscript()`. |
| `eval/run-detector.ts` | Fixture test suite. |
| `eval/cross-check-cases.ts` | Agreement report against `eval/cases.json`. |

## Wiring it up

Batch (report card):

```ts
import { detect } from "./src/detector";
const flags = await detect(transcript);           // rules mode
```

Live (coaching):

```ts
import { LiveDetector } from "./src/detector";
const live = new LiveDetector(callId);
for await (const turn of transcriptStream) {
  const fresh = await live.push(turn);            // only newly-raised flags
  fresh.forEach(showFlagInUI);
}
const forReportCard = await live.finalise();
```

Inside the Supabase function, where the key lives:

```ts
import { detect, geminiAdjudicator } from "./src/detector";
const flags = await detect(transcript, {
  mode: "hybrid",
  adjudicator: geminiAdjudicator({ apiKey: Deno.env.get("GEMINI_API_KEY")! }),
});
```

## Fixture changes

`fixtures/expected/expected_flags.json` — `call_003`'s
`ABA_INFORM_HARDSHIP_PROVISIONS` entry now expects `trigger_turn_start_ms:
45000` with `escalated_at_ms: 103200`, instead of 103200 as the trigger. The
duty to inform arises with the notice; the customer's direct question escalates
that same obligation rather than creating a second one. Raising it at the
question would mean the system stays silent for the 58 seconds where the staff
member could still have got it right.

A fourth fixture was added: `call_004_deferral_request.json`. An explicit ask to
move a payment with a stated near-term recovery — the same situation as
`eval/cases.json` c02. It must emit a `request` and no obligation. It is the
boundary case between the two tiers, and the demo's answer to "how do you know
you haven't just built a keyword matcher".
