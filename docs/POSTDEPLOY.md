# Post-deploy check, 13 Sep 2026

Checked 04:00–04:22 UTC (2:00–2:22 pm AEST) against
**https://aufanhakim1920-source.github.io/the-hard-call/** — the deployed site, not the dev
server. Every measurement below carries `location.href` proof of origin.

**Verdict: the app is sound. Three demo runs on the live site, the asymmetric claim holds all
three times, the answer-time strip is fixed, and there is not one contrast failure anywhere.
One thing is stale — the About page's eval numbers — and its deploy is stuck in the queue.**

---

## 1. Which commit is live

| | |
|---|---|
| **Live commit** | **`4e2ecb1`** (merge of main), Pages run `34736803879`, finished **03:59:51 UTC**, success in 35 s |
| Live bundle | `assets/index-pG19eAvq.js` |
| `origin/main` tip | `d8b5f79` |
| **Gap** | **1 application commit + 1 `[skip ci]` log commit** |

The live build carries both of this session's fixes, confirmed by string in the served bundle:
`"Play the demo call"` (the first-screen fix, `4e93fe8`) and the lower-case `"no answer found"`
(the answer-time fix, `2bcdbae`).

### ⚠️ The one stale thing, and it is a deploy that is stuck

`d8b5f79 "eval: re-run on the grown suite…"` pushed at **04:10:20 UTC**. Its Pages run
`34737262567` was **still `queued` twelve minutes later** at 04:22. Every previous Pages run in
this repo finished in **33–36 seconds**. It is queued, not failed — nothing is broken, it is
waiting on a runner.

It touches `README.md`, `docs/DECISIONS.md`, `eval/results.json` and `public/eval-results.json`.
**No `src/`** — so no application code is stale and everything verified below still stands.

But `public/eval-results.json` ships to the site and About fetches it
(`src/components/About.tsx:110`), so **the live About page is quoting the older eval run**:

| About shows now (live) | After the queued build lands |
|---|---|
| RECALL **69%** | RECALL **72.1%** |
| EXACT MATCH **68%** | EXACT MATCH **72.7%** |
| LATENCY P50 **1.9 s** | P50 **1.74 s** |
| **41** labelled utterances | **44** labelled utterances |
| precision 100%, 13 failures | precision 100%, 12 failures |

The live page **understates** the engine. If the run has not gone green before submission,
re-trigger the Pages workflow — the fix is a re-run, not a code change.

---

## 2. The demo path on the deployed site, both ways

Three real runs, every one judged by the **deployed** edge function on **`gemini-flash-latest`**
(read back from the stored report, not assumed).

| run | viewport | coaching | signs | handled | partly | **missed** | legal sign | score |
|---|---|---|---|---|---|---|---|---|
| 1 | 1280×720 | **on** | 4 | 4 | 0 | **0** | **handled** | **95** |
| 2 | 1280×720 | **off** | 5 | **0** | 0 | 5 | **missed** | **10** |
| 3 | 375×812 | **on** | 4 | 3 | 1 | **0** | **handled** | **85** |

**The claim holds, and it is genuinely asymmetric.** Nothing MISSED on either coached side.
Nothing HANDLED on the silent side. The statutory notice was handled coached (twice) and never
addressed silent.

The statutory notice, both ways:

- **Coached:** "Needs payment reduced for months", verdict HANDLED, answered at 0:49 —
  *"I'll send you the hardship form today and we'll go from there."* Reply due **Sun 4 Oct,
  21 days**, National Credit Code s 72(4).
- **Silent:** "Unsure when repayments can resume", verdict MISSED. The card says it straight:
  *"One is a legal obligation — a reply is due Sun 4 Oct, 21 days from this call, and the
  worker never addressed it."*

One honest wrinkle, not a defect: the two runs raised **different sign sets** (4 vs 5), because
the demo script branches — the silent worker actually says worse things ("So when do you think
you could pay the full amount?"). The compare board already states this itself:
*"These two calls did not raise the same signs (4 and 5), so the two scores are not counting the
same things."* That caveat is the right call and should stay.

### The answer-time strip — the reason for this run. **Fixed.**

Zero occurrences of `NO ANSWER FOUND` across all three report cards. The strip, the ledger and
the cards below now agree with each other in every run:

| run | strip footer | strip rows | ledger | cards below |
|---|---|---|---|---|
| 1 coached | **4 of 4 answers timed**, fastest 4.0 s · slowest 14 s | 4 × HANDLED with a time | 4 of 4 answered, 0 missed | 4 × HANDLED |
| 2 silent | **no answers on this call to time** | 5 × MISSED / **NOT ADDRESSED** | 0 of 5 answered, 5 missed | 5 × MISSED |
| 3 coached | **4 of 4 answers timed**, fastest 4.0 s · slowest 6.0 s | PARTLY 4.0 s + 3 × HANDLED | 4 signs | 1 PARTLY, 3 HANDLED |

An unanswered sign now prints **NOT ADDRESSED**, which is true, instead of "NO ANSWER FOUND"
over an answer that was right there. Nothing is blank and no lane is missing.

Slowest coached answer is **14 s** and it is real, not latency: measuring from the triggering
line rather than the API response is exactly what makes a 14 s gap printable at all. Under the
old arithmetic the model's round trip would have eaten it.

---

## 3. The cold first screen — passes at both widths

Storage cleared, then loaded, at **1280×720** and **375×812**:

| | measured |
|---|---|
| `NOT STARTED` chip | present, leads the setup row |
| clock | **`--:--`** — not counting |
| primary | gold **`▶ Play the demo call`**, `rgb(199,156,90)` on `rgb(28,31,36)`, 152×34, top-right of the header |
| `End call` | **absent** — 0 matches in the DOM |
| horizontal overflow | **0** at 1280, **0** at 375 |
| contrast failures | **0** at both |

At 375 it is unmistakably the loudest thing on the page — full-width gold block, everything else
outlined or plain. A stranger cannot miss it.

---

## 4. Layout at 1280 and 375

**Horizontal overflow is 0 in every state measured** — idle, mid-call, live tip card, live legal
card, handled legal card, both report cards, the compare board, Deadlines, Lessons, About,
Practice — at both widths, in both grounds, with every accessibility setting on.

**End call is reachable without scrolling once a call is running.** At 375 during run 3, with
`scrollY: 0`, the button sat at **top 135 → bottom 175** inside an 812 px viewport. It never
needs a scroll.

**The sheet does not block the transcript or the type row.** Measured with the sheet collapsed:
it covers the bottom **148 px**, and with the page scrolled to the end the newest transcript line
sits at **bottom 457** — **207 px clear** of the sheet's top edge at 664. When the sheet is
*expanded* it does cover the transcript, which is the point of dragging it up; "drag down" is
right there in the handle row. The type row is not rendered during a demo replay at all — the
speed control takes that slot, by design, same as at desktop.

`matchMedia('(max-width:768px)')` reported **true** at 375 and **false** at 1280, so the phone
reads are real phone reads.

**Known and accepted, confirmed still true, not re-reported as new:** the sheet clips the bottom
18 px of the Listen button at idle; the centre is clear and it is tappable.

### One low-priority observation, 375 only

The tab strip is a deliberate horizontal scroller (`nav.tabs`, `overflow-x: auto`,
`scrollWidth 432` vs `clientWidth 375`), so **About sits off the right edge** with no visual
affordance that there is more. Page overflow is still 0 — this is a discoverability nit, not a
layout fault. A fade on the right edge would fix it. Not worth touching before Monday.

---

## 5. Console and network

Buffer marked before starting (`=== PD-MARK-A ===` onward); everything below is post-mark and
live, not stale.

**No 404s. None.** `eval-results.json` returns **200** — the About 404 is gone. All seven
`sfx/*.mp3` return 206.

**Every edge-function call succeeded.** From the Resource Timing API on the deployed origin:

- **25 × `/functions/v1/api/flags` → 200.** Zero 503s, zero retries.
- **2 × `/functions/v1/api/report` → 200.**
- **1 × `/functions/v1/api/health` → 200** — called against the deployed host, and About's
  live line reads *"Server: up · model gemini-flash-latest · key configured"*.

⚠️ The **first** flags call after a cold edge-function start took **13.4 s**. Every call after it
settled at **1.6–3.0 s**. In the demo this was invisible — the first sign still landed at 00:17 —
but if the functions have been idle before a live demo, **play the demo once to warm them** or
the first sign will feel slow.

### Errors — four in total, and only one belongs to the app

1. **`422` on `POST /auth/v1/signup`**, once per cold load, 322 ms. **By design.** Anonymous
   sign-ins are off on the Supabase project; `src/lib/auth.ts` catches it, falls back to
   device-only mode, shows "Saved here only" honestly, and suppresses the retry for 30 minutes.
   The code comment already names the console-red problem. It is cosmetic, it is a red line in
   dev tools for anyone who opens them in the first half hour. If you want it gone before
   Monday the fix is a dashboard toggle — turn anonymous sign-ins **on** for the project — not
   a code change.
2. **`t?.closest is not a function`** — **my fault, not the app's.** The stack's second frame is
   `<anonymous>:1:11`, which is my injected script: I dispatched a synthetic `keydown` on
   `document`, whose target has no `.closest`. A real key press always targets an element. Does
   not reproduce on a user path. If you want belt-and-braces, the global key handler could guard
   `typeof e.target?.closest === "function"` — one line, optional.
3–4. **`navigator.vibrate` blocked ×2** — Chrome refuses haptics without user activation, and I
   drove the app with scripted clicks rather than trusted taps. Does not happen when a person
   taps. Ignore.

---

## 6. Contrast on the deployed build

Computed, never eyeballed: relative luminance, `(L1 + .05) / (L2 + .05)`, alpha composited
against the real stacked ancestor background, 4.5 for body text and 3.0 for large text. I also
checked for ancestor `opacity` that would make a nominal ratio a lie — **there is none anywhere
in the app**; dimmed states use literal colours, so the measurements are honest.

**Zero failures. Every state, both grounds, default and with every accessibility setting on.**

| state on screen | nodes | fails |
|---|---|---|
| idle first screen, 1280 | 96 | 0 |
| idle first screen, 375 | — | 0 |
| waiting column mid-call (coached, ~29 s) | 79 | 0 |
| waiting column mid-call (silent — "Coaching is off for this call") | 66 | 0 |
| live tip card | 96 | 0 |
| live legal card + running deadline | 116 | 0 |
| **HANDLED legal card** | 11 | **0** |
| report card, coached | 125 | 0 |
| report card, silent | 140 | 0 |
| compare board | 86 | 0 |
| Deadlines, running | 33 | 0 |
| Deadlines, settled | 33 | 0 |
| About | 61 | 0 |

**The badge that failed at 1.01:1 is fixed.** On the handled legal card the `LEGAL` badge now
measures **6.81:1** — `rgb(242,238,231)` on `rgb(74,82,96)`. When the card is marked handled it
drops its gold ground and the badge moves to slate, so there is no longer gold-on-gold. The rest
of that card: "Reply due" / "Sun 4 Oct" / "21 days left" / "handled 01:50" all **9.29:1**,
"Ask next" **9.39:1**, the Undo button **5.95:1**.

Report-card verdict badges: `HANDLED` **8.97:1** on the sign cards and **6.47:1** on the
answer-time strip stamps; `MISSED` **8.97:1**.

### Accessibility extremes and both grounds

All eight visual settings on at once — line spacing, hyperlegible, higher contrast, reduce
transparency, underline links, less motion, bigger buttons, thicker focus ring — plus **text size
Largest**, walked across all six pages:

- **Dark:** Live call 44, Calls 86, Deadlines 33, Lessons 26, About 61, Practice 62 nodes —
  **0 failures, 0 overflow**.
- **Light** (`body` = `rgb(242,238,231)`, ink `rgb(28,31,36)`): same six pages plus a report card
  (81 nodes) — **0 failures, 0 overflow**.

One cosmetic note at Largest text: the speaker dropdown truncates to "Custom…". It is an
ellipsis, not an overflow. Leave it.

**A false alarm I caught, recorded so nobody re-raises it:** my first read after clicking "Light"
showed `body` still at `rgb(28,31,36)` and a screenshot with a dark page under a light settings
panel. That was **sampled mid-transition**. Re-read after the repaint: the theme is fully and
correctly applied everywhere. The light theme is fine.

---

## 7. What I could NOT check, stated plainly

- **The queued build `d8b5f79` never deployed while I watched.** I verified the *pending* eval
  JSON on disk and the *live* one over HTTP and diffed them, but I could not see the new numbers
  rendered on the live About page, because they are not there yet.
- **Practice / voice.** Not touched at all — the ElevenLabs quota is exhausted and every attempt
  burns a shared slot. The Practice **page** renders and was swept for contrast and overflow; no
  session was started, so nothing about the voice agent is verified here.
- **The wider width ladder.** Only **1280 and 375** were measured, as briefed. 288, 320, 768,
  885, 960, 1024 and 1440 were **not** swept this run.
- **Keyboard-only runs.** Not done this pass. The keyboard hints are visible in the UI
  (`E` end call, `H` handle newest, `T` type) but I drove the app by click, so I cannot claim
  the shortcuts or the focus order work.
- **The edge functions' own logs.** I proved the deployed functions answered — 25 flags calls and
  2 report calls all 200, from the deployed origin — but I did not read the Supabase-side logs,
  so I cannot speak to anything that failed server-side and was retried into a success.
- **Auto-scroll of the live transcript at 375.** At ~30 s into run 3 the page sat at `scrollY: 0`
  while the newest line was at y ≈ 901, off-screen. After a manual scroll everything sat clear of
  the sheet, so nothing is permanently hidden — but I did not re-run to establish whether the
  transcript follows the newest line on its own or waits for the user. **Observed once, not
  reproduced.**

---

## 8. Ranked, worst first

1. **The live site quotes stale eval numbers** (recall 69% / exact 68% / 41 cases instead of
   72.1% / 72.7% / 44). Cause: Pages run `34737262567` has been `queued` for 12+ minutes against
   a 35-second norm. Fix: let it drain, or re-trigger the workflow. **No code change.**
2. **A `422` in the console on every cold load** — anonymous sign-ins off on the Supabase
   project; handled correctly in code, cosmetic only. Fix if wanted: enable anonymous sign-ins
   in the project dashboard.
3. **First flags call after an idle edge function takes 13.4 s** (steady state 1.6–3.0 s).
   Fix: warm it with one demo run before showing anyone.
4. **"About" is off the right edge of the tab strip at 375**, no scroll affordance. Cosmetic.

Nothing on this list blocks Monday.

---

*Read-only check. No repository file was modified other than this one. Nothing committed,
nothing pushed.*
