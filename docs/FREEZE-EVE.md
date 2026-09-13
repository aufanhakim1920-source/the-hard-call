# Freeze-eve verification

Run 13 Sep 2026, ~05:00–06:00 UTC (3:00–4:00 pm AEST), by the verifier. Nothing was fixed; this
reports only.

**Verdict: nothing found that blocks the submission.** Every priority check passes with numbers.
Three low-severity findings and one process item are listed at the bottom, plus a plain list of what
could not be checked and why.

---

## Which build this is about

Measured against the **deployed site**, https://aufanhakim1920-source.github.io/the-hard-call/ —
not the dev server. The deployed site was current throughout.

⚠️ **The site redeployed in the middle of this sweep.** Checks 1–6 opened on commit `3936ee6`
(`index-BypFX-Oi.js` / `index-CPNY0yH9.css`). Partway through, three commits landed and Pages
published `4847042` (`index-BjcZIDjv.js` / `index-oL1G-Qpx.css`):

| commit | what it touches |
|---|---|
| `4cd11dd` | report: the biggest gold glyph on the failing card was the score |
| `2a64137` | report: a screenshot caught "1 OF 5" on a call whose answer is five of five |
| `15fd019` | docs |

The diff is **report-card presentation only** — `ReportCard.tsx`, `ReportLedger.tsx`,
`ScoreRing.tsx`, three CSS files, and `useCountUp.ts` deleted. No engine, no detector, no call
screen. So the demo-path verdicts in check 1 are unaffected, and the **report card was re-measured
on the new build** (contrast in all four states, overflow at 1280 and 375, and the numbers reading
correctly). Those re-runs are marked "new build" below.

`origin/main` is now `3fd1df3`, which is a `[skip ci]` team-log commit on top of `4847042` — so the
deployed code equals main's code.

---

## 1 · The demo path, both ways — PASS, and the asymmetric claim holds

Run on the deployed site, coached first, then silent, both at 2× replay speed, both ended with
**End call**, both judged by `gemini-flash-latest`.

### Coaching ON

| | |
|---|---|
| Signs raised | **4** — one LEGAL ("Needs lower payments for months") + three TIP |
| Answered | **4 of 4**, one of them PARTLY ("Things have been a bit tight") |
| Missed | **0** |
| Statutory notice | **HANDLED** — reply due Sun 4 Oct, 21 days from the call |
| Score | **85 / 100** |
| Answer-time strip | "4 of 4 answers timed · fastest 2.0 s · slowest 6.0 s" (2.0 / 4.0 / 5.0 / 6.0 s) |

### Coaching OFF

| | |
|---|---|
| Signs raised | **5** — the extra one is `inform-hardship-provisions`, exactly as DEMO-SCRIPT.md warns |
| Answered | **0 of 5** — every row reads MISSED / NOT ADDRESSED |
| Missed | **5** |
| Statutory notice | **not handled** — the card says "the worker never addressed it" |
| Score | **15 / 100** |
| Answer-time strip | "no answers on this call to time" — the correct empty state, not a broken chart |
| During the call | the signs column showed **0** signs for the whole replay; the column carried the "Coaching is off for this call" copy instead |

**The claim is true as stated.** Nothing came back MISSED on the coached side, nothing came back
HANDLED on the silent side, and the statutory notice was handled coached and not handled silent.
The fractions were 4-of-4 and 0-of-5 today; the direction is what holds.

---

## 2 · 375px, the whole app — PASS

The phone layout was rebuilt today, so this was measured rather than looked at. `--bar-h` was
written in by hand before every measurement (the pane's own copy is stale: it read **92px** when
the true topbar height was **90.5px**; true values are **90.17px** at default text and **104.17px**
at the largest).

- **No page scroll on the call screen.** `scrollHeight − clientHeight = 0` **and**
  `scrollWidth − clientWidth = 0`, with `clientWidth` reading a real 375 — at default settings and
  again at the largest text size with all eleven accessibility switches on.
- **The transcript is a real scroll container and sticks to the newest line.** During a live demo
  replay: `.transcript` held **654px of content in a 307px box** with `scrollTop 347` — pinned to
  the bottom, `atBottom` true.
- **Listen and the type row hit-test as themselves.** `elementFromPoint` at each element's centre
  (not bounding boxes):

  | control | rect (default / big-targets) | top element under the centre |
  |---|---|---|
  | Listen | 14,529 170×40 / 170×46 | `BUTTON.btn` ✅ |
  | speaker select | 14,577 112×40 / 112×46 | `SPAN.sel-value` ✅ |
  | type input | 132,577 229×40 / 229×46 | `INPUT.field` ✅ |

  The sheet at `peek` sits at **y = 664** — 47px below the type row's bottom edge (617). It does
  not auto-raise over them when a sign lands. Verified again on the new build.
- **0 horizontal overflow on every screen** — Live call, Calls, Practice, Deadlines, Lessons,
  About — at **320, 375 and 414**, in both default settings and largest-text-with-everything-on.
  Twenty-four measurements, every one zero.
- The residual overflow a naive sweep reports inside `.tabs` is the intentional nav scroll strip:
  `overflow-x: auto`, 480px of tabs in a 375px box, with `data-edge` mask fades. It never reaches
  the page.
- Big-targets gives 46px-tall controls, above the 44px floor.

---

## 3 · 1280×720, the projector case — PASS

- **End call is reachable without scrolling.** Mid-call it sits at **(1158, 70) → (1260, 104)** and
  hit-tests as `BUTTON.btn gold`.
- **Nothing is below the fold on the call screen.** `scrollHeight` = `clientHeight` = **720**, and
  `scrollWidth − clientWidth = 0`. There is no page scroll at all.
- The report card is 1951px tall and does scroll, which is correct for a document — but the score,
  the MISSED count and the one-sentence verdict are all above the fold.

---

## 4 · Contrast, both grounds, default and every setting at once — PASS, 0 failures

Method: alpha composited through every ancestor before measuring, relative luminance,
`(L1 + .05) / (L2 + .05)`, threshold 4.5 for body text and 3.0 for large (≥24px, or ≥18.66px bold).
`aria-live` and screen-reader-only text excluded. Every state below was **rendered and looked at**,
not only computed.

| state | dark · default | dark · all on | light · default | light · all on |
|---|---|---|---|---|
| idle first screen | **5.95** (48) | — | — | — |
| call screen: live tip + live legal + HANDLED legal | **6.47** (74) | **5.25** (74) | **4.56** (74) | **4.56** (74) |
| sign column alone | 6.72 (42) | 5.55 (42) | 4.56 (42) | 4.56 (42) |
| legal card, open | 6.73 (11) | 6.81 (11) | 5.84 (11) | 5.84 (11) |
| legal card, HANDLED | 6.73 (11) | 6.81 (11) | 4.56 (11) | 5.84 (11) |
| waiting column, coaching off, mid-call | **6.73** (5) | — | — | **4.81** (5) |
| Deadlines — 4 running + 1 settled | pass | 5.25 (44) | 4.57 (44) | 4.84 (44) |
| compare board | pass | 5.25 (95) | 4.84 (88) | 4.84 (95) |
| report card, coached | pass | — | 4.84 (76) | 4.84 (76) |
| report card, silent | pass | 5.25 (83) | 4.84 (83) | — |
| **report card, NEW build** | **6.47** (63) | **6.56** (63) | **4.91** (63) | **5.04** (63) |

(number in brackets = text nodes measured; the figure is the worst ratio found in that state)

Deadlines carried both states in one view: four running clocks ("21 days left", each with
*Mark replied*) and one settled ("done", with *Reopen*).

### Settings panel with a row hovered — new today, measured closely

| | dark | light |
|---|---|---|
| hovered row fill | `--ink-3` #2b3038 | rgb(242, 238, 231) |
| panel behind it | `--ink-2` #22262c | rgb(233, 228, 218) |
| **hover vs panel** | **1.10 : 1** | **1.096 : 1** |
| row title on the hover fill | pass | **14.29 : 1** |
| row description on the hover fill | pass | **5.01 : 1** |

All eleven rows sit inside `.a11y-scroll`, so all eleven get the hover — none is missed. The fill
**is** visible in a screenshot in both grounds, so this is not the invisible-hover bug again, but
1.10:1 is a very weak signal. Not a WCAG failure — the row is identified by its own text and
switch, not by the hover fill — and press feedback is much stronger (`scale(0.995)` on the row,
`scaleX(1.28)` on the knob). Worth a darker step if anyone has spare time; not worth touching under
freeze.

The sliding segment indicator (`.a11y-seg-thumb`, gold, `translateX(calc(var(--i) * 100%))`) renders
in the right cell in both grounds.

---

## 5 · Frozen tab — PASS, proved by deleting requestAnimationFrame

`window.requestAnimationFrame` replaced with a no-op returning 0, `cancelAnimationFrame` stubbed,
then every view force-remounted and a full report card rendered.

- **Nothing under opacity 1.** Every leaf element in the view and the topbar computed **1.000**.
  Zero exceptions.
- **No bar stuck at zero.** `rv-seg answered` 860px, `rv-dl-left` 452px, `rv-hist-bar` 8px each.
  Zero-width bars: **0**.
- **The tab underline has width.** `.tab-ink` rendered at **46px**. TopBar withholds it until it
  has been measured (`ink.width > 0 && …`), so the frozen first frame is never width 0.
- **The numbers land at their values, not at zero.** Score read **85**, the ledger read
  "4 of 4 signs answered".
- The sheet is at rest: `.sheet peek`, top 664, no transform in flight.

On the new build `useCountUp.ts` is deleted outright, so the report numbers no longer animate at
all. That closes this class of problem at the source — I hit the old version of it once, where a
screenshot caught "0 OF 4" while the DOM already said 4 of 4.

---

## 6 · Keyboard — PASS

**Focus rings: 110 controls, 110 with a visible ring, 0 without.**

| view | controls | with a ring |
|---|---|---|
| Live call | 20 | 20 |
| Calls | 22 | 22 |
| Practice | 15 | 15 |
| Deadlines | 18 | 18 |
| Lessons | 13 | 13 |
| About | 12 | 12 |
| Settings panel | 30 | 30 |

Every one is a **2px solid `#c79c5a`** outline and matches `:focus-visible`. Ring against the dark
ground = **6.56 : 1**, well past the 3.0 needed. Confirmed by eye as well as by measurement: four
real Tab presses put a clear gold ring on Listen.

**H / E / T are inert where they must be.** The handler was proved live first, so the negatives
mean something: `H` on `body` marked a sign handled, `T` on `body` focused the type input.

| focus is in | H | E | T |
|---|---|---|---|
| the type field | inert — focus stayed in the field | inert — no "Writing report…" | inert |
| the `.sel-pop` speaker listbox | inert | inert | inert |
| a row in the settings panel (`role="dialog"`) | inert | inert | inert |

**Reset does not drop focus to the top of the document.** After pressing it, `document.activeElement`
is `DIV.acct-panel a11y-panel` — the dialog itself. Not `body`, still inside the panel. The panel
also takes focus when it opens, and is deliberately `aria-modal="false"` so it can be used during a
live call.

---

## 7 · Gates — all four pass

| gate | result |
|---|---|
| `npx tsc -b --force` | exit 0, no diagnostics |
| `node scripts/gate-css.mjs` | 14 files, every `fr` track has a zero floor |
| `npm run build` | built in 463 ms — 1,153.89 kB, **320.00 kB gzip** |
| `npm run lint` (oxlint) | **6 warnings, 0 errors** |

The build prints one advisory: the chunk is over 500 kB. It is a warning, not a failure, and has
been there all along.

The six lint warnings, unchanged and all pre-existing: `engine.ts:202` `Date.now` during render ·
`detect.ts:212` unused `resolution` param · `practice.ts:70` and `speech.ts:41` refs during render ·
`speech.ts:113` `start` read while initialising · `Sheet.tsx:100` setState in effect. (There were
seven earlier; `useCountUp.ts` was deleted with its warning.)

---

## Findings, worst first

**1 · Uncommitted work is sitting in the tree on freeze eve, and it was briefly build-breaking.**
`src/components/CallHistory.tsx` and `src/components/call-history.css` are modified and not
committed; `eval/demo-runs.latest.json` is untracked. For roughly ten minutes mid-sweep, `tsc -b`
and `npm run build` both failed on the working tree with
`src/components/CallHistory.tsx(155,8): error TS17008: JSX element 'div' has no corresponding
closing tag` — a mid-edit save, not anything in HEAD (the Pages run for the same commit stayed
green throughout, and the gates pass now). *Fix:* whoever owns that edit finishes or reverts it,
and it lands before 11:00 — an unfinished file in the tree at freeze is the one thing here that
could actually cost the submission.

**2 · The settings-row hover is only 1.10 : 1 against its own panel**, in both grounds
(#2b3038 on #22262c dark, rgb(242,238,231) on rgb(233,228,218) light). Visible, but barely. Not a
WCAG failure and not a freeze blocker. *Fix if there is time:* one step darker in dark and one step
lighter in light, in `.a11y-panel .a11y-scroll .a11y-row:hover`.

**3 · The H/E/T window handler throws if a keydown's target is not an Element.**
`t?.closest is not a function` — the guard does `el?.closest('[role="dialog"], …')` on `e.target`,
which is undefined when the target is `document`. Real keyboard events always target an element or
`body`, so this is unreachable in normal use; I only produced it with a synthetic dispatch. *Fix if
anyone wants it airtight:* `el instanceof Element && el.closest(…)`.

**4 · Two `422` responses in the console, unattributed.** They appeared in the error buffer, but the
pane's retained network window had already rolled past them, so I could not say which endpoint
returned them or whether they were live or left over from an earlier run. Nothing visibly failed in
front of me — both report cards, all sign detections and every deadline rendered correctly. *Needs
a human:* open DevTools on a fresh load, run one demo call each way, and see whether a 422 appears.

**5 · `navigator.vibrate` blocked** — Chrome policy when the frame has had no user tap. Benign, an
artifact of driving the page from a script, not a defect.

---

## What I could not check, plainly

- **Enter in the type row.** The Browser pane's synthetic Enter does not trigger HTML implicit form
  submission. I proved that rather than assuming it: a control `<form><input></form>` with a submit
  listener, injected into the live page, also recorded **0** submits on the same keypress. So the
  app's Enter-to-add-a-line is **untested by me and must be tried by hand** — five seconds on a real
  keyboard. The handler underneath is sound: calling `requestSubmit()` on that same form added the
  line and raised 3 signs, every time.
- **How the motion actually looks.** The Browser pane does not advance CSS transitions:
  `getAnimations()` reported both `.tab-ink` transitions as `playState: "running"` with
  `currentTime: 0`, indefinitely. The declared values are right — React set
  `translateX(241px); width: 84px` for the Deadlines tab, matching `offsetLeft 229 + 12` and
  `offsetWidth 108 − 24` — but the rendered value stays at the start. **The underline logic is
  correct; only its animation is unobservable here.** Any claim about how transitions feel has to be
  made on a real browser.
- **A practice voice session** — not started. The ElevenLabs quota is exhausted, as instructed.
- **`npm run eval` and `npm run eval:fixtures`** — not in this run's gate list, not run. The eval
  numbers in the repo are from the previous sweep.
- **The silent report card on the new build.** I re-verified the coached one across all four
  contrast states and both widths after the redeploy; the silent one was measured on the previous
  build. The two share every component the three commits touched, so the risk is low, but it is not
  the same as having looked.

## False alarms chased down, so nobody repeats them

Four measurements looked like defects and were not. Each cost time; each is written here instead of
in the findings.

- **"Listen and the type row are under the sheet at largest text."** `elementFromPoint` returned
  `SPAN.watch-ex` and the sheet read `top: 356`. Read **too early** — 400 ms after writing `--bar-h`
  the layout was still reflowing. After a 1.5 s settle: sheet at 664, both controls hit-testing as
  themselves. The screenshot had shown them clear all along.
- **"23 contrast failures in light mode."** Stale computed styles: flipping `data-theme` in a pane
  that is not compositing leaves `getComputedStyle` returning the old theme for a subtree. Forcing a
  paint with a screenshot first gives the true values. Same cause as an apparent
  "`.sign` is cream-on-cream in dark mode".
- **"The ASK NEXT block is dark-on-dark in the handled legal card."** My own compositing was wrong —
  blending two translucent layers must carry `a = fa + ba(1−fa)`, not declare the result opaque. Done
  properly it is **5.84 : 1**.
- **"The tab underline never moves."** The declared style was correct for every tab; the pane simply
  never advances the transition. See above.

The general lesson, and it is the same one three times: **in this pane, force a paint and let the
layout settle before reading anything, and print `clientWidth` next to any overflow number.**
