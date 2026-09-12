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

> ⚠️ **Not on `main` yet.** The detector is on an open pull request. Until it merges, the flags come
> from the model pass and **can** be rate-limited. This section describes the agreed direction, not
> today's build — a distinction worth keeping honest, since the rest of this file is used to answer
> "does it really work".

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

## The report card leads with a fraction, not a score

It used to lead with a ring showing a score out of 100 — which on most calls reads "not verified",
i.e. an empty circle as the first thing anyone sees. Rebuilt from the research:

- **"2 of 3 signs answered", not four percentages.** Natural frequencies are read correctly far more
  often than rates — Gigerenzer's study had 16 of 24 doctors right with frequencies against 1 of 24
  with the same fact as a percentage.
- **Answer times on a shared seconds axis.** The gap between a sign firing and the worker acting *is*
  the product's claim, and it had never been drawn as a duration. Position on a common scale is judged
  more accurately than length, which beats angle — which is also why a ring is no longer the primary
  reading.
- **A benchmark strip**, the same ratio over the last five calls. A number out of 100 invites a school
  grade; a comparison against your own history does not.
- **Motion encodes arrival only**, once, and every chart starts finished when the frames will not come.
  A bar frozen at 0% is not a subtler bar, it is a wrong one.

**Found by looking:** a `missed` verdict carries evidence too — the worker line where they failed to
address it — so the first build printed "answered in 21 s" underneath the word MISSED.

---

## Never let a measurement feed back into the thing being measured

The call screen sized itself as `100dvh` minus a hardcoded 56 px top bar. The bar is two rows on a
narrow screen and taller again at the largest text size, so the call header was pushed to **-32 px** —
above the top of the page, hiding the setup fields on the first screen anyone opens.

The obvious fix is to measure the bar and publish its height into `--topbar`. That is a **loop**,
because the bar's own height is `var(--topbar)`. It latched at 90 px and stayed there even at 1440 px
where the bar is genuinely one row — and a latched loop looks perfectly stable, which is why a spot
check at one width passes.

**A measured value gets its own variable.** `--topbar` stays the static token the bar is built from,
`--bar-h` carries the observation, and anything subtracting the real height reads
`var(--bar-h, var(--topbar))` so the fallback is correct before the first measurement lands.

Two more of the same family, both fixed: a `transform` keyframe ending on `none` wiped the centring of
a toast for its whole entrance (**183 px off**, only while moving), and a list reorder cannot be
animated by a transition at all — it changes node order, not a property, so a ticked deadline
teleported until it was given a FLIP.

## Choosing the model: precision over recall, on purpose

Measured on the same 41 cases, same run:

| | `gemini-2.5-flash` | **`gemini-flash-latest`** (deployed) |
|---|---|---|
| precision | 0.97 | **1.00** |
| recall | 0.81 | **0.74** |
| p50 latency | 1.89 s | **1.71 s** |

We kept the lower-recall model deliberately. **A false notice starts a 21-day clock the bank does not
owe** and puts a customer into a hardship process they never asked for. A miss costs a prompt the
worker did not get. The two errors are not symmetrical, so the metric that matters is not symmetrical
either. 2.5-flash catches one more hardship case and pays for it with a false positive on "the storm
knocked our power out".

**And the recall number is not what it looks like.** Every one of the 11 misses is a
`hardship-request` — not one is a statutory notice. Under the two-tier rule those are *requests*: a
hint that should prompt the worker to ask, starting no clock and stored nowhere. The engine already
detects them; the legal gate correctly refuses to call them notices, and until the request tier exists
there is nowhere to put them. **That recall figure is the shape of an unbuilt feature, not a quality
problem** — which is worth saying out loud rather than quietly reporting the better-looking model.

---

## A tier that only exists in the docs will be dropped at a boundary

The transcript adapter hard-coded `kind: "legal"` on every incoming flag. So a request — a live prompt
that starts no clock — was silently promoted to an obligation the moment it crossed into the report.

Proved end to end: a call with **no obligation at all** came back reporting `caught: 1`, which reads as
the worker having missed something that was never owed.

The adapter now carries an explicit `tier`, defaulting to `notice` so any caller predating the field
behaves exactly as before, and `caught` counts obligations only — in the server and the browser
fallback alike. **An agreement written in a document is not implemented until the type system carries
it across every boundary.**

## The before-and-after demo had nothing to compare

The pitch runs the same call twice — coaching off, then on — and puts the two report cards side by
side. It did not work, and the reason is embarrassing in hindsight: the demo replays a fixed
transcript, so **the worker said the same words whether or not he had been prompted**. Measured over
six runs: 3 of 4 answered coached, 3 of 4 silent, every time. The demo proved the switch worked. It
never proved the product did.

There are **two worker scripts now and one customer script**. Sarah says exactly the same words in
both, so the engine raises exactly the same signs at exactly the same moments. The only variable is
what the worker does about them.

| | coached | silent |
|---|---|---|
| score | **95** | **20** |
| signs caught | 4 | 3 |
| handled | 3 | 0 |
| missed | 0 | **3** |

The silent worker is not a caricature — he is doing what people do under pressure, chasing the payment
he rang about. He asks for part of it this week, pushes for a date straight after she says she was laid
off, and closes by writing it down: *"I'll put a note on the file and someone will be in touch."* Every
line is one a real worker says. He simply never offers a repayment change and never mentions that
hardship assistance exists.

⚠️ **This is a dramatisation and is described as one.** It is two workers handling one call, not a
recording of the tool changing someone's words live. The honest framing, and the one the demo script
uses, is *"the same call, handled two ways"*.

**Generalises to:** an A/B demo has to vary the thing you are claiming to change. Ours varied the
display and held the behaviour fixed, which is the one arrangement that can never show a difference.

## A legal flag now has to quote the customer

The request tier is built: a hint raises `ask-about-hardship`, which prompts the worker to ask and
carries no clock, no deadline and no authority. Only a stated inability over a period becomes a notice.

It emits under its **own key**, deliberately. The engine refuses to fire a key already on screen, so a
shared key would have let a hint at turn 2 cancel the statutory notice at turn 4 — a hint silently
eating the legal flag. That is tested turn by turn rather than argued.

**And the notice now requires a checkable quote.** The model must copy the customer's own sentence
saying they cannot meet the repayments, and code verifies that sentence appears in the turn being
judged.

That was not a preference. Asking the model to report a fact rather than a verdict made it report on
more turns, and it began inflating the period from circumstances — firing **15.7 s and 18.7 s early**
on two fixtures. The quote requirement caught a specific trick: it reached back three turns for "I
don't think I'm going to make the next one" — a line it had itself classified as a *single payment*
when it was said — and re-served it as a period because the picture had since got darker.

| | before | after |
|---|---|---|
| precision | 1.000 | **1.000** |
| recall | 0.738 | 0.690 |
| notice timing, 3 fixtures | one **28.5 s early** | **all three exact** |

Recall fell and we took the trade. **Firing a statutory clock 28 seconds early is the worst error this
system can make** — it starts an obligation on words the customer had not yet said. Two cases moved
from notice to request under the new rule; they are open questions for the rules owner, not relabelled.

**The pattern, for the third time on this project:** when wording will not hold a rule, make the model
produce something *checkable* and let code check it. First a classification, now a quotation.

## The demo's argument is a row, not a score

Twelve runs of the two-worker demo — seven coached, five silent — killed the comparison we thought we
had:

| | coached (7) | silent (5) |
|---|---|---|
| score | 95 twice, **"not verified" five times** | 30, 30, 40, 40, 45 |
| fraction | 4 of 4 twice, 3 of 4 five times | 2 of 3, 2 of 3, 2 of 3, 1 of 3, 1 of 3 |
| signs missed | **0, every run** | at least 1, every run |
| **the statutory notice** | **handled 7 of 7** | **missed 5 of 5** |

**The coached run usually returns no score at all.** The card withholds rather than invents whenever a
sign cannot be verified from the transcript, and the hardship-process prompt often cannot be. So the
*better* run is frequently the one with no number on it, and a "95 against 20" comparison was a lucky
pair rather than a result.

**The row that never wavered is the argument**: the statutory obligation was caught every single time
the worker could see it and missed every single time he could not. That is also the claim the product
actually makes. The demo points at that row now, and the script puts the score ring explicitly
off-limits.

**One asymmetry a judge will notice, so we say it first:** the coached run raises four signs and the
silent one three. The extra is the hardship-process prompt, which can only fire because the coached
worker said the words. It is a consequence of coaching rather than a rigged comparison — but an
unexplained difference in the denominator looks like one.

---

## Two cards, one axis — and nothing subtracted

Past reports get their own tab and a compare board that puts two calls on a shared axis, with the two
ledgers sign by sign underneath.

**Ledgers rather than two whole cards**, because the transcript is never stored. A card recalled from
storage has no timeline, no answer times and no quoted worker lines, so two cards side by side would
be one complete card next to one with holes in it. What survives storage is exactly what the argument
is made of.

**No difference is ever computed.** The same script does not score the same twice — an identical
coached run gave 95 and then 90. The board prints both fractions and both columns, and states only
what is true: that the scores are not repeatable, that the two calls raised different numbers of
signs, that a degraded call was never judged at all. **Subtracting two numbers that are not repeatable
produces a number that means nothing.**

## The live engine is the only one that counts, and it had never been tested

Every number up to this point — twelve demo runs, a fifteen-finding sweep, every eval figure — came
from a **local** API on port 8787 running a different model from the deployed one. And a structural
fact nobody had written down: **merging to `main` does not update what a judge talks to.** The site
ships automatically from GitHub Actions; the edge function ships by hand.

Checked against the live URL and the deployed function:

| | result |
|---|---|
| `/health` | `ok`, **2 keys armed**, `gemini-flash-latest` |
| a hint → a request, no clock | **5 of 5** |
| a stated inability → the statutory notice | **2 of 2** |
| the demo's own key line, in context | **3 of 3** |
| live site | current — Calls tab present, zero sideways scroll, no unexpected console errors |

**One real demo risk, and it is a timing one.** The engine makes one call per finished sentence and
**serialises them**, because each call needs to know which signs are already on screen or it would fire
duplicates. Each call takes about two seconds. At 2× speed the lines arrive every two to three seconds,
so the queue runs behind the transcript and **the legal sign can land after the final line**. It does
land — and ending the call waits for the queue, so the report card always contains it — but a presenter
who says "and there's the legal sign" too early will be pointing at nothing.

The demo script says: do not end the call until the sign is on screen. The serialisation is not a bug
to fix; it is what keeps the de-duplication correct.

**One empty result in seven**, on the first call after the function had been idle. Every repeat was
correct. Warm the engine with one call before demoing.
