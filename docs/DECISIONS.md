# Decisions

Why CallFlag is built the way it is — including the things we tried and rejected.

Kept as a running log rather than a summary, because the reasoning is the part that normally
disappears. Newest last. `README.md` says what it does; this says why.

---

## The product is about a legal clock, not a mood

An Australian bank has **21 days** to reply in writing to a hardship notice (National Credit Code
s72), and **30 days** to a complaint (ASIC RG 271). A hardship notice can be given **orally** and
needs no magic words — the customer almost never says "hardship".

So the thing worth building is not sentiment detection. It is: *did the customer just start a clock,
and does the person on the phone know?*

**Rejected: claiming this is new.** An early draft said no bank had done this. A search found Bendigo
and Adelaide Bank already detect hardship indicators **after** the call. The honest claim is narrower
and stronger: **live, during the call, with the deadline and the next question to ask.**

---

## Two tiers, because a hint is not a notice

Originally one `hardship-request` sign fired on difficulty language. That is wrong in both directions:
it fires on people who are fine, and it makes a legal obligation out of a feeling.

| the customer says | we raise | clock | stored |
|---|---|---|---|
| "things are tight", "I'm behind" | a **request** — prompt the staff member to ask | no | no |
| an inability to pay **over a period** | a **notice** — s72 is engaged | 21 days | yes |

The case that settles it: *"can you push it back two weeks, I get paid on the 20th"* is a timing gap,
not a statutory notice. Firing on it is the worst error this system can make — it starts a process the
customer never asked for and a clock the bank did not owe.

---

## Wording could not hold the line, so a gate decides

Three rounds of prompt engineering on the hardship test reached **1 of 3** on the legal fixtures. The
model kept reading a *cause* ("I lost my job, nothing's coming in") as an *inability*.

The fix was to stop asking the model for a verdict and start asking it for a **fact**:

```ts
// The model classifies what was said. This line decides.
const periodOk = (s: ModelSign) =>
  s.key !== "hardship-request" || s.period === "months_or_open_ended";
```

`period` is a required enum — `none` / `single_payment` / `near_term_recovery` /
`months_or_open_ended` — so the model reports duration and deterministic code applies the law. That
reached **2 of 3**.

**Generalises to:** when prompt wording will not hold a rule, make the model classify and let code
decide.

---

## The deterministic detector owns the law; the model owns the judgement

The detector in `src/detector/` runs in **rules mode by default and makes zero API calls**. The legal
test is two signals in the same turn — payment inability plus not-near-term — with recovery language
as a suppressor. The model only adjudicates genuinely ambiguous turns, typically none or one per call,
and returns **no flag** on an API failure rather than guessing.

| layer | engine | why |
|---|---|---|
| legal obligations | deterministic rules | a rule should not be a judgement call |
| cause cues, and the question to ask next | Gemini | these genuinely are judgements |

**The consequence that matters for a demo:** the flagging half **cannot be rate-limited**. We
discovered this the hard way — see the quota section below.

---

## Privacy is enforced by the schema, not promised in prose

An earlier version of the docs claimed we never classify the customer at all. The evaluation set
expected exactly those categories — health, gambling, safety — and the repository is public. A claim
that the code contradicts is worse than no claim.

What is true, and checkable:

- The adjudicator's response schema has **no field** for *why* the customer cannot pay, so the model
  cannot return one.
- Flags reference the transcript by `{ speaker, start_ms }` and **never copy the utterance**.
- **Cause cues are ephemeral**: they appear live to the staff member and are never written to the
  report card or the database. Only obligations persist.
- Card and account numbers are masked in the browser before anything is sent.

So the sentence we can defend is: *nothing that classifies a customer is ever stored; a few cues route
the call in the moment and are discarded.* Someone reading the source can verify every clause.

---

## The report card judges the worker, never the customer

Counts, deadlines and durations are computed deterministically. The model only writes the judgement,
and only from transcript evidence: a verdict of `handled` or `partly` **must** cite worker lines that
came after the triggering line, or it degrades to `unverified`.

**Rejected: a score that is always a number.** `scoreUnverified` exists because an unverifiable call
must not be given a confident figure. A fabricated number is worse than a missing one.

---

## Quota: what we built, and why it was the second-best answer

Google's free tier is rate-limited **per key**, and a live test returned 429 mid-call. Two fixes, in
order of how much they matter:

**1. The report card no longer dies.** Only the *written review* needs the model. The signs, whether
each was marked handled, the legal deadlines and the call duration are all already known — in the
browser and on the server. A model failure now returns a real report card built from those, flagged
`degraded` with a reason, and **never invents a score**. Both the server and the browser carry this
fallback, so the card survives even if the function is unreachable.

**2. A spare API key.** `GEMINI_API_KEY_2` and `_3` are optional spares, tried in order, and **only on
failures that belong to the key** — 429, 403, and 400 `API_KEY_INVALID`. A bad prompt or a bad schema
does not retry, because that would burn the spare on a request that will fail anyway. Verified by
pointing the first key at a deliberately invalid value: the call returned on the spare in 1950 ms.
The key travels in a header, not the query string, because query strings end up in logs.

**The honest framing:** the spare key protects the **report card**. It does nothing for the flags — and
under rules mode the flags never needed protecting. Deterministic-by-default was the better answer and
we found it second.

---

## A status endpoint that reports a default is worse than none

`/health` had `getEnv("GEMINI_MODEL") ?? "gemini-2.5-flash"`. It reported `gemini-2.5-flash` for days
regardless of what was actually running, and was believed, because a health endpoint is trusted. It
now reports the model in use and how many keys are armed.

---

## Interface craft, and three bugs found behind a cosmetic complaint

Replacing the native `<select>` (which opens the operating system's own unstyleable list) surfaced
three things that were not cosmetic:

- **A transformed ancestor captures a `position: fixed` child** — a transform makes that element the
  containing block — so the popup rendered 89 px out of place. Fixed with a portal.
- The selected row's gold measured 4.91:1 against the page but **4.48:1 against the popup's own
  surface**. Contrast must be measured against the surface an element actually sits on.
- The trigger became a `<button>`, and the call screen's keyboard shortcuts only skipped
  `input`/`textarea`/`select` — so typing "e" inside the dropdown **would have ended the call**.

**Generalises to:** a complaint about how something looks is often the only visible symptom of
something structural.

---

## An entrance animates transform, never opacity

A CSS animation whose first keyframe is `opacity: 0` overrides the element's base `opacity: 1`, and a
throttled or backgrounded tab holds that first frame indefinitely. Frozen at time 0, three of our
entrance keyframes measured **opacity 0** — which is every screen, every transcript line, and the
report card.

The same class of defect hit the canvas score ring and the verdict bars, which depended on animation
frames a hidden tab never delivers: the ring would have rendered **0 out of 100** and every bar sat at
zero width. Both now jump to their finished state if the frames do not arrive.

**Rule:** animate what an element looks like on its way in. Never animate *whether it can be seen*.
The failure mode of a decoration must be "less pretty", never "not there".

---

## Layout rules that came from measurements, not taste

- **`minmax(0, 1fr)`, never a bare `1fr`.** A bare `1fr` is `minmax(auto, 1fr)` and will not shrink
  below its widest child — which is where a sideways scroll comes from. `npm run gate` fails the build
  on any grid track without a zero floor, naming the file, the line and the correction.
- **`min-width: 0` on any flex or grid item containing an `<input>`**, which carries its own
  min-content width of roughly 204 px.
- **Breakpoints come from the measured width of the component, not from a device name.** The top bar's
  content measures about 930 px; its rules stopped at 760 px "because that sounds like a tablet", and
  the page scrolled sideways by 177 px at 768. The breakpoint is 940 now.
- The page must read `scrollWidth - clientWidth === 0` at **288, 320, 375, 768, 885, 960, 1024 and
  1440**.

---

## Coaching off is a mode, not a demo trick

The assistant can be switched to listen without speaking: it still detects, still judges, still starts
the legal clock, and says nothing during the call. The worker gets the report at the end.

Two reasons, and the second is the real one:

1. **It makes the demo honest.** Run the same call twice. Coaching off: the staff member misses the
   notice and the report card shows the miss. Coaching on: the sign fires, the staff member names the
   hardship process, the report is clean. A judge watches the difference instead of being told about it.
2. **It is a rollout path.** A bank can run it silent for a month to measure what is being missed, then
   turn coaching on. That is a far easier thing to buy than "install our AI into live calls".

Measured: same call, coaching off gives **0 sign cards on screen and 4 signs recorded and judged**;
coaching on gives 4 and 4. Identical verdicts, identical deadline, identical score.

---

## Accessibility controls are copied, not invented

Twelve settings, each taken from a product that ships it: text size in four steps (BBC), line spacing
(WCAG 1.4.12), Atkinson Hyperlegible, light/dark ground, higher contrast, reduce transparency (macOS),
46 px targets (WCAG 2.5.8), a 4 px focus ring, less motion, underlined links, announce, and read aloud.

Two details specific to this product:

- **Read aloud is a separate opt-in from announce**, because a headset leaks to the customer.
- **The settings panel is deliberately not `aria-modal`.** The worker may be on a live call, and a
  modal takes the sign announcements off the page behind it.

Contrast is computed, never eyeballed. The brand gold is 2.18:1 as text on the light ground and fails,
so it darkens to `#8A5E1C` (4.91:1) for text while the sign's gold **fill** stays, because ink on it is
6.56:1.

---

## Things deliberately not built

- **In-app music.** A player inside a regulated hardship tool is the detail that makes a reviewer doubt
  we understood the domain, and licensed audio carries real obligations. The insight underneath it was
  kept as a roadmap item: a media control for whatever the worker already has playing, and pausing it
  when a call starts. A web page cannot reach a desktop music app; that route needs the provider's own
  login and a paid tier.
- **Relabelling evaluation cases to raise a number.** Under the strict legal gate, recall on the
  40-case set fell from 1.00 to 0.83 — and 7 of those 8 "misses" are cases we had labelled wrongly
  against the actual law. They were left alone. Editing the test to match the code is how a gate stops
  meaning anything.

## A 401 is not always a bad key — read the error code

A deployment check reported the public anon key getting `401 Invalid API key` from the REST root, which
reads like a broken credential. It was not.

| call | result |
|---|---|
| `/auth/v1/settings` | 200 — the key is valid |
| `/functions/v1/api/health` | 200 — the key is valid |
| `/rest/v1/reports?select=id` | 401, `42501 permission denied for table reports` |

`42501` is a **grants** error, not an invalid-JWT error. Every table has row level security on, one
policy — `FOR ALL TO authenticated USING (user_id = auth.uid())` — and privileges granted to
`authenticated` only.

**Two layers, and reading only one of them produces a false alarm.** The grant decides whether a role
may touch the table at all. The policy decides which rows it sees. A bare anon key reaches nothing; a
signed-in user, including an anonymous-auth user, reaches only their own rows.

The tempting fix — `GRANT SELECT ON public.reports TO anon` — would have made every row readable with
the key that ships inside the published bundle. **Both failures are HTTP 401. One means "who are you",
the other means "you may not touch this table."**
