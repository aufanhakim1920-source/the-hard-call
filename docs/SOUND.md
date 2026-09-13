# Sound

The Hard Call is used by someone whose eyes are on a distressed customer, not on a screen. Sound is not
decoration here — it is the channel that still works when nobody is looking at the monitor. That is
also why there is so little of it: a channel that fires constantly stops being a channel.

**Nothing in this app is synthesised.** Seven real recordings, all Mixkit, all licensed for
commercial use. There is no oscillator, no generated tone and no procedural noise anywhere in the
codebase — verified by grep across `src/`, `supabase/`, `scripts/`, `eval/` and `dev/`. The single
`AudioContext` in the repo (`src/lib/speech.ts`) is an **analyser on the microphone** driving the
input level meter; it is connected to no destination and emits nothing. Licences and sources:
[`public/sfx/ATTRIBUTION.md`](../public/sfx/ATTRIBUTION.md).

⚠️ **Nobody has listened to these.** They were chosen, levelled and re-balanced entirely by
measurement — peak, RMS, duration, spectral distribution and play counts. Every number below was
measured; no claim here is about how anything sounds. **Aufan needs to hear them on a headset
before this ships.**

---

## The event map

Eight named events on seven files. `undo` and `failed` share one recording.

| Event | Where it fires | File | Gain | Heard peak | On a live call |
|---|---|---|---|---|---|
| `legal` | a legal sign is raised — starts a 21-day statutory clock | `sign-legal.mp3` | 0.22 | −13.3 dB | **yes, at 0.121 (−18.5 dB)** |
| `tip` | a tip is raised — advice, not an alarm | `sign-tip.mp3` | 0.34 | −14.4 dB | silent |
| `handled` | a sign marked handled; a lesson, correction or practice customer saved | `mark-handled.mp3` | 0.26 | −17.3 dB | silent |
| `undo` | that mark taken back; call history cleared | `mark-undo.mp3` | 0.45 | −17.8 dB | silent |
| `deadline` | a deadline ticked off in the list | `deadline-done.mp3` | 0.26 | −12.2 dB | silent |
| `report` | the report card arrived | `report-ready.mp3` | 0.34 | −15.6 dB | yes, full — the call is over |
| `failed` | End call was pressed and the write-up **did not** arrive | `mark-undo.mp3` | 0.45 | −17.8 dB | yes, full — the call is over |
| `tap` | tabs, switches, buttons, submitting a typed line | `switch-tap.mp3` | 0.16 | −16.5 dB | silent |

`failed` is declared here and **not yet called**. Wiring it is a one-line change in a file this lane
does not own — see *Handed to other lanes* at the bottom.

### The two that matter, and why they cannot be confused

|  | `legal` | `tip` |
|---|---|---|
| length of real signal | **135 ms** | **229 ms** |
| heard peak | −13.3 dB | −14.4 dB |
| low / mid / high | 0.0 / 43.9 / **56.1 %** | 11.9 / **83.6** / 4.5 % |
| spectral centroid | 3 620 Hz | 752 Hz |

They are **1.1 dB apart in level** and a factor of **4.8 apart in centroid**. The distinction is
carried by texture and length, never by loudness, so a worker who turns the volume down does not
lose it. On a live call the legal sign is the only sign sound that plays at all, at 0.55 of its
practice level — quiet enough not to alarm a customer whose headset picks it up, present enough to
land on a worker who is not looking at the screen.

---

## What a demo call actually produces — measured

A full ~50 s scripted demo call in the running app, instrumented by wrapping
`HTMLMediaElement.prototype.play` and recording every call with its file, gain and timestamp.

**Before this pass — 10 plays for 6 events:**

| t | file | gain | note |
|---|---|---|---|
| 7.6 s | `sign-tip` **×2** | 0.34 | 1 ms apart |
| 27.2 s | `sign-legal` **×2** | 0.22 | 0 ms apart |
| 36.8 s | `sign-tip` **×2** | 0.34 | 0 ms apart |
| 42.4 s | `sign-tip` **×2** | 0.34 | 0 ms apart |
| 72.1 s | `switch-tap` | 0.16 | End call pressed |
| 75.3 s | `report-ready` | 0.34 | report card |

**After — 6 plays for 6 events:** 7.2 s tip · 26.8 s tip · 37.3 s **legal** · 42.7 s tip · 93.9 s
tap · 98.1 s report. No file over three, no event heard twice.

**A live call, measured on the real path:** one typed hardship line raised **three signs at once**
(1 legal + 2 tips) and produced **exactly one sound** — `sign-legal.mp3` at gain 0.121. Marking that
sign handled produced **zero**. Submitting the typed line produced zero.

**Sound off means silence:** five navigations with the switch off produced **0** `play()` calls; the
same navigations with it on produced one each.

**Nothing plays before a user gesture:** on a cold load the app constructs seven `Audio` elements
with `preload="auto"` and calls `play()` on none of them — measured 0 plays between load and the
first click. `preloadSfx()` only warms the cache.

---

## What changed in this pass, and why

### 1. Every sign sound was firing twice — fixed in the sound layer

Measured above: four sign events, eight `play()` calls, 0–1 ms apart. The cause is upstream —
`playSigns` is called **inside a `setSession` updater** in `src/lib/engine.ts`, and React may run an
updater more than once for a single state change. Because the two calls land on one cached `Audio`
element the result is one restarted sample rather than two audible hits, but it also doubles the
screen-reader announcement beside it, and it means every count taken here was wrong by 2×.

`play()` now refuses a repeat of the **same file within 90 ms**, and any sound within **70 ms** of
the previous one — with `legal` exempt from the second rule, because a statutory alert is never
dropped to protect the texture of something else. The observed duplicate gap was 0–1 ms; two
deliberate clicks are never within 90 ms. Verified: four tab clicks 300 ms apart still produce four
taps, and a deliberately double-fired sign event produces one sound.

### 2. The tip sound is capped at three per call

`sign-tip.mp3` fired **three** times in the demo call and **four** times in 5 of the 42 archived
demo runs in `eval/demo-runs.json`. Four breaks the standing rule that no one file sounds more than
three times in a stretch a person hears as one piece — and a call is that stretch.

The fourth tip is also the one that has stopped meaning anything: by then the worker has learned the
pattern, and every extra firing spends a little of what makes the legal sound different. So:

- **tips: at most three per call.** The budget resets when a call starts and when it ends, and is
  only spent when the sound was actually started — a silenced call does not leave the next one short.
- **legal signs: never capped.** Missing one costs the customer a statutory right.
- A capped tip still draws its card, still vibrates the phone, still announces to the screen reader.
  It just stops interrupting.

Verified: six tip events in one call → three plays; a legal sign after the budget is spent → still
plays; a new call → the budget is back.

### 3. A deadline tick would have been the loudest thing in a customer's ear

`deadline` carried `live: true` while its own comment said it was an off-call sound. Measured in
live mode it returned gain **0.26** — **6.7 dB louder than the attenuated legal sign at 0.121**. It
is unreachable today (opening the Deadlines view unmounts the call), so nobody has heard it; the
flag was simply wrong, and if a future screen ever puts a deadline beside a live call the wrong
sound must not be the loud one. Now `live: false`.

### 4. The dead `sign` alias is gone

`play("sign")` — one sound for every sign, the thing this set exists to end — no longer appears
anywhere in `src/`. Its own comment said to delete it once that was true, so it is deleted. The type
system now rejects any attempt to bring it back.

### 5. Two names, one file, one element

`undo` and `failed` share `mark-undo.mp3`. The element cache and the repeat guard are both keyed by
**file** rather than by name, so the browser fetches the recording once (measured: eight preload
entries became seven) and the three-repeat rule counts samples, which is what the rule is about.

---

## What is deliberately silent

Silence is a design decision here, not an omission.

| Moment | Silent because |
|---|---|
| **A call starting** | The worker started it. They know. A sound would be the app talking about itself. |
| **Every sound except the legal sign, during a live call** | The headset leaks. Anything the app plays, the customer may hear, cannot interpret, and will assume is about them. A sign already lifts the sheet on a phone, vibrates, draws a card and announces to the screen reader — sound is the fourth channel on that event, not the only one. |
| **The whole app while "coaching off" is set** | That mode exists so a bank can measure what staff miss without prompting them. A sound during it would be the prompt. The engine still flags, still records, still writes the report card. |
| **The assistant retrying a failed flag call** (`paused`) | It self-heals within seconds. A sound for something that fixes itself trains the worker to ignore sounds. |
| **The fourth and later tip in one call** | See the tip budget above. |
| **Speech recognition dropping out** | The mic level meter and the Listen button carry it visually, and the transcript stops moving. Argued for and rejected for the deadline: it fires on a permission prompt and on ordinary pauses, so it would be the most frequent sound in the app and the least meaningful. |
| **Leaving a live call by clicking another tab** | `tap` is muted on a live call and the tab click is handled while the call is still mounted, so it is silent. Correct by policy — but that click also discards the call, which is a UI question, not a sound one. |

### Not applied: the three-repeat rule against `switch-tap.mp3`

Four tab clicks produce four taps, and a long session produces far more. This is a deliberate
exception, and the reason is what the rule is for: it comes from film, where one timeline is heard
as one piece and a sample repeating becomes wallpaper. A click echo is not wallpaper — it is the
direct, immediate answer to the worker's own finger, like a key click, and capping it would make a
button that sometimes does not respond. It is also the smallest thing in the set: 52 ms, heard peak
−16.5 dB. **The rule is enforced where it applies — the assistant's own sounds, within one call.**

---

## The standing rules, audited against the measurements

| Rule | Result |
|---|---|
| No kick-drum sample | **Pass.** Highest low-band content in the set is `deadline-done` at 13.0 % below 250 Hz. Nothing has a low body. |
| No sparkle or tinkle layer | **Pass.** A tinkle is tonal *and* high. The two most tonal files (spectral peak-to-median 115 and 89) are `switch-tap` and `sign-tip`, both centred at or below 2.9 kHz; the two brightest (`report-ready`, `mark-handled`) measure 12 and 9 — broadband, not tonal. Nothing is both. |
| Nothing low as the last sound | **Pass.** The last sound of a call is `report-ready`: **0.0 %** below 250 Hz, centroid 10.1 kHz. |
| No file more than three times | **Pass for the assistant's sounds**, now enforced in code. `switch-tap` is exempt by the decision above. |
| No continuous background bed | **Pass.** No element loops, no bed exists, every sound is a one-shot. |
| Never synthesise audio or music | **Pass.** Verified by grep; the only `AudioContext` is a microphone analyser. |

---

## Measured file inventory

Peak and RMS are of each file's real signal with its silent tail trimmed at −40 dB. "Heard" is after
the playback gain the app applies. Measured independently with ffmpeg + numpy, not copied from the
previous pass.

| File | file length | real signal | peak | RMS | gain | heard peak | heard RMS | low / mid / high | centroid |
|---|---|---|---|---|---|---|---|---|---|
| `sign-legal.mp3` | 1.036 s | 135 ms | −0.1 dB | −14.1 dB | 0.22 | −13.3 dB | −27.3 dB | 0.0 / 43.9 / 56.1 | 3 620 Hz |
| `sign-tip.mp3` | 0.305 s | 229 ms | −5.1 dB | −20.8 dB | 0.34 | −14.4 dB | −30.2 dB | 11.9 / 83.6 / 4.5 | 752 Hz |
| `mark-handled.mp3` | 0.574 s | 184 ms | −5.6 dB | −23.3 dB | 0.26 | −17.3 dB | −35.0 dB | 0.2 / 3.4 / 96.4 | 7 383 Hz |
| `mark-undo.mp3` | 0.167 s | 80 ms | −10.8 dB | −28.8 dB | 0.45 | −17.8 dB | −35.7 dB | 0.0 / 50.8 / 49.2 | 3 616 Hz |
| `deadline-done.mp3` | 0.705 s | 329 ms | −0.5 dB | −26.4 dB | 0.26 | −12.2 dB | −38.1 dB | 13.0 / 15.0 / 72.0 | 5 721 Hz |
| `report-ready.mp3` | 1.372 s | 204 ms | −6.3 dB | −24.4 dB | 0.34 | −15.6 dB | −33.8 dB | 0.0 / 0.6 / 99.4 | 10 132 Hz |
| `switch-tap.mp3` | 1.106 s | 52 ms | −0.6 dB | −18.9 dB | 0.16 | −16.5 dB | −34.8 dB | 0.7 / 18.4 / 80.9 | 2 925 Hz |

Bands are % of energy below 250 Hz / 250 Hz–2 kHz / above 2 kHz.

---

## Handed to other lanes

Neither is a sound-file change, and neither is in this lane's files.

1. **`src/lib/engine.ts` — the impure updater.** `playSigns(add)` and the `announce(...)` loop sit
   inside the `setSession` updater in `commitSigns`. Move both out: keep the updater pure, and fire
   the sound and the announcement from the caller or an effect once the state has actually changed.
   The sound layer is now defended against it, the announcement is not.
2. **`src/components/CallScreen.tsx` — the failure nobody can hear.** In the `catch` of `finish()`,
   add `play("failed")` beside `setEndErr(...)`. The worker pressed End with their eyes on the
   customer; `tap` is muted on a live call, `report` never comes, and the error banner is on a
   screen nobody is looking at. The `failed` event already exists here and is safe on a live call
   because the call has ended.
