# The Hard Call

**Live signs for a bank's hardship calls, with the question to ask next. Then the calls you got wrong become your practice.**

Built in 48 hours for *Forward: AI in Business Hackathon* (DSCubed × RAID, University of Melbourne, 12–14 Sep 2026).
**Track 3 — Solve a Business Problem**, entered alongside the **Built With ElevenLabs** track.

> **Live app:** https://aufanhakim1920-source.github.io/the-hard-call/ · Video: _(link goes here)_

---

## The problem

People in money trouble almost never say the word "hardship". They say *"I'm a bit behind"* or *"my hours got cut"*. Under the National Credit Code that still counts as a hardship notice, and the bank has **21 days** to reply in writing.

Staff miss it. In 2025 NAB was fined **$15.5m** over **345** hardship requests that were not answered in time. ASIC's review of ten lenders found **35%** of people who asked for help dropped out of the process, and that training staff to spot hardship lifted the number caught by **58%**.

A bank (Bendigo and Adelaide) already uses AI to find hardship in calls — **after** the call, when a team leader is told minutes later and the customer has hung up.

## What The Hard Call does

1. **It listens during the call.** The worker puts the call on speaker; the browser's own speech engine turns it into words. Nothing is recorded.
2. **⚠ A sign pops up live**, once per new thing, the moment the customer says something that counts — with the **reply-due date** and **one question the worker can ask next**, word for word.
3. **The human decides.** The AI never talks to the customer and never makes the call.
4. **A report card after the call** judges the worker (not the customer): what was caught, handled, missed, and one tip. Legal deadlines land in a list so nothing goes unanswered.
5. **Practice mode.** An ElevenLabs voice agent plays a customer who hides the real problem until you ask well. Same signs, same report card.
6. **It gets smarter.** Any real call can become a new practice customer (de-identified, approved by a person). Managers correct signs; every correction is sent to the engine with every future call.

**The line:** *A bank already catches hardship after the call. We catch it during the call, tell staff what to ask next, and turn the calls they got wrong into their practice.*

## Isn't this already a thing?

| Who | What they do | What's missing |
|---|---|---|
| Bendigo and Adelaide Bank | AI finds hardship in calls | Only after the call; live is their stated next step |
| Westpac (pilot) | Live alerts during calls | For scams, not hardship |
| Balto, Cresta, Google Agent Assist | Live tips for call centres | General; no Australian hardship law, no 21-day clock |
| Hyperbound, Yoodli | AI practice customers | For sales calls, not hardship |
| **The Hard Call** | Live sign + ask-next + deadline + report card + practice built from your own calls | The first we could find that does all of it together |

## How it's built

```
browser (React + Vite, on GitHub Pages)    Supabase Edge Function `api` (Deno)   models
───────────────────────────────────────    ───────────────────────────────────   ──────
Web Speech API ──► finished sentence ──►   /api/flags    (sign engine)    ──►   Gemini 2.5 Flash
   mask card/account numbers first         /api/report   (report card)   ──►   Gemini 2.5 Flash
ElevenLabs voice agent (practice) ──►      /api/scenario (de-identified   ──►   Gemini 2.5 Flash
   both transcripts feed the same engine                 practice customer)
localStorage today, Supabase tables next: reports · deadlines · lessons · practice customers (never a transcript)
```

- **`supabase/functions/_shared/signs.ts`** — the sign taxonomy: 2 legal signs (hardship request → 21 days, NCC s72; complaint → 30 days, RG 271) and 9 tips (job loss, health, bereavement, separation, safety, gambling, disaster, stress, scam). Deadlines are computed in code, never by the model.
- **`supabase/functions/api/flags.ts`** — one call per finished sentence: last 14 lines in, speaker + new signs out. Dedup by key on both sides, so a sign fires once. Manager lessons are appended to the prompt.
- **`supabase/functions/api/report.ts`** — judges each sign as handled / partly / missed from the transcript, not from the tick.
- **`supabase/functions/api/scenario.ts`** — turns a call into a practice customer with name, job, suburb and every number changed.
- **`src/lib/practice.ts`** — the ElevenLabs agent is public with overrides enabled; the browser starts it with just its id and hands it the scenario as a prompt override. No key in the browser.

### Why these models

The sign engine runs on **every sentence of a live call**, so it must answer in about a second. `gemini-2.5-flash` with thinking off does that on the free tier, returns strict JSON against a schema, and — measured, see below — is accurate enough. The report card and scenario builder use the same model at higher temperature. The practice customer's brain is the LLM inside the ElevenLabs agent; its voice is an ElevenLabs premade voice. Swap `GEMINI_MODEL` in the environment to try another model; `npm run eval` tells you whether it was worth it.

### Evaluation

`eval/cases.json` holds 40 labelled utterances — real phrasings without the word "hardship", hard negatives that look similar, and one to three cases per tip. `npm run eval` runs them through the real engine and reports precision, recall, exact-set accuracy, speaker accuracy and latency. The latest numbers are published on the app's About page (`public/eval-results.json`).

## Privacy, by design

- Nothing new is collected — banks already record these calls.
- It flags what to **do**, not who the person is. No diagnosis or label is ever written.
- Words are never stored. Only signs, report cards and deadlines are kept, on the device.
- Card, account, BSB, TFN and Medicare numbers are masked before a sentence leaves the browser.
- Practice customers built from real calls are de-identified by the model and approved by a person.
- The AI never decides and never speaks to a real customer.

## Run it

```bash
npm install
cp .env.example .env        # public VITE_* values are in the example; GEMINI_API_KEY only for the eval
npm run dev                 # http://localhost:5173 — talks to the deployed Supabase functions
npm run eval                # score the sign engine locally (needs GEMINI_API_KEY in .env)
npm run functions:deploy    # redeploy the edge function (needs a Supabase access token)
```

Hosting: the site is static on **GitHub Pages** (built by `.github/workflows/pages.yml` on every push to `main`); the engine runs as a **Supabase Edge Function**, where the Gemini key lives as a secret. No key is ever in the repo or the browser.

## Team

Four people, four parts — see [CONTRIBUTING.md](CONTRIBUTING.md) for the branch plan.

## Sources

- National Credit Code s72 — hardship notices and the 21-day reply
- ASIC RG 271 — internal dispute resolution, 30-day written response
- ASIC Report 782 (May 2024) and Report 815 (Sep 2025) — hardship at ten lenders
- ASIC 25-165MR (Aug 2025) — NAB and AFSH, $15.5m penalty
- iTnews, 1 Oct 2025 — Bendigo and Adelaide Bank finds hardship in calls with AI (post-call)
- iTnews, 29 May 2025 — Westpac pilots live call analysis for scams

Sounds are real recordings from Mixkit — see `public/sfx/ATTRIBUTION.md`.
