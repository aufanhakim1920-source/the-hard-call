# The 90-second demo

The exact sequence to perform in front of a judge, with what to say over each beat.

## The sentence to say, whatever is on the screen

> **"Same call, handled two ways: nothing was missed on the coached side, and nothing was handled on
> the silent side — including the notice that starts the twenty-one day clock."**

That sentence is true of **every one of the 42 runs archived in `eval/demo-runs.json`** — 14 coached
and 28 silent, across both engines and both versions of the script. Counted from the archive: **no
sign has ever come back MISSED on the coached side** (0 of 63 signs) and **no sign has ever come back
HANDLED on the silent side** (0 of 125). The statutory notice was handled in **14 of 14** coached runs
and in **none** of the 28 silent ones.

⛔ **Do not read a fraction off this page.** The number of signs raised moves: the coached run has
been recorded with both 4 and 5 signs, and so has the silent run. Both shapes are real and both are
in the archive. A presenter saying "four of four" while the screen shows five of five has just told a
judge the numbers are decoration. **The direction is the claim; the fraction is whatever today's card
says.**

## If the numbers on screen are not the ones you expected

Most likely thing to go wrong all morning, and it costs nothing if you expect it. **Read the screen,
say what it says, keep going.**

| What you see | What to say | Why it is fine |
|---|---|---|
| The coached run raises **5 signs**, not 4 (or 4, not 5) | "Five signs this time. The extra one is the prompt to tell the customer the hardship process exists." Then read the verdicts off the card | Only one sign comes and goes — `inform-hardship-provisions`. The other four are in **all 42** archived runs, both sides, every phase |
| The silent run raises **4 signs**, not 5 | The same sentence, then point at the missed rows | Same sign, other side |
| A coached row reads **PARTLY**, not HANDLED | "Partly — he acknowledged it and did not close it." Then point at the legal row, which is the one that carries the duty | **Partly is not missed.** The archive holds 12 partly verdicts among the 63 coached signs, and 0 missed. The sentence at the top still holds |
| A silent row reads **PARTLY** | Point at the legal row and at the missed count instead | Silent cards carry partly verdicts on the cue tips in 18 of the 28 archived runs — 34 of 125 signs. They have never carried a **handled** |
| The score is not 88, or the card says **not verified** | Never quote it. "The card withholds a score it cannot verify from the transcript rather than inventing one." Move to the per-sign rows | The score is written by the model; the counted fields are not |
| The **legal row** is anything but HANDLED coached / not-handled silent | **Stop quoting the archive and read the card aloud.** Say plainly that this run went differently | It has not happened in 42 runs. If it happens live, the honest reading is the only thing that survives it |

⛔ **Never talk over the screen to protect a number you memorised.** The card is the product's live
output; this page is a record of runs that already happened.

---

**The beats below were measured on 13 Sep against the deployed engine — ten full calls, six silent
and four coached, plus one browser run end to end**; the archive those ten sit in holds 42. Where a
number moves between runs, the spread is printed. Nothing here is estimated, and **nothing here
promises a score**.

> **How the numbers were taken.** `npx tsx eval/demo-runs.ts --runs 6 --side silent --remote`
> replays `src/lib/demoScript.ts` through the real engine — the same detector pass, the same
> `api/flags`, the same `api/report` — and prints the spread. Re-run it before any rehearsal you
> are going to quote numbers from. It costs twelve model calls per run.

---

## Say this out loud, in the first ten seconds

> **"The same call, handled two ways."**

It is the opening clause of beat 1 in the run table below, so you say it whether you mean to or not.
This section is why it is there.

The demo plays one customer's call twice. **Sarah's words are identical to the character in both
runs**, so the engine hears the same sentences both times. What changes is the person on the phone:
one worker had the signs in front of him, the other did not.

One honest wrinkle, and say it before a judge finds it: **the two runs do not raise the same number
of signs — one side gets an extra one, and on the deployed engine that side has been the silent
run.** The extra one is the prompt to tell the customer the hardship process exists,
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
| 0 | **Hard-reload the live URL** (Ctrl+Shift+R) | ⚠️ **Mandatory.** The 13 Sep rehearsal opened a tab serving a cached build whose JS asset no longer exists on the origin — the script 404'd and the page was dead until a hard reload. Two seconds, and the cheapest insurance in this document |
| 1 | Open the live URL in **Chrome or Edge**, full screen, and let it settle | First load fetches the fonts and the sounds. Other browsers have no speech engine — the replay still works, the microphone does not |
| 2 | **About → Delete everything** → then **Delete everything on this device** | ⚠️ **There is no browser dialog any more** — `window.confirm` was deliberately removed. It is two in-page buttons: the first arms, the second wipes. Anyone waiting for a Chrome prompt will think the first click failed. Result: an empty Calls list and an empty Deadlines tab, so the clock the demo creates is obviously new |
| 3 | Check the top bar says **Assistant ready** | Grey or paused means the engine is not answering — see Fallbacks |
| 4 | **Settings → The assistant → Coaching during the call → OFF**, then close Settings | Run one is the bank as it is today. **Do this now, not on stage** — it is the only piece of slack in the ninety seconds. ✅ **Check it without opening Settings:** the **Settings** tab grows a **`1`** badge while coaching is off and loses it when coaching is back on |
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

**The beat times below are derived, not chosen** — every machine interval is measured (`REHEARSAL.md`
§1–§2) and every spoken line is its word count ÷ 3.1 words per second. The full arithmetic is in
`docs/PITCH.md`, *Where 1:27.9 comes from*. **The words in the "You say" column are identical to
PITCH's, character for character.** If you change one, change both.

| At | You do | You say | What appears |
|---|---|---|---|
| 0:00 | Click **▶ Play the demo call**, then **2x** | "Same call, handled two ways. CallFlag listens, and puts the reply-due date and the next question on the worker's screen while the customer is still on the phone." | Transcript starts. Right column: **"Coaching is off for this call."** — present from **+0.11 s**, before the first line |
| 0:09 | — | "Under the National Credit Code a hardship notice can be **spoken**. She never says the word, and the twenty-one days start when she speaks." | "Honestly, I'm a bit behind on everything" at **0:07.2**, then "Maybe. I got laid off last month" at **0:12.7** |
| 0:17 | Point at the worker's line | "He asks for a date instead. In August 2025 NAB and a related lender were penalised $15.5 million for failing to answer 345 customers’ hardship notices in time." ⚠️ Corrected 13 Sep by laural, who owns the law: it was NAB **and AFSH Nominees**, **345 customers** not 345 notices, and they **failed to respond within the required period** — some received nothing at all, so "late" understates it | "So when do you think you could pay the full amount?" — measured **0:15.2**, and it really is line 7 |
| 0:25 | Point at the right column | "The assistant heard all of it and said nothing — coaching is off." | Right column still the silent note. **0 sign cards, all 26.8 s** |
| 0:29 | Press **E** (or click **End call**). **Say nothing** | — | Script finished at **0:26.8**; the status line reads *"script finished — end the call for the report card"* |
| 0:34 | — | "Graded. Nothing handled — the legal one included. The clock started anyway." | Report card, **5.0 s after E**. The sentence **"The assistant ran silent on this call"** is on it but it is the **second** paragraph — what leads is the count. Every sign unhandled; 5 of 5 missed in the ten deployed runs archived on 13 Sep |
| — | ⚠️ **Do NOT say "the one at the bottom".** Rehearsed 13 Sep: the legal row is **fourth of five** and reads *Needs months without full payment*; the bottom row is *Let them know hardship help exists*. Point at the row that says ON THE CLOCK, or do not point at all | — | Under **ON THE CLOCK**: `REPLY DUE` · `Needs months without full payment` · `Sun 13 Sep` → `Sun 4 Oct` · `21` `DAYS LEFT`. ⚠️ **"Reply due · 21 days" is not a string on the card.** If you quote it, quote *"REPLY DUE, Sun 4 Oct, 21 days left"* |
| 0:37 | **Settings → Coaching during the call → ON**, close, **Live call** | "Now the same customer, with the assistant coaching." — **say it over the switch, not after it** | Fresh call screen. This switch is the slowest thing you do — about six seconds, and **the only unmeasured interval in the run** |
| 0:43 | Click **▶ Play the demo call**, then **2x** | "Her words do not change. Watch the right column." | Transcript restarts from an empty screen |
| 0:50 | — | "About two seconds after she says it." | First sign card, measured **+6.3 s** into run two, titled **"Customer mentions things are tight"** — **"mentions", not "says"**, on the card, the compare board and the report card |
| 0:52–1:09 | **Nothing. Watch it with the room** | — | Two more cards arrive on their own: **"Customer was laid off"** (+15.7 s) and **"Customer sounds stressed"** (+20.1 s) |
| 1:09 | Read the legal card aloud when it lands. **If it is not there, see the box below** | "There it is — the duty, the reply date, and the question he asks while she is still on the phone." | Gold **LEGAL** card, measured **+25.7 s** into run two, titled **"Needs reduced payments for months"** and reading `REPLY DUE` / `Sun 4 Oct` / `21 days left` / `under National Credit Code s72` / `ASK NEXT "Would pausing or reducing payments for three months give you some breathing room?"`. ⚠️ It says **"21 days left"**, not "21 days" |
| 1:15 | Press **E**, but only once the legal card is on screen | — | Script finished at **+26.8 s** into run two |
| 1:18 | — | "Nothing missed." | Report card, **3.1 s after E**. **"The assistant coached this call"** is again the **second** paragraph. **0 missed — in all 14 coached runs ever archived.** A row may read PARTLY; that is not a miss |
| 1:19 | Click the **Calls** tab **and start the sentence on the click** | "The engine did identical work in both runs. The only difference is whether the person on the phone was told in time to do anything about it." | Heading **TWO CALLS COMPARED**, rendered **1.2 s** after the click. The legal row is the **first** row and reads **coached HANDLED · silent MISSED** |
| 1:28 | Stop | — | — |

### ⚠ The legal card at 1:09 — what to say if it is not there yet

**Wait for the legal card before you press E on the coached run.** On the deployed engine it fires on
Sarah's last line. Measured 13 Sep: the card landed at **1:09.7** and the script finished at
**1:10.8** — a margin of **1.1 seconds**, the most fragile number in the demo. The slowest `flags`
call measured that day was **3.67 s** against a median of **2.38**. One slow call and the card lands
after the script ends.

**Say this while you wait:**

> **"Every card on that screen is a live call to the model — nothing here is a recording."**

**It is true either way**, because three cards are already up by then (+6.3 s, +15.7 s, +20.1 s). It
costs 5.5 seconds and it answers the question a judge was going to ask anyway.

⛔ **If the card is still not there when that sentence ends: stop and wait in silence. Do not
describe it.** A two-second pause reads as confidence. Describing a card that is not on screen tells
the judge you are reciting, and it is the one failure in this demo that cannot be recovered.

`docs/PITCH.md` carries the same instruction and the same sentence.

**The argument in one sentence, if you only get one:** *the engine did identical work in both runs;
the only difference is whether the person on the phone was told in time to do anything about it.*

---

## What is measured, and what varies

### What never moved — all 42 archived runs, both engines, both versions of the script

This is the block to speak from. Counted from `eval/demo-runs.json`: 14 coached runs (63 signs) and
28 silent runs (125 signs).

| | Coached (14 runs) | Silent (28 runs) |
|---|---|---|
| Signs **missed** | **0 of 63**, every run | 86 of 125 |
| Signs **handled** | 49 of 63 | **0 of 125**, every run |
| The legal sign — the one that starts the clock | **HANDLED in 14 of 14 runs** | **handled in 0 of 28 runs** (missed in 25, partly in 3 — all three before the 13 Sep script fix) |
| Legal deadline created, Reply due today + 21 days, NCC s72 | yes | **yes — even with nothing on screen** |
| Sign cards on screen during the call † | 4 or 5 | **0** |

† The card count is a browser observation, not a harness one; the harness has no screen.

### What did move — the fraction, and the denominator under it

**Ten runs on 13 Sep against the deployed engine — six silent, four coached** (`--remote`,
`gemini-flash-latest`) came back identical on every counted field:

| | Coached (4 runs) | Silent (6 runs) |
|---|---|---|
| Signs raised and judged | **4**, every run | **5**, every run |
| Signs missed | **0**, every run | **5**, every run |
| Signs answered | **4 of 4** (3 handled, 1 partly), every run | **0 of 5**, every run |
| The legal sign | **HANDLED**, every run | **MISSED**, every run |
| Verdicts unverified | **0**, every run | **0**, every run |

**And three runs of the same script through the local source engine came back as the mirror image** —
coached **5** signs, silent **4** — as did the two browser runs written up in `docs/EVIDENCE.md`,
which recorded coached **5 of 5** and silent **0 of 4**. Across the whole archive the answered
fraction has taken **ten distinct shapes**: coached 4 of 4, 5 of 5 and 4 of 5; silent 0, 1, 2 or 3 of
4 and 0, 1 or 2 of 5.

**So quote the direction, never the fraction.** Everything in the first table held in 42 of 42 runs.
Nothing in the second table held in more than 10.

**Why the denominator moves:** exactly one sign comes and goes — `inform-hardship-provisions`, the
prompt to tell the customer the hardship process exists. Inside the archive it splits by engine and
not by luck: on the deployed engine it fired on the **silent** side in 13 of 13 silent runs and never
in 7 coached ones; on the local source engine it is exactly reversed, 7 of 7 coached and 0 of 15
silent. The two browser runs in `docs/EVIDENCE.md` put it on the coached side and record the engine
as the deployed one, so **do not promise a side in advance** — the story reads the same either way
(the worker who has not covered the hardship process earns the prompt telling him to), and the Calls
screen prints whichever way it fell.

### What still moves, so never say it

| | Coached (4 runs) | Silent (6 runs) |
|---|---|---|
| Score | **88 · 85 · 88 · 88** | **10 · 10 · 10 · 15 · 10 · 10** |

**The score is the least trustworthy number on the card, and you must not quote it.** The model
writes it; nothing deterministic pins it. The ring is scenery.

⚠️ **The fraction is not a safe substitute for it either** — see the section above. Say *"nothing
missed on one side, nothing handled on the other"* and point at the per-sign table, where whatever
the run actually produced is printed for the judge to read himself.

⚠️ **The old pitch line "95 against 20" is dead, and it was never true.** Checked against the 26
judgements archived before the script was fixed: **95 appeared 0 times in 7 coached runs**, and the
silent row we published — 20 with 3 caught, 0 handled, 3 missed — appeared **0 times in 19**, because
`caught` was 1 every run and never 3. The bare score 20 did turn up, in 7 of the 19. Quote the
direction, and read the fraction off the card in front of you.

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
7. **Delete everything** arms an in-page confirm; **Delete everything on this device** is the second click that does it. There is no browser dialog. It does
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
| **The fractions on the cards are not the ones you rehearsed** | Read what is on screen and carry on — see *If the numbers on screen are not the ones you expected* at the top of this page. The direction is what you promised, and it has held in all 42 archived runs |
| A card comes back **NOT VERIFIED** | Point at the per-sign rows. The card withholds a score it cannot verify from the transcript rather than inventing one — which is the same reason a judge should trust the numbers it *does* print |
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

## The report card is taller than a projector screen

Measured 13 Sep on the silent card at 1280×720: **2271px** tall, against a laptop showing **720px** of
it. (The earlier recorded range was 2005–2226px; the card has grown past it and will drift again, so
treat the number as "about ten screens", not a constant.) That is not a bug — it is a long document —
but it means the presenter is scrolling in front of a judge, and scrolling that was not planned looks
like hunting for something.

**Everything the pitch says out loud is already in the first 720px**, screenshot-verified: the score
ring, the miss count, the sentence naming the reply date, and the answered fraction. So:

- **Say the claim before you scroll.** The top of the card is the argument; the rest is the evidence.
- **Then scroll once, deliberately, to the per-sign table** and stop there. That table is what proves
  the number above it, and it is the thing worth showing rather than skimming.
- Do not scroll while talking. Land, speak, scroll, speak.

## Warm the engine before you present

**Measured on the deployed function: the first flags call after it has been idle took 13.4 seconds.**
Steady state measured **1.9–3.7 s, median 2.38** on 13 Sep (the earlier 1.6–3.0 was optimistic). The edge function cold-starts, and the first line of your demo is exactly
where that cost lands — in silence, in front of a judge, on the beat where the product is supposed to
look instant.

**Play the demo call once a few minutes before you present, and let it finish.** That is the whole
fix. It costs one run and it removes the worst thirteen seconds in the pitch.

## Rehearsed on the deployed site, 13 Sep - what the clock actually did

Both calls performed end to end against the live URL, timed with the real clock. Full table in
`docs/REHEARSAL.md`. Machine time is only **62.9 s**, so the budget is sound. **Every correction the
rehearsal asked for has been applied to the run table above and to `docs/PITCH.md`.** This section is
the record of what changed and why.

### The overrun was not one line — it was the whole script, and it had never been timed

The rehearsal reported the run at **≈1:33** and put the whole overrun on the 1:05 line. Re-timing
every beat on paper says the problem was larger:

- **The old 1:05 line is 33 words, not 28.** Recount it: *"There it is. It names the duty, the date
  the bank has to reply by, and the exact question to ask next — and he asks it while she is still on
  the phone."*
- **The old PITCH table carried 291 spoken words.** At the rehearsal's own rate (28 words ≈ 9 s, so
  3.1 words per second) that is **94 seconds of continuous talking** — more than the whole slot,
  before a single machine gap.
- **The first four beats alone came to 164 words = 52.9 s**, over a replay that is finished in
  **26.8 s**. The narration for run one was twice as long as run one.

So the fix was not a trim. **The spoken script was rewritten to 173 words and re-derived beat by
beat**, and it now lands at **1:27.9**. The arithmetic is printed in `docs/PITCH.md`, *Where 1:27.9
comes from* — word counts, the rate, and every measured machine gap, so the total can be checked
rather than believed.

**On the 1:05 line specifically: cut, not moved.** It is now **20 words** — *"There it is — the duty,
the reply date, and the question he asks while she is still on the phone."* — and it keeps all four
things the old line named: the duty, the date, the question, and that he asks it live. **The
rehearsal's third option, pressing E before the line, was rejected**: it only works if the card is
already up, and the whole reason this beat needs attention is the runs where it is not. Pressing E
into an empty column is the failure it was meant to avoid.

### The most fragile number in the demo

**The legal card beats the end of the script by 1.1 seconds.** The slowest `flags` call measured on
13 Sep was 3.67 s against a median of 2.38. If one runs long, the script finishes before the card
arrives and the presenter is talking about something not yet on screen.

**The script now handles it explicitly** — see *The legal card at 1:09* above. There is a sentence to
say that is true whether or not the card has landed, and an instruction to stop and wait in silence
after it. Warming the engine first still matters and is still the cheapest half of the fix.

### Two things that will make a presenter look lost

- **The legal row is fourth of five, not the bottom one.** Corrected above, in both documents.
- **The wipe has no browser dialog.** Two in-page buttons now.

### Every quoted string the documents got wrong, now fixed in both

| Was quoted as | What the screen actually says |
|---|---|
| "Lead line: *The assistant ran silent on this call*" | Both sentences exist but neither **leads** — each is the **second** paragraph. What leads is the count |
| "Lead line: *The assistant coached this call*" | Same — second paragraph |
| First coached card: *Customer **says** things are tight* | *Customer **mentions** things are tight* — on the card, the compare board and the report card |
| *Reply due · 21 days* under ON THE CLOCK | `REPLY DUE` · `Sun 13 Sep` → `Sun 4 Oct` · `21` `DAYS LEFT`. Quote it as *"REPLY DUE, Sun 4 Oct, 21 days left"* |
| Legal card: *… · 21 days · National Credit Code s72* | `21 days left` / `under National Credit Code s72` |
| *Two calls compared* | **TWO CALLS COMPARED**, and the legal row is the **first** row |
| The card is 2005–2226px | **2271px**, measured at 1280×720 |

Also corrected: the steady-state latency band (**1.9–3.7 s, median 2.38**, not 1.6–3.0), and the
30-second version, which had never been rehearsed and carried the same three faults.

### Two things confirmed rather than corrected

- **2x works**: both replays finished at 26.8 s against 52 s of scripted gaps, exactly half.
- **The network claim a judge can check**: 12 transcript lines produced exactly 12 `flags` calls plus
  1 `report` call, both runs, no more and no fewer.

### One pre-flight step that is now mandatory

**Hard-reload the live URL before you present.** The rehearsal opened a tab serving a cached build
whose JS asset no longer exists on the origin - the script 404'd and the page was dead until a hard
reload. It costs two seconds and it is the cheapest insurance in this document. It is now **row 0**
of the pre-flight table.
