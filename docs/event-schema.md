# Event schema — three kinds

The contract between the sign engine, the detection layer, and the report card.
Supersedes the flag-event section of `docs/transcript-schema.md`.

The core idea: **the threshold scales with the consequence.** A prompt to ask a
question can fire on a hint. A claim that a statutory clock started has to be
earned.

| kind | Bar | Asserts | Deadline | Persisted? | Enters compliance record? |
|---|---|---|---|---|---|
| `obligation` | High — inability established | A legal duty is owed | Yes | Yes | **Yes** |
| `request` | Low — a hint or an ask | The customer asked for a change | No | Yes | No |
| `cue` | Engine's own | A circumstance that routes the call | No | **Never** | No |

Every event carries `kind` and `persist`. **Consumers branch on `kind` and gate
storage on `persist`** — not on a list of rule ids, so new rules inherit the
behaviour automatically.

## `obligation`

A duty under the National Credit Code or the Banking Code was triggered. These
are asserted, carry a citable `authority`, and are the only events that enter
the compliance record.

- `NCC_72_ORAL_NOTICE` — 21 days to assess and notify (s 72(4))
- `ABA_INFORM_HARDSHIP_PROVISIONS` — tell the customer the provisions exist
- `NCC_72_WRITTEN_NOTICE_30D` — written notice of a variation over 90 days

Deadlines come from `src/detector/rules.ts`, never from a model.

## `request`

The customer has asked to change their repayments, or signalled difficulty,
without inability being established. One rule: `HARDSHIP_REQUEST`.

It fires on a hint, deliberately, because the consequence is a single
clarifying question — *"can you recover in the near term?"* — and a false
positive costs one question. It makes **no legal claim** and starts **no clock**.

It fires even alongside a stated near-term recovery: *"push it back, I get paid
on the 20th"* is a real request and is not a statutory notice. It does **not**
fire when the customer asks for nothing and settles the question themselves
(*"I'll be square once the 20th comes through, no dramas"*) — there is nothing
left to ask.

**`superseded_by`.** When a request later becomes an obligation, the request
carries `superseded_by` pointing at the obligation's `flag_id`. That is one
story, not two events.

> **Scoring rule:** skip any request carrying `superseded_by`. Score the
> obligation it became. Otherwise one failure is counted twice.

## `cue`

A circumstance signal that routes the call while it is happening — `safety`,
`scam`, `gambling`, `health`, `stress`, `separation`, `bereavement`,
`disaster`, `job-loss`, `complaint`. The sign engine produces these; the
detection layer produces none.

**Cues are never persisted.** `persist` is always `false`. They are shown to the
staff member in the moment and discarded when the call ends. They must not reach
the database, the report card, the summary, or the feedback text.

They exist because some of them are protective and the ABA guideline asks for
them: `safety` routes a family-violence case to a specialist team, `scam` stops
a transfer mid-call. Suppressing those to satisfy a slogan would make the
product worse.

## What we claim about privacy, precisely

The earlier wording in `docs/transcript-schema.md` and
`docs/hardship-flag-rules.md` said we never classify the customer at all. That
over-claimed relative to what the system does. The accurate version:

> **Nothing that classifies the customer is ever stored.** Obligation and
> request events name the duty or the ask — never the cause. A small set of
> circumstance cues route the call in the moment and are discarded when it ends;
> they never reach the record, the report card, or any summary.

This is a stronger claim than the absolute one, because it survives someone
reading the code. Use this wording in the pitch.

Two invariants back it up, both tested:

1. `eval/run-detector.ts` asserts `must_not_emit_kinds: ["cue"]` on every
   fixture. A regression that starts classifying the customer in the detection
   layer fails a test.
2. Any event with `kind: "cue"` and `persist: true` is a test failure.

## Full event

```json
{
  "flag_id": "f_003_02",
  "call_id": "call_003",
  "kind": "obligation",
  "persist": true,
  "rule_id": "NCC_72_ORAL_NOTICE",
  "raised_at": { "speaker": "customer", "start_ms": 45000 },
  "escalated_at": { "speaker": "customer", "start_ms": 103200 },
  "superseded_by": null,
  "obligation": "Assess the hardship notice and notify the customer of the decision",
  "deadline_days": 21,
  "deadline_from": "notice_received",
  "authority": "National Credit Code s 72(4)",
  "confidence": 0.94,
  "staff_prompt": "Hardship notice received. 21-day clock started. …",
  "resolution": {
    "status": "missed",
    "evidence": null,
    "reason": "The call ended and no staff turn discharged this obligation."
  }
}
```

`raised_at`, `escalated_at` and `resolution.evidence` are `{speaker, start_ms}`
pointers into the transcript. They never copy the customer's words, so the
sensitive utterance is not duplicated into the event store.

`resolution` is absent on live events — the call is still running. Three states:
`satisfied` (a staff turn discharged it; `evidence` names it), `missed` (the call
ended and nothing did), `unverified` (settled after the call by a system action,
so no transcript evidence can decide it either way).

## Speakers

Canonical is **`staff`**. `worker` is the engine and display spelling.
`src/lib/speaker.ts` is the only normaliser in the repo — one canonical form,
converted once at each boundary, because two adapters pointing opposite ways is
how a contract quietly breaks.

```ts
import { toCanonicalSpeaker, toWorkerSpeaker, caseToTranscript } from "../lib/speaker";
```

`caseToTranscript()` converts an `eval/cases.json` case into a transcript the
detector can read, spacing turns on a synthetic 4-second grid since cases carry
no timestamps.

## Cross-checking the two systems

```bash
npx tsx eval/cross-check-cases.ts
```

Runs the detector over `eval/cases.json` and reports where the two systems
disagree. It is a report, not a gate — the systems are allowed to differ, we
just need to know where.

Current state on the cases checked: **28/29 agree, zero false positives.** Every
hard negative stays silent, including `c19` (a *worker* line containing the word
"hardship") and `c35` (distress with no money ask).

The one disagreement is `c41` — *"Don't worry about it, I'll be fine in a
month."* The detector stays silent in rules mode; the implicature needs the model
tier. Tron's own note on that case says the live engine doesn't fire on it
either, so both engines agree and the `expect: ["hardship-request"]` array is
the outlier. Either drop the label or move it to a hybrid-mode-only expectation.
