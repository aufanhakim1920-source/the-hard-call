# The deployed site, verified

Checked 13 Sep 2026, ~03:15–03:30 UTC (1:15–1:30 pm AEST), against
**https://aufanhakim1920-source.github.io/the-hard-call/** — not the dev server.

Verdict: **the live site is current and the demo works on it.** Two real defects, one
cosmetic, one live-risk. Nothing blocks the submission.

---

## 1. Which commit is live

**The site is NOT behind.** It serves `324c9fb`, built and deployed at 03:17:35 UTC,
run `34735122480`, conclusion success.

| | |
|---|---|
| Live build asset | `assets/index-DcdUWsnN.js` + `assets/index-BROz5zcC.css` |
| Live commit | `324c9fb` (merge of main) |
| `origin/main` tip | `a55f0e5` |
| Gap | **one commit — `a55f0e5 "log: update team log [skip ci]"`** |

That single commit ahead of the deploy is the github-actions bot appending
`TEAM-LOG.md`, carrying `[skip ci]`. It contains no application code and by design
does not deploy. **Effectively the live site is fully up to date.**

Every Pages run in the recent history succeeded — no failed build is hiding an old
artifact. The last three deploys: `be735ed` 03:14:11, `147e169` 03:16:49,
`324c9fb` 03:17:35, all green in 33–37s.

**Dating the build by content:** the waiting column shipped in `eaa66d6` is present
on the live page — the string "both halves, in one thing the customer says" renders
on a cold load at both 1280 and 375. The build is new, confirmed by content, not just
by the run log.

⚠️ **The repo moved three times while this check ran.** The demo run in section 3 was
executed against `index-DyRAu1JR.js` (build `147e169`), one commit behind the current
live `324c9fb`. The only app-code difference between them is
`src/components/Practice.tsx` (+32/-3), which does not touch the call screen, the
report card or the engine. The report-card evidence therefore still holds for the
current build. The Practice tab itself was **not** re-verified — see section 7.

---

## 2. The engine answers, from the deployed origin

**Yes.** The app reaches its API from the GitHub Pages origin, and the wiring baked in
at build time is correct.

**Health**, called with the anon key, `Origin: https://aufanhakim1920-source.github.io`:

```
200  {"ok":true,"gemini":true,"keys":2,"model":"gemini-flash-latest","time":"..."}
```

**The deployed function reports its model as `gemini-flash-latest`.** Two keys loaded.
Six consecutive probes: 6/6 → 200, 134–183 ms.

**CORS is correctly configured for the deployed origin.** The preflight returns:

```
HTTP/1.1 204
Access-Control-Allow-Origin: https://aufanhakim1920-source.github.io
access-control-allow-headers: authorization, apikey, content-type, x-client-info
access-control-allow-methods: POST, GET, OPTIONS
```

The allow-origin echoes the Pages origin exactly — not `*`, not localhost. This is the
failure that would have been invisible locally and fatal on stage; it is not present.

Without an auth header the endpoint returns `401 UNAUTHORIZED_NO_AUTH_HEADER`, which is
correct behaviour, not a fault.

**Build-time configuration** is supplied by GitHub Actions repository *variables*
(`VITE_API_BASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_ELEVENLABS_AGENT_ID`), consumed by `.github/workflows/pages.yml`. The Supabase
key published to the client decodes to `role: anon` — the publishable key, protected by
RLS. **No `service_role` key is exposed in the build.** The Gemini key is held in
Supabase and never reaches the client. Values themselves are not reproduced here.

The strongest proof the app talks to its own API from the deployed origin is not the
curl: it is that the live report card is stamped **"judged by gemini-flash-latest"**,
the same model string the deployed health endpoint reports for itself.

---

## 3. The demo call on the deployed site — the pitch claim holds

Both halves were run end to end **on the live site**, not locally.

### Coached (assistant on) — score 90/100, 0 MISSED

```
REPORT CARD · DEMO   Sarah M.
13 Sep, 1:18 pm · 2 min 5 s · judged by gemini-flash-latest
90/100        0 MISSED
4 of 4 signs answered, 0 missed.
```

Four signs raised, all four answered while the call was still live:

| Sign | Verdict | Worker's answer |
|---|---|---|
| Things have been a bit tight | HANDLED | 0:19 "Would it help if we looked at changing your repayments…" |
| Laid off last month | HANDLED | 0:29 "Take your time — what would make things easier right now?" |
| Customer feels stressed about finances | HANDLED | 0:40 "That's exactly what our hardship team can set up." |
| Needs payment relief for few months (**LEGAL**) | HANDLED | 0:49 "I'll send you the hardship form today…" |

**The statutory notice fired and is correct.** Raised as a LEGAL sign citing *National
Credit Code s 72(4)*, reply due **Sun 4 Oct 2026** — exactly 21 days from the call date
of 13 Sep. The deadline also propagated to the Deadlines tab ("1 obligation on a
clock", badge incremented).

### Silent (coaching off) — score 10/100, 5 MISSED

```
REPORT CARD · DEMO   Sarah M.
13 Sep, 1:21 pm · 1 min 11 s · judged by gemini-flash-latest
10/100        5 MISSED
0 of 5 signs answered, 5 missed.
```

During the silent call the sign stack showed **0 signs** — measured, not assumed: zero
"Mark handled" controls existed in the DOM for the whole call. The panel read
"silent this call … Nothing appears here while you are on the phone." The report card
correctly labelled it: "The assistant ran silent on this call… A low number here
measures what a call misses without it." The legal obligation was still detected and
still clocked (reply due Sun 4 Oct) even though nothing was shown live.

### The claim

> nothing MISSED on the coached side, nothing HANDLED on the silent side

**CONFIRMED on the deployed build.** Coached: 0 missed, 4/4 handled. Silent: 5 missed,
0/5 handled. The asymmetry is real and it is reproducible on the live URL.

Note the two runs use different worker scripts — the silent run's worker asks
"So when do you think you could pay the full amount?" where the coached run's asks
"what would make things easier right now?" — and the silent script raises a fifth sign.
That is the demonstration working as designed, but be ready for a judge who asks
whether the comparison is like-for-like: **it is not the same worker performance, it is
the same customer**. Say so before they ask.

---

## 4. Layout — 1280x720 and 375

Measured on the current live build, cold, after entrances settled.

**1280x720 — clean.**

| Check | Result |
|---|---|
| Horizontal overflow | **0** (`scrollWidth` 1280 = `clientWidth` 1280) |
| Element extending past the viewport | none |
| "End call" without scrolling | **yes** — at y 70–104, viewport 720 |
| Page scroll | none — `scrollHeight` 720 = `clientHeight` 720 |

**375x812 — clean, with two cosmetic notes.**

| Check | Result |
|---|---|
| Horizontal overflow | **0** (`scrollWidth` 375) |
| Phone breakpoint actually active | **yes** — `matchMedia("(min-width: 768px)")` is `false`, so this is a real phone read, not the pane lying |
| "End call" without scrolling | **yes** — y 221–261 |
| Bottom sheet covers the transcript? | **no** — collapsed it is a peek bar at the bottom; the transcript sits above it and is fully readable |
| Bottom sheet covers "Listen"? | **no** — Listen at y 411–451, well clear |
| Bottom sheet covers the type row? | **no** — the "Or type what was said…" row sits above the peek bar |

Verified by screenshot at 375, not only by measurement. When the LEGAL sign fires the
sheet auto-expands and does then cover the transcript — that is deliberate (it is the
one thing you want on a phone at that moment) and it collapses again from the "drag
down" handle, which works.

An early automated read reported Listen as covered; the screenshot disproved it. The
crude fixed-element probe was catching the sheet's full-height container rather than
the visible panel. **Listen and the type row are clear.**

---

## 5. Console and network

The buffer was marked before testing (`=== VERIFIER MARK ===`) and again before the
cold load (`=== COLD LOAD MARK ===`), so stale entries are separated from live ones.

**Stale (before the mark, from earlier sessions):** 2× 422, 2× 502. Ignore.

**Live, during the two demo runs:**
- **3 × HTTP 502**
- **1 × warn: `flags failed … gemini gemini-flash-latest 503 UNAVAILABLE`**

**Live, on the cold load:** **1 × HTTP 422**.

**No 404s. No failed assets.** Every static file loaded: the JS and CSS bundles 200,
all seven `sfx/*.mp3` returned 206. No missing font, image or sound.

### The 422 is known and handled — not a bug
`src/lib/auth.ts` documents it: Supabase **anonymous sign-ins are switched off** on the
project, so the first load asks and is refused. The app remembers the refusal for 30
minutes in `localStorage` under `the-hard-call:anon-off-until` and falls back to local
mode — the "Saved here only" badge in the header. Cost: exactly **one red line in the
console on a genuinely fresh browser**, then silence. If a judge opens dev tools in the
first seconds, that is what they see. Turning anonymous sign-ins on in the Supabase
dashboard removes it; nothing in the repo needs to change.

### The 502/503 is the one live risk worth knowing about
Upstream **Gemini returned 503 UNAVAILABLE** during the demo, and the app surfaced 502s.
The report cards still came back correct, so the retry path works — but a flags call
that fails is a sign that may not be raised live. This is upstream capacity, not the
function: the function's own health was 6/6 green at ~150 ms immediately afterwards.

**Possibly connected:** in the coached report card, the answer-time strip reads
**"NO ANSWER FOUND"** against three of the four signs and **"1 of 4 answer times
measured"**, while the detail cards immediately below quote each worker answer with a
timestamp (0:19, 0:29, 0:40, 0:49). The card contradicts itself on the same screen.
A judge reading top to bottom will see "NO ANSWER FOUND" next to a sign the next
paragraph says was handled at 0:19. This is the most visible cosmetic defect on the
deployed site.

---

## 6. Cold load, fresh state

Cleared `localStorage` and `sessionStorage`, reloaded, waited for entrances.

- Page loads, title "CallFlag — client alerts for banking staff".
- The waiting column renders its real content — the legal test in the customer's own
  words, the two halves, the recovery signal, the 21 days with the section. Not an
  empty state.
- Overflow 0 at 1280 and at 375.
- "End call" reachable without scrolling at both.
- The only storage key written on load is `the-hard-call:anon-off-until` (see above).
- One 422 in the console, as documented.

**This is what a judge sees, and it is fine.**

---

## 7. Defects, worst first

1. **The report card contradicts itself on answer times.** The strip says
   "NO ANSWER FOUND" and "1 of 4 answer times measured" for signs the cards below quote
   answers for. Live on the deployed site, in the coached demo — the exact screen the
   pitch lands on. *Fix: the answer-time strip and the per-sign cards read different
   fields; make the strip fall back to the card's matched answer rather than printing
   NO ANSWER FOUND.*

2. **The Settings panel does not close when you navigate away.** Open Settings, click
   "Live call": the tab is marked `aria-current="page"` but the Settings panel stays
   open on top of the call. At 375 it covers the entire screen — the demo appears
   broken. Reproduced deliberately: toggling the Settings button closes it correctly
   (`true → false`), but a nav click leaves it `true`. *Fix: clear the settings-open
   state in the nav handler.*

3. **Gemini 503 during the demo (upstream).** Three 502s and one explicit
   `503 UNAVAILABLE` across two live runs. Retries covered it and both report cards
   were correct, but a dropped flags call means a sign may not appear live. Nothing to
   fix in the repo; know it can happen mid-pitch and know the demo replay still scored
   correctly when it did.

4. **One 422 on a cold load.** Documented and handled; costs one red console line on a
   fresh browser. *Fix, if wanted: enable anonymous sign-ins in Supabase.*

5. **Cosmetic, 375.** The nav strip scrolls horizontally — "About" sits off-screen and
   needs a sideways swipe within the nav (document overflow is still 0, so this is a
   contained scroller, not the phone bug). The line "Only signs are kept. Words are
   never stored." is clipped by the sheet peek bar, and the type-row placeholder is
   truncated mid-word.

---

## 8. What was NOT checked, and why

- **The Practice tab.** Deliberately not exercised — the ElevenLabs quota is exhausted
  and each attempt consumes a concurrency slot. This matters more than usual here:
  `src/components/Practice.tsx` is the *only* app file changed between the build the
  demo was run on and the build now live, and it is therefore the one part of the
  current deployment nobody has run. Its commit message says it fixes a raw model error
  printing whatever the model sent.
- **The voice path end to end**, for the same reason.
- **The API calls in the network panel.** The recorder captured document, JS, CSS and
  audio requests but recorded nothing for the Supabase function host, so per-request
  status codes for `/flags` and `/report` could not be listed. The console 502s and the
  correct, model-stamped report cards are the evidence used instead.
- **Widths other than 1280 and 375**, both grounds, the accessibility extremes,
  keyboard-only runs and computed contrast — outside this brief, which was scoped to
  the deployed-vs-local gap. The accessibility controls are present in Settings on the
  live build (text size, line spacing, hyperlegible, ground, higher contrast, reduce
  transparency, underline links, less motion, bigger buttons, thicker focus ring,
  announce signs, read aloud) but none of them were measured here.
- **The site as another user.** Everything was read from one browser profile.
