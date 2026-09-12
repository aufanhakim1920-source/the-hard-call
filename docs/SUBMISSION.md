# Submission checklist

**Submissions close Monday 14 Sep, 12:00pm. Late is not considered.**
**`main` freezes Monday 11:00am** — one hour of slack for a bad deploy, and nothing merges after it.

Every line below is a yes/no somebody can check. Status is what was true when this file was written
(13 Sep, shortly after midnight). Tick it yourself before you trust it.

---

## A · The four things the submission form needs

| # | Must be true | How to check | Owner | Status |
|---|---|---|---|---|
| A1 | **Track named in the description**: Track 3 — Solve a Business Problem, plus Built With ElevenLabs | Read the Devpost description back | Aufan | not submitted |
| A2 | **Public codebase link** | Open the repo signed out: github.com/aufanhakim1920-source/the-hard-call | Aufan | **yes** — public, no licence file |
| A3 | **Production URL**, not localhost | Load https://aufanhakim1920-source.github.io/the-hard-call/ on a phone off the home wifi | Aufan | **yes** — HTTP 200, engine answering |
| A4 | **A 3–5 minute video showing the app working end to end**, not slides | The file exists and plays | Aufan | **NO — does not exist. Highest risk on this page.** |
| A5 | **Re-read the event's Official Rules before submitting** — it said "TBC" as of 10 Sep; an IP-transfer clause would change what we hand over | Open the rules page on Devpost | Aufan | not re-checked |

## B · The build on `main`

| # | Must be true | How to check | Owner | Status |
|---|---|---|---|---|
| B1 | `main` builds green | `npm run build` | whoever merges last | check at freeze |
| B2 | The CSS gate passes | `npm run gate` | same | **yes** |
| B3 | Offline report tests pass | `node --test eval/report.test.mjs` → 7 pass | Shawn | **yes, 7/7** |
| B4 | The Pages deploy for the final commit finished | Actions tab, green tick, then hard-reload the live URL | whoever merges last | check at freeze |
| B5 | The live engine answers | `/functions/v1/api/health` returns `"gemini":true` | Tron | **yes — `gemini:true`, 2 keys armed, model `gemini-flash-latest`** |
| B6 | No secret is committed | `.env` git-ignored, only `.env.example` tracked, no key-shaped strings in tracked files | anyone | **yes, scanned** |
| B7 | **Nothing uncommitted in `src/`** at freeze | `git status` is clean | everyone | report-visual files were uncommitted at the time of writing |
| B8 | Every open pull request is merged or closed with a reason | PR list is empty | Aufan | **PR #3 (detector) open · PR #5 (report) draft** |

## C · Claims the judges can check

Each of these is a sentence we make somewhere. If the code stops backing it, the sentence goes.

| # | Claim | Where it lives | Owner | Status |
|---|---|---|---|---|
| C1 | The published eval numbers match the code on `main` | `public/eval-results.json`, About page, README | Shawn | **stale in one way:** it records model `gemini-2.5-flash`; the live function runs `gemini-flash-latest`. Re-run `npm run eval` against the deployed model, or label the difference |
| C2 | "The flagging cannot be rate-limited" | true only once the deterministic detector is on `main` | laural | **not true yet** — PR #3 is open. Do not say it on stage until it merges |
| C3 | "Nothing that classifies a customer is ever stored" | README, About | laural | true on `main`: cause cues are live-only; verify once more after PR #3 merges |
| C4 | The report card "says the call ran silent" | Settings panel says this | Shawn or UI | **false** — the report card never mentions coaching. Either add it or change the Settings wording |
| C5 | Every legal figure is sourced | README and About: NCC s72 / 21 days · RG 271 / 30 days · NAB $15.5m / 345 notices / ASIC 25-165MR · REP 782 · REP 815 | Aufan | numbers match the sources on file; re-read once aloud before submitting |
| C6 | Nothing claims to be first without a search | Bendigo and Adelaide Bank is named in the README as prior art | Aufan | **yes** |

## D · Decisions still open — each needs a yes or a no, not a discussion

| # | Open item | The decision | Owner | Cost of leaving it |
|---|---|---|---|---|
| D1 | **Anonymous sign-ins are OFF** on the Supabase project, so the app runs "Saved here only" | Either switch them on (Authentication → Sign In / Providers → Anonymous ON, Confirm email OFF) and demo an account, or leave off and never show an account flow | Aufan (owner-only setting) | Low if left off — the README and the chip already say so. Do not demo accounts |
| D2 | **The detector (PR #3)** | Merge before freeze, or close and say the legal test is a model call with a code gate | laural + Aufan | Merging is worth real rubric points (agentic, deterministic, cross-checked). Merging late is the bigger risk |
| D3 | **PR #5, draft** | Finish or close | Shawn | A draft PR at freeze reads as unfinished work |
| D4 | **ElevenLabs practice quota** | Redeem the Forward credit (it is in the Discord menu) and run one full practice call end to end | Aufan | Practice mode is half the pitch and **no connected voice call has been verified**. If it cannot be shown, say so instead of implying it works |
| D5 | **The 2× replay speed does nothing** once the replay has started | Fix (re-schedule on speed change) or remove the control | live-call owner | Cosmetic, but it is visible in the demo and in the video |
| D6 | **Practice screen trap**: opening a scenario and not speaking leaves you stuck — End call is disabled and the Live call tab shows the same session; only a reload escapes | Let the Live call tab abandon an unstarted practice call | live-call owner | A judge who clicks Practice during Q&A gets stuck |
| D7 | **The report card can vary** — the same scripted call returned 78, 78, 75, and the deliberate miss flipped between `partly` and `missed` | Nothing to fix; just never promise a number on stage or in the video | everyone | A promised number that does not appear is worse than no number |

## E · Already done and verified — do not redo

- Live URL serves the app and the engine answers; two Gemini keys armed on the deployed function.
- The scripted demo call runs end to end on the live app: 11 lines in 49.6 s, job-loss tip at 27.6 s,
  legal sign plus stress tip at 37.7 s, report card 3.7–6.8 s after End call.
- Coaching off measured: 0 sign cards on screen, 3 signs still recorded and judged, same deadline.
- A typed sentence raises the legal sign in 2.9–3.7 s, with the reply-due date computed as today + 21.
- The negative control — "push the payment back a couple of weeks, I get paid on the twentieth" —
  raises nothing, after 9 s of waiting.
- Secret scan clean; repo public with no licence file (viewable, not reusable).
- Team log writes itself on every push to `main`.

## F · Monday, in order

| Time | Do | Owner |
|---|---|---|
| by 09:00 | D2 and D3 decided; last merges land | laural, Shawn, Aufan |
| 09:00–10:00 | Video recorded and uploaded — follow `docs/DEMO-SCRIPT.md`, allow for the replay being 49.6 s | Aufan |
| 10:30 | B1–B7 checked against the final commit; hard-reload the live URL and run the demo once | whoever merges last |
| **11:00** | **`main` freezes.** Nothing merges after this | everyone |
| 11:00–11:45 | Devpost: track name, repo link, live URL, video link; re-read the Official Rules (A5) | Aufan |
| **12:00** | **Submissions close** | — |
| 16:00 | Finalists announced (top 8); a second brief follows for 17:30 | — |
