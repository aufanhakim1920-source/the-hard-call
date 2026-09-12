# The 90-second demo

The exact sequence to perform in front of a judge, with what to say over each beat.

Every timing below was measured by running it on the live app on 12–13 Sep. Where a number
varies between runs, it says so. Nothing here is estimated.

> **Run it on the live URL, not localhost.** https://aufanhakim1920-source.github.io/the-hard-call/
> The rubric scores a localhost-only project lower, and the live app talks to the deployed engine.

---

## Before the judge arrives — two minutes, done once

| # | Do | Why |
|---|---|---|
| 1 | Open the live URL in **Chrome or Edge**, full screen | Other browsers have no speech engine; the replay works anyway, the microphone does not |
| 2 | **About → Delete everything on this device** → OK in the browser's own dialog | Starts with an empty Deadlines tab, so the clock the demo creates is obviously new |
| 3 | Load the page once and let it settle | First load fetches the fonts and the sounds |
| 4 | **Settings → The assistant → Coaching during the call → OFF** | Run one is the bank as it is today |
| 5 | Check the top bar says **Assistant ready** | Grey or "paused" means the engine is not answering — see Fallbacks |
| 6 | Have the typed line on the clipboard (beat 6 below) | Saves eight seconds of typing in front of someone |
| 7 | Keep the tab in front for the whole demo | A backgrounded tab freezes the animations and the report numbers sit at 0 for a second |

---

## The run

Times are cumulative wall clock from the first click. The replay is fixed at real speed and
takes **49.6 s** — that is the spine of the demo and it cannot be shortened (see *Known traps*).

| At | You do | You say | What appears (measured) |
|---|---|---|---|
| 0:00 | Click **▶ Replay the demo call** | "A bank has 21 days to answer a hardship notice. The customer almost never says the word. This is a real call played through the live engine — nothing is pre-flagged." | Transcript starts. Right column: **"silent this call"** |
| 0:06 | — | "Sarah is behind on a home loan. Listen for the moment the law starts." | "Things have been a bit tight lately" |
| 0:14 | — | "That is the phrase people actually use." | "Honestly, I'm a bit behind on everything" |
| 0:25 | — | "She has lost her job." | "Maybe. I got laid off last month" |
| 0:30 | Point at the worker's line | "And there is the miss. He asks for the full amount. In 2025 NAB was fined $15.5 million over 345 hardship notices answered late — this is what that looks like in one sentence." | "So when do you think you could pay the full amount?" |
| 0:35 | Point at the right column | "The assistant has heard all of it and said nothing. That is coaching off — a bank can run it silent for a month to measure what it is missing." | Right column still **silent** — **0 sign cards, measured** |
| 0:50 | Press **E** (or click **End call**) | "Call over." | Script finished |
| 0:55 | — | "Same call, graded. It caught three signs the worker never saw, and it started the 21-day clock anyway." | Report card: **3 signs caught**, the legal one with **Reply due (today + 21 days)**, the missed line quoted back with its timestamp |
| 1:05 | **Settings → Coaching during the call → ON**, then click the **Live call** tab | "Now the same customer, with coaching on." | Fresh call screen |
| 1:12 | Paste the line below into the type box, press Enter | "This is the sentence the microphone would have heard." | — |
| 1:16 | Read the gold card aloud | "Three seconds. It names the duty, the date the bank has to reply by, and the exact question to ask next. He asks it while she is still on the phone." | Gold **LEGAL** card — **"Reply due · 21 days · National Credit Code s72"** and **"Ask next: …"**. Measured **2.9 s and 3.7 s** on two runs |
| 1:22 | Click the **Deadlines** tab | "And the clock is on the bank's list, with the date, before anyone hangs up." | One row: the date, "21 days left", the customer |
| 1:30 | Stop | — | — |

**The line to paste at 1:12:**

```
I lost my job last month and I can't make the repayments, not this month and not for a few months.
```

**The argument in one sentence, if you only get one:** *the engine did identical work in both runs —
the only difference is whether the person on the phone was told in time to do anything about it.*

---

## What is measured, and what varies

Measured on the live app, three full runs of the scripted call:

| | Coaching **off** | Coaching **on** |
|---|---|---|
| Sign cards on screen | **0** | **3** |
| Signs recorded and judged | **3** | **3** |
| Legal deadline created | yes | yes |
| Score | 78, 75 | 78 |

- **The sign lands about 3 seconds after the sentence.** Measured end to end in the browser against
  the deployed function: 2.99 s and 3.06 s during the replay, 2.92 s and 3.75 s typed.
- **The report card appears 3.7–6.8 s after End call** (three runs). Say "a few seconds", not a number.
- **Do not promise a score.** The same scripted call returned **78, 78 and 75**, and the deliberate
  miss on line 7 was judged **partly** twice and **missed** once. The model writes the judgement; the
  counts, the deadline and the duration are computed in code and did not move.
- **The reply-due date is computed, not canned.** It read Sat 3 Oct before midnight and Sun 4 Oct
  after — always today + 21 days.
- Replay line times, from the click: 1.6, 5.6, 9.6, 13.6, 19.6, 24.6, 29.6, 34.6, 40.6, 45.6, 49.6 s.
  With coaching on, the job-loss tip appeared at **27.6 s** and the legal sign plus the stress tip at
  **37.7 s**.

---

## Known traps — all hit while rehearsing this

1. **The 2× speed button does nothing once the replay has started.** The whole script is scheduled
   the moment the replay begins, and the speed control only exists after that. Measured: line times
   with 2× clicked are identical to 1×. Plan for 49.6 s, or fix it before Monday.
2. **Entering a practice scenario and not speaking traps you on that screen.** End call is disabled
   with no lines, and the Live call tab keeps showing the practice session. The only way out is a
   page reload. Do not open Practice mid-demo unless you intend to talk.
3. **Every sign is a model call.** Eleven lines is eleven calls, plus one for the report. The
   deterministic detector that makes zero API calls is **not merged yet** (PR #3), so on Monday's
   build the flags can still be rate-limited. Two spare keys are armed on the live function. Do not
   say on stage that the flagging cannot be rate-limited until that branch lands.
4. **Delete everything on this device** opens the browser's own confirm dialog. Click OK; it does
   nothing without it.
5. **A backgrounded tab freezes the report numbers at 0** for a second until the fallback fires.
   Keep the tab in front.
6. **The report card does not say the call ran silent.** The Settings panel claims it does. The
   operator has to say it — or it gets fixed before Monday.

---

## Fallbacks

| If | Do |
|---|---|
| The top bar says **Assistant paused** | Finish the call anyway — the report is still written, and say plainly that the free-tier key is rate-limited. Honesty scores better than a stalled screen |
| The live URL is down | Same demo on `npm run dev` at localhost:5173 with `npm run api` running; say it is the same build |
| A sign does not fire on the typed line | Type it again — it is one call, and it is idempotent (a sign fires once per key) |
| You are asked for the microphone | Skip it. The replay and the typed line both go through the identical engine; the microphone only changes where the words come from |

---

## Two extra beats, for questions (about 20 seconds each)

**"Does it just fire on sad words?"** — Type this into a fresh call:

```
Any chance we can push the payment back a couple of weeks? I get paid on the twentieth.
```

Measured: **nothing fires, after 9 seconds of waiting.** That is a timing gap, not a statutory
notice. Starting a hardship process the customer never asked for is the worst error this system can
make, so the legal test is a required duration field the model must report and code decides on — not
a phrase match.

**"What about privacy?"** — Open the About page. Words are never stored; a flag points at the
transcript by speaker and timestamp instead of copying it; card, account, BSB, TFN and Medicare
numbers are masked in the browser before a sentence is sent. The adjudicator's response schema has
no field for *why* the customer cannot pay, so the model cannot return one.

---

## If you get two minutes instead of ninety seconds

Run the replay **twice** — coaching off, then coaching on — and show both report cards. Be honest
about what the second run proves: the worker's words are scripted, so both reports come out the
same. The comparison is what the person on the phone could see while it was happening, not two
different scores. Claiming the second call went better because of the coaching would be a claim this
demo cannot support, and a judge who reads the repo will find the scripted call.

The version that *would* prove it is a live practice call: an ElevenLabs customer, a real person
answering, once with the signs and once without. That needs a microphone, a quiet room and the
ElevenLabs quota — **not verified, do not attempt it cold in front of a judge.**
