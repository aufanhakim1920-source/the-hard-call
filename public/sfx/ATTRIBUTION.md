# Sounds

Seven real recordings, all from Mixkit under the Mixkit Sound Effects Free
License (free for commercial use, attribution not required — credited here
anyway). **Nothing in this app is synthesised.** There is no oscillator, no
Web Audio node and no generated tone anywhere in the codebase; every sound is
a file somebody recorded.

| File | Plays when | Mixkit title | Source |
|---|---|---|---|
| `sign-legal.mp3` | A legal sign fires | Quick switch click | https://assets.mixkit.co/active_storage/sfx/2582/2582-preview.mp3 |
| `sign-tip.mp3` | A tip fires | Dry pop up notification alert | https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3 |
| `mark-handled.mp3` | A sign is marked handled | Fast transitions swoosh | https://assets.mixkit.co/active_storage/sfx/3115/3115-preview.mp3 |
| `mark-undo.mp3` | That mark is taken back · **and the report card fails to arrive** | Light switch sound | https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3 |
| `deadline-done.mp3` | A deadline is marked replied | Mechanical typewriter single hit | https://assets.mixkit.co/active_storage/sfx/1382/1382-preview.mp3 |
| `report-ready.mp3` | The report card arrives | Retract clock mechanism | https://assets.mixkit.co/active_storage/sfx/1049/1049-preview.mp3 |
| `switch-tap.mp3` | Switches, tabs, buttons | On or off light switch tap | https://assets.mixkit.co/active_storage/sfx/2585/2585-preview.mp3 |

Retired 2026-09-12: `ui-message-pop.mp3` (Message pop alert) and
`ui-success-soft.mp3` (Success software tone). Both are pitched musical tones —
measured spectral peak-to-median of 1.7 billion and 131 million against 1 353
for the sound that replaced them. A tone reads as a phone notification, and the
soft one is a rising major resolve, which is the wrong thing to play over a
report card that may say the worker missed a statutory sign.

## How loud, measured

Peak and RMS are of the file's real signal with its silent tail trimmed at
-40 dB. "Heard" is after the playback gain the app applies.

| File | real signal | file peak | file RMS | heard peak | heard RMS | low / mid / high |
|---|---|---|---|---|---|---|
| `sign-legal.mp3` | 135 ms | -0.1 dB | -14.1 dB | **-13.3 dB** | -27.3 dB | 0.0 / 43.9 / 56.1 |
| `sign-tip.mp3` | 274 ms | -5.1 dB | -21.6 dB | **-14.5 dB** | -31.0 dB | 10.2 / 84.9 / 4.8 |
| `mark-handled.mp3` | 219 ms | -5.6 dB | -24.0 dB | -17.3 dB | -35.7 dB | 0.3 / 3.2 / 96.5 |
| `mark-undo.mp3` | 106 ms | -10.8 dB | -29.9 dB | -17.7 dB | -36.8 dB | 0.0 / 52.0 / 48.0 |
| `deadline-done.mp3` | 329 ms | -0.5 dB | -26.4 dB | -12.2 dB | -38.1 dB | 13.0 / 15.0 / 72.0 |
| `report-ready.mp3` | 209 ms | -6.3 dB | -24.5 dB | -15.7 dB | -33.9 dB | 0.0 / 0.6 / 99.4 |
| `switch-tap.mp3` | 53 ms | -0.6 dB | -18.9 dB | -16.5 dB | -34.8 dB | 0.6 / 18.3 / 81.0 |

The legal sign and the tip are **1.2 dB apart** in what the worker hears. They
are separated by texture — 56.1% high against 4.8%, a dry clack against a soft
round pop — and by length, 135 ms against 274 ms. Turning the volume down does
not blur them.

On a live call only the legal sign plays at all, and at 0.55 of the level
above: -18.4 dB peak. See `src/lib/sfx.ts`.

## Nobody has listened to these yet

They were chosen and levelled by measurement, not by ear. **Aufan needs to hear
them on a headset before this ships.**

## Two events on one recording

`mark-undo.mp3` carries both `undo` (a mark taken back) and `failed` (End call was pressed and the
report card did not arrive). Seven files, eight named events — no eighth file was downloaded the
night before the deadline, and the element cache and the repeat guard are both keyed by file, so the
browser fetches it once and the three-repeat rule counts samples rather than names.

The full event map, the live-call policy and what is deliberately silent are in
[`docs/SOUND.md`](../../docs/SOUND.md).
