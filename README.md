# The Hard Call

**An assistant that listens to a bank's hardship calls and raises a live danger sign carrying the
reply-due date and one question to ask next.** After the call it grades the worker, not the
customer, and the calls that went wrong become de-identified practice customers.

**The measurement the whole thing rests on.** The same customer, the same words, the same engine,
run twice — once with the signs on screen and once with them hidden. Across **every one of the 42
runs archived** in `eval/demo-runs.json`: **not one sign was ever marked missed on the coached side,
and not one was ever marked handled on the silent side.** The statutory notice that starts a 21-day
clock was handled in **14 of 14** coached runs and in **none** of the 28 silent ones. The number of
signs raised moves between runs; which side answers them has never moved. Full tables and the
archived run records [below](#what-it-does).

> **Live app:** https://aufanhakim1920-source.github.io/the-hard-call/
> **Video:** _(link goes here)_ · **Demo:** [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md) ·
> **Why it is built this way:** [docs/DECISIONS.md](docs/DECISIONS.md)

Built in 48 hours for *Forward: AI in Business Hackathon* (DSCubed and RAID, University of
Melbourne, 12–14 Sep 2026). **Track 3 — Solve a Business Problem**, entered alongside the
**Built With ElevenLabs** track.

> The product is **The Hard Call**. The repository, the folder, the package and the deployed URL stay
> `the-hard-call` — the Pages deploy and four branches key off that path, so only the interface
> carries the product name.

---

## The problem

People in money trouble almost never say the word "hardship". They say *"I'm a bit behind"* or
*"my hours got cut"*.

Under the **National Credit Code section 72** a hardship notice can be given **orally** and needs no
particular words. Once the lender has enough information, it has **21 days** to respond in writing.
A complaint starts a different clock: **ASIC Regulatory Guide 271** requires an internal dispute
resolution response within **30 days**. The **Banking Code of Practice** obliges subscribing banks
to work with customers in financial difficulty. The phone call is where all three begin, and the
person on the phone has to recognise it in the moment.

What happens when they do not:

- **$15.5 million.** In August 2025 the Federal Court penalised NAB and AFSH Nominees over **345**
  hardship notices not responded to within the statutory period (ASIC 25-165MR).
- **About 35%** of customers who asked ten large home lenders for hardship help **dropped out of the
  process at least once**, and around **40%** of those given reduced or deferred payments fell into
  arrears straight afterwards (ASIC Report 782, May 2024).
- Hardship notices **identified** by those lenders then rose **58%** over the following period
  (ASIC Report 815, September 2025) — the problem is recognition, and recognition can be moved.

A bank has already attacked this. **Bendigo and Adelaide Bank** uses AI to detect hardship in calls
— **after** the call, with a team leader told minutes later, by which time the customer has hung up.
Their stated next phase is doing it live. We are not claiming the idea is untouched; we are claiming
the harder half: **during the call, with the deadline and the next question.**

## What it does

1. **It listens while the call is happening.** The worker puts the call on speaker and the browser's
   own speech engine turns it into text. **No audio is recorded and no transcript is stored** — what
   persists is the signs, the report card, the deadlines and the lessons, never the words.
2. **A sign appears, once per new thing, with the duty and the date.** A legal sign carries the
   reply-due date and the section it comes from; a tip carries a cue worth handling. Every sign
   carries **one question the worker can ask next**, word for word.
3. **The human decides.** The assistant never speaks to the customer and never makes the decision.
4. **A report card judges the worker.** What was caught, handled, missed, one thing to do next time,
   and the legal deadlines land in a list so nothing goes unanswered.

Two more things follow from that: **practice mode**, where an ElevenLabs voice agent plays a
customer who hides the real problem until you ask well, and a **learning loop** — a finished call can
be turned into a de-identified practice customer, and a manager correcting a sign teaches the engine.

**Coaching can be switched off.** The assistant still listens, still judges, still starts the legal
clock, and says nothing during the call. That is both a real rollout path — run it silent for a month
to measure what is being missed, then turn coaching on — and the thing that makes the demo honest.

**The demo runs one customer's call twice: "the same call, handled two ways."** Sarah's lines are
identical to the character in both, so the engine hears the same thing; the two workers are not. It
is a dramatisation and we say so — there are two worker scripts in `src/lib/demoScript.ts`, and an
earlier version with only one proved nothing, because the worker said the same words either way.

**Measured, not claimed.** `eval/demo-runs.ts` replays the demo script through the real engine —
the same detector pass, the same `/flags`, the same `/report` — and archives every run. The archive
holds **42 runs**, 14 coached and 28 silent, on two engines and both versions of the script.

**What held in all 42:**

| | Coaching **on** (14 runs, 63 signs) | Coaching **off** (28 runs, 125 signs) |
|---|---|---|
| Signs **missed** | **0**, every run | 86 |
| Signs **handled** | 49 | **0**, every run |
| The statutory notice (NCC s72) | **handled, 14 of 14 runs** | **handled in 0 of 28 runs** — missed in 25, partly in 3 |
| 21-day deadline created | yes | **yes — with nothing on screen** |
| Sign cards on screen during the call † | 4 or 5 | **0** |

† Every other row comes from the harness, which has no screen. The card count is a browser
observation from 13 Sep, counted by eye on twelve full runs.

**What did not hold: the fraction.** The ten runs measured on the deployed engine on 13 Sep came back
identical on every counted field — coached **4 of 4** answered (3 handled, 1 partly), silent
**0 of 5**, scores 88 · 85 · 88 · 88 against 10 · 10 · 10 · 15 · 10 · 10. Three runs of the same
script through the local source engine produced the mirror image, coached **5** signs and silent
**4**, and the two browser runs written up in `docs/EVIDENCE.md` recorded coached **5 of 5** and
silent **0 of 4**. Across the whole archive the answered fraction takes **ten distinct shapes**.

**So the fraction is not a claim we make.** One sign comes and goes — the prompt to tell the customer
the hardship process exists — and it lands on whichever worker has not covered it. That is the
finding, not a wobble in it: the worker who never mentions hardship assistance earns a prompt telling
him to, the worker who does never triggers one, and **the absence is the thing being measured.** What
we state, because it has never once failed in 42 runs, is the direction: **nothing missed on the
coached side, nothing handled on the silent side, and the statutory notice handled in every coached
run and in no silent one.**

**The score is the least trustworthy row and we do not lead with it.** It moves by up to three
points between otherwise identical runs, because the written review is generated and the counted
fields are not.

⚠️ **An earlier version of this table quoted "95 against 20".** Neither row survived measurement.
Across 19 silent and 7 coached judgements recorded before the script was fixed, **the coached score
95 appeared 0 times**, and the silent row we had published — *20 with 3 caught, 0 handled and 3
missed* — appeared **0 times** either, because `caught` was 1 on all 19 runs and never 3. The bare
score 20 did occur, in 7 of those 19. They were replaced rather than defended, and every run record
is archived in `eval/demo-runs.json` so anyone can check both the old claim and this one.

⚠️ **And an earlier version of this section led with "four of four against zero of five".** That
fraction is real and reproduced ten times, but only on one engine; the archive contains its mirror
too. It has been demoted to an observed range with its source, because a fraction quoted on a stage
while a different one is on the screen behind you costs more than it buys.

## A hint is not a notice

The single most important rule in the product, and the one that took the longest to get right.

| The customer says | We raise | Clock | Stored |
|---|---|---|---|
| "things are tight", "I'm behind" | a prompt for the worker | no | no |
| an inability to pay **over a period** | a legal sign — section 72 is engaged | 21 days | yes |

*"Can you push it back two weeks, I get paid on the twentieth"* is a timing gap, not a statutory
notice. Firing on it is the worst error this system can make: it starts a process the customer never
asked for and a clock the bank never owed. Checked against the **deployed** engine: "push it back two
weeks, I get paid on the 20th and I am fine after that" raises nothing at all.

Three rounds of prompt wording could not hold that line. The fix was to stop asking the model for a
verdict and ask it for a fact: a required `period` enum (`none` / `single_payment` /
`near_term_recovery` / `months_or_open_ended`) that reports what was said about the repayments, with
deterministic code applying the law.

## Isn't this already a thing?

| Who | What they do | What is missing |
|---|---|---|
| Bendigo and Adelaide Bank | AI finds hardship in calls | After the call; live is their stated next step |
| Westpac (pilot) | Live alerts to the operator during calls | For scams, not hardship |
| Balto, Cresta, Observe.AI, Google Agent Assist | Live prompts for contact centres | General purpose; no Australian hardship law, no 21-day clock |
| Aveni Detect (UK) | Vulnerability flags across calls | UK rules, QA-shaped, not live coaching |
| Hyperbound, Yoodli, Second Nature | AI practice customers | Sales calls, not hardship |
| **The Hard Call** | Live sign, the reply-due date, the next question, the report card, and practice built from your own calls | The first we could find doing all of it together, for Australian hardship law |

## How it is built

```
browser (React + Vite, GitHub Pages)        Supabase Edge Function "api" (Deno)        model
────────────────────────────────────        ───────────────────────────────────        ─────
Web Speech API ─► finished sentence ─►      /api/flags     sign engine          ─►     Gemini Flash
   card/account numbers masked first        /api/report    report card          ─►     Gemini Flash
ElevenLabs voice agent (practice) ─►        /api/scenario  practice customer    ─►     Gemini Flash
   both transcripts feed the same engine    /api/health    model + keys armed
localStorage today. Only signs, report cards, deadlines and lessons — never a transcript.
```

- **`supabase/functions/_shared/signs.ts`** — the taxonomy: 2 legal signs (hardship request, 21 days,
  NCC s72; complaint, 30 days, RG 271), 9 cause cues (job loss, health, bereavement, separation,
  safety, gambling, disaster, stress, scam), and 1 duty prompt (tell them the hardship process
  exists — the ABA duty staff most often forget under pressure). That is twelve defined; a
  **thirteenth is derived** — `ask-about-hardship`, the request tier.
  **Deadlines are computed in code, never by the model.**
- **`supabase/functions/api/flags.ts`** — one call per finished sentence: the last 14 lines in,
  speaker plus new signs out, deduplicated by key on both sides so a sign fires once. Manager lessons
  are appended to the prompt.
- **`supabase/functions/api/report.ts`** — judges each sign from the transcript, not from whether the
  worker ticked it. A verdict of `handled` or `partly` must cite worker lines that came *after* the
  triggering line, or it degrades to `unverified` and the score is withheld rather than invented.
- **`supabase/functions/api/scenario.ts`** — turns a finished call into a practice customer with the
  name, job, suburb and every number changed. A person approves it before it can be used.
- **`src/lib/practice.ts`** — the browser starts the ElevenLabs agent with an agent id and hands it
  the scenario as a prompt override. **No key in the browser.** ⚠️ That the agent is published with
  overrides enabled is a setting in the ElevenLabs dashboard, not something this repository can show;
  no connected voice call has been recorded end to end yet.

### Why these models

The sign engine runs on **every sentence of a live call**, so it has to answer in about a second.
Gemini Flash with thinking off does that on the free tier, returns strict JSON against a schema, and
is accurate enough — measured below. The report card and the scenario builder use the same model at a
higher temperature; the practice customer's brain is the LLM inside the ElevenLabs agent and its
voice is an ElevenLabs premade voice. The deployed function currently reports **`gemini-flash-latest`**
(`/api/health` reports the model actually in use and how many keys are armed, because a health
endpoint that reports a hardcoded default gets believed). `npm run eval` tells you whether swapping
the model was worth it.

The free tier is rate-limited **per key**, so `GEMINI_API_KEY_2` and `_3` are optional spares, tried
only on failures that belong to the key (429, 403, and 400 `API_KEY_INVALID`). A bad prompt does not
burn the spare. Separately, a model failure at the end of a call still returns a real report card
built from what is already known, marked `degraded`, with no invented score.

### Evaluation

`eval/cases.json` holds **44 labelled utterances** — real phrasings that never use the word
"hardship", hard negatives built to look similar, and one to three cases per cue. `npm run eval`
replays them through the real handler and reports precision, recall, exact-set accuracy, speaker
accuracy and latency. The published run (`public/eval-results.json`, also shown on the app's About
page) is measured against **the model the deployed function actually uses**, `gemini-flash-latest`:

| | |
|---|---|
| Precision | **1.00** (no false positives) |
| Recall | **0.72** |
| Exact set match | **32 of 44** |
| Speaker accuracy | **44 of 44** |
| Latency | **p50 1.74 s · p95 3.00 s** |

⚠️ **The suite grew from 41 to 44 and the numbers above are the re-run, not the old ones carried
forward.** The three added cases are the first that can score the ABA duty prompt at all: it sat at
support 0 because the duty exists only once a notice is on record, and until a case could declare a
sign as already raised, its precondition was unwritable. `c42` must fire it, `c43` and `c44` must
not. Against the previous published run of 41, precision held at **1.00**, recall moved
**0.69 → 0.72**, F1 **0.817 → 0.838** and exact-set match **0.683 → 0.727**, with **0 errors** in
both. One case changed side — see below.

**Per key, the picture is sharper.** Nine cause cues, the complaint sign and the ABA duty prompt score
**1.00 precision and 1.00 recall** — every one, no misses. The entire recall figure comes from a
single key:

| key | precision | recall |
|---|---|---|
| complaint, job loss, health, bereavement, separation, safety, gambling, disaster, stress, scam, inform-hardship-provisions | **1.00** | **1.00** |
| hardship-request | **1.00** | **0.25** |

**Read that table the right way round.** For this product precision is the number that matters:
a false notice starts a 21-day clock the bank does not owe and puts a customer into a process they
never asked for. Recall costs a prompt the worker did not get; a false positive costs a legal
obligation invented out of nothing.

**And every one of the 12 misses is a `hardship-request`** — not one is a statutory notice. Under the
two-tier rule the team agreed, those are **requests**: a hint that should prompt the worker to ask,
starting no clock and stored nowhere.

**Exactly one case changed side between the two runs**, and it is worth naming rather than absorbing
into a better number. `c04` — *"Is there any way to pause it for a bit? I just can't do it right
now."* — was a request last run and is a notice this one. Nothing in the code explains it: the notice
gate turns on the model's own `period` and `recovery` fields plus a quote check, and the one engine
change since (an unknown speaker now downgrades a legal sign to a request instead of dropping it)
cannot reach `c04`, whose speaker resolved as `customer` both times. **It is the model landing
differently on a borderline utterance** — "I just can't do it right now" read once as a single
payment and once as open-ended. The other eleven misses are the same eleven as before. That one
case is the whole of the recall movement, which is the honest size of the difference.

**The request tier is built, and 9 of those 12 "misses" are the engine firing correctly under the
other key** (`ask-about-hardship` — the run records them). `eval/cases.json` predates the tier and has
no label for a request, so under its flat labels a correct request can only ever score as a miss.
The results file marks that block `"scored": false` for exactly this reason. **Recall here is a
measurement of the labels, not of the engine** — which is why it is printed next to a precision of
1.00 rather than alone.

A one-off control run against `gemini-2.5-flash` scored **0.97 precision / 0.81 recall** — one more
hardship case caught, bought with a false positive on "the storm knocked our power out". ⚠️ **Read
that pair against 1.00 / 0.74, not against the 0.72 above**: both control figures were taken before
the quote requirement landed, which cost `gemini-flash-latest` 0.738 → 0.690. Only the
`gemini-flash-latest` run is committed, so treat the comparison as a measurement we took rather than
one you can reproduce from this repo. We chose the model that never invents an obligation.

**We did not edit the test to flatter the code — and that was argued out, not assumed.** Recall fell
the day the strict legal gate landed, and seven of the cases it "missed" (c01, c02, c03, c08, c09,
c11, c34) all have the same shape: informal difficulty language with no stated period.

**Shawn corrected those seven to expect nothing** (`a21931a`), and said plainly in the pull request
that it contradicted what this section then claimed. His argument was that it is not the forbidden
move. He was moving the labels toward the **written legal authority**, not toward the code:
`docs/hardship-flag-rules.md` triggers on inability over the *medium term*, a problem unresolvable
"within about 6 months", and explicitly does **not** trigger on "temporary difficulty with a stated
near-term recovery" — and `fixtures/expected/expected_flags.json` puts it harder, calling a fire on
that shape in `call_002` the single most important failure to avoid. Editing a test toward the law
and editing it toward the code are different acts, and only one of them is cheating.

**It was settled the other way, and the seven labels are back** (`ebd2644`). Not because the reading
of the law was wrong — the law says what Shawn said it says — but because the labels were never the
defect. Those seven *are* hardship turns; what the engine lacked was a second outcome to put them in.
Expecting nothing would have raised recall by deleting the evidence that a tier was missing. **The
tier was built instead** (`77d20fe`), and the labels stayed exactly as measured.

So the original principle survives, and a reader can see which side of it this case fell on:
**editing the test until it agrees with the code is how a gate stops meaning anything** — and when a
label looks wrong, the repair is usually a missing outcome rather than a corrected label. Recall on
`hardship-request` sits at **0.25** because 9 of the 12 misses are correct requests that the flat
label set cannot express. That number is left low deliberately. Whether those seven are requests or
notices is a contract question for laural, and it is worth more visible than tidied away.

A second, stricter set comes from the detection branch: three full call fixtures with ground truth
for *when* the obligation arises. `npm run eval:fixtures` replays them turn by turn — **2 of 3
passing**, and on the clear-hardship call the legal sign fires **0.0 s off** the expected turn. The
third is an open contract question between two engines, not a defect, and it is written down rather
than tuned away.

Measured end to end in a browser rather than in-process: a sign lands **1.7–2.7 seconds** after the
sentence that caused it, and the report card **3.0–3.8 seconds** after the call ends (twelve runs,
13 Sep). ⚠️ Those twelve browser runs went through a **local** engine on `gemini-2.5-flash`, not the
deployed one — the numbers above them in this file are the deployed engine. These are the app's own
timings, which the model choice barely moves, but they are not a deployed measurement and we do not
present them as one.

## Privacy, enforced by the schema

An earlier draft of these docs claimed we never classify the customer at all. The evaluation set
expected exactly those categories and the repository is public — a claim the code contradicts is
worse than no claim. What is true, and checkable by reading the source:

- The adjudicator's response schema has **no field** for *why* the customer cannot pay, so the model
  cannot return one.
- Flags reference the transcript by `{ speaker, start_ms }` and **never copy the utterance** into
  anything that is stored.
- **Cause cues are ephemeral.** They appear live to the worker and are never written to the report
  card or the database. Only obligations persist.
- Card, account, BSB, TFN and Medicare numbers are masked **in the browser** before a sentence is sent.
- Nothing new is collected: banks already record these calls.
- The assistant never decides and never speaks to a real customer. The demo uses invented customers
  only.

## What is real, and what is scaffolding

**Working on the live URL today**, verified by using it:

- The sign engine, the live call screen, the transcript, the sounds (7 real Mixkit recordings, quiet
  during a live call), and the report card with its timeline and verdict rows.
- Deadlines, lessons, and the practice roster with five written customers plus the scenario builder.
- Coaching off as a real mode, and **twelve accessibility controls**, each copied from a product that
  ships it, with every colour pair contrast-measured rather than eyeballed.
- `npm run gate` — a CSS gate that fails the build on any grid track without a zero floor, which is
  where sideways scroll comes from. It runs in CI before the build. The page reads zero sideways
  scroll at 288, 320, 375, 768, 885, 960, 1024 and 1440.
- `node --test eval/report.test.mjs` — 7 offline tests of the report contract, no API key needed.

**Scaffolding, and said plainly:**

- **Accounts are off.** Anonymous sign-in is disabled on the Supabase project — checkable, and
  re-checked: `/auth/v1/settings` returns `anonymous_users: false`. So the app runs on "Saved here
  only" and everything lives in that browser. The sync layer is written and names four tables
  (`reports`, `deadlines`, `lessons`, `scenarios`), all unused. ⚠️ **Their schema is not in this
  repository** — there are no migrations here, so the tables and their row-level-security policies
  can only be confirmed inside the Supabase project. The chip in the top bar says so rather than
  pretending.
- **The deterministic detector is merged and wired, and it does not carry the demo.** It runs in the
  browser before every model call, with no network, and it is accurate where it fires: 40 of 41
  agreement with `eval/cases.json`, 0 cases where it fires and the case expects silence, 4 of 4 of
  its own fixtures. ⚠️ That agreement was measured when the set held 41 cases and has **not** been
  re-measured against the three added since, so read it as 40 of 41, not 43 of 44. But replayed line by line over both demo scripts it raises **0 signs**, because
  the demo's wording — *"Just a few months without the full payment"* — pairs a period with an
  implied inability and matches nothing in its lexicon. All **188 signs** across every archived demo
  run came from the model; the detector contributed none.
  **So we do not claim the flagging cannot be rate-limited.** On a
  transcript whose wording the rules do reach, it fires with no key at all; on this one it does not.
- **Practice mode is configured, not proven.** The published ElevenLabs agent is live and the Start
  button is enabled; a full connected voice call needs a microphone and quota. **The free
  allowance is spent** — 14 of 15 minutes for the month, and five attempts on 13 Sep returned
  `quota_exceeded` or a concurrency refusal, with zero sessions started. So the voice cannot be
  demonstrated live without a paid tier. Everything up to the session is verified and recorded in
  `docs/PRACTICE.md`, including the de-identification check: a transcript carrying 29 identifiers
  produced a persona with none of them and zero shared 3-grams.
- There is no licence file. Public so it can be judged; not licensed for reuse.

## Run it

⚠️ **`.env.example` is not complete, and a fresh clone will not reach the engine without two edits.**
`VITE_SUPABASE_ANON_KEY` is deliberately blank, and `VITE_API_BASE` in the example stops at
`/functions/v1` — the deployed function is named `api`, so that path returns
`404 NOT_FOUND: Requested function was not found`. The value the live site is built with, and the one
that works, ends `/functions/v1/api`. CI takes both from repository variables, which is why the
deployed site is unaffected.

```bash
npm install
cp .env.example .env   # then fix VITE_API_BASE (append /api) and paste the anon key
npm run dev            # localhost:5173, talking to the deployed Supabase function
npm run gate           # the CSS gate CI runs
node --test eval/report.test.mjs   # 7 offline report tests, no key
npm run eval           # score the sign engine (needs GEMINI_API_KEY in .env)
npm run eval:fixtures  # replay the three legal call fixtures
npm run team           # what landed on main, open PRs, your branch state
```

To run the engine locally instead of against the deployed function, `npm run api` serves it on
port 8787 and `VITE_API_BASE=http://localhost:8787/api` points the app at it.

Hosting: the site is static on **GitHub Pages**, built by `.github/workflows/pages.yml` on every push
to `main`; the engine is a **Supabase Edge Function**, where the Gemini key lives as a secret. No key
is in the repository or in the browser.

## Team

Four people, four parts. [CONTRIBUTING.md](CONTRIBUTING.md) has the branch plan;
[TEAM-LOG.md](TEAM-LOG.md) records who changed what, written by GitHub Actions on every push to
`main` rather than typed by anyone.

## Sources

⚠️ **Every figure in this list comes from the source named beside it and none of them can be checked
from inside this repository.** They were read against the published documents when written and have
not been re-read since; the prior-art table above is in the same position. Treat them as cited, not as
measured — the measured numbers in this README are the ones with a run record behind them.

- National Credit Code section 72 — hardship notices, and the 21-day response
- ASIC Regulatory Guide 271 — internal dispute resolution, 30-day written response
- Banking Code of Practice — financial difficulty obligations of subscribing banks
- ASIC Report 782 (May 2024) and Report 815 (September 2025) — hardship at ten large home lenders
- ASIC 25-165MR (August 2025) — NAB and AFSH Nominees, $15.5m, 345 hardship notices
- iTnews, 1 October 2025 — Bendigo and Adelaide Bank detects hardship in calls after the call
- iTnews, 29 May 2025 — Westpac pilots live call analysis for scams

Sounds are real recordings from Mixkit; see `public/sfx/ATTRIBUTION.md`.
