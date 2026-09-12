# The 90-second demo

The exact sequence to perform in front of a judge, with what to say over each beat.

Every timing below was measured by running the demo on the app on 13 Sep — **twelve full calls,
seven coached and five silent**, at 1x and at 2x, at 1280 px. Where a number moves between runs, the
spread is printed. Nothing here is estimated, and **nothing here promises a score**.

---

## Say this out loud, in the first ten seconds

> **"The same call, handled two ways."**

The demo plays one customer's call twice. **Sarah's words are identical to the character in both
runs**, so the engine hears the same thing both times. What changes is the person on the phone: one
worker had the signs in front of him, the other did not.

One honest wrinkle, and say it before a judge finds it: the coached run raises **four** signs and the
silent run **three**. The extra one is the prompt to explain the hardship process, and it fires only
because the coached worker says the word — a consequence of the coaching, not a thumb on the scale.
**The three signs both runs raise are the same, the customer is the same, and the deadline is the
same.** The Calls screen prints the discrepancy itself.

**It is a dramatisation, and it is written down as one.** There are two worker scripts in
`src/lib/demoScript.ts`. This is not a recording of the tool changing somebody's words live.

**If a judge asks whether the worker's lines are scripted: yes, both sides are.** Say it plainly and
move to the thing that is not scripted — the engine, the verdicts, the deadline and the clock all
run live against the real model on every run, and they come out differently every time, which is why
this script never tells you what number will appear.

The silent worker is not a straw man. He chases the payment he rang about, asks for part of it this
week, pushes for a date straight after she says she was laid off, and closes with *"I'll put a note
on the file and someone will be in touch."* Every line is one a real worker says. He simply never
offers a repayment change and never mentions that hardship assistance exists.

---

## Before the judge arrives — three minutes, done once

> **Run it on the live URL, not localhost.** https://aufanhakim1920-source.github.io/the-hard-call/
> The rubric scores a localhost-only project lower, the live build talks to the deployed engine, and
> the report card prints the name of the model that judged it — locally that is a different model
> from the one the README publishes.

| # | Do | Why |
|---|---|---|
| 1 | Open the live URL in **Chrome or Edge**, full screen, and let it settle | First load fetches the fonts and the sounds. Other browsers have no speech engine — the replay still works, the microphone does not |
| 2 | **About → Delete everything on this device** → OK in the browser's own confirm dialog | An empty Calls list and an empty Deadlines tab, so the clock the demo creates is obviously new. The button shows the counts next to it |
| 3 | Check the top bar says **Assistant ready** | Grey or paused means the engine is not answering — see Fallbacks |
| 4 | **Settings → The assistant → Coaching during the call → OFF**, then close Settings | Run one is the bank as it is today. **Do this now, not on stage** — it is the only piece of slack in the ninety seconds |
| 5 | Land on the **Live call** tab with the setup row showing Sarah M. / home loan / Bank rang them | Where beat 1 starts |
| 6 | Keep the tab in front for the whole demo | A backgrounded tab gets no animation frames; the counters jump to their final value about a second late instead of counting up |

**If you are running it locally rather than on the live URL, `npm run api` must be running first.**
See Fallbacks.

---

## The run

Times are cumulative wall clock from the first click. **Press 2x the moment you click Replay — do
not wait for the first line.** The control appears as soon as the replay mode starts, and every line
already scheduled when you press it still runs at 1x.

Measured: pressing 2x straight away gives a **25.2 s** call and the times in the table below.
Pressing it after the first line appears — the natural thing to do — gives **27.7 s**, because the
first two gaps have already been set at full speed. That is 5 s across the two runs, and 5 s is the
difference between comfortable and rushed.

End to end, machine-driven with instant presses: **74.6 s**. Performed at human pace with the
coaching switch in the middle: **about 85 s**. Budget the full ninety and have the cut ready — if you
are running long, drop the pointing beats at 0:23 and 0:33. **Never cut the Calls beat at 1:16**; it
is the whole argument.

| At | You do | You say | What appears (measured) |
|---|---|---|---|
| 0:00 | Click **▶ Replay the demo call**, then **2x** | "A bank has twenty-one days to answer a hardship notice. The customer almost never says the word. Same call, handled two ways — this is the worker who was not told." | Transcript starts. Right column: **"Coaching is off for this call."** |
| 0:07 | — | "Sarah is behind on a home loan." | "Honestly, I'm a bit behind on everything" |
| 0:13 | — | "She has lost her job." | "Maybe. I got laid off last month" |
| 0:15 | Point at the worker's line | "And there is the miss — he asks for a date instead. In 2025 NAB was fined $15.5 million over 345 hardship notices answered late. This is what that looks like in one sentence." | "So when do you think you could pay the full amount?" |
| 0:23 | Point at the right column | "The assistant heard all of it and said nothing. That is coaching off — a bank can run it silent for a month to measure what it is missing." | Right column still the silent note. **0 sign cards, measured, every run** |
| 0:26 | Press **E** (or click **End call**) | "Call over." | Script finished at **25.2 s** |
| 0:30 | — | "Same call, graded. Read the fraction, not the number." | Report card in **3.0–3.8 s**. Lead line: **"The assistant ran silent on this call"**. A fraction like **2 of 3 signs answered**, at least one **MISSED** |
| 0:33 | Point at the missed row | "The one it missed is the legal one — the sentence that starts the clock. And it started the clock anyway: the deadline is on the bank's list whether or not anyone on the call noticed." | The legal row reads **MISSED · NOT ADDRESSED**, and **Reply due · 21 days** sits under ON THE CLOCK |
| 0:36 | **Settings → Coaching during the call → ON**, close, **Live call** | "Now the same customer, with the assistant coaching." | Fresh call screen. This switch is the slowest thing you do — about six seconds |
| 0:42 | Click **▶ Replay the demo call**, then **2x** | "Her words do not change. Watch the right column." | Transcript restarts |
| 0:51 | — | "About two seconds after she says it." | First sign card: **Customer sounds stressed**, at **9.0 s** into the replay |
| 1:02–1:07 | Read the legal card aloud when it lands | "There it is. It names the duty, the date the bank has to reply by, and the exact question to ask next — and he asks it while she is still on the phone." | Gold **LEGAL** card: **Reply due · [today + 21 days] · 21 days · National Credit Code s72**, and **Ask next: …**. It read Sun 4 Oct on 13 Sep; the date is computed, so it will read **Sun 5 Oct** on Monday |
| 1:09 | Press **E**, but only once the legal card is on screen | — | Script finished at **25.2 s** again |
| 1:12 | — | "Nothing missed." | Report card in **3.0–3.5 s**. Lead line: **"The assistant coached this call"**. **0 missed**, every run |
| 1:16 | Click the **Calls** tab | "Both calls, one axis. The engine did identical work in both runs. The only difference is whether the person on the phone was told in time to do anything about it." | **Two calls compared** — the two fractions on one scale, then the per-sign table: the legal row reads **coached HANDLED · silent MISSED** |
| 1:25 | Stop | — | — |

**⚠ Wait for the legal card before you press E on the coached run.** It landed at **20.0 s** on one
run and at **25.1 s and 25.3 s** on two others — that last one is *after* the final line of the
script. If it is not on screen yet, hold for two seconds. It has arrived on every run.

**The argument in one sentence, if you only get one:** *the engine did identical work in both runs;
the only difference is whether the person on the phone was told in time to do anything about it.*

---

## What is measured, and what varies

**Twelve runs on 13 Sep — seven coached, five silent, 1280 px.**

⚠ Measured on `npm run dev` against the local engine, which this machine's `.env` runs on
`gemini-2.5-flash`. The **live** function runs `gemini-flash-latest`. Every timing below is the
app's and does not depend on the model; the **verdicts and the score spread could move**. Run one
pair on the live URL before recording.

### What did not move

| | Coached | Silent |
|---|---|---|
| Sign cards on screen during the call | **4** | **0** |
| Signs recorded and judged | **4** | **3** |
| Signs missed | **0**, every run | **at least 1**, every run |
| The legal sign — the one that starts the clock | **HANDLED**, every run | **MISSED**, every run |
| Legal deadline created, Reply due today + 21 days, NCC s72 | yes | **yes — even with nothing on screen** |
| Script length at 2x | 25.2 s | 25.2 s |
| Report card after **End call** | 3.0–3.5 s | 3.0–3.8 s |

**That bottom-left cell is the demo.** Seven coached runs, five silent runs, and the statutory notice
was handled in every coached one and missed in every silent one. It is the only row that held
without exception, and it is the row the product is about.

### What moved, so never say it

| | Coached (7 runs) | Silent (5 runs) |
|---|---|---|
| Score | **95 twice · "not verified" five times** | **30, 30, 40, 40, 45** |
| Fraction | 4 of 4 twice · 3 of 4 five times | 2 of 3 three times · 1 of 3 twice |
| The stress and job-loss verdicts | HANDLED, every run | flipped between PARTLY and MISSED |
| The hardship-process prompt | HANDLED twice, UNVERIFIED five times | not raised |
| When the legal sign fires at 2x | 20.0 s, 25.1 s, 25.3 s | n/a, nothing on screen |

⚠ **The coached run usually has no score at all.** Five times out of seven it came back
**"— / 100 · NOT VERIFIED"**, because the hardship-process prompt could not be verified from the
transcript and the card withholds a score rather than inventing one. That is the product working as
designed — `scoreUnverified` exists on purpose — but it means **"look, 95 against 20" fails most of
the time.** Point at the fraction and the per-sign table. Never at the ring.

⚠ **The silent run always produced a number and the coached run usually did not**, so the two rings
side by side can read backwards. The Calls screen says this itself, in the page: *"The same script
does not score the same twice. Read the fractions and the verdicts below — not the gap between the
two numbers."* Let the app make the disclaimer and agree with it.

### Other measured facts

- **Replay line times at 2x**, from the click, with 2x pressed immediately: 1.1, 3.1, 5.1, 7.2,
  10.2, 12.7, 15.2, 17.7, 20.7, 23.2, **25.2 s**. At 1x the same eleven lines run to **49.8 s**.
- **Sign arrival, coached at 2x:** stress **9.0 s**, job loss **14.4–14.6 s**, hardship-process
  prompt **22.5–22.7 s**, the legal sign **20.0–25.3 s**. Each is 1.7–2.4 s after the line that
  caused it.
- **A typed sentence raises the legal sign in 2.7 s.** Card text, verbatim: *They cannot make
  repayments for a period · LEGAL · Reply due Sun 4 Oct · 21 days · National Credit Code s72 ·
  ASK NEXT "Would you like to talk about changing your repayment arrangements?"*
- **The reply-due date is computed, not canned** — always today + 21 days. It read Sun 4 Oct on
  13 Sep across all twelve runs.
- **The two cards are not counting the same signs.** Coached raises four, silent raises three. The
  extra one is the hardship-process prompt, and it only fires because the coached worker says the
  word — so it is a consequence of the coaching, not a rigged comparison. **The three signs both
  runs raise are identical**, the customer is identical, and the deadline is identical. The Calls
  screen prints the difference itself: *"These two calls did not raise the same signs (4 and 3), so
  the two scores are not counting the same things."* If a judge spots it before you do, you have
  lost the room — say it first.

---

## Known traps — all hit while rehearsing this

1. **The 2x control does not exist until the replay is running**, and every line already scheduled
   when you press it still runs at 1x. It appears the instant you click Replay, so press it in the
   same breath. Measured: pressed immediately, the call is **25.2 s**; pressed once the first line is
   on screen, **27.7 s**; not pressed at all, **49.8 s** — which does not fit twice into ninety
   seconds.
2. **The "who said it" box flips after every typed line.** Type one sentence as Customer and the box
   switches itself to Worker, so a second line typed straight after is attributed to the worker and
   **raises nothing** — correctly, because the engine only flags the customer. Measured: the
   hardship sentence entered as Worker produced 0 signs after 16 s; the identical sentence as
   Customer produced the legal sign in 2.7 s. **Check the box before you press Enter.**
3. **The hint under the transcript says "Watch line 7: the worker asks for money instead of
   answering the sign."** That is true of the silent run only. In the coached run line 7 is
   *"Take your time — what would make things easier right now?"* Do not read the hint aloud on the
   second run.
4. **Wait for the legal card on the coached run.** Measured at 20.0 s, 25.1 s and 25.3 s — the last
   two land at or after the final line.
5. **Entering a practice scenario and not speaking traps you on that screen.** End call is disabled
   with no lines and the Live call tab keeps showing the practice session; only a page reload
   escapes. Do not open Practice mid-demo unless you intend to talk.
6. **Delete everything on this device** opens the browser's own confirm dialog. Click OK; it does
   nothing without it.
7. **A backgrounded tab gets no animation frames.** The counters have a safety timeout and land on
   the right value about a second late, so nothing is wrong — but it looks like a stall. Keep the
   tab in front.
8. **Every sign is a model call.** Eleven lines is up to eleven calls plus one for the report. Two
   spare keys are armed on the live function. The deterministic detector that makes zero API calls
   is not on `main`, so **do not say on stage that the flagging cannot be rate-limited** until it is.

---

## Fallbacks

| If | Do |
|---|---|
| The **Calls** tab is missing (it is deployed, so this should not happen) | It is the newest screen and it may not be deployed. Fall back to the two report cards in sequence — press End, read the silent card, run the second call, read the coached card. The argument survives; you narrate the comparison instead of pointing at it |
| The top bar says **Assistant paused** | Finish the call anyway — the report card is still written from what is already known, marked `degraded`, with no invented score. Say plainly that the free-tier key is rate-limited. Honesty scores better than a stalled screen |
| The live URL is down | `npm run dev` at localhost, **with `npm run api` already running** — the local `.env` points the app at `localhost:8787`, and without that server every call falls back to the no-write-up card. Say it is the same build |
| A sign does not fire on a typed line | Check the **who said it** box first — see trap 2. Then send it again; a sign fires once per key, so it is safe to repeat |
| The coached card shows **NOT VERIFIED** | Expected, five times in seven. Point at **"3 of 4 signs answered, 0 missed"** and the per-sign rows. Say the card withholds a score it cannot verify from the transcript rather than inventing one — which is the same reason a judge should trust the numbers it *does* print |
| You are asked for the microphone | Skip it. The replay and the typed line go through the identical engine; the microphone only changes where the words come from |

---

## Two extra beats, for questions (about 20 seconds each)

**"Does it just fire on sad words?"** — Type this into a fresh call, as **Customer**:

```
Any chance we can push the payment back a couple of weeks? I get paid on the twentieth.
```

Measured 13 Sep: **nothing fires, after 13 seconds of waiting.** That is a timing gap, not a
statutory notice. Starting a hardship process the customer never asked for is the worst error this
system can make, so the legal test is a required duration field the model must report and
deterministic code decides on — not a phrase match.

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
   cites the worker line it was judged on, with its timestamp. On the silent card the missed legal
   sign quotes *"No worries, I'll put a note on the file and someone will be in touch."*

And say the honest sentence once more, because it is the one a judge who reads the repo will be
checking you against: **the worker's lines are scripted on both sides. The engine is not.**

The version that would prove it without a script is a live practice call — an ElevenLabs customer, a
real person answering, once with the signs and once without. That needs a microphone, a quiet room
and the ElevenLabs quota. **Not verified. Do not attempt it cold in front of a judge.**
