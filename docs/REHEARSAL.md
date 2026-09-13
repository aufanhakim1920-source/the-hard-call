# The rehearsal — the script performed against the running product

**13 Sep 2026, 06:02–06:12 UTC (4:02–4:12 pm AEST).** Both calls run end to end on the **deployed
site**, https://aufanhakim1920-source.github.io/the-hard-call/, build `index-sM-ROkVX.js`, engine
`gemini-flash-latest`.

**Why the deployed site:** `gh run list` shows the last *code* commit (`e2ab07b`, merge) built and
published green at 05:56:44 UTC in 41 s. The only commit after it is `18c98bc "log: update team log
[skip ci]"`, which carries `[skip ci]` and contains no application code. The live site is current.

⚠️ **The tab had a stale build cached.** The first load served `index-BjcZIDjv.js`, an asset that no
longer exists on the origin — fetching it returned GitHub's 404 page. One hard reload fixed it. **On
the morning, reload the live URL once before you trust what is on it.**

**How it was measured.** Every number below is `performance.now()` inside the page, zeroed on the
click of **▶ Play the demo call**, plus `performance.getEntriesByType('resource')` for every call to
the engine. Nothing is estimated. The browser pane was not compositing, so **no screenshot was taken
and no visual claim is made here** — every "what appeared" is read out of the live DOM.

---

## 1. The beat table — what the doc says against what happened

Times are cumulative on the doc's own clock: run 1 starts at 0:00, run 2 at 0:44.

### Run one — the silent call

| Doc beat | The doc says | What actually happened | Measured |
|---|---|---|---|
| 0:00 | Click Play, then **2x** | Both worked. The control is labelled **2×** under a **Speed** heading, `role="radio"`, `aria-label="2 times speed"` | 2× pressed at **+0.26 s** |
| 0:00 | Right column: **"Coaching is off for this call."** | Exact match, present from **+0.11 s**, before the first line | +0.11 s |
| 0:07 | "Honestly, I'm a bit behind on everything" | Exact | **0:07.2** ✅ |
| 0:13 | "Maybe. I got laid off last month" | Exact | **0:12.7** ✅ |
| 0:15 | "So when do you think you could pay the full amount?" | Exact — and it is genuinely **line 7**, so the hint under the transcript is honest | **0:15.2** ✅ |
| 0:23 | Silent note still there, **0 sign cards** | Confirmed. The sign column held one element for the whole call and it was the silent note | **0 cards, all 26.8 s** ✅ |
| 0:27 | Press **E** | Script finished at **0:26.8**, status line changed to *"script finished — end the call for the report card"* | **0:26.8** ✅ |
| 0:31 | Report card. Lead line **"The assistant ran silent on this call"**; every row MISSED | Card arrived. **The `/api/report` call took 5.0 s**, so the card is on screen at ≈0:32 — one second past the budget. See §4 for the lead-line wording | **0:32.0** ⚠️ |
| 0:34 | Every row **MISSED · NOT ADDRESSED**; **Reply due · 21 days** under ON THE CLOCK | 5 signs, all MISSED · NOT ADDRESSED ✅. ON THE CLOCK reads **REPLY DUE / Sun 13 Sep → Sun 4 Oct / 21 DAYS LEFT** — see §4 | — |
| 0:38 | Settings → Coaching ON, close, Live call — "about six seconds" | Done, but by script. **The six seconds is not verified** — a machine click is not a human reaching for a toggle | not timed by hand |

Silent card, as printed: score **10**, **5 MISSED**, *"0 of 5 signs answered, 5 missed."*, one
obligation on the clock, **reply due Sun 4 Oct** (today + 21).

### Run two — the coached call

| Doc beat | The doc says | What actually happened | Measured |
|---|---|---|---|
| 0:44 | Click Play, then 2x | Both worked; transcript restarted from an empty screen | 2× at **+0.26 s** |
| 0:49 | First sign card: **Customer says things are tight** | Card arrived, titled **"Customer mentions things are tight"** — see §4 | **0:50.3** (+1.3 s) |
| — | (not in the doc) | Second card **"Customer was laid off"** | 0:59.7 |
| — | (not in the doc) | Third card **"Customer sounds stressed"** | 1:04.1 |
| 1:05 | Gold **LEGAL** card | Arrived, titled **"Needs reduced payments for months"**, reading **REPLY DUE / Sun 4 Oct / 21 days left / under National Credit Code s72 / ASK NEXT "Would pausing or reducing payments for three months give you some breathing room?"** | **1:09.7 — 4.7 s late** ⛔ |
| 1:12 | Press E, but only once the legal card is up | Script finished at **1:10.8**. The legal card beat it by **1.1 s** | margin **1.1 s** ⚠️ |
| 1:16 | Report card. Lead **"The assistant coached this call"**, **0 missed** | Card arrived; `/api/report` took **3.1 s** | **1:13.9** ✅ |
| 1:20 | **Calls** tab → **Two calls compared**, legal row coached HANDLED · silent MISSED | Heading reads **TWO CALLS COMPARED**. Legal row is the **first** row: *Needs reduced payments for months · LEGAL · coached HANDLED · silent MISSED* ✅ | board rendered **1.2 s** after the click |

Coached card, as printed: score **85**, **0 MISSED**, *"4 of 4 signs answered, 0 missed."* — 3
HANDLED, 1 PARTLY (*Customer mentions things are tight*). Legal sign **HANDLED**. Reply due Sun 4 Oct.

**The compare board picked the right pair on its own**, newest coached against newest silent, out of
8 calls on the device. It also prints its own honesty line: *"These two calls did not raise the same
signs (4 and 5), so the two scores are not counting the same things."*

**This run is an eleventh data point for the deployed-engine table and it agrees with it exactly:**
coached 4 signs / 0 missed / legal HANDLED, silent 5 signs / 5 missed / legal MISSED, and the
floating `inform-hardship-provisions` sign fired on the **silent** side (*"Let them know hardship
help exists"*), as `DEMO-SCRIPT.md` predicts for the deployed engine.

---

## 2. The real total: **about 1:33**, not 88 seconds

The 88 s budget is not wrong about the *product*. It is wrong about **one spoken line**.

**Machine time, measured end to end: 62.9 s** — replay 26.8 + report 5.0 + replay 26.8 + report 3.1
+ board 1.2. That leaves 25 s of the 88 for talking and the settings switch, which is enough.

Where it goes over:

| | Doc | Measured | Slip |
|---|---|---|---|
| Legal card lands | 1:05 | **1:09.7** | **+4.7 s** |
| Silent report card lands after E | 4 s | **5.0 s** | +1.0 s |
| Everything else | — | — | on or ahead of budget |

The 4.7 s matters because **the line at 1:05 is the longest in the pitch** — 28 words, about 9
seconds spoken. Started when the card actually lands, it runs to **1:18.7**, which pushes E to 1:19,
the coached card to 1:22, the Calls click to 1:24 and the closing 28-word line to **≈1:33**.

**Three ways to land on 1:28, pick one before Monday:**

1. **Shorten the 1:05 line.** "There it is — the duty, the reply date, and the question he asks while
   she is still on the phone" is 19 words, ≈6 s, and finishes at 1:16.
2. **Move the beat to 1:10** in both documents and cut the closing line by a third.
3. **Press E before the line, not after it.** The card is already on screen; ending the call does not
   remove it, and the report is then being fetched while you talk.

⚠️ **The 1.1 s margin between the legal card and the end of the script is the single most fragile
number in the demo.** One slow `flags` call — the slowest measured today was 3.67 s against a median
of 2.38 — and the card lands *after* the script finishes, with the presenter holding an empty column.
`DEMO-SCRIPT.md` already warns to hold for two seconds. It is right, and it is not optional.

---

## 3. The 2× control and the cold start

**2× exists and works.** `demoScript.ts` sums to 52 s of gaps at 1×; both runs finished at **26.8 s**
— exactly half, both sides, pressed 0.26 s after Play. The doc's "about 27 s per call" is right to
the tenth. It appears only once the replay is running, as trap 2 says.

**Cold start could not be reproduced — the function was already warm.** The first `flags` call I made
returned in **2.51 s**, the next two in 2.89 and 2.61. Nothing in 30 requests came close to the
13.4 s in the doc.

| | Measured today |
|---|---|
| `flags` calls | **27** — 3 probes, then **exactly 12 per replay**, both runs |
| `flags` latency | min **1.89 s** · median **2.38 s** · max **3.67 s** |
| `/api/report` | **5.00 s** (silent) · **3.06 s** (coached) |
| `/api/health` | 213 ms |

Two things follow.

- **The advice to warm the engine stays.** I cannot show it is unnecessary — I can only show the
  function was warm at 4 pm on a day the team had been hammering it. Nothing here contradicts the
  13.4 s measurement, and the fix costs one run.
- **"Steady state is 1.6–3.0 s" is now slightly optimistic.** Measured band today: **1.9–3.7 s**.
  Twelve calls at a 2.4 s median is what the replay actually absorbs.

**PITCH's network claim is exactly right and a judge can check it:** 12 transcript lines produced
**12** `flags` calls plus **1** `report` call, both runs, no more and no fewer.

---

## 4. Every place a document names something the screen does not

Quote from the doc, then the exact text on screen. **These are corrections to make; nothing here was
edited.**

### ⛔ 1. The wipe no longer uses the browser's confirm dialog

- `DEMO-SCRIPT.md` pre-flight row 2: *"**About → Delete everything on this device** → OK in the
  browser's own confirm dialog"*
- Trap 7: *"**Delete everything on this device** opens the browser's own confirm dialog. Click OK; it
  does nothing without it."*

**Both are wrong.** `window.confirm()` was deliberately removed — the comment in
`src/components/About.tsx` says so. The control is now two in-page buttons: **"Delete everything"**
arms it (and turns into **"Keep it all"**), then **"Delete everything on this device"** appears below
and does the wipe. No OS dialog appears at any point.

**Correction:** *About → **Delete everything** → **Delete everything on this device**. Two buttons in
the page; there is no browser dialog.* A presenter waiting for a Chrome prompt will think the first
click failed.

*(Not exercised — I did not wipe the device, so eight calls and seven deadlines were already in the
list when I started. The compare board still picked the correct pair.)*

### ⛔ 2. "The one at the bottom is the legal one" — it is not

- `DEMO-SCRIPT.md` 0:34 and `PITCH.md` 0:34: *"the one at the bottom is the legal one, the sentence
  that starts the clock."*

On the silent card the five rows print in this order:

1. Things have been a bit tight
2. Customer was laid off
3. Customer feels very stressed
4. **Needs months without full payment** ← the legal one
5. Let them know hardship help exists

**The bottom row is the hardship-process prompt, not the statutory notice.** A presenter pointing at
the bottom row while saying "that is the legal one" is pointing at the wrong row, in the beat the
whole pitch rests on.

**Correction:** *"the fourth one — **Needs months without full payment** — is the legal one."* Or,
safer given the wording moves between runs: *"the one that names the months is the legal one."*

### ⚠️ 3. The "lead line" is the second paragraph, on both cards

- `DEMO-SCRIPT.md` 0:31: *"Lead line: **'The assistant ran silent on this call'**"*
- `DEMO-SCRIPT.md` 1:16: *"Lead line: **'The assistant coached this call'**"*

Both sentences exist, word for word, but neither leads. What leads is the count:

- silent: *"Not one of the 5 signs raised on this call was answered. One is a legal obligation — a
  reply is due Sun 4 Oct, 21 days from this call, and the worker never addressed it."*
- coached: *"All 4 signs raised on this call were answered while it was still live. The legal one was
  answered too — a reply is due Sun 4 Oct, 21 days from this call."*

**Correction:** call it the *second* line, or better, point the presenter at the lead sentence, which
is stronger — it names the deadline out loud without quoting a score.

### ⚠️ 4. The first coached card is titled "mentions", not "says"

- `DEMO-SCRIPT.md` 0:49: *"First sign card: **Customer says things are tight**"*
- On screen: **"Customer mentions things are tight"**

Same on the compare board and the report card.

### ⚠️ 5. "Reply due · 21 days" is not a string on the card

- `DEMO-SCRIPT.md` 0:34: *"**Reply due · 21 days** sits under ON THE CLOCK"*
- On screen, under **ON THE CLOCK**: `REPLY DUE` · `Needs months without full payment` · `Sun 13 Sep`
  → `Sun 4 Oct` · `21` `DAYS LEFT`, then the sentence *"Reply due Sun 4 Oct, 21 day window from this
  call."*

Right in substance, wrong as a quotation. **Correction:** *"REPLY DUE, Sun 4 Oct, 21 days left."*

### ⚠️ 6. The legal card says "21 days left", not "21 days"

- `DEMO-SCRIPT.md` 1:05: *"**Reply due · [today + 21 days] · 21 days · National Credit Code s72**"*
- On screen: `REPLY DUE` / `Sun 4 Oct` / `21 days left` / `under National Credit Code s72` / `ASK NEXT`

Everything the doc promises is there. Only the punctuation and "left" differ.

### ⚠️ 7. The report card is taller than the doc says

- `DEMO-SCRIPT.md`: *"the card is **2005–2226px** tall"*
- Measured at 1280×720 on the silent card: **2271 px**.

45 px past the top of the stated range. It does not change the advice — say the claim, then scroll
once — but the range is now stale and will drift again.

### ✅ What matched exactly

- `Assistant ready` in the top bar; setup row **Sarah M. / home loan / Bank rang them**
- `▶ Play the demo call`, `End call`, the **E** shortcut, `Settings → THE ASSISTANT → Coaching during
  the call`
- **"Coaching is off for this call."** in the right column, and 0 cards for the whole silent call
- The silent hint **"Watch line 7: the worker asks for money instead of answering the sign."** — and
  line 7 really is the worker asking for money (trap 4's fix holds)
- **TWO CALLS COMPARED**, and the legal row reading coached HANDLED · silent MISSED
- The reply-due date computed as today + 21 = **Sun 4 Oct**, identical on the live card, both report
  cards and the Deadlines row
- Every fraction the doc refuses to promise moved exactly as it says it would

### Undocumented, and worth knowing

The **Settings** tab grows a **`1`** badge while coaching is off, and loses it when coaching is back
on. That is a free, glanceable check that run one is actually set up right — better than opening
Settings to look. Neither document mentions it.

---

## 5. What I could not check

- **Anything visual.** The browser pane was not compositing: no screenshot was taken. Every claim
  above is DOM text and a clock, not a look at the page. **The layout, the gold on the legal card and
  the score ring have not been seen in this pass.**
- **The 13.4 s cold start.** The function was warm before I touched it. I cannot say the warm-up
  advice is unnecessary; I can only say it did not bite today.
- **The six-second settings switch** at beat 0:38 — clicked by script, not by a hand.
- **The wipe itself.** Verified as two buttons in the DOM and in the source; not executed, because it
  would have destroyed the other calls on the device.
- **The coached transcript hint** (*"Watch what the worker does the moment each sign lands."*) —
  confirmed in `CallScreen.tsx`, not read off the screen.
- **The two Q&A beats** (the "push the payment back two weeks" line and the About page) and the
  **30-second version**, including its claim that the typed sentence fires the detector with no API.
  The same sentence *through the model path* raised 1 sign in 2.5 s; the no-key path was not
  exercised.
- **Practice mode** — not opened. The ElevenLabs quota is exhausted and starting a session was out of
  scope.
- **A human at 1× on a projector.** Everything here was 2× in one tab at 1280×720.
