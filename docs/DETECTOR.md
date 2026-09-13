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
| `hybrid` | Same, but `unclear` candidates go to an adjudicator for the inability-vs-delay call. Clear cases still skip the model. | one call per ambiguous turn, once |

Given the shared free-tier quota, `rules` mode is what runs in the demo. Hybrid
is the upgrade path and the answer to "does this generalise beyond your three
fixtures".

`LiveDetector` re-runs the whole of `detect()` on every new turn, so without a
cache each still-unclear candidate was re-adjudicated once per subsequent turn —
Aufan measured 18 calls on a 21-turn call. It now carries a memo keyed by the
triggering turn's `start_ms`, so each turn is judged once: the same call is 1.

Failure policy in hybrid: if the model is rate-limited, down, or the transport
fails outright, the adjudicator returns *no flag* rather than guessing, and
`detect()` catches a thrown adjudicator so a third-party failure can never take
the obligations the deterministic pass already found. Both paths are verified,
not assumed.

### What rules mode does and does not reach

Aufan cross-checked stage 1 against all 41 cases in `eval/cases.json` and found
`MEDIUM_TERM` matching **zero** of them, so `NCC_72_ORAL_NOTICE` fired 0/41
outside the fixtures it was written alongside. That is a real limitation and it
was overfitting: the duration patterns were written against four hand-authored
calls.

Two open-ended phrasings have since been added (`since <month>`, `till/until I
find work`) and the notice now fires on c06 and c13. The distribution is still
lopsided — 2 inability, 12 unclear, 27 with no candidate at all — and the honest
statement is this:

> **Rules mode carries the request tier and cannot be rate-limited. The model
> carries most of the notice tier today.** The deterministic path fires a
> statutory notice only on phrasings its rules reach, and on an independent set
> that is a small minority.

Do not say "the legal half is deterministic" in a pitch, and do not say the
flagging cannot be silenced by quota either — the next section measures a script
where rules mode raises nothing at all, not even a request. The wording that
survives someone running the code is: *clear statutory notices can be raised
locally without an API call, while the model handles less explicit language.*

### Measured: the demo script fires nothing in rules mode

`src/lib/demoScript.ts` — the script behind "Play the demo call", and the one in
the submission video — produces **zero flags** in rules mode. Twelve turns, no
API calls, nothing raised. Shawn caught this against the pitch wording. It is not
a vocabulary gap, it is structural.

The two halves of the s 72 test are split across three customer turns:

| Turn | Text | Carries |
|---|---|---|
| 1 | "Things have been a bit tight lately." | inability — near miss, see below |
| 2 | "Honestly, I'm a bit behind on everything." | inability — near miss |
| 3 | "Maybe. I got laid off last month." | the **cause**, deliberately never counted |
| 4 | "I don't know. I'm really stressed about all of it." | a cue, correctly silent |
| 5 | "Just a few months without the full payment." | duration only |

`classifyTurn` requires DIFFICULTY and MEDIUM_TERM **in the same customer turn**,
so nothing assembles. Turns 1–2 carry no duration; turn 5 matches `MEDIUM_TERM`
on "a few months" and is discarded anyway, because a turn with neither difficulty
nor an ask returns `null` before the duration is ever looked at.

Turns 1 and 2 are also near misses on wording, and fixing them would not help:

- `things?\s+(are|is)\s+…tight` wants "things **are** tight", gets "things
  **have been** tight".
- `behind\s+on\s+(the\s+)?(payment|repayment|…)` wants "behind on **the
  payment**", gets "behind on **everything**".

**The real fix** is letting the two halves combine across the customer's turns
inside `contextWindow`, which is how s 72 actually reads: the notice is what the
borrower conveyed, not what fits in one sentence. That is a change to the core
rule and needs the full fixture suite and all 44 cases re-run, so it was not made
before the submission freeze. It is the highest-value change left in this layer.

The offline A/B page is the worked example of what *does* hold: it is built from
the fixtures, where both halves sit in one turn, so that artefact genuinely runs
with no key at all.

Reproduce it by importing `demoScript` and calling `detect(..., { mode: "rules" })`.

## Agreement with the sign engine

`eval/cross-check-cases.ts` runs this layer over `eval/cases.json`. Current
state: **43/44 agree, zero false positives.** Every hard negative stays silent,
including `c19` (a *worker* line containing the word "hardship"), `c35` (distress
with no money ask) and `c43` (asking whether a process exists, with no notice on
record).

`c42` and `c44` read as false positives until the report was fixed. Both carry
`existingKeys: ["hardship-request"]` — the notice is already on record — and
`expect` lists only the delta the new line should add. The detector correctly
re-finds that notice in the context turns; the report was ignoring
`existingKeys`. `c43` is the control: same question as `c42`, nothing on record,
silent.

The one gap is `c41` — "Don't worry about it, I'll be fine in a month". Note
that it does **not** reach the model tier either: `classifyTurn` returns null on
that turn because nothing in `DIFFICULTY` or `REQUEST_ASK` matches, so no
candidate is formed and hybrid mode never sees it. Catching it would need a
lexicon addition, not an adjudicator — and the phrasings that would catch it are
soft deflections, which is a bigger decision than it looks. The deployed engine
is silent on it too.

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


## Known limitation: live and final can disagree

`contextWindow` looks four turns ahead and the recovery suppressor reads them.
Live, those turns do not exist yet, so a candidate can classify `inability` at
turn N and `unclear` at turn N+2 once a recovery is stated — and
`LiveDetector.emitted` never retracts. So a notice shown on screen mid-call can
be absent from `finalise()`, in that direction only.

Not fixed. Retracting a legal card mid-call is arguably worse than leaving it,
and the report card is the record. Worth knowing before someone finds it.
