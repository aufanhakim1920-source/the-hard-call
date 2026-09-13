# Practice — what it does, what was measured, what will break

Verified end to end on 13 Sep 2026, against the deployed edge function and the deployed site.
Everything below is a measurement, not a description. Where something could not be checked it says so.

---

## 1 · The path, step by step

| # | step | who acts | where it runs |
|---|---|---|---|
| 1 | Run a call (live, demo or practice) | worker | browser |
| 2 | **End call** | worker | browser; the report POST waits for the sign queue |
| 3 | Report card appears | — | `/api/report`, degrades to a browser-built card |
| 4 | **Turn this into a practice customer** | worker | `POST /api/scenario` → Gemini |
| 5 | Draft customer is drawn, saved nowhere | — | React state only |
| 6 | **Approve and add to Practice** | **worker — the human gate** | localStorage + Supabase upsert |
| 7 | It appears in Practice with a *from your call* badge | — | browser |
| 8 | **Start** → **Start practice call** | worker | ElevenLabs public agent, WebRTC |

**Two human gates, both real.** Nothing is generated until step 4 is clicked, and nothing is stored
until step 6 is clicked. Between 4 and 6 the draft lives in React state and disappears on **Discard**
or on any navigation — there is no "rejected" record and no undo.

**Measured on a demo run:** steps 1→7 completed with no manual intervention. The generated customer
("Fiona Campbell, 42, Event Coordinator") reached the Practice grid with the badge, the *Invented*
paragraph and a Remove button, and survived a reload.

---

## 2 · De-identification — the field-by-field result

The claim on the card: *"The model was told to invent a new name and a new job, and to change the age,
the suburb and every number."* Tested three ways.

### The demo call (weak test — it contains no identifiers)

| field | real call | generated |
|---|---|---|
| name | Sarah M. | Fiona Campbell / Marcus Reid / Marcus Bennett / … |
| age | not stated | 41–44 |
| job | not stated | Logistics coordinator / Warehouse supervisor / … |
| product | home loan | "Home Loan" / "Variable Rate Home Loan" |
| numbers | none in the transcript | none |
| gender | female | male in 5 of 6 deployed runs |

Verbatim overlap between the whole real transcript and the whole generated persona:
**0 shared 3-grams, 0 shared 4-, 5- and 6-grams.** The real name never appears.

⚠️ **The demo call has no dollar figure, suburb, date of birth, account number or surname, so it does
not test the strongest half of the claim.** Do not cite the demo run as proof of de-identification.

### A transcript deliberately stuffed with identifiers (the real test)

29 planted identifiers — full double-barrelled name, account number, street address, suburb and
postcode, date of birth, mobile number, employer, five dollar amounts, a spouse's name, a child's
name, a named private school, an exact hours figure and two exact dates.

**Leaks: 0 of 29.** The generated persona contained **no digits at all**. The employer became "her
clinic", the spouse "her ex-partner", the school "private school", the hours "part-time shifts".
The account number was even stripped out of the product string it was embedded in.
0 shared 3-grams with the source.

### The one nuance worth knowing before anyone says "unlinkable"

The approved customer stores **`from_call_id`**, and it is synced to Supabase. The report row for that
call stores the **real customer's name**. So in the database an invented customer can be joined back to
the real customer's name through the shared call id. The *content* is de-identified; the *link* is not
removed. If asked on stage, the honest answer is: "the practice customer carries none of their details,
and it keeps a reference to which call it came from so the team can see why it exists."

Also true and worth saying plainly: the real transcript **is** sent to Google to build the customer. It
is not stored by us — the stored report holds `{lineId, offsetMs}` references, not words, and the
transcript itself never leaves the browser's memory.

---

## 3 · What happens when the voice cannot start

**As of 13 Sep the practice voice does not start.** Five attempts from a browser, five refusals,
zero sessions.

| attempt | origin | HTTP | `detail.status` |
|---|---|---|---|
| 1–3 | `http://localhost:5173` | 429 | `quota_exceeded` |
| 4–5 | `https://aufanhakim1920-source.github.io` | 429 | `workspace_concurrency_limit_exceeded` |

The ElevenLabs dashboard for the account shows **14 minutes of total duration** and **10K credits** used
in the last 7 days. The free plan allows 15 minutes a month. **The monthly allowance is essentially
spent.** The agent itself is healthy and public — a conversation token request from the terminal returns
200 with a token — so nothing is misconfigured; there is simply nothing left to spend.

⚠️ **Some of the concurrency block is self-inflicted by this verification.** Seven token requests were
issued while establishing the above, and each one opens a conversation record that holds one of the
free plan's four concurrent slots. Leave the workspace alone for a while before testing again, and
expect `workspace_concurrency_limit_exceeded` to clear on its own.

### What the worker sees now

Both refusals were caught and rewritten (`humanError` in `src/lib/practice.ts`):

- quota → *"The practice voice has used up this month's free minutes. The live call and the report card still work."*
- concurrency → *"Too many practice calls are running at once — the free plan allows four. Give it a minute and start the call again."*
- no microphone device → *"This computer has no microphone the browser can use…"*
- microphone blocked → *"This browser blocked the microphone. Allow it in the address bar…"*

Each keeps the **Start practice call** button so it can be retried, measures **5.01:1** against the
light ground (AA passes at 4.5), and carries **no agent id**.

⚠️ **Two things this fixed that would have gone wrong on stage.** Until 13 Sep the failure printed the
SDK's own string — *"Failed to fetch conversation token for agent agent_…: ElevenLabs API returned 429"* —
because a token failure **rejects `startSession()` instead of reaching `onError`**, so the whole
translation layer was skipped on the one path most likely to run in front of a room. And the
concurrency refusal contains both "limit" and "capacity", so the quota branch was catching it and
telling four people practising at once that the month was over.

---

## 4 · The screens, and the ones that do not exist

| state | reachable | what it shows |
|---|---|---|
| no practice customers | **never** | five seeds always ship, so the empty grid cannot occur |
| draft awaiting approval | yes | full persona, the *This person does not exist* panel, Approve / Discard |
| rejected | **not persisted** | Discard clears the draft; no record, no undo, and the model call is spent |
| approved, in the grid | yes | *from your call* badge, *Invented.* paragraph, Remove |
| removed | yes | `is-leaving-row`, gone in ~200 ms, store drops immediately — **no confirm, no undo** |
| build failed | yes | one plain sentence, the raw text under it, **Try again** and **Dismiss**, `role="alert"` |
| call idle | yes | *"Ready when you are."* + persona line |
| call failed to connect | yes | see §3 |
| **call connected / mid-call** | **unverified** | see §5 |

Practice measured `scrollWidth − clientWidth === 0` at **320, 375, 768 and 1280**.

---

## 5 · What is NOT verified, and why

- **No audio was ever exchanged with anything.** No spoken turn, no voice, no transcript from a real
  utterance. Nobody should say the practice voice has been heard working today.
- **The connected state, the volume orb, the live transcript de-duplication and the report card built
  from a spoken practice call are all unverified**, because no session ever started (§3).
- **No screenshots.** The Browser pane was hidden for the whole run and does not composite while
  hidden, so every screenshot timed out. Everything above is DOM, computed style and network
  measurement.
- The volume orb is driven by `requestAnimationFrame`, which does not fire in a background or
  throttled tab; the orb will sit at its resting size there. Cosmetic, and only during a live session.

---

## 6 · Known rough edges (not fixed here — they are in other agents' files)

1. **"Turn this into a practice customer" is enabled on a call with zero lines.** The server answers
   `400 {"error":"empty session"}` and the panel says *"try again"* — advice that can never work.
   Disable the button when `session.lines.length === 0`, or give `scenarioFailure()` a branch for it.
   (`src/components/ReportCard.tsx`, `src/lib/scenarios.ts`)
2. **The raw error line is untruncated.** A Gemini 503 renders its whole JSON body under the friendly
   sentence. Cap it. (`src/components/ReportCard.tsx`)
3. **The deployed scenario route failed 2 of 10 times** with `gemini-flash-latest` returning 503
   "high demand". It is transient and **Try again** works, but warm it before the demo and never
   generate a customer live without a second attempt in hand.
4. **Repetition.** At temperature 0.7 the same call produced "Marcus Reid, Logistics coordinator,
   Variable Rate Home Loan" in 3 of 6 deployed runs. Generating twice on stage from the same call
   shows near-identical people.
5. After hanging up, the strip shows *"Call ended."* with **no button at all** — the only way on is the
   header's End call. Correct, but nothing offers a second go at the same customer.

---

## 7 · Before the demo — the short list

1. **Decide about the voice.** 14 of 15 free minutes are gone. Either upgrade to the $6 tier, or cut
   the live practice call from the run and show it as a recorded clip. Do not walk on stage intending
   to press Start.
2. Warm `/api/scenario` with one throwaway call; the first call after idle is the one that 503s.
3. If the voice is being demonstrated, have exactly **one** person connected — the free plan's four
   concurrent slots are shared with anything else touching the agent.
