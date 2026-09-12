# Submission checklist

**Submissions close Monday 14 Sep, 12:00pm. Late is not considered.**
**`main` freezes Monday 11:00am** — one hour of slack for a bad deploy, and nothing merges after it.

Every line below is a yes/no somebody can check. Status is what was true when this file was written
(13 Sep, around 01:40, after re-performing the whole demo twelve times). Tick it yourself before you
trust it.

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
| B7 | **Nothing uncommitted in `src/`** at freeze | `git status` is clean | everyone | **yes** — `git status` clean and `main` in sync with `origin/main`. Re-check at freeze |
| B8 | Every open pull request is merged or closed with a reason | PR list is empty | Aufan | **no** — PR #3 (detector) and PR #5 (report) both open. Neither is a draft |
| B9 | **The engine on Supabase matches `main`** | The Pages workflow deploys the *site* only. The edge function ships by hand: `npm run functions:deploy`. Merging the request-tier and quote-check commits to `main` does **not** update the engine a judge talks to | whoever merges last | **run it after the last engine merge, before freeze** |
| B10 | **The Calls screen is on `main` and deployed** | Load the live URL and look for a **Calls** tab next to Live call | UI owner | **yes** — on `main`, and the published bundle contains the screen's own caveat string. Confirmed on the live URL |
| B11 | The live site points at Supabase, not localhost | Search the published JS for `localhost:8787` | anyone | **yes** — the bundle contains only `https://clqcpqxivqylnjqmfeuz.supabase.co/functions/v1/api`. CI builds from repo variables, not from anyone's `.env` |

## C · Claims the judges can check

Each of these is a sentence we make somewhere. If the code stops backing it, the sentence goes.

| # | Claim | Where it lives | Owner | Status |
|---|---|---|---|---|
| C1 | The published eval numbers match the code on `main` | `public/eval-results.json`, About page, README | Shawn | **live function confirmed on `gemini-flash-latest`** (`/api/health`, 13 Sep 01:33). ⚠ A local `.env` runs `gemini-2.5-flash`, and **the report card prints the model that judged it** — so a video recorded off `npm run dev` shows a model name the README does not. Record off the live URL, or fix `.env` first |
| C2 | "The flagging cannot be rate-limited" | true only once the deterministic detector is on `main` | laural | **not true yet** — PR #3 is open. Do not say it on stage until it merges |
| C3 | "Nothing that classifies a customer is ever stored" | README, About | laural | true on `main`: cause cues are live-only; verify once more after PR #3 merges |
| C4 | The report card "says the call ran silent" | Settings panel says this | Shawn or UI | **fixed, verified 13 Sep.** Silent card leads *"The assistant ran silent on this call…"*; coached card leads *"The assistant coached this call — every sign appeared the moment it was raised."* Seen on all twelve runs |
| C7 | **"The same call, handled two ways"** — the demo is described as a dramatisation wherever it is claimed | `docs/DEMO-SCRIPT.md`, the video narration, the Devpost description | Aufan | **script says it; the video and Devpost do not exist yet.** Two worker scripts, one customer script. If a judge asks whether the worker's lines are scripted, the answer is yes — say it before they ask |
| C8 | The two report cards are described as comparing the **same** signs | Anywhere the before/after is claimed | Aufan | ⚠ **they do not.** Coached raises 4 signs, silent raises 3; the extra is the hardship-process prompt, which fires only because the coached worker says the word. The three shared signs, the customer and the deadline are identical. The Calls screen prints the discrepancy itself — do not claim otherwise anywhere else |
| C5 | Every legal figure is sourced | README and About: NCC s72 / 21 days · RG 271 / 30 days · NAB $15.5m / 345 notices / ASIC 25-165MR · REP 782 · REP 815 | Aufan | numbers match the sources on file; re-read once aloud before submitting |
| C6 | Nothing claims to be first without a search | Bendigo and Adelaide Bank is named in the README as prior art | Aufan | **yes** |

## D · Decisions still open — each needs a yes or a no, not a discussion

| # | Open item | The decision | Owner | Cost of leaving it |
|---|---|---|---|---|
| D1 | **Anonymous sign-ins are OFF** on the Supabase project, so the app runs "Saved here only" | Either switch them on (Authentication → Sign In / Providers → Anonymous ON, Confirm email OFF) and demo an account, or leave off and never show an account flow | Aufan (owner-only setting) | Low if left off — the README and the chip already say so. Do not demo accounts |
| D2 | **The detector (PR #3)** | Merge before freeze, or close and say the legal test is a model call with a code gate | laural + Aufan | Merging is worth real rubric points (agentic, deterministic, cross-checked). Merging late is the bigger risk |
| D3 | **PR #5, open** | Merge or close with a reason | Shawn | Not a draft — an open PR at freeze still reads as unfinished work |
| D4 | **ElevenLabs practice quota** | Redeem the Forward credit (it is in the Discord menu) and run one full practice call end to end | Aufan | Practice mode is half the pitch and **no connected voice call has been verified**. If it cannot be shown, say so instead of implying it works |
| D5 | ~~The 2× replay speed does nothing~~ | **Done.** Verified 13 Sep: 49.8 s at 1×, 25.2 s at 2×. The control only exists once the replay is running, and the line already scheduled when you press it still lands at 1× — both are in the demo script as beats, not bugs | live-call owner | closed |
| D6 | **Practice screen trap**: opening a scenario and not speaking leaves you stuck — End call is disabled and the Live call tab shows the same session; only a reload escapes | Let the Live call tab abandon an unstarted practice call | live-call owner | A judge who clicks Practice during Q&A gets stuck |
| D7 | **The report card varies a lot more than we thought.** Twelve runs: coached scored **95 twice and "not verified" five times**; silent scored **30, 30, 40, 40, 45**. The coached run usually returns *no score at all*, because the hardship-process sign comes back unverified and the card withholds rather than invents | Nothing to fix — it is `scoreUnverified` working. But **the "95 against 20" beat fails five times in seven**, so the script now points at the fraction and the per-sign table instead | everyone | A promised number that does not appear is worse than no number — and here the *good* run is the one with no number |
| D8 | ~~The Calls screen is not committed or deployed~~ **CLOSED** — it is on `main` and live. Two cards on one axis, with the honest caveats written into the page | Nothing. Perform the comparison on the Calls tab | — | Was the biggest visible win left; it landed |
| D9 | **The "who said it" box flips after every typed line.** One sentence as Customer switches it to Worker, so a second typed line raises nothing — correctly, since the engine only flags the customer | Either stop flipping it, or leave it and keep the warning in the demo script | live-call owner | Measured: the hardship sentence as Worker raised 0 signs in 16 s; the same sentence as Customer raised the legal sign in 2.7 s. A judge typing during Q&A hits this |
| D10 | **The hint under the transcript reads "Watch line 7: the worker asks for money instead of answering the sign."** True of the silent script only; on the coached run line 7 is *"Take your time — what would make things easier right now?"* | One-line copy fix, or condition it on coaching | live-call owner | It is on screen during the run a judge is watching most closely |

## E · Already done and verified — do not redo

Re-measured 13 Sep, 01:20–01:40, twelve full calls (seven coached, five silent) at 1280 px.

⚠ **The twelve runs were on `npm run dev` against the local engine on `gemini-2.5-flash`**, because
that is what this machine's `.env` points at. The timings are the app's and do not depend on the
model; **the verdicts and the score spread might**. One confirming pair on the live URL before the
video is a ten-minute job and it is on the Monday list.

- Live URL serves the app; the deployed engine answers `gemini:true`, **2 keys armed**, model
  `gemini-flash-latest`. The two worker scripts are live on the published bundle.
- **The replay runs 49.8 s at 1× and 25.2 s at 2×.** Line times at 2×: 1.1, 3.1, 5.1, 7.2, 10.2,
  12.7, 15.2, 17.7, 20.7, 23.2, 25.2 s.
- **Both runs, back to back, fit in 75 s** including ten seconds of standing still reading the two
  cards. Measured end to end.
- **Report card lands 3.0–3.8 s after End call** (twelve runs). Say "a few seconds", never a number.
- **Coaching off: 0 sign cards on screen, 3 signs still recorded and judged, and the 21-day deadline
  still created.** Coaching on: 4 cards, at 9.0 s (stress), 14.4–14.6 s (job loss), 22.5–22.7 s
  (hardship prompt) and 20.0–25.3 s (the legal sign).
- **The statutory notice was HANDLED in all seven coached runs and MISSED in all five silent ones.**
  That is the only verdict that held without exception, and it is the argument.
- A typed sentence raises the legal sign in **2.7 s**, reply-due computed as today + 21 (Sun 4 Oct).
- The negative control — "push the payment back a couple of weeks, I get paid on the twentieth" —
  **raises nothing after 13 s of waiting**.
- Both report cards now name the mode in their first line (C4).
- Secret scan clean; repo public with no licence file (viewable, not reusable).
- Team log writes itself on every push to `main`.

**Not re-verified, still open:** the practice-screen trap (D6), the microphone path, and any
ElevenLabs connected call.

## F · Monday, in order

| Time | Do | Owner |
|---|---|---|
| by 08:30 | ~~D8 decided~~ **done** — the Calls screen is live, so the demo ends by pointing at the comparison rather than narrating it | — |
| by 09:00 | D2, D3, D9, D10 decided; last merges land; **`npm run functions:deploy` run after the final engine merge** (B9) | laural, Shawn, Aufan |
| 09:00–10:00 | **Video recorded off the live URL, not localhost** (C1) — follow `docs/DEMO-SCRIPT.md`, use 2×, both runs fit in 75 s. Say "the same call, handled two ways" in the first ten seconds (C7) | Aufan |
| 10:15 | **Run one coached and one silent call on the live URL** and check the verdicts match section E. The twelve measured runs were local, on a different model | Aufan |
| 10:30 | B1–B11 checked against the final commit; hard-reload the live URL and run the demo once | whoever merges last |
| **11:00** | **`main` freezes.** Nothing merges after this | everyone |
| 11:00–11:45 | Devpost: track name, repo link, live URL, video link; re-read the Official Rules (A5) | Aufan |
| **12:00** | **Submissions close** | — |
| 16:00 | Finalists announced (top 8); a second brief follows for 17:30 | — |
