# The 90-second demo

The exact sequence to perform in front of a judge, with what to say over each beat.

**Measured on 13 Sep against the deployed engine — ten full calls, six silent and four coached,
plus one browser run end to end.** Where a number moves between runs, the spread is printed.
Nothing here is estimated, and **nothing here promises a score**.

> **How the numbers were taken.** `npx tsx eval/demo-runs.ts --runs 6 --side silent --remote`
> replays `src/lib/demoScript.ts` through the real engine — the same detector pass, the same
> `api/flags`, the same `api/report` — and prints the spread. Re-run it before any rehearsal you
> are going to quote numbers from. It costs twelve model calls per run.

---

## Say this out loud, in the first ten seconds

> **"The same call, handled two ways."**

The demo plays one customer's call twice. **Sarah's words are identical to the character in both
runs**, so the engine hears the same sentences both times. What changes is the person on the phone:
one worker had the signs in front of him, the other did not.

One honest wrinkle, and say it before a judge finds it: **the silent run raises five signs and the
coached run four.** The extra one is the prompt to tell the customer the hardship process exists,
and it fires on the silent run precisely *because* that worker never mentions it — the coached
worker says the word, so the engine stops asking. **The silent run gets more help, not less, and
answers none of it.** The Calls screen prints the discrepancy itself.

**It is a dramatisation, and it is written down as one.** There are two worker scripts in
`src/lib/demoScript.ts`. This is not a recording of the tool changing somebody's words live.

**If a judge asks whether the worker's lines are scripted: yes, both sides are.** Say it plainly and
move to the thing that is not scripted — the engine, the verdicts, the deadline and the clock all
run live against the real model on every run.

The silent worker is not a straw man. He chases the payment he rang about, asks for part of it this
week, pushes for a date straight after she says she was laid off, and closes with *"No worries, I'll
put a note on the file."* Every line is one a real worker says. He simply never offers a repayment
change and never mentions that hardship assistance exists.

⚠️ **The same words are not the same context.** The engine reads the last fourteen lines, so the
worker's question is part of what it hears when Sarah answers. Measured across the ten deployed runs:
the statutory notice fires on *"I don't know. I'm really stressed about all of it."* in **5 of 6**
silent runs and on *"Just a few months without the full payment."* in **4 of 4** coached ones — the
sixth silent run fired on the later line, like the coached ones. Same key, same 21-day date,
**different moment** — do not say "at the same second in both runs".

---

## Before the judge arrives — three minutes, done once

> **Run it on the live URL, not localhost.** https://aufanhakim1920-source.github.io/the-hard-call/
> The rubric scores a localhost-only project lower, and the live build talks to the deployed engine,
> which is the one every number below was measured on.

| # | Do | Why |
|---|---|---|
| 1 | Open the live URL in **Chrome or Edge**, full screen, and let it settle | First load fetches the fonts and the sounds. Other browsers have no speech engine — the replay still works, the microphone does not |
| 2 | **About → Delete everything on this device** → OK in the browser's own confirm dialog | An empty Calls list and an empty Deadlines tab, so the clock the demo creates is obviously new |
| 3 | Check the top bar says **Assistant ready** | Grey or paused means the engine is not answering — see Fallbacks |
| 4 | **Settings → The assistant → Coaching during the call → OFF**, then close Settings | Run one is the bank as it is today. **Do this now, not on stage** — it is the only piece of slack in the ninety seconds |
| 5 | Land on the **Live call** tab with the setup row showing Sarah M. / home loan / Bank rang them | Where beat 1 starts |
| 6 | Keep the tab in front for the whole demo | A backgrounded tab gets no animation frames; the counters jump to their final value about a second late instead of counting up |

⛔ **If you demo on localhost instead, restart `npm run api` first.** `dev/api-server.mjs` imports the
engine once at start-up and never reloads it, so a server left running overnight serves the engine as
it was when you launched it. **Measured 13 Sep: the local server had been up eleven hours and was
still returning the pre-request-tier report — three "unreproducible" silent runs were all measured
against it.** The check takes one second: `curl -s localhost:8787/api/health`, then kill and relaunch.

---

## The run

Times are cumulative wall clock from the first click. **Press 2x the moment you click Replay — do
not wait for the first line.** The control appears as soon as the replay mode starts, and every line
already scheduled when you press it still runs at 1x.

**Script length: twelve lines, 52 s of scripted gaps** (summed from `demoScript.ts`; identical on
both sides). One browser run at 1x, measured 13 Sep,
finished at **54 s** — the extra second and a half is request latency. At 2x the app halves every
remaining gap, so budget **about 27 s** per call. ⚠️ The 2x path was **not** re-measured after the
script gained its closing line; if you are timing the rehearsal to the second, time it yourself.

| At | You do | You say | What appears |
|---|---|---|---|
| 0:00 | Click **▶ Replay the demo call**, then **2x** | "A bank has twenty-one days to answer a hardship notice. The customer almost never says the word. Same call, handled two ways — this is the worker who was not told." | Transcript starts. Right column: **"Coaching is off for this call."** |
| 0:07 | — | "Sarah is behind on a home loan." | "Honestly, I'm a bit behind on everything" |
| 0:13 | — | "She has lost her job." | "Maybe. I got laid off last month" |
| 0:15 | Point at the worker's line | "And there is the miss — he asks for a date instead. In 2025 NAB was fined $15.5 million over 345 hardship notices answered late. This is what that looks like in one sentence." | "So when do you think you could pay the full amount?" |
| 0:23 | Point at the right column | "The assistant heard all of it and said nothing. That is coaching off — a bank can run it silent for a month to measure what it is missing." | Right column still the silent note. **0 sign cards, every run** |
| 0:27 | Press **E** (or click **End call**) | "Call over." | Script finished |
| 0:31 | — | "Same call, graded." | Report card. Lead line: **"The assistant ran silent on this call"**. **0 of 5 signs answered, 5 missed** |
| 0:34 | Point at the missed rows | "Every sign missed — and the one at the bottom is the legal one, the sentence that starts the clock. It started the clock anyway: the deadline is on the bank's list whether or not anyone on the call noticed." | Every row reads **MISSED · NOT ADDRESSED**, and **Reply due · 21 days** sits under ON THE CLOCK |
| 0:38 | **Settings → Coaching during the call → ON**, close, **Live call** | "Now the same customer, with the assistant coaching." | Fresh call screen. This switch is the slowest thing you do — about six seconds |
| 0:44 | Click **▶ Replay the demo call**, then **2x** | "Her words do not change. Watch the right column." | Transcript restarts |
| 0:49 | — | "About two seconds after she says it." | First sign card: **Customer says things are tight**. ⚠ Card arrival times were measured at 1x on the silent run only (7.6 s / 26.8 s / 36.6 s from the click); the coached run's on-screen times were not re-measured after the script changed |
| 1:05 | Read the legal card aloud when it lands | "There it is. It names the duty, the date the bank has to reply by, and the exact question to ask next — and he asks it while she is still on the phone." | Gold **LEGAL** card: **Reply due · [today + 21 days] · 21 days · National Credit Code s72**, and **Ask next: …** |
| 1:12 | Press **E**, but only once the legal card is on screen | — | Script finished |
| 1:16 | — | "Nothing missed." | Report card. Lead line: **"The assistant coached this call"**. **0 missed, every run** |
| 1:20 | Click the **Calls** tab | "Both calls, one axis. The engine did identical work in both runs. The only difference is whether the person on the phone was told in time to do anything about it." | **Two calls compared** — the two fractions on one scale, then the per-sign table: the legal row reads **coached HANDLED · silent MISSED** |
| 1:28 | Stop | — | — |

**⚠ Wait for the legal card before you press E on the coached run.** On the deployed engine it fires
on Sarah's last line, so it can land at or just after the end of the script. If it is not on screen
yet, hold for two seconds. It has arrived on every run.

**The argument in one sentence, if you only get one:** *the engine did identical work in both runs;
the only difference is whether the person on the phone was told in time to do anything about it.*

---

## What is measured, and what varies

**Ten runs on 13 Sep against the deployed engine — six silent, four coached** (`--remote`,
`gemini-flash-latest`), plus one browser run end to end on the local engine.

### What did not move

| | Coached (4 runs) | Silent (6 runs) |
|---|---|---|
| Signs raised and judged | **4**, every run | **5**, every run |
| Sign cards on screen during the call | **4** | **0** |
| Signs missed | **0**, every run | **5**, every run |
| Signs answered | **4 of 4** (3 handled, 1 partly), every run | **0 of 5**, every run |
| The legal sign — the one that starts the clock | **HANDLED**, every run | **MISSED**, every run |
| Verdicts unverified | **0**, every run | **0**, every run |
| Legal deadline created, Reply due today + 21 days, NCC s72 | yes | **yes — even with nothing on screen** |

**Every counted field on both cards was identical across all ten runs.** That was not true a day
ago and it is not free — see *Why the script reads the way it does* below.

### What still moves, so never say it

| | Coached (4 runs) | Silent (6 runs) |
|---|---|---|
| Score | **88 · 85 · 88 · 88** | **10 · 10 · 10 · 15 · 10 · 10** |

**The score is the only thing that moves, and it is the only thing you must not quote.** The model
writes it; nothing deterministic pins it. Say *"zero of five answered against four of four"* and
point at the per-sign table. The ring is scenery.

⚠️ **The old pitch line "95 against 20" is dead, and it was never true.** Checked against the 26
judgements archived before the script was fixed: **95 appeared 0 times in 7 coached runs**, and the
silent row we published — 20 with 3 caught, 0 handled, 3 missed — appeared **0 times in 19**, because
`caught` was 1 every run and never 3. The bare score 20 did turn up, in 7 of the 19. Quote the
fraction.

### On the local engine, the spread is wider

Three silent and three coached runs through `npm run dev` + `npm run api` on this machine's
`gemini-2.5-flash`:

| | Coached (3) | Silent (3) |
|---|---|---|
| Signs raised | 5 | 4 |
| Signs missed | **0**, every run | 2 · 3 · 1 |
| The legal sign | **HANDLED**, every run | **MISSED**, every run |
| Score | 90 · 75 · 80 | 30 · 20 · 30 |

The two rows the demo rests on hold on both engines. The cue tips (stress, job loss, "worth asking")
flip between **PARTLY** and **MISSED** on the older local model, because the silent worker genuinely
does acknowledge before pushing on — which is what PARTLY means. That moves the *fraction* on the
card, which is why **the live URL is the one to demo on.**

### Why the script reads the way it does

Nine runs before this measurement had the silent run's legal row come back MISSED seven times and
**PARTLY twice**, with the score anywhere from 18 to 40. Asked why, the model said it in its own
words: *"You noted the file for someone to follow up."* It was reading two things as the worker
partly discharging the obligation:

- *"I can give you a couple of weeks before the next reminder goes out"* — a forbearance he never
  meant to grant;
- *"and someone will be in touch"* — a callback nobody had arranged.

Both were removed. **Nothing was added to make the silent worker worse; two offers he never meant to
make were taken away.** A third change: both scripts now end on *"Alright. Bye for now, Sarah."*,
because a sign raised on the final line of a call has no worker line after it, and the card is
required to mark a verdict it cannot point at **unverified** — which withholds the score for the
whole card. Counted in `eval/demo-runs.json`: across the **7** deployed silent runs recorded before
the sign-off existed, the hardship-process prompt landed on the last line in **5**, and the card
withheld its score in **exactly those 5**. After the sign-off: **0 of 6**.

⛔ **If you edit `demoScript.ts`, re-run `eval/demo-runs.ts` before you trust the table above.**
Putting an offer back into either line will make the demo unrepeatable again.

### Other measured facts

- **Sign arrival, silent at 1x**, from the click: "worth asking about hardship" **7.6 s**, job loss
  **26.8 s**, the legal sign and stress together **36.6 s**. Each is about 2 s after the line that
  caused it.
- **The deterministic detector is on `main`** and runs in the browser before the model, with **zero
  API calls**. Typing *"I can't make the repayments, not this month and not for a good few months
  after that."* as **Customer** raises the legal sign **and** the hardship-process prompt from the
  detector alone, with the model pass adding nothing.
  ⛔ **It does not fire on this demo.** Replayed line by line over both scripts it raises **0 signs
  on 12 of 12 lines**, and all **188 signs** in `eval/demo-runs.json` came from the model. Sarah's
  key line — *"Just a few months without the full payment."* — pairs a period with an *implied*
  inability, and the rules need both halves explicit in the same customer turn (`docs/DETECTOR.md`).
  **So do not say "it cannot be rate-limited" over this call.** If a judge asks what happens when the
  key runs out, the honest answer is the one in Fallbacks: the report card still comes, marked
  `degraded`, with no invented score — and if you want to *show* the deterministic path, type the
  sentence above into a fresh call rather than pointing at the replay.
- **The reply-due date is computed, not canned** — always today + 21 days.
- **The report card's `caught` counts obligations only**, not tips. A silent card reading "1 caught"
  with five signs is correct: one of the five is a legal duty.

---

## Known traps — all hit while rehearsing this

1. **A local `npm run api` left running overnight serves a stale engine.** It imports the handlers
   once and never reloads. Restart it before measuring anything, or demo on the live URL. This one
   cost three misleading measurements on 13 Sep.
2. **The 2x control does not exist until the replay is running**, and every line already scheduled
   when you press it still runs at 1x. It appears the instant you click Replay, so press it in the
   same breath.
3. ~~The "who said it" box flips after every typed line~~ **— fixed.** It stays where you put it, so
   two customer sentences in a row now both reach the engine. Still glance at it before Enter: a line
   typed as Worker raises nothing, correctly, because the engine only flags the customer.
4. ~~The hint under the transcript names line 7 on both runs~~ **— fixed.** It is conditioned on
   coaching now: silent reads *"Watch line 7: the worker asks for money instead of answering the
   sign."*, coached reads *"Watch what the worker does the moment each sign lands."* Either is safe
   to read aloud.
5. **Wait for the legal card on the coached run** — it fires on Sarah's last line, so it can land at
   or after the end of the script.
6. ~~Entering a practice scenario and not speaking traps you on that screen~~ **— fixed.** End call
   is never disabled now; an empty call just produces an empty report. ⚠️ Confirmed by reading the
   source, not by clicking it, so if you open Practice during Q&A know that the escape has not been
   rehearsed on the live URL.
7. **Delete everything on this device** opens the browser's own confirm dialog. Click OK; it does
   nothing without it.
8. **A backgrounded tab gets no animation frames.** The counters have a safety timeout and land on
   the right value about a second late, so nothing is wrong — but it looks like a stall. Keep the
   tab in front.
9. **Every sign is a model call.** Twelve lines is up to twelve calls plus one for the report. Two
   spare keys are armed on the live function, and the deterministic detector answers with none.

---

## Fallbacks

| If | Do |
|---|---|
| The **Calls** tab is missing | Fall back to the two report cards in sequence — press End, read the silent card, run the second call, read the coached card. The argument survives; you narrate the comparison instead of pointing at it |
| The top bar says **Assistant paused** | Finish the call anyway — the report card is still written from what is already known, marked `degraded`, with no invented score. Say plainly that the free-tier key is rate-limited. Honesty scores better than a stalled screen |
| The live URL is down | `npm run dev` at localhost, **with a freshly restarted `npm run api`** — the local `.env` points the app at `localhost:8787`. Say it is the same build, and expect the wider spread in the table above |
| A card comes back **NOT VERIFIED** | Point at the fraction and the per-sign rows. The card withholds a score it cannot verify from the transcript rather than inventing one — which is the same reason a judge should trust the numbers it *does* print |
| A sign does not fire on a typed line | Check the **who said it** box first — see trap 3. Then send it again; a sign fires once per key, so it is safe to repeat |
| You are asked for the microphone | Skip it. The replay and the typed line go through the identical engine; the microphone only changes where the words come from |

---

## Two extra beats, for questions (about 20 seconds each)

**"Does it just fire on sad words?"** — Type this into a fresh call, as **Customer**:

```
Any chance we can push the payment back a couple of weeks? I get paid on the twentieth.
```

**Nothing fires.** That is a timing gap, not a statutory notice. Starting a hardship process the
customer never asked for is the worst error this system can make, so the legal test is a required
duration field the model must report, plus a quote it has to find in the transcript, and
deterministic code makes the call — not a phrase match.

**"What about privacy?"** — Open the About page. Words are never stored; a flag points at the
transcript by speaker and timestamp instead of copying it; card, account, BSB, TFN and Medicare
numbers are masked in the browser before a sentence is sent. The adjudicator's response schema has
**no field** for why the customer cannot pay, so the model cannot return one.

---

## If you get two minutes instead of ninety seconds

Add two beats, in this order:

1. **The Deadlines tab, after the silent run** (about 10 s). One row: the date, "21 days left",
   Sarah M., and a **Mark replied** button. The point: the silent call put 0 cards on the screen and
   still started the clock, so the obligation exists whether or not anyone on the call noticed it.
2. **Open both cards from the Calls list** (about 20 s) and read the evidence quotes. Each verdict
   cites the worker line it was judged on, with its timestamp.

And say the honest sentence once more, because it is the one a judge who reads the repo will be
checking you against: **the worker's lines are scripted on both sides. The engine is not.**
