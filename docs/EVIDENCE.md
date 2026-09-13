# Evidence

Raw material for the film, and the final pre-submission sweep. Written by the verifier on
13 Sep 2026, 10:00–11:10 AEST. **Nothing here was fixed — this file reports.**

Plates live in [`docs/evidence/`](evidence/). Every number below was measured, not estimated;
where something could not be measured it says so in [What could not be checked](#what-could-not-be-checked).

---

## How this was measured

The Browser pane could not do this job: it stops compositing when hidden, so `requestAnimationFrame`
never fires, a screenshot at default scale silently resets the emulated viewport, and clipped
captures hang. So the whole pack was taken in a **real headless Chrome 152 driven over the DevTools
Protocol** from a throwaway profile — which also means every run started from genuinely empty
storage.

| | |
|---|---|
| Chrome | 152.0.7977.83, `--headless=new`, fresh profile per run |
| App | `http://localhost:5173` (the running dev server), talking to the **deployed** Supabase function |
| Frames | 2× device pixel ratio. Full frames are 2560×1440 at 1280×720; element crops are 4× |
| Settings | app defaults (`coaching: true`, text size 0, dark ground) unless a plate says otherwise |
| Motion | sampled only **after entrances finished**; the frozen-frame tests pause every animation and seek it to `currentTime = 0` |

**Tree state.** Gates were run at `8839c52`. The captures were taken against the working tree
between 10:12 and 11:05, which at the time included the then-uncommitted `CallHistory.tsx` and
`call-history.css` (since landed). `main` moved three times during the run — it is now `1887450`.
A concurrent session was editing the repo and using the shared browser tab throughout.

### Three instrument traps, paid for here so nobody pays again

1. **A default-scale screenshot in the Browser pane resets the viewport.** Set 1280×720, measured
   1280×720, took one screenshot — the tab was then emulating 1100×1750 and the next measurement
   was wrong. Scaled screenshots inside a batch keep the size.
2. **`Page.captureScreenshot` with `clip` + `captureBeyondViewport` never returns.** Not slow —
   no response at all in 150 s. Size the viewport to contain the element and clip inside it.
3. **A screenshot can restart a canvas animation.** Two report-card plates were first captured
   2.6 s after opening the card and still showed the score ring mid-count (58 of a true 85, and a
   partial count of a true 10) because the preceding element capture restarted it. Every plate here
   is now taken only after the ring's printed number equals its own `aria-label` value.

---

# Job 1 — the evidence pack

## 1. The sign card, the instant a legal sign fires

**Plates:** `coached-01-sign-fires-frame.png` (whole screen) · `coached-02-sign-card.png` (the card)

A coached replay of the demo call, run through the real engine. Nothing pre-flagged.

| | |
|---|---|
| **Wall-clock second of the call** | **00:36** (36.80 s after the replay started) |
| Obligation | "Customer cannot meet repayments" |
| Reply due | **Sun 4 Oct** · **21 days left** |
| Statute | National Credit Code s72 |
| Ask next | *"What changes to your repayments would help right now?"* |
| Evidence quoted | *"I don't know. I'm really stressed about all of it."* |
| Frame at capture | header clock reads **00:37**, "End call" in view, 4 signs open |

Every sign in that run, with the call clock at which it appeared:

| at | kind | sign | carries |
|---|---|---|---|
| **00:07** | tip | Customer says things are tight | *"How can we help with your repayments?"* |
| **00:26** | tip | She lost her job | *"How has that affected things for you?"* |
| **00:36** | **legal** | **Customer cannot meet repayments** | **Sun 4 Oct · 21 days · NCC s72** |
| 00:36 | tip | Customer sounds stressed | *"It sounds like a lot is going on…"* |
| 00:42 | tip | Worker mentioned hardship process | — |

Script finished at 52.75 s; 5 cards on screen at 00:56.

## 2. The report card, both versions

**Plates:** `report-coached-top.png` · `report-silent-top.png` (same viewport, 1280×1100 at 2×, so
they sit side by side) · `report-coached-full.png` · `report-silent-full.png` ·
`report-lead-coached.png` · `report-lead-silent.png` (the lead alone, identical crops)

One customer, one script, two workers. Both cards judged by the deployed engine.

| | coaching **on** | coaching **off** |
|---|---|---|
| Sign cards on screen during the call | **5** | **0** (measured at 00:56) |
| Signs judged | 5 | 4 |
| Answered | **5 of 5** (4 handled, 1 partly) | **0 of 4** |
| Missed | **0** | **4** |
| The statutory notice | **handled** | **missed** |
| Score | 85 | 10 |
| Deadline created | yes — 2026-10-04 | yes — 2026-10-04 |
| Call length | 0:57 | 0:58 |

**The leads differ in the first second**, which is the thing that was broken and is now fixed. Both
lead blocks are 57 px tall and carry a single large figure in a state colour:

- coached — **0 MISSED** in green: *"All 5 signs raised on this call were answered while it was
  still live. The legal one was answered too — a reply is due Sun 4 Oct, 21 days from this call."*
- silent — **4 MISSED** in salmon: *"Not one of the 4 signs raised on this call was answered. One is
  a legal obligation — a reply is due Sun 4 Oct, 21 days from this call, and the worker never
  addressed it."*

## 3. The 21-day clock

**Plates:** `clock-02-21day-live.png` (running) · `clock-03-21day-overdue.png` (**overdue**) ·
`clock-04-overdue-greyscale.png` · `clock-01-deadlines.png` (the Deadlines page)

| | running | overdue |
|---|---|---|
| Row | `rv-dl-row` | `rv-dl-row overdue` |
| Reading | **21 DAYS LEFT** | **5 DAYS OVERDUE** |
| Axis | Sun 13 Sep → Sun 4 Oct | Tue 18 Aug → Tue 8 Sep |
| Bar length | **452 px of a 452 px track** | **452 px of a 452 px track** |
| Fill | flat gold tint, `rgba(199,156,90,0.14)` | the same tint **plus a 135° hatch**, `rgba(199,156,90,0.55)` every 4 px |

**The overdue hatch has now been seen.** It had never rendered in the app's life, because past the
due date "time left" computes to zero and the bar drew 0 px. It now draws the full window, hatched.

⚠️ **How the overdue row was produced.** A fresh device cannot make one — every demo deadline is 21
days in the future. A third report was written into local storage with its call dated 26 days ago
and its deadline 5 days ago; **nothing else was changed**, and the row, the hatch and the "5 days
overdue" reading are the app's own output from that date. Say so if the plate is used.

One limitation, visible in the plate: the "today" marker is clamped to the deadline
(`elapsed = min(total, …)`), so on an overdue row it sits exactly on the due date rather than past
it. The axis ends at the deadline, so there is nowhere else to put it.

## 4. The compare board — the same call run twice

**Plates:** `compare-01-board.png` (colour) · `compare-03-board-greyscale.png` ·
`compare-02-board-frame.png` (in the page)

Both bars on one axis, so 5 signs against 4 is a length rather than a ratio hidden in two bars
stretched to the same width.

| | coached | silent |
|---|---|---|
| Bar | 860 px | 688 px |
| Single segment | `rv-seg answered`, 860 px | `rv-seg missed`, 688 px |
| Background | `rgba(199,156,90,0.14)` — a tint, `background-image: none` | **`rgb(220,179,115)` solid + `repeating-linear-gradient(45deg, rgb(28,31,36) 0–2px, transparent 2–6px)`** |
| Height | 16 px | 16 px |
| Reading | 5 OF 5 ANSWERED · SCORE 85 | 0 OF 4 ANSWERED · SCORE 10 |

**The greyscale plate settles the claim.** With `filter: grayscale(1)` on the root, the coached bar
is an outlined, near-empty channel and the silent bar is a bold hatched slab. They are told apart by
**texture, not hue** — the difference survives with every colour removed. The `ANSWERED` / `MISSED`
key survives too, because its swatches carry the same fill. The verdict chips below
(HANDLED / PARTLY / MISSED) lose their colour difference in greyscale and are carried by their words
alone, which is legible but is the weakest part of the picture.

---

## Before and after, with the numbers

Pairs a film can show. Sources: `docs/DECISIONS.md` for the before, this run for the after.

| what | before | after | checked here |
|---|---|---|---|
| Carried row's opacity through its own 340 ms trip | **0.45** at all five sample points | **1** at all five | — |
| Ink-on-gold surfaces on the light ground | **2.18:1**, 23 colours | **6.56:1** | ✅ 0 failures in 1,929 nodes |
| Contrast sweep run mid-entrance | **11 phantom failures**, two at ratio 1.00 | measure after entrances settle | ✅ `midEntrance = 0` in all 32 sweeps |
| Report card's split bar | inflated from zero, held **"0 of 4" for 820 ms** | true on frame one | ✅ **860 px** with `rAF` removed |
| Answer-time bars | **0 px of a 200 px bar at t=0**, indefinitely in a frozen tab | arrive by transform | ✅ 0 zero-length bars, all screens |
| Deadline bar in a non-compositing tab | **0 px**, reading "no time left" | **452 px** at t=0 | ✅ 452 px with `rAF` removed |
| Overdue deadline | **0 px** — the hatch had never rendered | **452 px of hatch** | ✅ plate `clock-03` |
| Active-tab underline, frozen | **width 0** — section carried by colour alone | width 46 | ⚠️ width **48**, but see finding 2 |
| View container entrance | `translateY(6px)` frozen → **6 px of vertical scroll** clipping the footer at 1280×720 | entrance deleted | ✅ docH **720** = vh 720, vScroll **0** |
| Phone bottom sheet, frozen | top **243** of 812 — covering transcript, Listen, type row | top 664 | ✅ **664**, frozen and settled |
| Quoted evidence on the hero card | **native Windows button face**, `#6B6B6B`, **3.10:1** | styled | ✅ visible in `coached-02` |
| Reply date vs statute citation | both 13 px | date 19 px, statute 10 px | ✅ visible in `coached-02` |
| Ticked card during a FLIP | two animations on `transform`, **scale 1.0008** at the end | FLIP owns transform | — |
| The two report leads | one leading digit, same size and colour; MISSED at 10 px | 62 px figure in a state colour | ✅ **0 MISSED** vs **4 MISSED** |
| Missed segment | 860 px of flat gold — read as the **fuller** of the two | hazard stripes | ✅ survives greyscale |
| Pitch numbers | "silent 20 / coached 95" — **0 of 19** and **0 of 7** archived runs | replaced | ⚠️ see finding 1 |
| `e` with focus in Settings | **ended the live call** | guarded | ✅ 5 of 5 scenarios correct |

---

# Job 2 — the final sweep

Run on the tree as it stood, 13 Sep 10:20–11:05.

## Gates — all four pass

| gate | result |
|---|---|
| `npx tsc -b` | **exit 0**, no output |
| `node scripts/gate-css.mjs` | **exit 0** — "css gate: 9 file(s), every fr track has a zero floor." |
| `npm run build` | **exit 0** — 158 modules, built in 457 ms. `index.js` 1,141.70 kB (gzip 316.18 kB), `index.css` 63.95 kB (gzip 12.91 kB). One warning: the JS chunk is over 500 kB. |
| `npm run lint` (oxlint) | **exit 0** — 0 errors, **7 warnings** (1 unused parameter, 2 refs-during-render, 2 set-state-in-effect, 1 impure `Date.now` in render, 1 read-before-init) |

## Widths — 0 sideways scroll, 60 of 60

`scrollWidth − clientWidth` at 288, 320, 375, 414, 768, 885, 960, 1024, 1280 and 1440 px, on Live
call, Calls, Practice, Deadlines, Lessons and About: **0 at every one of the 60 combinations.**

The nav tab strip does extend past the viewport at 375 px (its right edge measures 406–466 px). That
is the strip's own internal scroll with its edge mask; the document reads 0.

## 1280×720 — the projector case

| screen | document height | vertical scroll | sideways | controls below the fold |
|---|---|---|---|---|
| **Live call** | **720** | **0** | 0 | **0** — "End call" in view |
| Deadlines | 720 | 0 | 0 | 0 |
| Lessons | 720 | 0 | 0 | 0 |
| Practice | 862 | 142 | 0 | 0 |
| Calls | 1038 | 318 | 0 | 4 |
| About | 1719 | 999 | 0 | 2 |

**The demo path passes.** Live call is exactly one viewport tall with nothing below the fold and
"End call" reachable without scrolling — confirmed both idle and during a live call
(`coached-01-sign-fires-frame.png`, taken at 1280×720, shows "End call E" at the top right while the
legal card is on screen).

Calls and About scroll, which is correct for a list and a long page. What is below the fold there:
on **Calls**, the two call rows and their Compare buttons (bottoms at 891–977 px); on **About**, the
two "Delete everything" controls (1403 and 1520 px). Nothing on the demo path.

## 375 px — the phone

`scrollWidth − clientWidth` = **0** on Live call, Calls, Practice, Deadlines, Lessons, About and the
report card. Media queries confirmed to have moved (`max-width: 720px` → true, `max-width: 640px` →
true, 5 touch points).

**The sheet does not cover the call.** At its resting detent, measured against a 812 px viewport:

| | top | bottom | covered by the sheet |
|---|---|---|---|
| Sheet (`sheet peek`) | **664** | — | — |
| Transcript | 274 | **644** | **0 px** |
| Listen button | 544 | **584** | **0 px** |
| Type row | 592 | **632** | **0 px** |

**And it holds frozen.** With every animation paused at `currentTime = 0`, the sheet reads top
**664**, class `sheet peek`, `transform: translateY(390px)` — the resting position, not
`translateY(0)`. The old failure was top 243. Plate: `frozen-03-phone-at-rest.png`.

During a call the sheet auto-lifts to `full` (top 189) when a new sign lands, which does cover the
transcript. That is the deliberate lift, not the frozen-frame bug, and it is suppressed with
coaching off. `phone-02-live-signs.png` shows it, and shows the sheet head naming the same sign as
the card directly beneath it.

## Cold load — complete, everything reachable

Fresh browser profile, then `localStorage.clear()` and a reload.

| | |
|---|---|
| Keys written on first load | **1** — `the-hard-call:anon-off-until` |
| Ground | dark (following the system) |
| Document height | **720** = viewport 720 · vertical scroll **0** · sideways **0** |
| Visible controls | **18** · **0** below the fold |

All 18 reachable: Skip to the call · the six section tabs · Settings · the storage chip · Sound ·
Customer name · Product · Direction · End call · Listen · Who said it · the type field · Replay the
demo call. Plate: `cold-01-first-screen.png`.

## Throttled / non-compositing tab

Every animation paused and seeked to its first frame, then computed styles read. Also re-run with
`requestAnimationFrame` replaced by a no-op before the card mounted.

| screen | animations frozen | opacity < 1 | zero-length bars |
|---|---|---|---|
| Live call | 0 | **0** | **0** |
| Calls (with the compare board) | 6 | **0** | **0** of 5 |
| Report card | 6 | **0** | **0** of 5 |
| Deadlines · Lessons · Practice · About | 4 each | **0** | **0** |
| Phone at rest | — | **1** — `.sheet-handle` at 0.55, a decorative grab bar with no text | **0** |

Values held at the first frame: split bar **860 px**, deadline bar **452 px**, compare bars
**860 / 688 px**. With `rAF` removed entirely the split bar still reads 860 px, the deadline bar
452 px, and the score ring reads 0 at 300 ms then **10** from 1700 ms — its `setTimeout` rescue
fires, because timers still run when frames do not. The ring's `aria-label` carries the true value
at every instant.

**The active-tab underline has real width — but not the right position. See finding 2.**

## Contrast — 2,294 nodes, 3 failures

Composited: every ancestor background is flattened, the alpha is applied, and ancestor `opacity` is
folded into the foreground. Sampled only after entrances settled — `midEntrance` was **0** in all 32
page sweeps, so none of this is the phantom-failure class.

| set | sweeps | text nodes | failures |
|---|---|---|---|
| Dark ground, default settings — 8 screens | 8 | 477 | **0** |
| Dark ground, accessibility extremes | 8 | 483 | **0** |
| Light ground, default settings | 8 | 486 | **0** |
| Light ground, accessibility extremes | 8 | 483 | **0** |
| **Live call with sign cards on screen** | 4 | 365 | **3** |

Screens covered: Live call, Calls (with the compare board), Practice, Deadlines, Lessons, About, the
report card and the Settings panel. "Extremes" = largest text, line spacing, hyperlegible face, high
contrast, reduce transparency, big targets, thick focus, underlined links. Thresholds 4.5 for body
and 3.0 for large text.

**All three failures are the same element** — the keyboard-shortcut badge on a sign card. See
finding 3.

## Keyboard

**16 tab stops, 0 without a visible focus ring.** Every stop had either a non-`none` outline with a
width above 0 or a box-shadow.

Single-key shortcuts, one fresh live call per trial, a real key event each time:

| focus is… | `e` should… | result |
|---|---|---|
| the transcript type field | not end the call | **PASS** |
| a control inside the open Settings panel (`role="dialog"`) | not end the call | **PASS** |
| the last control in Settings ("Test an announcement") | not end the call | **PASS** |
| the "Who said it" combobox, closed | not end the call | **PASS** |
| the same combobox with its listbox **open** (`aria-expanded="true"`, 2 options) | not end the call | **PASS** |
| the page body — the control | **end the call** | **PASS** |

`t` pressed inside Settings left focus in the dialog and did not jump to the type field: **PASS**.
The Settings panel is `role="dialog"` with 18 controls and is non-modal by design, which is what made
the original bug possible. Plates: `keyboard-01-settings-open.png`, `keyboard-02-listbox-open.png`.

---

# Findings

Worst first. Nothing was fixed.

## 1 · The deployed engine is the model the README says was rejected, and the published fractions did not reproduce

**Two claims in the README are false against the live system.**

**The model.** `GET /api/health` on the deployed function returns:

```
{"ok":true,"gemini":true,"keys":2,"model":"gemini-2.5-flash","time":"2026-09-13T00:39:39.980Z"}
```

⚠️ **SUPERSEDED — WITHDRAWN at the foot of this file.** The deployed function reports
`gemini-flash-latest`; this reading came from the LOCAL development path, which runs a
different model. The README was correct.

```
```

`README.md:178` says the deployed function "currently reports **`gemini-flash-latest`**", and
`README.md:194` says the published precision/recall figures are measured against "**the model the
deployed function actually uses**". Both are now wrong. `README.md:228` records that a control run on
`gemini-2.5-flash` scored 0.97 precision against `gemini-flash-latest`'s 1.00, bought with a false
positive on *"the storm knocked our power out"*, and concludes "**We chose the model that never
invents an obligation.**" The deployed function is running the other one. The report cards print it:
both plates read "judged by gemini-2.5-flash". `keys: 2` is correct.

**The fractions.** The README publishes **coached 4 of 4 answered, silent 0 of 5**, from 10 runs. My
two browser runs through the deployed engine produced the mirror image: **coached 5 of 5, silent
0 of 4**. The extra sign is `inform-hardship-provisions`; in my runs it fired on the *coached*
worker, and the README's story depends on it firing on the *silent* one ("the worker who never
mentions hardship assistance earns a prompt telling him to").

This is not run-to-run noise in one direction — it is already in the archive. `eval/demo-runs.json`,
grouped by phase:

| phase | coached | silent |
|---|---|---|
| `after-remote` (the 10 runs the README publishes) | 4 signs, 3 handled + 1 partly, 0 missed, 85–88 | **5 signs**, 0 answered, 5 missed, 10–15 |
| `after-local` (3 runs, same script) | **5 signs**, 0 missed, 75–90 | **4 signs**, 0 answered |
| this run, in the browser, deployed engine | **5 signs**, 5 of 5, 0 missed, **85** | **4 signs**, 0 of 4, 4 missed, **10** |

The direction of the claim survives everywhere — coached answers all of its signs, silent answers
none, and the statutory notice is handled in one and missed in the other. **The specific fractions do
not.** `README.md:87`, `README.md:9`, `docs/DEMO-SCRIPT.md:94` and `:126` all state "4 of 4" and
"0 of 5" as measurements.

**Fix in one line:** re-run `eval/demo-runs.ts` against the engine that is actually deployed, publish
whatever it says, and correct the three `gemini-flash-latest` references — or redeploy the function
with `GEMINI_MODEL=gemini-flash-latest` so the README becomes true again. Note `.env.example` ships
`GEMINI_MODEL=gemini-2.5-flash`.

**The safest thing to say on stage** is the one that held in every run: *the same call, handled two
ways — every sign answered against none, and the statutory notice handled against missed.* No
fraction, no score.

## 2 · The active-tab underline has width in a frozen tab, but sits under the wrong tab

The width-0 bug is fixed. The position bug is not.

Navigate to Deadlines, freeze every animation at `currentTime = 0`:

| | frozen | settled |
|---|---|---|
| `.tab-ink` left | **144.3** | 373.3 |
| `.tab-ink` width | **48** | 84 |
| The current tab ("Deadlines") | left 361.5, width 108.1 | same |
| Ink under the current tab? | **no** | yes |

Same on About: ink frozen at 144.3 while "About" sits at 546.8. The ink mounts already placed under
"Live call" — which is correct, and is the fix that was made — but every move after that is a
`transform` transition, and a transition frozen at its first frame holds the old position. The tab
does get `class="tab on"` and `aria-current="page"` immediately, so colour and screen-reader output
are right. The net effect is that the section is carried by colour alone **and** contradicted by an
underline pointing at a different tab, which is worse than the original "colour alone".

Only reachable on a tab that is not painting, and only after a navigation. Plate:
`frozen-04-tab-ink.png`.

**Fix in one line:** the ink's position is the same kind of value as its width — set it on the
element's first style after each view change (or key the element on `view` so it remounts placed)
rather than transitioning into it.

## 3 · The `H` badge on a sign card fails AA on both grounds — 1.01:1 on the gold card

The only contrast failure in 2,294 measured nodes, and it is on the product's hero object.

| ground | card | colour | on | ratio | needs |
|---|---|---|---|---|---|
| dark | **legal (gold)** | `rgb(154,163,173)` | `rgb(199,156,90)` | **1.01** | 4.5 |
| dark, a11y extremes | legal (gold) | `rgb(195,202,210)` | gold | **1.52** | 4.5 |
| light | **legal (gold)** | `rgb(94,102,115)` | `rgb(199,156,90)` | **2.30** | 4.5 |
| light | tip card | `rgb(94,102,115)` | `rgb(222,216,203)` | **4.08** | 4.5 |
| light, a11y extremes | — | — | — | pass | — |

**1.01:1 means the badge and the card have almost exactly the same relative luminance.** It is a
hue difference only — it disappears in greyscale, and for a low-vision or colour-blind reader it is
not there at all.

**Checked against the picture, as the vault requires.** `contrast-kbd-dark-zoom.png` and
`contrast-kbd-light-zoom.png` are 6× crops of the "Mark handled" button on the gold legal card: the
words are near-black and crisp, the `H` is a pale wash. `chain = 1` (no ancestor opacity),
`midEntrance = 0`, own background transparent. It is real, not the phantom class.

**Root cause, and why the 23-colour sweep missed it.** This is the same fault that sweep fixed —
`--ink` inverts with the theme and `--gold` does not, so a global grey token lands on a gold surface
and is never re-picked per ground. `kbd` got one global colour and no per-surface token. It was
missed because **the sweep ran on screens with no live sign cards**: the gold card only exists during
a call. The same `kbd` in the footer hint measures 6.47 (dark) and 5.01 (light), and the `E` inside
the gold "End call" button measures 6.56 because that one uses the ink token.

Visible on the phone too: `phone-02-live-signs.png`.

**Fix in one line:** give `.sign.legal kbd` (and the tip card's) the same per-ground token the rest
of the on-gold text uses — `--ink` on gold, as the `E` in "End call" already does.

## 4 · Minor, recorded rather than raised

- **`npm run build` warns that the JS chunk is over 500 kB** — 1,141.70 kB raw, 316.18 kB gzipped.
  Fine for a demo on a laptop; worth knowing if the venue's wifi is bad.
- **7 oxlint warnings, 0 errors.** One is a genuine smell on the demo path: `src/lib/engine.ts:178`
  calls `Date.now` during render.
- **The overdue row's "today" marker is clamped to the due date**, so it cannot sit past it. The
  reading ("5 days overdue") and the hatch both say it; the marker does not.
- **In greyscale the verdict chips (HANDLED / PARTLY / MISSED) are distinguished by their words
  only** — the bars carry texture, the chips do not.
- **`eval/demo-runs.latest.json` is untracked and empty** (0 runs) while `eval/demo-runs.json` holds
  42. If anything reads "latest" it gets nothing.

---

## What could not be checked

Stated plainly rather than implied.

- **Practice mode with a real voice call.** Needs a microphone and ElevenLabs free-tier quota, and
  headless Chrome has neither. The Practice screen, its roster and its layout were measured; a
  connected call was not.
- **Live speech recognition.** The Web Speech API is not available in headless Chrome. The live call
  path was exercised by typing lines into the app's own type field, which goes through the same
  `addLine` the speech engine calls; the recogniser itself was not run.
- **Sound.** Nothing was listened to. The sound files and their attribution were not checked.
- **The deployed GitHub Pages build.** Everything here is the dev server at `localhost:5173` against
  the deployed Supabase function. The production bundle builds clean but was not loaded in a browser.
- **Run-to-run stability of the engine.** I ran the demo **once per mode**, not ten times. Finding 1
  rests on those two runs plus the 42 archived runs, not on a fresh distribution.
- **Whether the tree I measured is the tree that ships.** A concurrent session committed three times
  during this run and left `src/lib/sfx.ts` modified. Re-run the gates after the freeze.
- **Contrast of transient states** — hover, active, the toast, the "Writing report…" state, and the
  practice orb — was not swept. Only resting states on the eight screens listed.
- **The Deadlines page's own rows** were captured (`clock-01-deadlines.png`) but the overdue hatch was
  only produced on the report card's `DeadlineTrack`, which is where that component lives.

---

## Every plate

39 PNGs in [`docs/evidence/`](evidence/). Full frames are 2× at the stated viewport; element crops
are 4×. Dark ground and default settings unless noted.

### The four objects

| file | what it is |
|---|---|
| `coached-01-sign-fires-frame.png` | 1280×720, the whole screen at **00:37**, the legal card on the right the moment it landed |
| `coached-02-sign-card.png` | the legal card alone — obligation, reply date, 21 days, s72, ask-next, quoted evidence |
| `coached-03-call-settled.png` | the same call at 00:56 with all 5 cards up |
| `silent-03-call-settled.png` | the same script, coaching off — **0 cards**, at 00:56 |
| `report-coached-top.png` · `report-silent-top.png` | the two cards, same viewport, score settled (85 / 10) |
| `report-coached-full.png` · `report-silent-full.png` | the same two, full page |
| `report-lead-coached.png` · `report-lead-silent.png` | the lead alone, identical crops — 0 MISSED vs 4 MISSED |
| `coached-04/05-report-*.png` · `silent-04/05-report-*.png` | the cards as they appear straight after "End call" |
| `clock-02-21day-live.png` | the running clock — 452/452 px, 21 days left, 13 Sep → 4 Oct |
| `clock-03-21day-overdue.png` | **the overdue hatch**, first time rendered — 5 days overdue |
| `clock-04-overdue-greyscale.png` | the same with all colour removed |
| `clock-01-deadlines.png` | the Deadlines page, two live clocks |
| `compare-01-board.png` | the compare board — striped missed bar against the answered channel |
| `compare-03-board-greyscale.png` | **the colour-blind test** — the same board at `grayscale(1)` |
| `compare-02-board-frame.png` | the board in its page |

### The sweep

| file | what it proves |
|---|---|
| `cold-01-first-screen.png` | cold load: 18 controls, none below the fold, doc height = viewport |
| `phone-01-live-idle.png` | 375 px at rest — sheet top 664, transcript/Listen/type row clear |
| `phone-02-live-signs.png` | 375 px during a call — the sheet's head and the card beneath it name the same sign |
| `phone-03-sheet-full.png` · `phone-04-report.png` | the sheet expanded, and the report card on a phone |
| `frozen-01-report-card.png` · `frozen-02-compare-board.png` | every animation paused at frame one — no blank bars |
| `frozen-03-phone-at-rest.png` | the sheet frozen at its resting detent, top 664 not 243 |
| `frozen-04-tab-ink.png` | the underline frozen — has width, wrong position (finding 2) |
| `frozen-05-report-no-raf.png` | the report card with `requestAnimationFrame` removed outright |
| `contrast-kbd-dark.png` · `contrast-kbd-light.png` | the legal card on each ground |
| `contrast-kbd-dark-zoom.png` · `contrast-kbd-light-zoom.png` | **6× on "Mark handled"** — the `H` badge, finding 3 |
| `contrast-01-sign-card-light.png` | live call, light ground, cards up |
| `contrast-02-sign-card-extreme.png` | live call, dark ground, accessibility extremes |
| `keyboard-01-settings-open.png` | the Settings dialog open over a live call |
| `keyboard-02-listbox-open.png` | the "Who said it" listbox open during a live call |

---

## Correction, added after this pack was written

**The model finding above is withdrawn.** Re-checked directly against the
deployed function at 01:05:

```
{"ok":true,"gemini":true,"keys":2,"model":"gemini-flash-latest","time":"2026-09-13T01:05:32.457Z"}
```

`README.md` is correct and this document was wrong. The `gemini-2.5-flash`
reading came from the local development path, which runs a different model
from its own `.env` — the same trap already recorded in `DECISIONS.md`, where
a local API left running for eleven hours served a superseded engine and made
three runs look unreproducible. **A health check is only evidence about the
host you actually called.**

**The fraction finding stands, and it matters more.** Two browser runs through
the deployed engine produced coached **5 of 5** and silent **0 of 4**; the
archived ten-run measurement produced coached **4 of 4** and silent **0 of 5**.
Both shapes are real and both are in `eval/demo-runs.json`.

What survives every run ever recorded is the **direction**: every sign
answered on the coached side, none on the silent side, and the statutory
notice handled versus missed. That is the claim to make on stage. The exact
fraction is not stable enough to put in a sentence somebody will read aloud.
