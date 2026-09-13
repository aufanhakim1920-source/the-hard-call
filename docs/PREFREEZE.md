# Pre-freeze verification — The Hard Call

**Run by:** verifier agent, read-only. Nothing in this repo was changed except this file.
**Date:** Sat 13 Sep 2026, 12:55–13:24 AEST.
**Code under test:** `main`, pulled at 12:56 (`d76d835`) and re-pulled at 13:22 (`a55f0e5`).
**Judged by:** the LOCAL dev API on `http://localhost:8787`, `gemini-2.5-flash`, 2 keys
(`/api/health` → `{"ok":true,"gemini":true,"keys":2,"model":"gemini-2.5-flash"}`).
**This says nothing about the deployed Supabase function.** No deployed host was called.

⚠️ **The tree moved under this sweep.** Between 12:58 and 13:22 someone was committing to `main`
live. `HEAD` went `d76d835` → `324c9fb` → `a55f0e5` while measurements were being taken, and
`ReportCard.tsx`, `CallHistory.tsx`, `App.tsx` and `CallScreen.tsx` all failed HMR at least once.
Every result below is stamped with which build it came from. The demo path (check 1) was run
**twice, on both builds**, so it is the one result that is not stale.

---

## Summary

| # | Check | Verdict |
|---|---|---|
| 1 | Demo path, coached vs silent | **PASS** — asymmetry confirmed twice, on two builds |
| 2 | Projector case, 1280×720 | **PASS on the live call. The report card is 3× the fold** — see F2 |
| 3 | 375 px | **PASS** — 0 overflow on every screen, sheet clears all three controls |
| 4 | Contrast, both grounds, default + all a11y on | **1 FAIL** — the LEGAL badge on a handled card, see F1 |
| 5 | Frozen / non-compositing tab | **PASS** — nothing stuck, score ring still lands on its number |
| 6 | Keyboard | **PASS** — including the thicker ring on text inputs |
| 7 | Gates | **PASS** — tsc 0, css gate 0, build 0, lint 0 (4 warnings) |

---

## 1 · Demo path — nothing regressed, and the asymmetry claim holds

The demo call was run end to end four times: coached and silent on `d76d835`, then coached and
silent again on `a55f0e5` after the tree moved. All four at 2× replay speed, "End call" pressed,
report card read.

### Coached (Settings → coaching ON, the default)

| | build `d76d835` | build `a55f0e5` |
|---|---|---|
| Signs raised | 5 | 5 |
| Verdicts | 4 HANDLED · 1 PARTLY · **0 MISSED** | 4 HANDLED · 1 PARTLY · **0 MISSED** |
| Statutory notice ("cannot make repayments") | **HANDLED**, reply due Sun 4 Oct, 21 days | **HANDLED**, reply due Sun 4 Oct, 21 days |
| Score | **90** / 100 | **85** / 100 |
| Headline | "All 5 signs raised on this call were answered while it was still live." | same |

The one PARTLY is always the same sign, *"Customer says things are tight"*, and the model's reason
is always the same: the worker acknowledged it and then asked for payment by Friday instead of
exploring hardship. That is a property of the script, not a flake.

### Silent (Settings → coaching OFF)

| | build `d76d835` | build `a55f0e5` |
|---|---|---|
| Sign cards shown during the call | 0 | 0 |
| Signs raised | 4 | 4 |
| Verdicts | 1 PARTLY · 3 MISSED · **0 HANDLED** | 2 PARTLY · 2 MISSED · **0 HANDLED** |
| Statutory notice | **MISSED — "the worker never addressed it"** | **MISSED** |
| Score | **20** / 100 | **30** / 100 |

### Verdict on the pitch's claim

The claim is **asymmetric: nothing MISSED coached, nothing HANDLED silent, the notice handled
coached and not handled silent.** All three halves held on all four runs. **Confirmed.**

Two things the pitch must not say:

- **Do not quote a fixed score.** Coached came back 90 and 85; silent came back 20 and 30. The
  adjudication is a live model call and it moves. Say "0 missed against 2–3 missed", which was
  stable, not "90 against 20", which was not.
- **The two calls do not raise the same number of signs** — 5 coached, 4 silent — because the
  coached worker says something ("told the customer about the hardship process") that itself raises
  a sign. The compare board already says this out loud, in its own words: *"These two calls did not
  raise the same signs (5 and 4), so the two scores are not counting the same things."* Good. Leave
  that sentence in; a judge who spots the mismatch unaided will otherwise assume it was hidden.

### F5 · Sign labels are inconsistently gendered on the same card — cosmetic, 2 min

On the silent card from `a55f0e5`, four rows read: *"Customer says things are tight"*,
**"She lost her job"**, *"Customer cannot make repayments"*, *"Customer sounds stressed"*.
Three say "Customer", one says "She", on one screen, side by side. The earlier build was
consistently "She…"; the rename to "Customer…" landed in the last few commits and one label was
missed. It is on the demo's most-stared-at screen.

---

## 2 · Projector case, 1280×720

Measured with the viewport emulated at exactly 1280×720.

**PASS on the live call.** `document.scrollHeight` = **720**, exactly the viewport, on every
variant tested: idle, mid-call with sign cards, coached, silent, and with every accessibility
setting on at once including largest text. `scrollWidth − clientWidth` = **0**. "End call" sits at
y 70–104, top right, never scrolled, never covered.

### F2 · The report card is 2005–2226 px tall against a 720 px fold

| screen | doc height | viewport |
|---|---|---|
| Live call (all variants) | 720 | 720 |
| Report card, coached | 2183 / 2226 | 720 |
| Report card, silent | 2005 / 2021 | 720 |
| Compare board | 1665–2065 | 720 |

This **fails the stated criterion** ("document height equal to the viewport… on the report card").
It is not a layout bug — a report card is a long document and it is meant to scroll.

What matters is that the argument survives the fold, and it does: within the first 720 px a judge
sees the score ring, the big **0 MISSED**, the sentence naming the legal obligation and its 4 Oct
date, and "5 of 5 signs answered". Verified by screenshot. **Nothing load-bearing is below the
fold** — the ledger, the timeline and the per-sign reasoning are, and those are the follow-up.

**Decision for whoever presents:** either accept the scroll and say so, or the demo scrolls once,
deliberately, after the headline. Do not discover this on the projector.

---

## 3 · 375 px

Viewport emulated at 375×812, page reloaded so the media queries re-ran.
`matchMedia("(max-width: 768px)")` reported **true** — the phone layout was genuinely active, not
a desktop layout in a narrow box.

**Horizontal overflow: 0 px on every screen.** `scrollWidth − clientWidth === 0` on Live call
(idle, mid-call and with the sheet up), Calls, Deadlines, Lessons, About, Practice, and the report
card.

**The bottom sheet clears all three controls at its resting detent.** Measured against a
812 px viewport:

| element | top | bottom |
|---|---|---|
| Transcript | 222 | 533 |
| **Listen** button | 544 | 584 |
| **Type row** | 592 | 632 |
| **Sheet** (`.sheet peek`) | **664** | — |

The sheet's top edge is **32 px below the bottom of the type row** and 131 px below the transcript.
Nothing is covered. Confirmed by screenshot, with a live legal sign card in the sheet.

### F4 · The replay-speed control is below the fold at 375 px — minor

In demo mode the 1×/2× radios sit at y 887–921 on an 812 px viewport, so the page must be scrolled
101 px to reach them. Harmless in normal use, but if the phone demo is shown at 2× someone has to
scroll to set it.

*Not tested:* the sheet dragged to its expanded detent. The head row is a drag handle, not a
button, and a click does not expand it; a drag was not worth the budget. At rest it is correct.

---

## 4 · Contrast

Method: composite every alpha layer up the ancestor chain **first** (correct source-over, alpha
accumulating, terminating on white), then relative luminance, then (L1+0.05)/(L2+0.05).
4.5 for body text, 3.0 for large text. Every state was **put on screen** before sampling, and every
sample was taken after `document.getAnimations().forEach(a => a.finish())` plus a settle delay.

States rendered and swept, on each of dark-default, light-default, all-a11y-on-dark and
all-a11y-on-light: **the waiting column mid-call** (both the "none yet" and the "silent this call"
variants), **a live tip card**, **a live legal card**, **a handled card**, **a running deadline**
("21 days left"), **a settled deadline** (`.deadline-row.done`), **both report cards**, and **the
compare board**. Plus Lessons, About and Practice.

**Result: 1 real failure, everything else clean.** Roughly 45–130 text nodes per state, zero fails
in all of them except the one below.

### F1 · HIGHEST — the LEGAL badge on a *handled* legal card fails on both grounds when High contrast is on

| state | text | background (composited) | ratio | needs |
|---|---|---|---|---|
| default, dark | `rgb(242,238,231)` | `rgb(69,73,80)` | **7.80** ✅ | 4.5 |
| **High contrast, dark** | `rgb(242,238,231)` | `rgb(118,123,130)` | **3.67** ❌ | 4.5 |
| **High contrast, light** | `rgb(28,31,36)` | `rgb(109,110,110)` | **3.22** ❌ | 4.5 |

10 px, weight 500, so it is small text and 4.5 applies. Confirmed by screenshot as well as by
maths: on the light ground the badge is visibly the weakest thing on the page.

**Root cause, exactly.** `src/components/sign-card.css:81`

```css
.signs-list .sign.legal.done .kind {
  background: var(--line-2);
  color: var(--cream);
}
```

`--line-2` is a **hairline** token, not a surface token. `src/styles.css:2449` and `:2457` raise it
under `.high-contrast` — `rgba(195,202,210,0.55)` on dark, `rgba(28,31,36,0.6)` on light — precisely
so borders get *more* visible. Because the handled legal badge reuses that token as a filled pill
background, raising it drags the pill toward the text colour and contrast falls. **Turning on High
contrast makes this one element worse.** The card itself is `background: transparent` in the `done`
state, so the pill is the only thing carrying the label.

**Fix in one line:** give the handled badge its own surface token (or use the same treatment the
`.sign.tip .kind` uses, which measured 8.26 on dark) instead of `var(--line-2)`. Do not fix it by
lowering `--line-2` — that is a real hairline improvement and other rules depend on it.

### A phantom that was caught, so nobody re-finds it

An earlier pass of this sweep reported the whole top bar at **2.21:1** and the active tab at
**1.00:1** on the light ground. Both were false. The theme change had left CSS colour transitions
mid-flight; the computed values were interpolated. After finishing animations the same elements
read `rgb(94,102,115)` and `rgb(28,31,36)` on `rgba(242,238,231,0.86)` and pass, and the screenshot
shows a perfectly legible bar. **After changing theme, finish the transitions before sampling** —
a reload alone is not enough.

A second false positive, "Ask next" at 1.00:1, came from a bug in the sweep's own alpha
compositing (it treated a partially composited colour as opaque). Corrected, that element measures
**5.85:1**. Every number in this section is from the corrected pass.

---

## 5 · Frozen / non-compositing tab

Proved by **replacing `requestAnimationFrame` with a no-op** and then driving the app, not by
watching. Counter confirmed 0 frames delivered on the tab-switch pass and 4 requested-never-served
on the report card.

With rAF dead:

- **Nothing stuck below opacity 1** anywhere. Every element wider and taller than 2 px on Calls,
  Deadlines, Lessons, About, the report card and the live call read computed opacity 1.
- **No bar stuck at zero length.** No element matching bar/track/fill/meter/ring measured under
  1 px wide on any screen.
- **The active-tab underline has real width** — 79 px on Calls, 104 px on Deadlines, 69 px on
  Lessons, 58 px on About, matching the tab's own box.
- **The score ring still lands on its number**: `aria-label` "score 90 out of 100" and the visible
  read-out "90/100", with zero frames ever delivered.
- **The phone sheet is at its resting position** — `.sheet peek`, top 664 of an 812 px viewport.
- `scrollWidth − clientWidth` = 0 on all four screens with rAF dead.

Why it holds: `useCountUp` (`src/lib/useCountUp.ts:18`) and `ScoreRing`
(`src/components/ScoreRing.tsx:81`) both arm a `setTimeout` safety that draws the final value, and
both short-circuit on `document.hidden` or the Less-motion switch. The comments in
`call-history.css`, `report-deadline.css` and `ResponseTimes.tsx` show the grow-from-zero-behind-rAF
pattern was already hunted out. It is genuinely fixed.

---

## 6 · Keyboard

Driven with **real key events**, not synthetic ones — synthetic `KeyboardEvent`s do not reach the
handler, and a first attempt using them produced a meaningless pass. A positive control was
established first: with focus on `body`, a real **H** marked the newest sign handled. Only then
were the negative cases run.

**H / E / T do not fire from a text field.** Focus in the type row, then H, E, T: the input value
became the literal string `"het"`, no sign changed state, the call did not end.

**H / E / T do not fire from the Settings panel.** Panel open (`.acct-panel.a11y-panel`), H then E
then T: no sign changed, still on the call.

**H / E do not fire from an open listbox.** The speaker `[role=combobox]` open with
`aria-expanded="true"`: no sign changed, still on the call.

**Every control has a visible focus ring.** Tabbed through the live call: Listen, the speaker
select, the type row, the transcript quote buttons and both Mark-handled buttons all reported
`outline: 2px solid`, offset 2 px, and `:focus-visible` true. The ring is gold `rgb(199,156,90)` on
dark surfaces and switches to ink `rgb(28,31,36)` on the gold legal card, which is correct — a gold
ring on a gold card would vanish. Ring against the page ground measures **6.56:1** (needs 3.0).

**"Thicker focus ring" now reaches text inputs — confirmed fixed.** With `thickFocus` on
(root class `thick-focus`), `INPUT.field` outline goes **2 px → 4 px**, offset 2.67 px,
`:focus-visible` true. Same 4 px on the Listen button, the speaker select and the replay button.
This is the thing that silently skipped every input until this morning; it does not any more.

---

## 7 · Gates

Run on `a55f0e5`, the tree clean apart from one untracked artefact.

| gate | result |
|---|---|
| `npx tsc -b` | **exit 0**, no diagnostics |
| `node scripts/gate-css.mjs` | **exit 0** — "css gate: 12 file(s), every fr track has a zero floor" |
| `npm run build` | **exit 0** — 162 modules, built in 445 ms, `index.js` 1,152 kB / 320 kB gzip |
| `npm run lint` | **exit 0** — 4 warnings, 0 errors |

The 4 lint warnings, unchanged and all pre-existing: `useCountUp.ts:14` set-state-in-effect,
`speech.ts:113` immutability, `speech.ts:41` refs-during-render, `Sheet.tsx:100` set-state-in-effect.
Vite warns the chunk is over 500 kB. None of these block anything.

### F3 · A twenty-minute window this morning where `main`'s tree did not compile

At 13:01 the working tree carried `import "./scenario-draft.css"` in `ReportCard.tsx` with **no such
file on disk**, plus two `TS6133` unused-variable errors at `ReportCard.tsx:203` and `:211`. `tsc -b`
failed, so `npm run build` never reached Vite, and the dev server threw a full-screen overlay:
*"Failed to resolve import ./scenario-draft.css"*. It was fixed inside about fifteen minutes by
whoever was editing, and `scenario-draft.css` is now committed (the css gate counts 12 files, up
from 11).

Nothing to fix — but the near-miss is worth one line in the freeze checklist:
**a new CSS file must be `git add`ed in the same commit as the component that imports it.** For a
window this morning that file was untracked while the import that needs it was staged; a commit in
that state would have broken `main` for everyone.

---

## What I could not check, stated plainly

1. **The deployed engine.** Every verdict, score and adjudication above came from the local dev API
   on port 8787 running `gemini-2.5-flash`. The deployed Supabase function was never called and may
   run a different model. **Nothing here is evidence about production.**
2. **The practice voice session.** Not started — the ElevenLabs quota is exhausted and each attempt
   burns a concurrency slot. The Practice screen was swept for contrast and overflow only.
3. **The sheet dragged to its expanded detent** at 375 px. Its resting position is measured and
   correct; the drag gesture was not exercised.
4. **A report card rendered under all-accessibility-on with a full verdict ledger.** The card that
   opened in that state was a short one (no ledger rows). The HANDLED / MISSED / PARTLY chips *were*
   measured under all-on, on the compare board, which carries the same chips — 0 fails on both
   grounds. The chips on the report card itself under all-on were not separately sampled.
5. **Widths other than 375 and 1280.** The brief asked for those two; 288, 320, 768, 885, 960 and
   1440 were not swept this pass.
6. **Which persisted report belongs to which run.** The `reports` array in `the-hard-call:v1` holds
   ten entries, two of which carry literal call ids ending `…coached` and `…silent` with 240 s
   durations and scores 95 and 20 — seeded fixtures sitting in the same **Calls** list a judge will
   click. I could not reconcile the array's ordering against the runs I had just made and stopped
   rather than burn budget on it. **Worth thirty seconds from whoever owns the store**, and worth
   deciding before Monday whether those two fixtures should be visible in the call list at all.

## Housekeeping

- `localStorage` was restored byte-for-byte: `the-hard-call:a11y` is back to the exact default
  object it held at 12:56, and the two helper keys this sweep created were removed. Another
  session's `__sweepSrc` and `__mark` keys were left untouched.
- **This sweep added five calls and three deadlines to the stored history** by running the demo four
  times. If the demo should open on a clean call list, clear history before Monday.
- Console errors in the buffer are dev-server HMR failures from the concurrent editing
  (`CallScreen.tsx`, `ReportCard.tsx`, `CallHistory.tsx`, `App.tsx` each failed to hot-reload at
  least once) plus one thrown by this sweep's own helper. **No application error was observed.**
  All API calls to the local engine returned 200.
- Nothing was committed or pushed.

---

## Follow-up, after this sweep was written

**Two of the four findings are fixed and pushed.**

- **F1, the LEGAL badge failing contrast with High contrast on** — fixed. The
  pill used `--line-2` as its fill; that token is a *hairline*, and
  `.high-contrast` deliberately raises it, so the accessibility setting made
  the element worse. It is now its own opaque surface: measured **6.81:1** on a
  real handled legal card with High contrast on, up from 3.67:1. The fill is
  opaque, so the ratio does not depend on the page behind it.
- **F2, the report card taller than a 720px fold** — not a code change. Recorded
  in `docs/DEMO-SCRIPT.md` as a presenting instruction: everything the pitch
  says out loud is already in the first 720px, so say the claim, then scroll
  once, deliberately, to the per-sign table and stop. Never scroll while
  talking.

**F5, "She lost her job" beside three "Customer …" labels — investigated, not a
missed rename.** The titles are written by the model, and the prompt at
`supabase/functions/api/flags.ts:130` explicitly asks for that shape: *"She
said she lost her job", not "Unemployed customer"*. So the mixed wording is
model variance inside an instruction that is working. Making all four agree
means changing that prompt line, which is the team's file. Left as a note
rather than a fix.

**The two seeded calls are local test residue, not shipped.** `c-coached` and
`c-silent` exist only in this machine's browser storage, written by an agent
during testing — `grep` across `src/` and `supabase/` finds neither. A judge
opening the site on their own machine starts with empty storage and will not
see them.

## Also fixed after this sweep, found on the deployed site

**Settings stayed open on top of whatever you navigated to.** Open Settings,
click a tab: the tab takes `aria-current`, the view changes underneath, and the
panel stays on top. At 375 it covers the whole screen, so the app looks like it
ignored the tab you pressed. The cause is the thing that makes the panel good —
it is deliberately non-modal so a worker can reach it mid-call, and so nothing
outside it was closing it.

⭐ **A non-modal panel still has to answer to navigation. "Modeless" means it
does not trap you, not that it survives you leaving.**

## Still open after the cold-start fix

**On a phone, the sheet clips the bottom 18px of the Listen button.** Measured
at 375x812 idle: Listen occupies 642–682, the sheet rests at 664. Its centre is
at 662, so `elementFromPoint` returns the button and it is still tappable — but
it is visually cut, and one step of larger text would close that 2px margin.

Left alone deliberately. The sheet's resting position has been broken and
repaired twice already, and a change to its geometry the day before a freeze
risks the whole phone layout to fix something that currently works. Whoever
picks it up: the honest fix is clearance in the idle type row, not a new
resting detent.
