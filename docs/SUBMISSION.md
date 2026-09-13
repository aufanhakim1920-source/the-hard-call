# Submission checklist

**Submissions close Monday 14 Sep, 12:00pm. Late is not considered.**
**`main` freezes Monday 11:00am** — one hour of slack for a bad deploy, and nothing merges after it.

Every line below is a yes/no somebody can check. Tick it yourself before you trust it.

**Statuses re-checked against the tree and the deployed function on 13 Sep.** What that pass changed,
because a stale checklist is worse than none: PR #3 had merged (B8, C2, D2), the silent run records
**5** signs rather than 3 and on the deployed engine raises **more** than the coached run (C8 — which
side gets the extra sign depends on the engine, so do not name one), and D6, D9 and D10
were all already fixed in the source. The verdict rows and the timings from the 01:40 twelve-run pass
are kept below, split into E-1 and E-2 because they were measured on two different engines.

---

## A · The four things the submission form needs

| # | Must be true | How to check | Owner | Status |
|---|---|---|---|---|
| A1 | **Track named in the description**: Track 3 — Solve a Business Problem, plus Built With ElevenLabs | Read the Devpost description back | Aufan | not submitted |
| A2 | **Public codebase link** | Open the repo signed out: github.com/aufanhakim1920-source/the-hard-call | Aufan | **yes** — public, no licence file |
| A3 | **Production URL**, not localhost | Load https://aufanhakim1920-source.github.io/the-hard-call/ on a phone off the home wifi | Aufan | **yes** — HTTP 200, engine answering |
| A4 | **A 3–5 minute video showing the app working end to end**, not slides | The file exists and plays | Aufan | **NO — does not exist. Highest risk on this page.** |
| A6 | **The 30-second offline A/B link is in the Devpost description**, above the fold — a judge who never installs anything still sees the product's whole argument | Open https://aufanhakim1920-source.github.io/the-hard-call/ab-demo.html in a private window with the network throttled to offline after first load: two buttons, the same call twice, no signup, no key, no request | Aufan | **the page is live (HTTP 200, 31 kB, 0 external hosts); the Devpost description does not exist yet** |
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
| B8 | Every open pull request is merged or closed with a reason | PR list is empty | Aufan | **one left, re-checked 13 Sep 17:40** — #1–#5 all merged. **PR #6 (mask names and addresses) is open** and has a measured objection on it: the new patterns fire on the demo's own lines (`Hi Sarah, it's Tom` → `Hi ••••, it's ••••`), because `maskSensitive` is applied at `engine.ts:130` to the text the transcript **renders**, not only to what leaves the browser. Do not merge it as-is before the video is recorded |
| B9 | **The engine on Supabase matches `main`** | The Pages workflow deploys the *site* only. The edge function ships by hand: `npm run functions:deploy`. Merging the request-tier and quote-check commits to `main` does **not** update the engine a judge talks to | whoever merges last | **run it after the last engine merge, before freeze** |
| B10 | **The Calls screen is on `main` and deployed** | Load the live URL and look for a **Calls** tab next to Live call | UI owner | **yes** — on `main`, and the published bundle contains the screen's own caveat string. Confirmed on the live URL |
| B11 | The live site points at Supabase, not localhost | Search the published JS for `localhost:8787` | anyone | **yes** — the bundle contains only `https://clqcpqxivqylnjqmfeuz.supabase.co/functions/v1/api`. CI builds from repo variables, not from anyone's `.env` |

## C · Claims the judges can check

Each of these is a sentence we make somewhere. If the code stops backing it, the sentence goes.

| # | Claim | Where it lives | Owner | Status |
|---|---|---|---|---|
| C1 | The published eval numbers match the code on `main` | `public/eval-results.json`, About page, README | Shawn | **live function confirmed on `gemini-flash-latest`** (`/api/health`, 13 Sep 01:33). ⚠ A local `.env` runs `gemini-2.5-flash`, and **the report card prints the model that judged it** — so a video recorded off `npm run dev` shows a model name the README does not. Record off the live URL, or fix `.env` first |
| C2 | "The flagging cannot be rate-limited" | Replay both demo scripts through `src/detector/detect.ts` line by line and count what it raises | laural | ⛔ **Still do not say it, and the reason has changed.** PR #3 merged and the detector runs first in the browser with no network — but replayed over both demo scripts it raises **0 signs on 12 of 12 lines**, and all **188 signs** in `eval/demo-runs.json` came from the model. Control check same run: the fixture wording *"I can't make the repayment. Not this month and honestly not for a while"* fires `NCC_72_ORAL_NOTICE` immediately, so the detector works — the demo's own phrasing is simply outside its lexicon. The sayable version: *"the legal test also runs as deterministic rules in the browser; on this particular script the model gets there first"* |
| C3 | "Nothing that classifies a customer is ever stored" | README, About | laural | **true on `main`**: cause cues are live-only. Re-verified after the detector merged — it emits no cue-tier events at all |
| C4 | The report card "says the call ran silent" | Settings panel says this | Shawn or UI | **fixed, verified 13 Sep.** Silent card leads *"The assistant ran silent on this call…"*; coached card leads *"The assistant coached this call — every sign appeared the moment it was raised."* Seen on all twelve runs |
| C7 | **"The same call, handled two ways"** — the demo is described as a dramatisation wherever it is claimed | `docs/DEMO-SCRIPT.md`, the video narration, the Devpost description | Aufan | **script says it; the video and Devpost do not exist yet.** Two worker scripts, one customer script. If a judge asks whether the worker's lines are scripted, the answer is yes — say it before they ask |
| C8 | The two report cards are described as comparing the **same** signs | Anywhere the before/after is claimed | Aufan | ⚠ **they do not, and which side gets the extra sign is not fixed.** Through the deployed engine the archive is consistent — **silent 5, coached 4** in all 20 runs — but through the local source engine it is the exact mirror (coached 5, silent 4 in all 22), and the browser pair in `docs/EVIDENCE.md` recorded the mirror shape while calling the engine the deployed one. The extra sign is the hardship-process prompt, and it fires on whichever worker never mentions hardship assistance. **The four shared signs, the customer's words and the 21-day deadline are identical in all 42 runs.** Say the asymmetry before a judge finds it, and say it without naming a side; the Calls screen prints whichever way it fell |
| C5 | Every legal figure is sourced | README and About: NCC s72 / 21 days · RG 271 / 30 days · NAB **and AFSH Nominees** $15.5m / **345 customers** (not notices) / ASIC 25-165MR — say “failed to answer in time”, never “late”: some received no response at all · REP 782 · REP 815 | Aufan | numbers match the sources on file; re-read once aloud before submitting |
| C6 | Nothing claims to be first without a search | Bendigo and Adelaide Bank is named in the README as prior art | Aufan | **yes** |

## D · Decisions still open — each needs a yes or a no, not a discussion

| # | Open item | The decision | Owner | Cost of leaving it |
|---|---|---|---|---|
| D1 | **Anonymous sign-ins are OFF** on the Supabase project, so the app runs "Saved here only" | Either switch them on (Authentication → Sign In / Providers → Anonymous ON, Confirm email OFF) and demo an account, or leave off and never show an account flow | Aufan (owner-only setting) | Low if left off — the README and the chip already say so. Do not demo accounts |
| D2 | ~~**The detector (PR #3)**~~ | **Closed — merged.** It runs first on every line, in the browser, with no network call, and its keys are deduped against the model pass. What it did *not* buy is the rate-limit claim: see C2 | — | closed |
| D3 | **PR #5, open** | Merge or close with a reason | Shawn | Not a draft — an open PR at freeze still reads as unfinished work |
| D4 | **ElevenLabs practice quota** | Redeem the Forward credit (it is in the Discord menu) and run one full practice call end to end | Aufan | Practice mode is half the pitch and **no connected voice call has been verified**. If it cannot be shown, say so instead of implying it works |
| D5 | ~~The 2× replay speed does nothing~~ | **Done.** Verified 13 Sep: 49.8 s at 1×, 25.2 s at 2×. The control only exists once the replay is running, and the line already scheduled when you press it still lands at 1× — both are in the demo script as beats, not bugs | live-call owner | closed |
| D6 | ~~**Practice screen trap**~~ | **CLOSED — fixed in `CallScreen.tsx`.** End call is no longer disabled on an empty call; leaving is always allowed and an empty call simply produces an empty report. Verified by reading the handler, **not by clicking it** — one pass through Practice on the live URL before the video would close that gap | live-call owner | closed |
| D7 | ~~**The report card varies a lot more than we thought**~~ | **CLOSED — diagnosed and fixed, not tolerated.** The variance was never in the engine: signs raised were byte-identical every run, and calling `/report` six times on one identical session still returned missed = 1,1,1,1,2,2. **All of it lived in the written review**, and the model said why — the silent script's *"a couple of weeks before the next reminder"* and *"someone will be in touch"* read as partial discharge of the obligation. **The script was sitting exactly on the line it was meant to be clearly one side of.** Both offers were removed and both scripts gained a neutral sign-off, so a sign raised on the last line still has a worker line to be judged against. After: 10 deployed runs, **every counted field identical** — coached 4 signs / 4 of 4 answered / legal HANDLED 4 of 4; silent 5 signs / 0 of 5 answered / legal MISSED 6 of 6. Only the score still moves, by 3 points **on that engine** — and see D11, because the fraction moves on others | everyone | ⭐ **A number in a pitch is a claim and needs a harness, not the memory of a good run.** `eval/demo-runs.ts` is that harness; re-run it after any edit to `demoScript.ts`. Never quote the score, and no longer quote the fraction either — say the direction |
| D8 | ~~The Calls screen is not committed or deployed~~ **CLOSED** — it is on `main` and live. Two cards on one axis, with the honest caveats written into the page | Nothing. Perform the comparison on the Calls tab | — | Was the biggest visible win left; it landed |
| D9 | ~~**The "who said it" box flips after every typed line**~~ | **CLOSED — it no longer alternates.** The box stays where it was put, with the reasoning left in the code: the cost is asymmetric, since typing the customer's sentence into a box that has silently flipped to Worker raises nothing (0 signs in 16 s as Worker against the legal sign in 2.7 s as Customer) | live-call owner | closed |
| D10 | ~~**The hint under the transcript names line 7**~~ | **CLOSED — conditioned on coaching.** Coaching off reads *"Watch line 7: the worker asks for money instead of answering the sign."*; coaching on reads *"Watch what the worker does the moment each sign lands."* | live-call owner | closed |
| D11 | **The fraction on the cards is not stable, and it was in the presenter's mouth** | **CLOSED — the documents now lead with the direction.** Counted across all **42 runs** in `eval/demo-runs.json`: the answered fraction takes **ten distinct shapes** (coached 4 of 4, 5 of 5, 4 of 5; silent 0/1/2/3 of 4 and 0/1/2 of 5), because one sign — the hardship-process prompt — comes and goes and lands on whichever worker has not covered it. What holds in **42 of 42**: **0 signs missed on the coached side** (0 of 63) and **0 signs handled on the silent side** (0 of 125), with the statutory notice handled in 14 of 14 coached runs and 0 of 28 silent ones. README, DEMO-SCRIPT and this file now state that and print the fraction only as an observed range with its source | pitch owner | ⭐ **A number that reproduces ten times on one engine is a measurement, not a claim.** The claim is the thing that survived every engine, both scripts and both directions of the asymmetry |

## E · Already done and verified — do not redo

Two separate measurement sets, and they must not be quoted as one.

**E-0 · The claim that survives all 42 archived runs**, both engines and both versions of the script:
**no sign has ever been marked missed on the coached side** (0 of 63) and **none has ever been marked
handled on the silent side** (0 of 125); the statutory notice was handled in **14 of 14** coached runs
and **0 of 28** silent ones. This is the sentence a presenter is allowed to say without looking at
the screen. Everything in E-1 and E-2 below is narrower than it — see D11.

**E-1 · The deployed engine, `eval/demo-runs.ts --remote`, 13 Sep — ten runs, four coached and six
silent.** Archived in `eval/demo-runs.json`; the report's own `model` field reads
`gemini-flash-latest` on all ten. Every counted field was identical across the ten: coached 4 signs,
4 of 4 answered; silent 5 signs, 0 of 5. ⚠️ **Those fractions are true of these ten runs and are not
a prediction** — the same script on the local source engine produces the mirror shape, and the
browser pair in `docs/EVIDENCE.md` recorded coached 5 of 5 / silent 0 of 4. Quote them as "in the ten
deployed runs on 13 Sep", never bare.

**E-2 · The browser, twelve full calls (seven coached, five silent) at 1280 px, 13 Sep 01:20–01:40.**
⚠ These went through `npm run dev` against the **local** engine on `gemini-2.5-flash`, because that is
what this machine's `.env` points at. **The timings are the app's and barely depend on the model; the
verdicts and the score spread do** — E-2's sign counts have since been superseded by E-1. Keep E-2 for
the wall-clock figures only. One confirming pair on the live URL before the video is a ten-minute job
and it is on the Monday list.

- Live URL serves the app; the deployed engine answers `gemini:true`, **2 keys armed**, model
  `gemini-flash-latest`. The two worker scripts are live on the published bundle.
- **The replay runs 49.8 s at 1× and 25.2 s at 2×.** Line times at 2×: 1.1, 3.1, 5.1, 7.2, 10.2,
  12.7, 15.2, 17.7, 20.7, 23.2, 25.2 s.
- ⚠️ **75 s is the two REPLAYS plus reading the cards. The full run in `docs/DEMO-SCRIPT.md`
  ends at 1:28**, because it also carries the Settings toggle between the runs and the Calls
  comparison at the end. Rehearse to the script's clock, not to this number — a presenter who
  trains to 75 s arrives 13 seconds short. `docs/DEMO-SCRIPT.md` is authoritative for timing.
- **Both runs, back to back, fit in 75 s** including ten seconds of standing still reading the two
  cards. Measured end to end.
- **Report card lands 3.0–3.8 s after End call** (twelve runs). Say "a few seconds", never a number.
- **Coaching off: 0 sign cards on screen, and the 21-day deadline still created.** Coaching on: 4
  cards, at 9.0 s (stress), 14.4–14.6 s (job loss), 22.5–22.7 s (hardship prompt) and 20.0–25.3 s
  (the legal sign). ⚠ The old "3 signs still recorded" here is **superseded by E-1: the silent run
  records 5**, every run, and raises one *more* than the coached run — see C8.
- **The statutory notice was HANDLED in every coached run and never handled in any silent one**, in
  both measurement sets: 7/7 and 5/5 in E-2, and 4/4 and 6/6 in E-1 — and across the full 42-run
  archive, 14/14 coached and 0/28 silent (missed in 25, partly in 3, all three of those before the
  13 Sep script fix). That is the only verdict that has never once wavered, and it is the argument.
- A typed sentence raises the legal sign in **2.7 s**, reply-due computed as today + 21 (Sun 4 Oct).
- The negative control — "push the payment back a couple of weeks, I get paid on the twentieth" —
  **raises nothing after 13 s of waiting**.
- Both report cards now name the mode in their first line (C4).
- Secret scan clean; repo public with no licence file (viewable, not reusable).
- Team log writes itself on every push to `main`.

**Not re-verified, still open:** the microphone path, and any ElevenLabs connected call (D4). D6, D9
and D10 are fixed in the source and were confirmed by reading it — nobody has clicked through them on
the live URL since.

## F · Monday, in order

| Time | Do | Owner |
|---|---|---|
| by 08:30 | ~~D8 decided~~ **done** — the Calls screen is live, so the demo ends by pointing at the comparison rather than narrating it | — |
| by 09:00 | **D3 is the only decision left** (D2, D6, D9, D10 all closed); last merges land; **`npm run functions:deploy` run after the final engine merge** (B9) | Shawn, Aufan |
| 09:00–10:00 | **Video recorded off the live URL, not localhost** (C1) — follow `docs/DEMO-SCRIPT.md`, use 2×, both runs fit in 75 s. Say "the same call, handled two ways" in the first ten seconds (C7) | Aufan |
| 10:15 | **Run one coached and one silent call on the live URL** and check the run against **E-0**, not E-1: nothing missed coached, nothing handled silent, the notice handled against not handled. **A different sign count or a different fraction is expected and is not a failure** — note what it produced and leave the documents alone. Only an E-0 row breaking is a stop-everything | Aufan |
| 10:30 | B1–B11 checked against the final commit; hard-reload the live URL and run the demo once | whoever merges last |
| **11:00** | **`main` freezes.** Nothing merges after this | everyone |
| 11:00–11:45 | Devpost: track name, repo link, live URL, video link; re-read the Official Rules (A5) | Aufan |
| **12:00** | **Submissions close** | — |
| 16:00 | Finalists announced (top 8); a second brief follows for 17:30 | — |
