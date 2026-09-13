# The spoken pitch

What a person says out loud, in order, for the 90-second live demo. The clicking script is
`docs/DEMO-SCRIPT.md` and it is the authority on **what to press**; this page is the authority on
**what to say**. The beat times below are that page's times, unchanged, so the two cannot drift.

Read `docs/DEMO-SCRIPT.md` before rehearsing this. Everything in *Before the judge arrives*,
*Known traps* and *Fallbacks* applies and is not repeated here.

---

## The one sentence that is always true

> **"Same call, handled two ways: nothing was missed on the coached side, and nothing was handled on
> the silent side — including the notice that starts the twenty-one day clock."**

True of all 42 archived runs in `eval/demo-runs.json` — 14 coached, 28 silent, both engines, both
versions of the script. It is the only sentence a presenter may say **without looking at the screen**.

⛔ **Never say a fraction out loud.** Not "four of four", not "five of five", not the score. The
denominator moves — ten distinct shapes across the archive — and the screen behind you decides which
one appears today. A presenter quoting a number the screen contradicts has told the judge that all
the numbers are decoration. **Direction from memory; fraction only by reading it off the card.**

If the card shows something you did not expect, the table at the top of `docs/DEMO-SCRIPT.md`
(*If the numbers on screen are not the ones you expected*) has the line to say for each case. Read
it once the morning of.

⚠ **Do not memorise the reply-due date either.** It is computed as today + 21 days. On 13 Sep it read
Sun 4 Oct; presented on 14 Sep it will read Mon 5 Oct. Read it off the card.

---

## The 90 seconds

**The clock starts on the first click.** The run as written in `docs/DEMO-SCRIPT.md` ends at 1:28, so
there is no room for a cold open in front of it — the product sentence and the legal fact go into the
first thirteen seconds, over an empty transcript and Sarah's first two lines. Nothing is on screen to
compete with them.

If the slot gives you a beat before the clock starts, stand still and say beat 1 first. It is better
standing still. It works either way.

| At | You do | You say |
|---|---|---|
| **0:00** | Click **▶ Play the demo call**, then **2x** in the same breath | "CallFlag listens to a bank's hardship call and puts the reply-due date, and the next question to ask, on the worker's screen — while the customer is still on the phone." |
| **0:07** | Nothing. Let the transcript run | "Under the National Credit Code, a hardship notice can be given **out loud**. The customer never has to say the word 'hardship' — and the bank's twenty-one days start when she speaks, not when someone fills in a form. That is why it gets missed." |
| **0:13** | Nothing | "Sarah is behind on a home loan and has just lost her job. This is the worker who was not told." |
| **0:15** | Point at the worker's line | "And there is the miss — he asks for a date instead. In 2025 NAB was fined **$15.5 million** over **345** hardship notices answered late. This is what that looks like in one sentence." |
| **0:23** | Point at the right column | "The assistant heard all of it and said nothing. That is coaching switched off — a bank can run it silent for a month to measure what it is missing, before it lets it speak to anyone." |
| **0:27** | Press **E** | "Call over." |
| **0:31** | Let the card land | "Same call, graded. Nothing handled." |
| **0:34** | Point at the missed rows | "Every sign missed — and the one at the bottom is the legal one. It started the clock anyway: the deadline is on the bank's list whether or not anybody on that call noticed." |
| **0:38** | **Settings → Coaching during the call → ON**, close, **Live call** | "Now the same customer, with the assistant coaching." |
| **0:44** | Click **▶ Play the demo call**, then **2x** | "Her words do not change. Watch the right column." |
| **0:49** | First card lands | "About two seconds after she says it." |
| **1:05** | Read the gold card when it lands | "There it is. It names the duty, the date the bank has to reply by, and the exact question to ask next — and he asks it while she is still on the phone." |
| **1:12** | Press **E**, but only once the legal card is on screen | — |
| **1:16** | Let the card land | "Nothing missed." |
| **1:20** | Click the **Calls** tab | "Both calls, one axis. The engine did identical work in both runs. The only difference is whether the person on the phone was told in time to do anything about it." |
| **1:28** | Stop talking | — |

**If you only get one sentence out, make it the last one.** *The engine did identical work in both
runs; the only difference is whether the person on the phone was told in time to do anything about it.*

### Two things to say before a judge has to ask

Both are honest disclosures, and saying them first is worth more than the seconds they cost.

- **At 0:13, if the room looks sceptical:** "Both workers are scripted — that is written into the
  repo. The engine is not: every sign on that screen is a live call to our backend."
- **At 1:20, if you have ten spare seconds:** "It runs on the browser's own speech engine today, so a
  bank plugs it into the call feed it already records. Nothing new is collected."

### If you get twenty seconds more

In this order:

1. **The Deadlines tab, after the silent run** (~10 s). "The silent call put nothing on the screen and
   still started the clock. That row is the obligation, and it exists whether or not anyone noticed it."
2. **Open both cards from the Calls list** (~10 s). "Every verdict cites the worker's own line, with
   its timestamp. It grades the worker, never the customer."

---

## Who says what

Four people, one screen. **One person drives and narrates the run; nobody else speaks between 0:00 and
1:28.** Ninety seconds at 2x speed has no room for a handover, and a second voice over the driver is
the fastest way to miss the beat where the legal card lands.

| Person | In the 90 seconds | In Q&A | Why them |
|---|---|---|---|
| **Aufan** | **Drives and narrates the whole run.** Every line in the table above | The demo, the product, the honest disclosures | He owns the live-call screen and the pitch part, and has run the demo more than anyone. The beats are keyed to his own clicks, so driver and narrator being one person removes the only handover in the slot |
| **laural** | Optionally the **0:07 legal block** only, then silent | Anything about the law: what counts as a notice, what does not, the 21 days, the two tiers | She owns the hardship rules and the "a hint is not a notice" contract (`docs/hardship-flag-rules.md`, claims C2 and C3). A lawyer's question should not go through the person clicking |
| **Shawn** | Silent | Accuracy, the eval, the report card, the score, why a verdict can come back unverified | He owns the report card and the evaluation suite — 13 of the report commits in `TEAM-LOG.md`, plus the offline report tests |
| **Tron** | Silent | The model, rate limits, latency, what happens when the key runs out, how it is deployed | He owns the engine commits and the deployed function's health check (`TEAM-LOG.md`, submission item B5) |

**If the team wants two voices in the run**, the only safe split is: laural takes 0:00–0:15 (the
product sentence and the legal fact), Aufan takes 0:15 to the end and drives throughout. Do not split
at 0:38 — the coaching switch is the slowest, most fragile six seconds in the demo and the person
clicking it should be the person talking over it.

**Everyone else faces the judges, not the screen.** Four people watching their own demo reads as
nervousness.

---

## The five questions, and the honest answer to each

### 1. "Are those lines scripted? Is this a recording?"

**Yes to the first, no to the second — say both.** Both workers are scripted; there are two worker
scripts in `src/lib/demoScript.ts` and it is written down as a dramatisation. Sarah's words are
identical on both sides, so the engine hears the same sentences twice.

What is not scripted: the engine, the verdicts, the deadline and the clock. During the replay the page
makes **one live call to the backend per transcript line — twelve on this call — plus one for the
report card**. A judge can confirm it in the network tab in thirty seconds, and one already did
(`docs/JUDGE.md`, §5). That is the difference between this and a demo that plays a video.

### 2. "How accurate is it — and why isn't there a number on the card you'll quote?"

Two answers, and they point opposite ways on purpose.

**The engine has been measured.** 44 labelled utterances, replayed through the real handler:
**precision 1.00, recall 0.72**, exact-set match 32 of 44, speaker 44 of 44, latency p50 1.74 s /
p95 3.00 s. Published in `public/eval-results.json` and on the app's own About page.

**Precision is the number that matters here, and we optimised for it.** A false notice invents a legal
obligation the bank never owed and drags a customer into a process they never asked for. A miss costs
a prompt the worker did not get. We chose the model that never invented one.

**Recall of 0.72 is a limitation and here is its shape:** every one of the 12 misses is a
`hardship-request` — a hint, not a statutory notice. Nine of those 12 are the engine firing correctly
under the request tier, which the flat label set has no way to express, so a correct answer can only
score as a miss. We left the number low rather than editing the test to agree with the code.

**The score on the card is the least trustworthy thing on it and we do not quote it.** The written
review is model-generated, so it moves a few points between otherwise identical runs. The counted
fields — what was raised, what was answered, the deadline — are computed in code. And when the model
cannot cite a worker line for a verdict, the card marks it **unverified and withholds the score rather
than inventing one**. Which is the reason to trust the numbers it does print.

### 3. "What does it cost to run, and what happens when the model is unavailable?"

**Cost — the shape, not a dollar figure.** One model call per finished customer sentence, plus one at
the end for the report card: twelve calls on this ninety-second call. It runs on Gemini Flash on the
free tier today. **We have not measured a per-call cost and will not quote one** — the honest thing we
can say is that it is one small-model call per sentence, not a call per second, and no audio and no
transcript are ever stored.

**When the model is unavailable, the report card still comes.** The signs, whether each was handled,
the legal deadlines and the call duration are all already known without the model — only the written
review needs it. A failure returns a real card built from those, marked `degraded`, **with no invented
score**. There are two spare keys armed, tried only on failures that belong to the key.

**And one limitation, said before it is found:** a deterministic version of the legal test is merged
and runs in the browser before every model call, with no network and no key. On a transcript whose
wording its rules reach, it fires with no API at all. **On this demo's phrasing it fires nothing** —
0 signs across 12 of 12 lines, and all 188 archived signs came from the model. So we do **not** claim
the flagging cannot be rate-limited. If you want to see the deterministic path, we type one sentence
into a fresh call and it raises the legal sign with the key switched off.

### 4. "What would a bank actually have to change to adopt this?"

Less than you would guess for the first step, and we built the first step deliberately.

**Coaching-off is the adoption path, not a demo trick.** The assistant listens, judges and starts the
legal clock while saying nothing to anybody. A bank runs it silent for a month, gets a report card per
call and a deadline list, and finds out what it is missing — with no AI ever reaching a customer and no
change to how anyone works. Then it turns coaching on. That is a far easier thing to buy than
"install our AI into live calls".

**What genuinely has to change, and we are not hiding it:**

- **The audio feed.** Today the words come from the browser's own speech engine with the call on
  speaker. A real deployment takes the telephony feed the bank already records — nothing new is
  collected, because these calls are recorded already.
- **Storage.** Right now everything lives in one browser. Accounts are switched off, and the sync layer
  is written but unused; it names four tables whose schema is not in this repository, so their
  row-level security can only be confirmed inside the Supabase project. A bank would host it themselves.
- **The model's home.** It is a hosted model on a free tier. A bank puts it inside its own boundary.

**What would not have to change:** the privacy shape is enforced by the schema, not by a promise. The
adjudicator has **no field** for *why* the customer cannot pay, so the model cannot return one. Flags
point at the transcript by speaker and timestamp instead of copying it. Cause cues are shown live and
never written down. Card, account, BSB, TFN and Medicare numbers are masked in the browser before a
sentence is sent.

### 5. "Can you show me the practice mode — the voice agent?"

**No, and the reason is quota, not code.** The free ElevenLabs plan allows 15 minutes a month and the
account shows 14 minutes used in the last 7 days. Five attempts from a browser on 13 Sep produced five
refusals and zero sessions. The agent itself is published and healthy — a token request returns 200 —
there is simply nothing left to spend. **No connected voice call has been recorded end to end, and we
say that in the README rather than implying it works.**

What you can see instead: the practice roster, the five written customers, and the scenario builder
that turns a finished call into a de-identified practice customer with the name, job, suburb and every
number changed, which a person has to approve before it can be used. What it needs to be shown live:
paid quota and one recorded run. Nothing in the code changes.

### Three more, one line each

- **"Isn't someone already doing this?"** Bendigo and Adelaide Bank detects hardship in calls — **after**
  the call, with a team leader told minutes later; live is their stated next step. Westpac's live
  in-call pilot is for scams. We name them in the README rather than claiming the idea is untouched.
  What we claim is the harder half: during the call, with the deadline and the next question.
- **"What stops it firing on anything sad?"** *"Can you push it back two weeks, I get paid on the
  twentieth"* raises nothing — checked against the deployed engine. The model is not asked for a
  verdict; it is asked for a fact (what was said about the repayment period) and deterministic code
  applies the law.
- **"Does it decide anything?"** No. It never speaks to the customer and never makes the call. It puts
  a duty, a date and a question in front of a human.

---

## The 30-second version

If the slot is cut, do not try to compress two calls — each replay is about 27 seconds at 2x and the
gap between them is the whole argument. **Show the object, then show the comparison already made.**

**Prep, in place of the usual pre-flight:** run both calls a few minutes before you present and leave
them in the Calls list. That doubles as warming the engine, which you have to do anyway — the first
call after the function has been idle has been measured at 13.4 seconds against a steady state of
1.6–3.0. **Skip the "Delete everything on this device" step**, or do it before those two runs, or the
Calls tab will be empty when you get there.

| At | You do | You say |
|---|---|---|
| **0:00** | Live call screen, nothing running | "Under the National Credit Code a hardship notice can be given out loud, and the bank's twenty-one days start when the customer speaks. She never has to say the word. CallFlag catches it while she is still on the phone." |
| **0:08** | Type into the transcript, as **Customer**: *"I can't make the repayments, not this month and not for a good few months after that."* | "One sentence, live." |
| **0:12** | The legal card lands | "The duty, the date the bank has to reply by, and the exact question to ask next. That date is computed, not canned — today plus twenty-one days." |
| **0:20** | Click the **Calls** tab | "Same call, run twice — once with that on screen, once with it hidden. Same customer, same words, same engine. Nothing was missed on the coached side and nothing was handled on the silent side, including the notice that starts the clock." |
| **0:28** | Point at the legal row | "That row is the argument." |

Sourced: a typed sentence has raised the legal sign in **2.7 s**, and that wording is inside the
deterministic detector's reach, so it fires **with no API key at all** — worth saying if the room has
been watching AI demos all day.

---

## Rehearsal checklist

- [ ] **Run `docs/DEMO-SCRIPT.md`'s pre-flight**, all six rows. Coaching **OFF** before you stand up.
- [ ] **Warm the engine** — play the demo call once, a few minutes before, and let it finish.
- [ ] Say the run out loud once against a stopwatch. The script is 88 seconds; if you are talking at
      1:28 you are over.
- [ ] Check nobody's lines contain a fraction or a score. Read the table above and mark them off.
- [ ] Read the *If the numbers on screen are not the ones you expected* table once, the morning of.
- [ ] Agree who answers each of the five questions **before** you are standing there.
