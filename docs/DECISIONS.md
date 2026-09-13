# Decisions

Why The Hard Call is built the way it is — including the things we tried and rejected.

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
// The model classifies what was said. Code decides what it means.
// Three conditions, and the middle one is what kills "push it back two weeks".
const isNotice = (s: ModelSign) =>
  s.period === "months_or_open_ended" &&
  s.recovery !== "named" &&          // a named payday is a timing gap, not a notice
  quotedInThisTurn(s.inabilityQuote); // and the customer must actually have said it
```

`period` is a required enum — `none` / `single_payment` / `near_term_recovery` /
`months_or_open_ended` — so the model reports duration and deterministic code applies the law. That
reached **2 of 3**.

**Generalises to:** when prompt wording will not hold a rule, make the model classify and let code
decide.

---

## The deterministic detector owns the law; the model owns the judgement

> ⚠️ **Superseded in part — read this with the two later entries.** When this was written the
> detector was on an open pull request; it has since **merged** and runs first on every line. What did
> *not* follow is the conclusion at the bottom of this section. See *The deterministic detector is
> wired, and it is not yet load-bearing* and *Our own documents stopped agreeing with the product*
> below: it raises **0 signs on the demo call**, so the rate-limit claim stays out of the pitch.

The detector in `src/detector/` runs in **rules mode by default and makes zero API calls**. The legal
test is two signals in the same turn — payment inability plus not-near-term — with recovery language
as a suppressor. The model only adjudicates genuinely ambiguous turns, typically none or one per call,
and returns **no flag** on an API failure rather than guessing.

| layer | engine | why |
|---|---|---|
| legal obligations | deterministic rules | a rule should not be a judgement call |
| cause cues, and the question to ask next | Gemini | these genuinely are judgements |

**The consequence we expected from a demo, once it merged:** that the flagging half would not be
rate-limitable at all. ⛔ **That did not survive measurement and the sentence was never earned.** The
detector merged, and on a transcript whose wording its rules reach it does exactly this — but on the
call we actually demonstrate it raises nothing, so the flags there still come from the model and can
still be throttled. The correction is written up two entries below. We discovered the problem it
solves the hard way; see the quota section next.

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

Measured at the time, with a single worker script: coaching off gave **0 sign cards on screen and 4
signs recorded and judged**; coaching on gave 4 and 4, with identical verdicts, deadline and score.

⚠️ **That last sentence is now the opposite of the product's argument, and it is kept only to show
where the demo started.** Identical verdicts were exactly the problem — the worker's words were the
same either way, so the switch changed the display and nothing else (see *The before-and-after demo
had nothing to compare*). With two worker scripts, the ten runs measured on the deployed engine on
13 Sep gave: coaching off **0 cards, 5 signs recorded, 0 of 5 answered, the statutory notice missed**;
coaching on **4 cards, 4 signs, 4 of 4 answered, the notice handled.** Those exact fractions belong to
those ten runs and are not the claim — see *The fraction moved and the direction did not*, last in
this file. The deadline is still identical, and that is still the point — the clock starts whether or
not anyone on the call noticed.

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
  40-case set fell from 1.00 to 0.83 — and 7 of those 8 "misses" looked like cases we had labelled
  wrongly against the actual law. They were left alone. Editing the test to match the code is how a
  gate stops meaning anything. ⚠️ This was later challenged and re-settled; see
  **The seven labels, argued twice** below.

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
| score | ~~95~~ | ~~20~~ |
| signs caught | ~~4~~ | ~~3~~ |
| handled | ~~3~~ | ~~0~~ |
| missed | ~~0~~ | ~~**3**~~ |

⛔ **Every figure in that table is withdrawn — it is here as the mistake, not as a result.** It came
from a couple of early runs nobody had archived. Measured later across 26 recorded judgements, the
coached 95 appeared **0 times in 7** and that exact silent row appeared **0 times in 19**. The
replacement, and how it was caught, are in *The numbers in our own pitch had never been measured* at
the end of this file. **Do not quote this table for any purpose.**

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
| score | ~~95 twice~~, **"not verified" five times** | ~~30, 30, 40, 40, 45~~ |
| fraction | ~~4 of 4 twice, 3 of 4 five times~~ | ~~2 of 3 ×3, 1 of 3 ×2~~ |
| signs missed | **0, every run** | at least 1, every run |
| **the statutory notice** | **handled 7 of 7** | **missed 5 of 5** |

⚠️ **The two score rows are withdrawn** — the 95 never reproduced, and these twelve runs were on a
local engine that had been serving a stale build. The bottom row is the one that survived every later
measurement, which is the point this entry was making anyway. Current figures: the last entry in this
file.

**The coached run usually returns no score at all.** The card withholds rather than invents whenever a
sign cannot be verified from the transcript, and the hardship-process prompt often cannot be. So the
*better* run is frequently the one with no number on it, and a "95 against 20" comparison was never a
result. (Written here as "a lucky pair"; the later archive shows it was not even that — 95 does not
appear in any recorded run.)

**The row that never wavered is the argument**: the statutory obligation was caught every single time
the worker could see it and missed every single time he could not. That is also the claim the product
actually makes. The demo points at that row now, and the script puts the score ring explicitly
off-limits.

**One asymmetry a judge will notice, so we say it first:** the two runs do not raise the same number
of signs. ⚠️ **The direction stated here is now backwards.** At the time the coached run raised four
and the silent three; on the deployed engine, across all ten archived runs, **silent raises five and
coached four**. The extra sign is the hardship-process prompt, and it fires on the *silent* run
precisely because that worker never mentions hardship assistance — the coached worker does, so the
engine stops asking. Either way the point holds: it is a consequence of coaching rather than a rigged
comparison, and an unexplained difference in the denominator looks like one.

---

## Two cards, one axis — and nothing subtracted

Past reports get their own tab and a compare board that puts two calls on a shared axis, with the two
ledgers sign by sign underneath.

**Ledgers rather than two whole cards**, because the transcript is never stored. A card recalled from
storage has no timeline, no answer times and no quoted worker lines, so two cards side by side would
be one complete card next to one with holes in it. What survives storage is exactly what the argument
is made of.

**No difference is ever computed.** The same script does not score the same twice — an identical
coached run gave two different numbers. (The pair quoted here originally was 95 and 90; the 95 was
one of the figures later measured out of existence, and the archived spread is 85–90 locally and
85–88 deployed. The instability the argument rests on is real; that particular pair was not.)
The board prints both fractions and both columns, and states only
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

## A privacy claim belongs on the screen, not in the pitch

Turning a finished call into a practice customer is the third act of the product, and it works: the
call is read once, the model is told to invent a new name and job and change the age, suburb and every
number, and **nothing is saved until a person approves it**. A real run turned "Sarah M., home loan,
casual retail" into a primary school teacher named Emily Smith, and the next run into a part-time
retail assistant with a different surname and age.

None of that was visible. A judge had to take it on faith. **The card says it now** — that this person
does not exist, and what was actually done to make sure of it. The wording was checked against the
edge function before it was written, so it is true rather than generous.

**A failure said nothing a worker could read.** This is the only model call on that screen with no
local fallback, and its error surfaced as the server's own words — `/api/scenario failed (429)` — in a
12 px line at the end of a row of buttons, in a colour measuring **1.73:1** on the light ground. A
quota failure in front of a judge would have looked like a button that simply did nothing. Quota, a
refused key, an unreachable server and an incomplete customer now each get a sentence, and every one
of them ends by saying the call and its report card are untouched.

That colour turned out to be **five** hardcoded literals, one of them behind "Report failed" — so a
report failure was near-invisible on the light ground too. All five were one token away from correct.
**Third time this project has been bitten by a colour chosen for one ground and used on both.**

## The deterministic detector is wired, and it is not yet load-bearing

The sign engine's legal tier goes through a model, so it can be throttled. The
detector merged from `part/detection` reaches the same conclusion from a word
list, in the browser, with no network call — which is why it now runs first on
every line, mapped onto the keys this app already draws so the same obligation
cannot produce two cards.

What was measured rather than assumed:

| check | result |
|---|---|
| agreement with `eval/cases.json` | 40 / 41 |
| cases where it fires and the case expects silence | 0 |
| its own fixtures | 4 / 4 |
| **signs raised on the demo call with `/api/flags` forced to 429** | **0, from 23 blocked model calls** |

The last row is the one that matters. The fallback is real code on a real path
and it produces nothing on the call we actually demonstrate, because the demo's
phrasing — "Just a few months without the full payment" — pairs a period with an
implied inability and matches no entry in the lexicon.

**So the claim that the legal half cannot be rate-limited stays out of the pitch
until that line raises a sign.** A fallback that has never been seen to fire is
a story, not a feature.

## A lift that is a class cannot beat a transition that is already running

The list animation carries a re-sorted row on its own opaque layer so its
words are readable while it passes the rows it overtakes. The lift is a class.
The rows it is applied to already transition the property the lift changes — a
ticked deadline transitions `opacity`, a practice card transitions
`background` — so adding the class did not set the property, it started a
transition towards it, and a running transition outranks every rule in the
stylesheet, `!important` included.

Measured on the real list, ticking the top deadline of six, sampling the
carried row's computed opacity at five points of its own 340 ms trip:

| point in the trip | before | after |
|---|---|---|
| 0 ms | 0.45 | 1 |
| 85 ms | 0.45 | 1 |
| 170 ms | 0.45 | 1 |
| 255 ms | 0.45 | 1 |
| 340 ms | 0.45 | 1 |

It was see-through for the whole journey — the one thing the lift exists to
prevent — and in a tab that is not painting the transition never leaves its
first frame, so it would stay that way for as long as the throttling lasts.

**Rule: take the carry out of the transition's hands.** Nothing interpolates
while a row is in the air; the transitions return on landing, which is where
the dimming belonged. Re-measured after: 1 at all five points, dimming to 0.45
where it lands.

**Second defect, same function.** "Is this row passing anyone" was tested as
*travels further than its own height*, which misses the commonest case of all:
two neighbours swapping travel exactly one row each and cross in the middle,
so neither was carried. The test is now *which row is moving against the
traffic* — a re-sort displaces one row and everyone else shifts a single place
to close the gap, so the minority direction is the traveller. Checked on a
285 px trip, a 71 px adjacent swap, and Reopen (the row rises while five rows
fall): the right row carried each time, and a removal heal carries nobody.

**And a verification lesson worth more than either fix.** The Browser pane
stops compositing when hidden — `requestAnimationFrame` never fires, so any
script that awaits a frame hangs. Watching motion frame by frame is impossible
there. What works instead: pause the animation and seek it to fixed times,
reading computed style at each. It is frame-independent, exact, and it doubles
as the throttled-tab test — which is the only reason the frozen transition was
caught at all.

## Dimming text with `opacity` is choosing a colour blind

A sweep for one failing value found 23. Almost every one was a single mistake
repeated: `--ink` inverts with the theme and `--gold` does not, so every
ink-on-gold surface became cream on gold the moment the light ground was
selected — the primary button, the legal sign card's body, its "Mark handled"
button, the skip link, the sheet counter, `::selection`. All measured 2.18:1;
all now 6.56:1.

Two rules came out of it, both more useful than the list:

**1 · `opacity` on text is a colour you have not looked at.** The same 0.75
measured **8.56:1** on the plain card and **3.93:1** on the gold one. A dimmed
token is a different colour on every surface it lands on, and nothing warns
you. Use a per-ground token, not a dimmed one.

**2 · A colour that passes on one ground can fail on the other, and the token
is where that gets decided.** Three literal `#1c1f24` patches in the light
block turned out to be one missing token wearing three costumes. No stylesheet
here now has a colour literal in a text declaration.

## A contrast sweep reports phantom failures during an entrance

Verifying the above independently, a composited sweep of the light ground
returned **11 failures, two of them at ratio 1.00** — text supposedly the exact
colour of its background, i.e. invisible. The screenshot showed all eleven
perfectly legible.

The sweep folds every ancestor's `opacity` into the foreground alpha, which is
correct; but it ran while the page's entrance was still playing, so an
ancestor was legitimately part-way to opaque. Re-run after motion settled:
**0 failures, on both grounds.**

⭐ **Rule: measure contrast only after entrances have finished, and screenshot
before believing any failure.** This is the mirror image of the older lesson
that a gate reads what you declare rather than what is painted — the same
blindness, pointing the other way. An instrument that cannot see the screen
produces false alarms as readily as false passes, and a false alarm wastes the
time of whoever chases it.

## The report card was showing the wrong answer first

The split bar inflated from zero, which held **"0 of 4" on screen for 820 ms**
on a card whose whole job is to be understood in two seconds — 40% of the
glance spent on a wrong number, and the denominator counted too, so every
intermediate frame made a different claim.

The bar and the history strip are now true on frame one and arrive by a 7 px
rise; only the numerator counts, 620 ms → 420 ms. Measured in a genuinely
throttled tab the segments freeze at **644 px + 215 px**, the real 75/25,
where before they froze at zero.

The answer-time bars kept their sweep, because there the growth *is* the
value. That is the line: animate a quantity only when the animation is saying
something true about it.

One more thing the reduced-motion pass caught: the global rules squash
`transition-duration` but **not** `transition-delay`, so a staggered arrival
left a reduced-motion reader watching an invisible wait. Stagger must be
zeroed explicitly.

## A frozen tab is where an entrance's real cost shows up

Three separate faults this round were one shape: **an animation that never
advances past its first frame holds that frame forever.** A tab that is not
painting does that, and so does a slow machine at exactly the wrong moment.

| what | frozen at | cost |
|---|---|---|
| the active-tab underline | width 0 | which section you are in was carried by colour alone |
| the view container | `translateY(6px)` | 6 px of vertical scroll clipping the privacy footer at 1280×720 |
| the phone's bottom sheet | `translateY(0)` | sheet top 243 instead of 664 — covering the transcript, Listen and the type row |

**The fix for a transition is to mount already placed.** A transition never
runs on an element's first style, so applying the resting value on the first
commit costs nothing and removes the frozen state entirely; later changes
still animate. Measured on the tab underline: width 46 at t+0 on the same
throttled load that previously gave 0.

**The fix for the view was to delete the entrance.** A transform on a
container is not free: besides freezing, *any* transform makes the element a
containing block for every `position: fixed` descendant — and the view
contains several, including the phone's sheet. There is no version that keeps
the move and drops the costs, because the move *is* the transform. The
contents already animate on their own, so the container's 6 px rise was the
least valuable motion in the app and the most expensive.

⭐ **Animate the contents, not the frame.**

## A single-key shortcut needs to ask "is anyone interacting", not "is this an input"

The shortcut guard skipped `INPUT`, `TEXTAREA` and `SELECT`. The Settings
panel is deliberately non-modal, because a worker may need it during a live
call, so focus can sit on its controls while the call is still listening on
`window`. Measured: tab into the open panel, press **e**, and the call ends —
report written, panel still floating above it.

The guard now also ignores a dialog, a listbox, the select popup and anything
contenteditable. ⭐ **The question a global key handler must ask is whether
the user is interacting with something, not whether that something is a form
field.**

## My own verification was wrong twice, the same way

Both times I sampled the page 1.6–1.8 s after load, while it was still
settling, and both times the reading looked like a real defect:

- a composited contrast sweep returned **11 failures, two at ratio 1.00** —
  text supposedly invisible. The screenshot showed all eleven legible. An
  ancestor was mid-entrance and its opacity folded into the foreground.
- the tab strip reported `mask-image: none` while visibly cut off, which read
  as the edge fade being broken. It was present — the observer that marks the
  edge had not run yet.

⭐ **Rule: sample after entrances have finished, and screenshot before
believing any failure.** This is the mirror of the older lesson that a gate
reads what you declare rather than what is painted. An instrument that cannot
see the screen produces false alarms exactly as readily as false passes, and a
false alarm costs whoever chases it.

## Nobody had reset `background` on `button`

The customer's quoted words — the evidence a legal sign rests on — were drawn
with the **native Windows button face**: grey `#6B6B6B`, a 2 px outset white
border, centred italic text. It measured **3.10:1** and failed AA. It was the
second-heaviest object on the product's hero card and the least important
thing on it.

Worth saying plainly because it is the cheapest kind of defect to carry for
days: a control that has never been given a background gets the operating
system's, and the operating system's is louder than anything in the design.
**Sweep for unstyled native controls once per project**, not per component.

The rest of the card had the same shape of fault a level up — everything after
the title was one undifferentiated block of 12–13 px mono, so the **reply
date, which a 21-day statutory clock hangs on, was set at the same size as the
statute reference printed beside it.** The date is 19 px now in its own block;
the statute is 10 px underneath. The block appears only on legal cards,
because starting a clock *is* the difference between the two kinds of sign.

⭐ **Rank type by consequence, not by category.** A date with a legal deadline
attached and a citation that merely says where the rule lives are not the same
kind of small grey text.

## A moved node restarts its CSS animation

Ticking a sign re-sorts the stack, React moves the DOM node, and a moved node
**replays its CSS entrance**. Measured: the ticked card ran its 420 ms entrance
*while* the FLIP was carrying it to its new position — two animations writing
`transform` at once, still at scale 1.0008 when the trip ended.

⭐ **One owner per property.** The FLIP owns `transform` during a reorder, so
the card's CSS entrance was deleted rather than tuned. A list that animates its
own reordering cannot also let its rows animate themselves.

## A bar that reads "nothing" is not a subtler wrong picture

The obvious fix for a deadline bar animating `width` was to swap it for a
`scaleX` sweep. Checked against the component instead of pasted, and the sweep
was wrong: it measured **zero length past 2000 ms** on a page that was visible
but not compositing, because a CSS transition needs frames exactly as
`requestAnimationFrame` does and the only guard was `document.hidden`.

On the row carrying a statutory reply date, a bar reading "no time left" is not
a gentler error than a missing bar — it is a false statement about a legal
deadline. The bar is true on the first frame now (452 px at 0, 80, 160, 320 ms)
and the row arrives instead, transform only.

⭐ **Animate a quantity only when the animation is saying something true about
it, and only when its frozen state is also true.**

**And the same measurement found a case that had never once rendered
correctly:** past the due date, "time left" computes to zero, so an overdue
deadline drew a 0 px bar — and the hatch the stylesheet keeps for exactly that
case had never appeared in the app's life. Now 452 px of hatch where there was
nothing. A stylesheet rule with no way to reach it is not a safety net.

## The two report cards were nearly identical in the first second

The demo's whole argument is holding the coached card and the silent card side
by side. Judged as a stranger: both led with the customer's name, which is the
same on both; the only difference was one leading digit, "0 of 3" against
"4 of 4" (the silent fraction was 0 of 3 on the engine of the day; it is 0 of 5
now — the design point is the single digit, not the denominator), in the same
colour at the same size; and **the word carrying the
legal consequence, MISSED, was 10 px uppercase grey — the smallest type in the
region.** The one unmistakable difference was the score ring, the reading the
research deliberately demoted and which reads "not verified" on most real calls.

The miss count now sits under the name at 62 px in a state colour, and the
consequence is stated in words rather than implied by a number. A card where
nothing could be checked against the transcript renders **no verdict at all**
rather than a confident "0 missed".

⭐ **If two things are meant to be compared, measure how they differ in the
first second — not whether the difference is present somewhere on the page.**

## A guard cannot un-freeze a transition, only choose when it starts

Third instance tonight, and the one that finally generalises. The answer-time
bars grew from `scaleX(0)` behind a `requestAnimationFrame`, with a
`setTimeout` as the rescue. Measured with the transition paused and seeked:
**0 px of a 200 px bar at t=0.** And the rescue was no rescue — the timer only
*starts* the same transition, so a tab that cannot paint would have held
"answered instantly" on all four lanes **indefinitely**, not for 900 ms.

⭐ **A quantity that animates up from zero has no safe guard.** Whatever is
painted first is what a frozen tab holds, and a guard only decides when that
first paint happens. The fix is never a better guard; it is to make the value
true on the first frame and let the row *arrive* with a transform instead.

The deeper reason the sweep was expendable here: **the distance already said
the duration in space. The sweep said it again in time, and time is the half
that can lie.**

## Gold as the only signal made the worst call look like the best

When a call goes entirely one way the split bar is a single segment. So the
coached card drew 860 px of gold tint, and the silent card drew 860 px of flat
gold. At a glance both read as *one long gold bar* — and since gold is the
positive accent everywhere else in this product, the flat slab read as the
**fuller** of the two. Backwards, on the screen the entire pitch rests on.

The missed segment is now hazard bars cut out of the solid: 2 px of the card's
own ground every 6 px at 45°. Texture rather than hue, so it survives
greyscale, colour blindness and print; and under reduce-transparency the
answered tint goes solid while the stripes stay, so the two never converge.

⭐ **One accent colour cannot carry two verdicts.** The moment a chart can be
100% of a single category, length stops distinguishing anything and fill has
to. This is the fourth time on this project that meaning resting on colour
alone has failed — and the first time it failed while every individual colour
still passed its contrast check.

## A head and the first card beneath it are one object

The phone sheet's head announced the newest sign *by time*. The stack orders
open-legal first, then open tips, then handled. On the demo call the legal
sign is third of four in time — so the head named a tip while the gold legal
card sat directly underneath it.

⭐ **Two orderings of the same list is the worst version of both.** The head
now takes the stack's order. The sheet's auto-lift still keys on the genuinely
newest sign, because *that* is a question about what just happened rather than
about what matters most.

## The numbers in our own pitch had never been measured

`eval/demo-runs.ts` replays the demo script through the real engine — the same
detector pass, the same `/flags`, the same `/report` — and archives every run.
Nineteen silent and seven coached judgements were recorded **before** anything
was changed.

- **"Silent 20 / 3 caught / 0 handled / 3 missed" appeared in 0 of 19 runs.**
- **"Coached 95 / 4 caught / 3 handled / 0 missed" appeared in 0 of 7.**

Both were printed in the README as measurements. They came from a handful of
early runs that happened to land that way.

**The cause was not a race, and no sign was ever dropped.** The signs raised
were byte-identical across every run — same keys, same trigger lines. Calling
`/report` six times on one byte-identical session returned missed = **1, 1, 1,
1, 2, 2**. The entire variance lives in the written review. The model's own
note said why: *"You noted the file for someone to follow up."* The silent
worker's script contained *"I can give you a couple of weeks before the next
reminder goes out"* and *"someone will be in touch"* — on those words, partial
discharge of the obligation is a fair reading. **The script was sitting exactly
on the line it was supposed to be clearly one side of.**

So the script stopped promising what that worker never meant to offer, and both
scripts gained a neutral sign-off so a sign raised on the final line still has a
worker line to be judged against. Sarah's words are untouched to the character,
because that property is what makes the comparison honest.

**After — 10 runs on the deployed engine, every counted field identical:**

| | coached (4 runs) | silent (6 runs) |
|---|---|---|
| signs raised | 4 | **5** |
| answered | **4 of 4** | **0 of 5** |
| the statutory notice | **handled 4/4** | **missed 6/6** |
| withheld as unverified | 0 | 0 |
| score | 88 · 85 · 88 · 88 | 10 · 10 · 10 · 15 · 10 · 10 |

Only the score still moves, by three points at most, which is why the docs
already say never to quote it. **The line to say out loud is the fraction:
four of four answered against zero of five.**

And the silent run now raises *more* signs than the coached one, which reads
oddly for a second and is then the better story: the worker who never mentions
hardship assistance earns a prompt telling him to, and the worker who does
never triggers one. **The absence is the thing being measured.**

⭐ **Two rules out of this.** First: **a number in a pitch is a claim, and a
claim needs a harness, not a memory of a good run.** Ours survived in the
README for a day because nobody had a cheap way to re-run it; the harness cost
an hour and would have caught it on day one. Second: **a dev server that never
reloads its handlers will lie to you for as long as it is up.** The local API
had been running eleven hours and was still serving the pre-request-tier
engine — every "unreproducible" run measured against it was measuring old code.

## Our own documents stopped agreeing with the product

The harness fixed the pitch's numbers. It did not fix the sentences around them, and by the morning
of the 13th the four documents a judge reads disagreed with the code and with each other.

Every factual assertion in `README.md` and `docs/SUBMISSION.md` was resolved to still-true, now-false
or unverifiable — **124 of them** — plus every number in the demo script and the load-bearing figures
in this file. **21 distinct facts were wrong, restated across 37 places. 8 could not be settled from
this repository at all** and are now marked unverified where they stand, rather than removed: the ASIC
and iTnews citations, the prior-art table, and the two claims about services we cannot query from here.
Not one of the 21 was a lie. Every one had been true when it was written, and the product moved
underneath it.

The four that would have cost us something in front of a judge:

**1 · The apology contained the same class of error it was apologising for.** The README's note
retiring "95 against 20" said neither figure appeared in 26 recorded judgements. **95 did not; 20
did, in 7 of 19 silent runs.** What never appeared was the published *row* — 20 with 3 caught — because
`caught` was 1 on every one of the 19. A claim compressed from "this row never occurred" to "this
number never occurred" is a different claim, and the second one is false. ⭐ **When you retire a
number, restate the exact thing that was measured, not a shorter version of it.** The shorter version
is the one that gets checked.

**2 · A fallback we had never seen fire had been written up as a feature — twice, in opposite
directions.** `docs/DEMO-SCRIPT.md` told the presenter the flagging "does not stop when the key is
rate-limited, and you may now say so on stage." `docs/DECISIONS.md`, two sections apart, said the
opposite and had the measurement. Re-run independently, line by line over both demo scripts through
`src/detector/detect.ts`: **0 signs on 12 of 12 lines**, and **all 188 signs in `eval/demo-runs.json`,
every phase, came from the model.** Control in the same run — the fixture wording *"I can't make the
repayment. Not this month and honestly not for a while"* — fires `NCC_72_ORAL_NOTICE` immediately, so
the detector works; the demo's own phrasing is outside its lexicon. The evidence for the true claim
existed in this file the whole time and lost to the more flattering sentence in the other one.
⭐ **When two of your own documents disagree, the optimistic one is the one that gets performed.**

**3 · An asymmetry had reversed and the checklist still described the old direction.** Three
documents said the coached run raises more signs than the silent one. On the deployed engine it is
the other way round, in all ten archived runs: **silent 5, coached 4**, because the worker who never
mentions hardship assistance earns the prompt telling him to. A presenter working from the stale
version would have contradicted his own screen.

**4 · Three "open decisions" had been fixed in the source and nobody moved the row.** The speaker box
no longer alternates, the transcript hint is conditioned on coaching, and End call is no longer
disabled on an empty practice call. A checklist that lists solved problems is read as a checklist
nobody keeps, and the unsolved rows on it stop being believed.

**And one defect found by reading rather than running.** `.env.example` sets `VITE_API_BASE` to
`…/functions/v1`, one path segment short of the deployed function, and ships a blank
`VITE_SUPABASE_ANON_KEY`. Checked: that URL returns `404 NOT_FOUND: Requested function was not found`,
where the live site's `…/functions/v1/api` returns 200. CI reads both from repository variables, so
the deployed site is fine and **only a fresh clone following the README is broken** — which is
precisely the reader we cannot watch.

⭐⭐ **The rule, and it is the same shape as the harness lesson one entry above.** A number got a
harness because a number is a claim. **A sentence is a claim too, and it has no harness at all** —
nothing fails when a document goes stale, so it goes stale silently and stays that way until someone
reads it out loud in front of a judge. The cheapest available substitute is the one used here: for
every factual sentence, name the file, the run record or the command that would settle it, and if
nothing can settle it, delete the sentence. Twenty-one of ours could be settled and were wrong. The
ones that could not be settled are now marked unverified in place, which is the only honest state for
a claim with no way to check it.

## A side effect inside a state updater runs as many times as the updater does

When both flag passes were merged into one `commitSigns`, the sound and the
screen-reader announcement went inside the `setSession` updater. React is
allowed to run an updater more than once for a single update, and it does.

**Measured: a demo call produced 8 play calls for 4 sign events, in pairs
0–1 ms apart.** The sound hid it — both calls land on one cached audio element,
so you hear a restart rather than two sounds — but **the announcement beside it
doubled with nothing to hide it**, and every count ever taken from that path
was twice the truth.

⭐ **Rule: a state updater is a pure function of the previous state. Anything
that reaches the outside world — audio, a screen-reader announcement, a
network call, analytics — is computed before it and run once against the
answer.** The tell is that the symptom hides inside whichever effect happens to
be idempotent; the one that is not is where you find it.

Re-measured after moving them out: 5 sign cards, **4 plays, 0 double fires**,
no file over three.

## A contrast sweep only covers the states you put on screen

The keyboard badge on "Mark handled" measured **1.01:1** on a legal card and
**4.08:1** on a tip card — the only contrast failures left in the app, and they
were on its hero object. Same root cause as the 23-colour sweep: a token chosen
against the page, landing on a card.

It survived that sweep because **the sweep ran on screens with no live sign
card on them.** A sign card exists only during a call, and the call has to be
run to produce one.

⭐ **An automated sweep measures the DOM that happens to exist when it runs.
Enumerate the states — mid-call, handled, overdue, empty, failed — and put each
one on screen before believing a clean result.** The badge inherits the
button's own colour now: re-measured on a real card, **11.64:1**.

## Sound: what was measured, since nobody can hear it yet

An inventory of every sound the app plays, by instrumenting `play()` and
re-measuring each file with ffmpeg:

- **`sign-tip` hit four plays in 5 of the 42 archived runs**, over the
  three-repeat rule. Tips are capped at three per call now; **a legal sign is
  never capped and never dropped**, because a statutory alert is the one sound
  that must always arrive.
- **A deadline tick measured 0.26 gain during a live call — 6.7 dB louder in a
  customer's ear than the statutory alert itself at 0.121.** Unreachable today
  because the Deadlines view unmounts the call, so nobody had heard it; the
  flag was simply wrong. Silent on a live call now.
- Legal and tip are **1.1 dB apart and 4.8× apart in spectral centroid**
  (3620 Hz against 752). They are told apart by texture, not loudness — the
  right way round for a sound a distressed customer may hear down the line.
- The report failing was the only event with **no sound at all**, and its
  silence is ambiguous with success: the tap is muted on a live call, the
  report sound never comes, and the error banner is on a screen the worker has
  just looked away from.

Whole demo call: **10 sounds down to 6.**

⚠️ **Nobody has listened to any of this.** Every figure above is a count, a
level or a spectrum. It needs a person with a headset before the demo.

## The fraction moved and the direction did not

The pitch had a number in it again: *"four of four answered against zero of five."* It reproduced ten
times on the deployed engine, it was archived, and it was wrong to say out loud — because a **second**
pair of runs through the same product came back **coached 5 of 5, silent 0 of 4**, and both shapes are
in `eval/demo-runs.json`.

So the archive was counted properly rather than sampled. **42 runs, 14 coached and 28 silent**, across
two engines and both versions of the demo script.

**The denominator is not noise.** Four signs are raised in every single run on both sides:
`ask-about-hardship`, `job-loss`, `stress` and the legal `hardship-request`. Exactly one comes and
goes — `inform-hardship-provisions`, the prompt to tell the customer the hardship process exists —
and inside the archive it splits perfectly by engine: on the deployed function it landed on the
**silent** side in 13 of 13 silent runs and never in 7 coached ones; on the local source engine it is
the exact reverse, 7 of 7 coached and 0 of 15 silent. (`docs/EVIDENCE.md` records a browser pair with
the local-shaped result while calling the engine the deployed one, which is one more reason not to
promise a side.)

**Answered fractions found in the archive — ten distinct shapes:**

| side | shapes recorded |
|---|---|
| coached | 4 of 4 ×7 · 5 of 5 ×5 · 4 of 5 ×2 |
| silent | 0 of 5 ×7 · 1 of 5 ×5 · 2 of 5 ×1 · 0 of 4 ×3 · 1 of 4 ×3 · 2 of 4 ×3 · 3 of 4 ×6 |

("Answered" as the report card counts it: handled or partly. Under the stricter reading — handled
only — there are six shapes, and a coached card on which *every* sign is fully handled occurs in just
**3 of the 14** coached runs; the other eleven read 3 of 4, 3 of 5 or 4 of 5.)

**What survived all 42, with nothing near an exception:**

| | coached (14 runs, 63 signs) | silent (28 runs, 125 signs) |
|---|---|---|
| **missed** | **0** | 86 |
| **handled** | 49 | **0** |
| partly | 12 | 34 |
| unverified | 2 | 5 |
| **the statutory notice** | **handled, 14 of 14 runs** | **handled in 0 of 28** — missed in 25, partly in 3 |

The three silent runs where the notice came back *partly* are all from before the 13 Sep script fix;
after it, all nine silent runs missed it. Even counting them, the notice has never been handled on the
silent side.

⚠️ **The loose wording of the claim does not survive, and that matters.** *"Every sign answered on the
coached side, none answered on the silent side"* is only true if "answered" means two different things
on the two sides. Read strictly — answered = fully handled — the silent half is perfect (0 of 125) and
the coached half fails in 11 of 14 runs, which carry a *partly* or an *unverified*. Read loosely —
answered = handled or partly — the coached half holds and the silent half fails in 18 of 28 runs,
which carry partly verdicts on the cue tips. **The claim only holds in its asymmetric form: nothing
missed on the coached side, nothing handled on the silent side.** That is now the sentence in the
README, in the demo script's first block and in the checklist as E-0.

⭐ **Two rules, and the first is the one that keeps getting relearned here.** A number that reproduces
ten times is a measurement of ten runs; it becomes a claim only when you have counted the runs it does
*not* cover. Ours had thirty-two of those sitting in the same file. ⭐⭐ And the second: **when a claim
is retired for being unstable, restate the replacement in the exact form that was verified.** The
short, symmetrical version of the direction reads better and is false; the asymmetric version is the
one the archive actually supports, and a presenter can only be given the one that holds.

**Not fixed, recorded:** `docs/EVIDENCE.md` attributes its browser pair to the deployed engine, while
every archived deployed run has the opposite shape and its own correction section shows the local path
had been mistaken for the deployed one an hour earlier the same night. It is unresolved from inside
this repository, and it changes nothing about what to say on stage.

## Sixty-five borders, nine shadows, and all nine of them inset

Every pass tonight hunted defects. Nobody had asked whether the thing is any
good. Counted across the stylesheet: **65 `1px solid` declarations against 9
box-shadows, and all nine were `inset`** — drawing more lines. Zero elevation
anywhere in the app. That is the house reflex, measured at 49 of 50 past
builds, present here structurally rather than as a matter of taste.

**The plane order on Deadlines was upside down.** Of the three painted surfaces
larger than 8000 px² on that screen, two were the page's own colour, and the
only object with a ground of its own was the **settled** row. A finished
deadline had a surface; two running 21-day statutory clocks lay flat on the
page with a hairline under them.

⭐ **Depth is a ranking. If the finished thing is the only thing with a
surface, the screen is telling the reader the wrong story** — and a hairline
under a row is not a ranking, it is a fence.

Same screen, the same fault in type: the date a 21-day clock hangs on was 14 px
mono and "21 days left" was 12 px grey, **both quieter than the customer's
name beside them.** The report card's deadline block had already been fixed for
exactly this and this screen was missed. *When a rule is applied, grep for
every other place the rule belongs.*

**The About page's engine numbers were visible by accident.** Five ghost
rectangles — no border, no radius, no shadow, background set to the page's own
colour. They read as objects only because the grain layer sits under the root,
so any opaque background punches a smooth rectangle out of the texture. The
most textbook instance of the pattern in the app, drawn entirely by accident,
on the screen a judge reads to check the engine.

**And one regression caught inside the same pass:** raising the Practice row
put its badge on a new ground, where the gold drops from 4.91:1 to **4.48:1**
and fails AA. ⭐ **Changing a ground re-opens every contrast question that
ground had already answered.** A raise is not a cosmetic change.

## The error path of the failure you most expect

The practice voice's quota failure is the single most likely thing to happen
in front of a judge, and it was the one path with no friendly message on it.

The reason is worth keeping: a token failure **rejects `startSession()`**
rather than reaching `onError`, so the whole translation layer — written and
tested against `onError` — was simply not on that path. The SDK's raw
developer string went on screen instead, **including the agent id.**

⭐ **Check the error path of the failure you most expect, not the one your code
was written around.** A handler that covers the failures you imagined is not
the same as covering the failure that actually happens.

A second, smaller instance in the same file: the concurrency refusal contains
both "limit" and "capacity", so it matched the quota branch, and four people
practising at once were told the month's allowance had run out. **Matching an
error by substring is matching it by accident.**

## De-identification, tested against something worth testing

The demo call is a weak test of a privacy claim — no dollar figure, no suburb,
no date of birth, no account number in it. So a transcript was built carrying
**29 identifiers**: a double-barrelled name, an account number, a street
address, a suburb and postcode, a date of birth, a mobile number, an employer,
five dollar amounts, a spouse's name, a child's name, and a named private
school.

**Zero leaked.** The generated persona contained **no digits at all**. The
employer became "her clinic", the spouse "her ex-partner", the school "private
school", and the account number was stripped out of the product string it had
been embedded in. Verbatim overlap with the source: **0 shared 3-grams**, and
0 at 4, 5 and 6.

⭐ **A privacy claim tested against benign input is not tested.** The demo
transcript would have passed no matter how leaky the generator was, because it
contains nothing to leak.

**And the nuance that changes what may be said out loud.** The approved
customer stores `from_call_id`, and the report row for that call stores the
real customer's name. The *content* is de-identified; the *link* is not
removed. So the sentence is "carries none of their details, and keeps a
reference to which call it came from" — never "unlinkable". Overclaiming a
privacy property is worse than the property being narrower than you hoped.

## Nobody had asked what a model error body can contain

The practice panel printed a Gemini 503's whole 780-character JSON body on
screen under the friendly sentence. The question nobody had asked is what
*else* a model error body can carry — and the answer is anything the request
carried.

The detail is redacted **by shape** now, before display: bearer tokens, api-key
and secret and password with whatever follows them, JWTs, provider-prefixed
ids, and any long opaque run. Then flattened, capped at 180 characters, and
put behind a closed disclosure. **780 characters to 180.**

⭐ **A rule becomes a check the day it is found**, so the shapes live in
`eval/redact.check.ts` — seven real secret shapes plus a benign 503, exiting
non-zero if any survives. Verified: all seven redacted and the plain 503 passes
through intact, because **a redactor that eats everything is no more useful
than one that eats nothing.**

## A control that cannot succeed should not be offered

"Turn this into a practice customer" was enabled on a call with zero lines.
The server answers `400 empty session`, and the failure panel then told the
worker to **try again** — on a path where trying again can only fail again.

⭐ **An error message that suggests a remedy has made a claim, and that claim
can be false.** "Try again" on a deterministic failure is worse than no
message: it spends the user's time and their trust in the next message. The
control is disabled now with its reason beside it, and the failure branch names
the real remedy instead.

## The last irreversible click without a guard

Removing a generated practice customer was one click — no confirmation, no
undo, and the model call that built them already spent — sitting a few pixels
from **Start** on a grid of nine rows. Discard had the same shape: one click
erased a draft with nothing kept.

Both ask first now, and they use the app's **existing** patterns rather than a
third one: Discard opens the arm-then-confirm row that Deadlines and About
already use, and Remove arms in place, because a question row repeated nine
times is heavier than the thing it guards. The armed button disarms after six
seconds — an armed control that outlives the screen is the bug the guard exists
to prevent.

⭐ **Count the irreversible clicks in a product and check each one has a guard.**
There were three here and two of them had none; nobody had listed them.

## The seven labels, argued twice

The one place two of us reached opposite conclusions from the same documents, kept here in full
because the reasoning is the part that normally disappears into a merged branch.

Seven cases in `eval/cases.json` — c01, c02, c03, c08, c09, c11, c34 — are informal difficulty
language with no stated period. All seven were expected to raise `hardship-request`, and under the
strict legal gate none of them did.

**The first reading (`a21931a`, Shawn).** The expectations are wrong, not the engine.
`docs/hardship-flag-rules.md` triggers on inability over the medium term, a problem unresolvable
within about six months, and states outright that it does **not** trigger on temporary difficulty
with a stated near-term recovery. `fixtures/expected/expected_flags.json` goes further and calls a
fire on that shape in `call_002` the single most important failure to avoid. c02 names a payday
inside the same sentence; c11 names next month. So the seven were corrected to expect nothing, and
the pull request said plainly that this contradicted the README rather than quietly leaving both
standing.

⭐ **The argument was not "the number is too low".** It was that the labels were being moved toward
the **written authority**, which the code independently follows — a different act from moving them
toward the code. That distinction is real, and it is the reason this was a decision and not a
violation.

**The second reading (`77d20fe`, aufan; reverted in `ebd2644`).** The labels were never the defect.
Those seven *are* hardship turns. What the engine lacked was somewhere to put them: a second outcome
between "statutory notice" and "nothing". Setting them to expect nothing would have raised recall by
**deleting the evidence that the tier was missing** — the number would have improved and the gap
would have become invisible. The request tier was built instead, the seven labels were restored
verbatim, and the recall figure was left pointing at the gap.

**Settled: the labels stand, the tier carries the difference.** `hardship-request` recall is 0.25
because 9 of the 12 misses are the engine correctly raising `ask-about-hardship`, which the flat
label set has no vocabulary for. The results file marks that block `"scored": false`.

⭐ **The rule that came out of it, sharper than the one that went in:** *editing the test until it
agrees with the code is how a gate stops meaning anything* — and when a label looks wrong, the
repair is usually **a missing outcome, not a corrected label**. A low number that names a gap is
worth more than a high one that hides it.

Still open for laural: whether c09 ("the floods took the whole ground floor... no way I can pay this
month") and c34 ("nothing left this fortnight") are requests or notices. Neither names a recovery,
and the turn after usually settles it. That is a contract question, not a defect.

## Re-running the eval after the suite grew

`eval/cases.json` went from 41 to 44 when the three `inform-hardship-provisions` cases landed, and
the published run stayed at n 41 until it was re-run on 13 Sep. Both numbers were correct for what
they measured, which is exactly why the mismatch was easy to leave alone.

| | published (41) | re-run (44) |
|---|---|---|
| precision | 1.000 | **1.000** |
| recall | 0.690 | **0.721** |
| F1 | 0.817 | **0.838** |
| exact-set | 0.683 | **0.727** |
| errors | 0 | **0** |
| speaker | 41/41 | **44/44** |
| p50 / p95 | 1.94 s / 3.30 s | **1.74 s / 3.00 s** |

`inform-hardship-provisions` scores for the first time — support 1, 1.00 / 1.00 — because a case can
now declare a sign already on record, so the ABA duty's precondition is finally writable.

**One case moved, and it was the model, not the code.** `c04` went from request to notice. The notice
gate reads the model's `period` and `recovery` fields and a quote check; the only engine change since
the last run affects turns whose speaker is unknown, and `c04` resolved as `customer` both times.
⭐ **A gate whose input is a model field inherits that field's variance** — one borderline utterance
is the entire difference between the two runs, and a headline recall quoted to three decimals hides
that. Worth remembering before reading the next 0.03 as progress.

## Type carries affordance, and no CSS rule has to say so

A cold reader tried to click two things that do nothing: the statute citation
on the legal sign card, and the example phrases in the waiting column.

The interesting part is **what made them look clickable, because nothing did.**
Cursor `auto`. No underline, no fill, no border, no hover. The affordance was
entirely typographic: **10 px mono with letter-spacing, alone on its own line,
directly beneath a legal claim.** That is the shape of a citation link, and a
reader recognises the shape before they read the words. The example phrases
were three short quotes separated by interpuncts — the shape of a tag row.

⭐ **A promise can be made by type alone.** Mono plus tracking plus its own line
says "reference you can follow". Short strings divided by dots say "pills".
Neither needed a rule, and neither would be caught by a sweep looking for
`cursor: pointer`.

**All four were removed rather than wired up**, which is the cheaper and more
honest fix the day before a freeze: adding a feature to justify an affordance
is the expensive way round. The citation was deliberately **not** linked to
legislation — this is read mid-call, sending a worker off-site is the wrong
instinct, and it would have meant guessing at a stable URL on freeze day. The
example phrases are deliberately still inert, because filling the transcript
from a chip would **fake input into a product whose entire claim is that it
reads real speech.**

One was kept after examination: the `LEGAL` badge is a 999 px pill, which is
chip-shaped — but every button in this app is 4 px, so it mimics nothing here,
and that pill is what separates legal from tip in greyscale and for a
colour-blind reader. ⭐ **A shape is only a false affordance relative to the
shapes the rest of the product uses.**

## A card with zero surfaces has no reading order, however good its type is

The report card's *content* had been worked hard — the verdict leads, the miss
count is large, the split bar is hazard-striped, the answer times are honest.
Nobody had asked whether it was a well-made **object**. Measured on the
finished card:

- **0 painted surfaces** larger than 8000 px², across 1956 px of card
- **25 elements** carrying a 1 px border
- **eleven regions** whose margins were 18, 20, 20, 20, 22, 22, 24, 24, 26 px

So the model's write-up got the same air as the miss count, and the eye had no
second or third stop — just a walk down a stack of flat panels separated by
hairlines. ⭐ **Type can rank things only within a surface. Between regions,
the ranking is ground and air, and with neither there is no ranking at all.**

**And the reading order was inverted.** The score ring was a 132 px gold dial
at the top-right — the only round thing, the only saturated thing, at the
natural first-fixation corner — while the miss count the research put first was
a 65 px band of flat page. On the card that says the worker failed, **the
biggest warm gold glyph on screen read `30`**, and gold is this product's
positive accent everywhere else. The same fault the split bar's hazard stripes
were introduced to fix, one level up.

⭐ **Demoting something in doctrine is not demoting it in paint.** The decision
log had said for two days that the ring is not the primary reading. The ring
had not been told.

**A real WCAG failure found on the way past:** the ring's lit ticks were drawn
in `--gold`, **2.18:1 on cream** — below the 3:1 a meaningful graphic needs, on
the marks that *are* the score, and 1.79:1 once a plate sat behind them on a
phone. The rule is written at the top of that very stylesheet; the ring was the
one place not following it.

**And the plate needed two tokens, not one.** Dark takes `--ink-3` because
`--ink-2` is a 1.09:1 step and is invisible when you actually look at it; light
takes `--ink-2` because `--ink-3` there drops the ring's own labels to 4.12:1
and fails. ⭐ *Changing a ground re-opens every contrast question that ground
had answered* — including the questions asked by things that merely sit on top
of it.

## Motion may carry a value in; it may not pretend the value is something else

The ledger numerator counted up from zero over 420 ms — already the trimmed
version of a worse one where the denominator moved too. A screenshot caught
**"1 OF 5" on a call whose answer is five of five**, on the frame the pitch
lands on: the one most likely to be paused, photographed, or dropped into a
video.

Worse in a tab that is not compositing — the frames never arrive, so the figure
sat at **0** until a 570 ms safety timer rescued it. A number reading zero
because the tab was in the background is not a subtler kind of wrong.

⭐ **A quantity must be true on the first frame.** This was the fourth and last
place on this card breaking that rule, after the split bar, the deadline track
and the answer-time bars. The arrival is still animated — the row rises — but
the number is true from the first paint. Verified by sampling 120 ms after
mount and again after every animation finished: identical.

The hook had exactly one consumer and was deleted rather than left behind. ⭐
**A helper whose whole premise is "start a quantity at zero and decide later"
is a loaded gun for the next chart** — the same reason its sibling went this
morning.

## The same fault, four times in one day

Four screens, four passes, and every time the answer to one question was wrong:

> **What is the loudest thing on this screen, and is it the thing that matters most?**

| screen | loudest | what mattered |
|---|---|---|
| report card | the score ring, 132 px, round, saturated, top-right | the miss count, 65 px on flat page |
| compare board | the customer name, **identical on both rows** | the mode, 10 px grey, the only thing that differs |
| Lessons | **the empty text input**, 17,388 px2 of sunken ground | four lessons, flat page, 1 px rules |
| Deadlines | nothing; all open rows identical | an overdue clock versus one due in 16 days |

The compare board is the sharpest: the loudest type in each row was **the part that is the same in
both rows.** The screen exists to show a difference and was shouting the similarity. Lessons is the
most embarrassing: the box you type *into* outranked the corpus you have built, which is the only
proof the product's central claim is true.

**Type ranks within a surface. Between regions, the ranking is ground and air, and with neither there
is no ranking at all however good the type is.** Measured: the report card had **0** painted surfaces
over 8000 px2 against **25** hairlines; the compare board had **1**, and it was a data segment rather
than a region ground, against **53**.

A hairline under a row is not a ranking, it is a fence. And **four equal cards is not the cure for
four flat rows** - one continuous raised surface is; equal cards is the same failure wearing
containers.

**The standing cost, paid every single time:** changing a ground re-opened a contrast question that
ground had already answered. A Practice badge at 4.48:1, a deadline's "3 days left" at 4.48:1, a
plate needing two different tokens per ground, and `reduce-transparency` repainting a data fill to
the exact colour of the plate newly behind it. **After moving a ground, re-measure everything sitting
on it, including what the accessibility settings repaint.**

## A generator that writes to the path the site no longer serves

The offline A/B page moved from `demo/` into `public/` so Vite copies it into `dist/` and it deploys
with the site — laural's idea, agreed in the group, and it gives the submission a link that needs no
signup, no key and no network: press two buttons and watch the same call run twice.

The move left a trap behind. `eval/build-demo.ts`, the generator that writes that page, still wrote
to `demo/ab-demo.html` and still held the pre-move template. Nobody would have noticed until someone
regenerated the demo, at which point the old file would have come back as a second copy and the
deployed page would have quietly stopped matching its own source.

**A file that moves is not moved until everything that writes to it moves too.** Grep for the old
path, not just for the old file. The generator now writes to `public/`, its template is the shipped
page, and regenerating is a no-op: verified identical up to 45000 ms, the same events raised, 3
missed silent against 3 satisfied coached, the display gate holding at 3 shown with coaching and 0
without, 31 kB written, no `demo/` directory recreated, 0 external hosts, `tsc` clean.

## Masking the worker's own screen is not privacy, it is damage

PR #6 closes a real gap: `docs/hardship-flag-rules.md` claims names and addresses are stripped, and
`maskSensitive` only ever masked digit runs and emails. But the fix lands at the wrong boundary.

`maskSensitive` is called in `engine.ts:130` inside `addLine`, and the masked string becomes
`Line.text` — which is what the transcript **renders**. Measured over both demo scripts and the A/B
page's transcript, four lines change, two of them lines a judge watches:

| line | becomes |
|---|---|
| `Hi Sarah, it's Tom from the bank.` | `Hi ••••, it's •••• from the bank.` |
| `Honestly, I'm a bit behind on everything.` | `••••, I'm a bit behind on everything.` |
| `Meridian Home Loans, Jordan speaking.` | `Meridian Home ••••, Jordan speaking.` |
| `It's 27 Ardwick Street, Sunshine West.` | `It's •••• West.` |

The third is the diagnostic one: it masks the bank's own name and keeps the only actual name in the
sentence. The second comes from a comma-vocative rule whose stopword list cannot be completed —
every capitalised word before a comma is a candidate and English has hundreds of sentence-opening
adverbs.

**The doc's claim is about persistence, and display is not persistence.** The worker is on the call;
they can hear the customer say her name. The right split is `Line.text` keeping what was said and the
mask running where text leaves the browser — the flags request and the report payload. Then a regex
that occasionally eats "Honestly" costs nothing, because nobody reads that copy. Reported on the PR
with the measurements rather than fixed, because `mask.ts` is Tron's file.

⚠️ **Do not merge PR #6 before the demo video is recorded.**

## The submission film: the template carries the argument, the app carries the proof

Built 13 Sep evening in Remotion on the SOME BRANDS template — a white studio, a green floor for
the stage beats, one real cut-out per beat with a contact shadow, red extruded type, a halftone
over everything, smears instead of fades. 1920×1080 rather than the template's portrait
container, because the app is landscape and so are the judges' laptops. Narration is Aufan's
cloned voice at the settled neutral setting; every scene boundary is a line and every internal
beat is the frame a word is spoken, so re-voicing re-cuts the film.

**The first nine lines are laural's problem segment, word for word**, with her three citations
on screen at their beats. Nothing after it says a number the repo cannot back: 44 labelled
utterances and 0 false positives are in `public/eval-results.json`; "cannot be rate-limited" is
not said (C2); the A/B page is described as what it is — plain rules in the browser, no network.

**Three things the footage forced, all measured off the deployed app:**

- **The legal card lands on Sarah's LAST line**, not on "I got laid off" — 50.0 s into a 55 s
  call, on *"Just a few months without the full payment"*, because the notice needs both halves
  in one thing she says. The first recording pressed End call 2 s after the script finished and
  the card never reached the screen. Re-recorded with a wait for the gold card; narration line 15
  re-voiced to name the sentence the card actually answers.
- **The deployed `/flags` returned 502 six times across the first two recordings** (18:19–18:24).
  The client retried and both report cards still came out right, but the hero moment depends on
  that call answering inside the window. Reported to Tron; the re-recordings at 18:37 had 0 errors.
- **No free photograph exists for an envelope, a tear-off calendar, or ASIC's mark.** The letter
  and the calendar are drawn (the template's own precedent — its television and diamond were
  drawn); ASIC is named in type on its tile, never an invented logo. NAB's text wordmark is public
  domain and used referentially. Phone, headset, stopwatch, gavel and key are real Commons plates
  cut out with BiRefNet — licences in the film project's `ATTRIBUTION.md`.

**What did not work:** the first chain came out at 2:42 against Devpost's 3-minute floor — the
extra air went where the picture carries itself (the app at real speed, the two report-card
holds), never into the argument. The sound guard refused the first cue list three times (one click
file fifteen times, then four events in forty frames on the opening) — every refusal was right.
