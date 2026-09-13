# The card — hold this while you demo

One page. The words to say are verbatim; the deep versions are `docs/DEMO-SCRIPT.md` (why every
number is what it is), `docs/PITCH.md` (the arithmetic and the five questions) and `docs/JUDGE.md`
(what a judge actually did with it).

**https://aufanhakim1920-source.github.io/the-hard-call/**

---

## Before you stand up — four things, three minutes

1. **Hard-reload the live URL** (Ctrl+Shift+R) in Chrome or Edge, full screen.
2. **About → Delete everything → Delete everything on this device.** Two in-page buttons, no browser
   dialog. The list must be empty so the clock you create is obviously new.
3. **Settings → The assistant → Coaching during the call → OFF.** Check without opening Settings: the
   **Settings** tab carries a **1** badge while coaching is off.
4. Top bar says **Assistant ready**. Run one throwaway call to warm the engine — the first call after
   idle has been measured at 13.4 s against a steady 1.9–3.7 s.

Keep the tab in front the whole time. A background tab gets no animation frames.

---

## The run — 90 seconds

| At | You do | You say |
|---|---|---|
| 0:00 | Click **▶ Play the demo call**, then **2x** straight away | "Same call, handled two ways. CallFlag listens, and puts the reply-due date and the next question on the worker's screen while the customer is still on the phone." |
| 0:09 | — | "Under the National Credit Code a hardship notice can be **spoken**. She never says the word, and the twenty-one days start when she speaks." |
| 0:17 | Point at the worker's line | "He asks for a date instead. In August 2025 ASIC penalised NAB and AFSH Nominees $15.5 million — 345 customers gave notice, and never got an answer in time." |
| 0:25 | Point at the right column | "The assistant heard all of it and said nothing — coaching is off." |
| 0:29 | Press **E**. **Say nothing** | — |
| 0:34 | Report card lands | "Graded. Nothing handled — the legal one included. The clock started anyway." |
| 0:37 | **Settings → Coaching → ON**, close, **Live call**. Talk over the switch | "Now the same customer, with the assistant coaching." |
| 0:43 | **▶ Play the demo call**, then **2x** | "Her words do not change. Watch the right column." |
| 0:50 | First sign card | "About two seconds after she says it." |
| 0:52–1:09 | **Nothing. Watch it with the room** | — |
| 1:09 | The gold **LEGAL** card lands — read it aloud | "There it is — the duty, the reply date, and the question he asks while she is still on the phone." |
| 1:15 | Press **E**, only once that card is on screen | — |
| 1:18 | Report card | "Nothing missed." |
| 1:19 | Click **Calls**, start talking on the click | "The engine did identical work in both runs. The only difference is whether the person on the phone was told in time to do anything about it." |

**If the legal card is late at 1:09, say this, then wait in silence:**

> "Every card on that screen is a live call to the model — nothing here is a recording."

Never describe a card that is not on screen. A two-second pause reads as confidence.

**Never point at "the one at the bottom".** The legal row is fourth of five. Point at the row under
**ON THE CLOCK**, or do not point.

**Read the fractions off the screen, not off this page.** The number of signs moves between runs. The
direction is the claim: nothing missed when coached, nothing handled when silent.

---

## If the slot is cut to 30 seconds

Do not compress two calls. Put this sentence on the clipboard **before you stand up** and paste it —
never type it live.

> *I can't make the repayments, not this month and not for a good few months after that.*

1. "Under the National Credit Code a hardship notice can be **spoken**. The bank's twenty-one days
   start when the customer says it."
2. Paste as **Customer** (check the *who said it* box), Enter. "One sentence, live."
3. Card lands. "The duty, the reply date, and the question to ask next. That date is computed — today
   plus twenty-one days."
4. Click **Calls**. "Same call, run twice — once with that on screen, once with it hidden. Nothing
   was missed on the coached side, and nothing was handled on the silent side, including the notice
   that starts the clock."
5. Point at the legal row. "That row is the argument."

**Prep for this version is different: run both calls a few minutes before and leave them in the Calls
list. Do not wipe the device** — the second half of this version *is* the Calls list.

---

## The five questions, one line each

1. **"Is this scripted?"** — Both workers are scripted and written down as a dramatisation. The
   engine, the verdicts, the deadline and the clock are not: twelve live backend calls per replay,
   plus one for the report card. Offer them the network tab.
2. **"How accurate is it?"** — 44 labelled utterances: precision 1.00, zero false flags, recall 0.72.
   It misses rather than invents, on purpose, because a false legal duty is worse than a missed
   prompt.
3. **"What does it cost, and what if the model is down?"** — One model call per finished customer
   sentence plus one for the card. If the model is unavailable the card still comes, marked
   `degraded`, with no invented score.
4. **"What would a bank have to change?"** — Coaching-off is the adoption path, not a demo trick. It
   runs on the call the bank already takes; account numbers are masked before a word leaves the
   browser, and nothing that classifies the customer is stored.
5. **"Can you show the practice voice agent?"** — Not live: the free plan allows 15 minutes a month.
   The mode is in the build and in the video.

---

## If something breaks

| If | Do |
|---|---|
| **Assistant paused** in the top bar | Finish the call anyway. The card is still written, marked `degraded`. Say plainly the free-tier key is rate-limited — honesty scores better than a stalled screen |
| The **Calls** tab is missing | Read the two report cards in sequence instead and narrate the comparison |
| The live URL is down | `npm run dev` at localhost with a **freshly restarted** `npm run api`. Say it is the same build |
| A card reads **NOT VERIFIED** | Point at the per-sign rows. It withholds a score it cannot verify rather than inventing one |
| A typed line raises nothing | Check the **who said it** box says Customer. Then send it again — a sign fires once per key, so repeating is safe |
| Asked for the microphone | Skip it. The replay and the typed line go through the identical engine |

**The argument in one sentence, if you only get one:** the engine did identical work in both runs;
the only difference is whether the person on the phone was told in time to do anything about it.
