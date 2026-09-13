# Cold judge pass

I had not seen this product before. I opened the live URL
(https://aufanhakim1920-source.github.io/the-hard-call/) with local storage, session storage and
IndexedDB cleared, at 1440x900, on 13 Sep. I used it first and read the README and
`docs/SUBMISSION.md` only afterwards. I did not start a practice voice session.

The sentence I would say to another judge: **"It's the only one where the AI's output was a legal
deadline with an actual date on it, and I watched it hit their own backend twelve times while the
demo ran — but their own 'how good is the engine' section says results aren't published yet, which
is a strange thing to leave blank when the results file is sitting on the server returning 200."**

---

## 1 · The first fifteen seconds

I thought I had walked in on a call already in progress. The clock in the top right was counting —
it read 00:12 by the time I had finished reading the header — and the only prominent button was
**End call**. There is no Start. A name and a product were already filled in ("Sarah M.", "home
loan"). My honest first read was: *is this a live session someone left open, or am I looking at a
mock?*

What I looked at first was the right-hand column, because it is the only block of real writing on
the screen, and it is genuinely good: hardship needs **both halves in one sentence** — can't pay,
and won't be fixed soon — then 21 days, then a stated exception ("a date they'll be square by
cancels it — that is a timing problem, not hardship"). A product that tells me its own
false-positive rule before I ask for it buys a lot of credit in ten seconds.

What I tried to click and could not: **`National Credit Code s 72(4)`**. It is set in mono, in the
accent colour, directly under a legal claim. It reads as a citation link. It is inert. Same for the
quoted example phrases ("I'm behind", "I can't cover it") — they look like chips you can tap to try
them.

What I did not understand:
- The three pills top-right — "Saved here only", "Assistant ready", "Sound on". I could not tell
  which were status and which were switches. One of them is a button with no accessible name at all.
- **Where the thing I am supposed to press is.** The only action available to a stranger is
  **"▶ Replay the demo call"**, bottom-right, small, ghost-styled, sitting next to a text input. It
  has the lowest visual weight on a screen whose biggest button is End call. I found it by reading
  every line of the page, not by looking.
- What "Bank rang them" was for, or whether changing it changed anything.

---

## 2 · The main path, narrated

**Pressed Replay.** The header changed to `DEMO REPLAY` and a subtitle appeared: *"playing the demo
script through the real engine."* Good line. I believed it later, for reasons in §5.

**~8 s in.** The first sign card slid into the right column and for a moment it rendered **on top of**
the explainer text underneath it — two layers of legible type overlapping. It settled within a
couple of seconds, so it is an entrance transition that doesn't clear its ground, not a broken
layout. On a recorded video it would be one ugly second.

**~23 s.** Now I understood the product. The transcript on the left underlines the exact phrase that
triggered a sign. The card on the right names the sign, quotes that phrase back, gives me **a
sentence to say next in quotation marks**, and offers "Mark handled". The connection between "what
she said" and "what you should say" is the whole idea and it is made visually, not explained. This
is the strongest thirty seconds in the product.

**~35 s.** Three cards stacked, header reads `3 open · legal first, handled last`. The ordering rule
is stated where it applies. The status pill had flipped to "Listening" in amber.

**~55 s.** The legal card fired, and it is a different object — amber, `LEGAL` badge, and
**REPLY DUE · Sun 4 Oct · 21 days left · National Credit Code s72**. That is the moment the demo
earns its place. Everything before it is a nicer version of a keyword highlighter; this is an
obligation with a date.

**I got bored once**, between about 40 s and 55 s, when the cards stopped being new and I was waiting
for the script to finish. The transcript panel told me "script finished — end the call for the report
card" but the End call button is at the far opposite corner from where my eyes were.

**Ended the call.** Report card: **85/100**, `0 MISSED`, 4 of 4 answered, one marked PARTLY, judged
by `gemini-flash-latest`, 1 min 23 s. Then per sign: a written critique that **quotes the worker's
actual line with a timestamp** — including the one it marked down, *0:09 "Can you make the payment by
Friday?"* against *0:19 "would it help if we looked at changing your repayments"*. Then answer times
per sign, 1.5 s to 3.4 s. Then a deadline strip, then one thing for next time. Then Deadlines picked
up the 4 Oct clock and Calls kept the card.

**One thing went wrong here.** The count-up animation means that for the first second the card reads
**"0 OF 4 SIGNS ANSWERED"** in large type directly under a "0 MISSED" ring. My screenshot caught it,
and it says the opposite of the result. If the video pauses there, it reads as a failure.

---

## 3 · The claim, from use alone

*Listen to a hardship call as it happens; the moment the customer says something that legally
counts, put a card on screen with the statutory deadline and one sentence for the worker to say
next; afterwards grade the worker rather than the customer, and keep the deadline where it cannot be
lost.*

**Demonstrated, not asserted** — for the scripted path. The signs fire against real sentences, the
deadline is computed (4 Oct is exactly 21 days from 13 Sep, and both are Sundays — I checked), the
report card cites lines that actually appear in the transcript, and the calls go to a live backend.

**Asserted, not demonstrated:** that it works off a microphone on a real call; that practice mode
speaks; that anything syncs; and — the important one — **how often it is right**.

---

## 4 · The three weakest things

**1. The app says it has never measured itself, and that is not true.** About → "How good is the
⚠️ **SUPERSEDED — see "Checked afterwards" at the foot of this file. This finding is
WITHDRAWN: the eval numbers DO render on the live About page. The reading below was
taken before an async fetch resolved.**

engine" → *"Eval results not published on this build yet."* Meanwhile
`/the-hard-call/eval-results.json` is served by the same site, returns 200, and contains a 41-case
run: precision 1.00, recall 0.69, f1 0.82, per-key breakdown, zero errors. The page fetched that file
while I was on it. So the single best piece of evidence this team has is on the server, is requested
by the browser, and is shown to the judge as a placeholder. Right now the About page is a wall of
*other people's* numbers — NAB's $15.5m, ASIC's 35%, a 58% lift — and a blank where its own go.
That's the worst possible arrangement: it reads as a team that researched hard and never tested.

**2. The practice roster looks copy-pasted.** Five customers, each with a distinct, well-written
premise — a knee injury, a scam behind a complaint, a widower's pride, a safety call. Then three of
the five carry a **byte-identical** coaching line: *"They will not volunteer it. Ask an open question
about what changed before you ask for a date — push for money and they shut down."* Dean, Jayden and
Frank get the same sentence for three completely different problems, and one of them is a scam. The
first two customers have bespoke lines, so I can see where the writing stopped. Three of five also
carry the same "defensive" label. It is the one screen that made me think *unfinished* rather than
*deliberate*.

**3. The cold start does not tell me what state I am in.** A running clock, an End call button, no
Start, no call. A judge with five minutes and eight tabs open may reasonably conclude the demo is
already broken before finding the replay button in the corner. Related and smaller:
`brand/callflag-logo.png` returns **404** on the live site — the header falls back to a mark, so
nothing looks broken, but a 404 in the network log of a submitted build is free doubt.

Two more that are below the top three but real: the report card's `4 ANSWERED · 1 ONLY PARTLY` reads
as five things when it is four; and the sign-card entrance overlaps the text beneath it for a beat.

---

## 5 · What made me trust it more

**This is the part the team should protect.** I checked whether the demo was a canned animation, and
it is not. During the 50-second replay the page made **twelve separate calls to
`https://<project>.supabase.co/functions/v1/api/flags`** — one per transcript line — followed by
`/api/report` when I ended the call, plus `/api/health`. The UI's own claim, "playing the demo script
through the real engine," is literally true, and a judge can verify it in thirty seconds with the
network tab. That single fact separates this from every hackathon demo that plays a recording.

Also, in rough order of how much each moved me:

- The report card's **per-sign critique quotes the worker's own words with timestamps**, including a
  line I could scroll up and find in the transcript. Faking that is more work than building it.
- The **PARTLY** verdict. It marked the worker down for asking "can you make the payment by Friday?"
  before pivoting, and said so in a sentence. A demo built to impress does not award itself a
  partial.
- The **deadline arithmetic is real**: 13 Sep + 21 days = Sun 4 Oct, and the Deadlines screen carries
  the same date independently.
- The report card **names the model that judged it** (`gemini-flash-latest`) on the card itself.
- The **"Clear demo data"** panel on Deadlines states exactly what will be removed — "1 report card
  and 1 deadline, including the 1 clock still running" — and what survives. Counted, not generic.
- The **negative case is stated in the product**, not just the docs: a date they'll be square by is a
  timing problem, not hardship.

What did **not** move me: the score. 85/100 with no stated scale is decoration until something tells
me what 85 is out of the range of.

---

## 6 · Now having read the README and SUBMISSION

They describe the thing I used, and they are unusually honest — more self-critical than the product
is. The README pre-empts most of what I would have attacked: it refuses to quote the demo fraction,
it publishes the run where an earlier claim died, it flags that the deterministic detector
contributes **zero** of the 188 archived signs, and it says plainly that no connected voice call has
ever been recorded. `SUBMISSION.md` is a genuine checklist with a "NO" in it. I have judged a lot of
READMEs that would not survive the audit their own authors ran here.

**Where the documents and the product disagree:**

- The README says the published eval is *"also shown on the app's About page."* **It is not.** The
  ⚠️ **WITHDRAWN, see the foot of this file.** About page shows "not published on this build yet" while the file it describes is served and
  fetched. This is the one outright mismatch, and it costs the most, because the eval is the best
  thing in the README.
- README: *"Coaching can be switched off."* I never found that control on the main path — the Calls
  screen invites me to "run the same script again with the assistant silent" but nothing on the live
  call screen offered it to me. It is presumably in Settings; I did not open Settings. A judge on
  five minutes will not find the comparison the whole measurement rests on.
- The README's headline measurement — nothing missed coached, nothing handled silent, across 42 runs
  — is the strongest claim in the submission and **I could not see any part of it in the product**.
  The Calls screen is where it would live and it had one card in it. The evidence exists in a JSON
  file in the repo; a judge with five minutes sees one report card.
- The practice roster's repeated coaching line is not mentioned anywhere.

**Impressive in the product that the documents do not mention:**

- **The answer-time measurement.** "Sign raised → the worker's words", per sign, in seconds, with
  fastest and slowest. It is the most original thing on the report card and it is the one number in
  the whole product that could actually go on a team leader's wall. `README.md` refers to "the report
  card with its timeline and verdict rows" and never names it once.
- **The trigger-phrase underlining in the transcript.** The causal link between a sentence and a sign
  is drawn on screen. Not mentioned.
- **"Correct this sign" → Lessons.** The README describes the learning loop abstractly; in the
  product it is one button on every verdict row, and the Lessons screen explains itself in a single
  sentence ("the team's judgement becomes the AI's"). That button is the product's second-best idea
  and it is buried at the bottom of a scroll.

**What I could not check**, and am not implying I did: the microphone path, any ElevenLabs voice
call (I found the Start buttons on the practice roster and left them alone — I expected them to dial
a voice agent and burn shared quota), Settings, and mobile layout. Screenshots stopped rendering
partway through my pass, so anything I have not described above, I did not see.

---

## If I could change one thing before submission

Put the eval on the About page. It is already written, already served, already 200. A precision of
1.00 with an honest recall of 0.69 and a one-line explanation of why precision is the number that
matters for a legal clock would move this from "nice demo" to "these people tested it" — and it is
the only fix on this list that costs nothing but a wire-up.

---

## Checked afterwards — one finding withdrawn, two confirmed and fixed

**Withdrawn: the eval numbers ARE on the About page.** Checked directly on the
live site: precision 100%, recall 69%, exact 68%, speaker 100%, latency p50
1.9 s, all rendering. The reading above was taken before an async `fetch`
resolved. That is the sixth sample-too-early false alarm on this project in a
day, and every one of them looked exactly like a real defect.

⭐ **The rule the project keeps relearning: let the page settle, then look at
it — and screenshot before believing a failure.** An instrument that reads the
DOM at the wrong moment produces false alarms as readily as false passes, and a
false alarm costs whoever chases it.

**Confirmed and fixed: the logo 404.** `brand/callflag-logo.png` is not in the
repo and never has been — `public/brand` is empty. Every load of About fetched
a file that 404s. It was invisible because a probe decoded the image first and
only rendered it once loaded, so the page looked fine while the network tab did
not. About now uses the mark that is already drawn in code for the top bar.

**Confirmed, and by design: the repeated practice sentence.** Three customers
carry the same coaching line because the line describes what the *level* asks
of the worker, not the customer. It is correct and it still reads as a bug at a
glance — showing it once per level rather than per row is the fix, and it is
recorded as an open item rather than done.

**Taken and acted on: the report card's self-contradiction.** Already found
independently on the deployed site and being worked.

**Still open, and the sharpest thing in this report: the cold start reads as
broken.** A clock already counting, an "End call" button, no Start, no call —
and the only thing a stranger can press is the lowest-weight element on the
screen. That is a judgement about the first fifteen seconds of the first
impression, and it is worth more than any defect in this file.
