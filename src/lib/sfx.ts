// Seven real, licensed recordings (Mixkit — see /public/sfx/ATTRIBUTION.md).
// Nothing here is synthesised: no oscillator, no Web Audio node, no generated
// tone. Every sound is a file that was recorded by somebody.
//
// ── How the set was chosen ────────────────────────────────────────────────
// The library these come from holds 204 files. Five shapes are excluded on
// sight, because they have each been rejected by ear before:
//   a kick body (low energy)  ·  a pure tone (it becomes a hum)
//   a rising "screech"        ·  a sparkle / tinkle
//   anything long enough to still be playing while somebody is talking
// Applied as a filter — under 400 ms of real signal, under 25% low, spectral
// peak-to-median under 20 000, no upward centroid drift, peak above -12 dBFS
// so it can be attenuated on purpose rather than by accident — 18 of the 204
// survive. All seven below come from those 18. Eight events share those seven
// files: `undo` and `failed` are one recording, keyed by src so the browser
// fetches it once and the three-repeat rule counts samples, not names.
//
// ── The grammar ───────────────────────────────────────────────────────────
// The assistant speaks with BODY; the worker's own actions TICK.
//   legal  a dry broadband clack — the only sound with real mid weight
//   tip    a soft round pop, mid-dominant, no edge
//   everything the worker does themselves is thin and high, and shorter
//
// A legal sign and a tip are 1.2 dB apart in peak level after gain. They are
// not told apart by loudness — they are told apart by texture (56% high vs
// 5% high) and by length (135 ms vs 274 ms). That is deliberate: a worker who
// turns the volume down must not lose the distinction.

import { coachingOn } from "./a11y";
import { getStore } from "./store";
import type { Sign } from "./types";

const BASE = import.meta.env.BASE_URL;

interface Spec {
  src: string;
  /** Playback gain. The file's own peak times this is what the worker hears. */
  vol: number;
  /** True when this belongs to the assistant's live surface, so "coaching off"
      must silence it. A sound the worker triggered themselves is not coaching. */
  call: boolean;
  /** True when it may still play on a LIVE call. See LIVE_CALL_POLICY below. */
  live: boolean;
}

const FILES = {
  /** A legal sign fired. Starts a clock the bank is answerable to. */
  legal: { src: `${BASE}sfx/sign-legal.mp3`, vol: 0.22, call: true, live: true },
  /** A tip fired. Advice, not an alarm. */
  tip: { src: `${BASE}sfx/sign-tip.mp3`, vol: 0.34, call: true, live: false },
  /** A sign marked handled. */
  handled: { src: `${BASE}sfx/mark-handled.mp3`, vol: 0.26, call: true, live: false },
  /** That mark taken back. Quietest file in the set, and falling — a release. */
  undo: { src: `${BASE}sfx/mark-undo.mp3`, vol: 0.45, call: true, live: false },
  /**
   * A deadline ticked off in the list. Off-call, so it is allowed some body.
   *
   * `live: false` because the comment above is a claim about where this can
   * happen, not a guarantee: today the Deadlines view unmounts the call, so it
   * is unreachable during one, but the flag was set to `true` and MEASURED at
   * gain 0.26 in live mode — 6.7 dB LOUDER in a customer's ear than the
   * statutory alert, which is attenuated to 0.121. If a future screen ever puts
   * a deadline beside a live call, the wrong sound must not be the loud one.
   */
  deadline: { src: `${BASE}sfx/deadline-done.mp3`, vol: 0.26, call: false, live: false },
  /** The report card arrived. The one sound that plays with nobody on the line. */
  report: { src: `${BASE}sfx/report-ready.mp3`, vol: 0.34, call: false, live: true },
  /**
   * The report did NOT arrive — End call was pressed and the write-up failed.
   *
   * The only event in the app whose silence is ambiguous with success. The
   * worker pressed End with their eyes on the customer; `tap` is muted on a
   * live call, `report` never comes, and the error banner is on a screen
   * nobody is looking at. So this is the one failure that must be audible, and
   * `live: true` is safe: the call is already over.
   *
   * It reuses `mark-undo.mp3` rather than adding an eighth file the night
   * before a deadline. That file is already the set's "that did not take"
   * gesture — 80 ms, falling, the quietest thing here — and it has been through
   * the same filter as the rest. Nothing new was downloaded and nothing was
   * synthesised.
   */
  failed: { src: `${BASE}sfx/mark-undo.mp3`, vol: 0.45, call: false, live: true },
  /** Switches, tabs, buttons. The smallest thing here, by design. */
  tap: { src: `${BASE}sfx/switch-tap.mp3`, vol: 0.16, call: false, live: false },
} as const satisfies Record<string, Spec>;

export type SfxName = keyof typeof FILES;

/**
 * MUTED DURING A LIVE CALL, except the legal sign — and that one attenuated.
 *
 * The worker is on a headset next to a person having the worst month of their
 * year. Anything the app plays, the customer may hear, cannot interpret, and
 * will assume is about them. The app already reasons this way once: `speak`
 * in a11y.ts is off by default with the note that a headset leaks.
 *
 * Nothing is lost by going quiet. A sign already lifts the sheet on a phone,
 * vibrates, renders a card and announces to the screen reader — sound is the
 * fourth channel on that event, not the only one.
 *
 * The one exception is the legal sign, because it is the only event where the
 * worker missing it costs the customer a statutory right, and it is the only
 * one that fires while their eyes are on the customer's file rather than on
 * the sign column. It plays at LIVE_ATTENUATION of its practice level.
 *
 * Practice and demo have no customer, so they run at full level: that is where
 * the worker learns what the two sounds mean, so that in a live call the
 * silent visual is recognised faster.
 *
 * To turn this off entirely, set LIVE_CALL_POLICY to "all".
 */
const LIVE_CALL_POLICY: "legal-only" | "all" | "silent" = "legal-only";
const LIVE_ATTENUATION = 0.55;

export type CallMode = "live" | "practice" | "demo";

let callMode: CallMode | null = null;
let tipsHeard = 0;

/** Call with the mode when a call starts, and with null when it ends. */
export function setCallMode(mode: CallMode | null) {
  callMode = mode;
  // The tip budget below is per call, so it resets on both edges: a call
  // starting and a call ending.
  tipsHeard = 0;
}

/**
 * ONE EVENT, ONE SOUND, ONE FILE — enforced here rather than trusted upstream.
 *
 * MEASURED on a full demo call: every one of the four sign events produced TWO
 * `play()` calls, 0–1 ms apart — eight calls for four signs. The cause is in
 * engine.ts, where `playSigns` sits inside a `setSession` updater, and React
 * may run an updater more than once for a single state change (StrictMode does
 * it deterministically in development; concurrent rendering may re-run one at
 * any time). The engine owns that file; this guard means the sound layer is
 * correct whether or not that ever changes.
 *
 * Two windows, because they answer two different questions:
 *   SAME name within 90 ms   — one event that fired twice. Always a mistake:
 *                              the observed gap was 0–1 ms, and two deliberate
 *                              clicks are never this close.
 *   ANY sound within 70 ms   — two files landing on the same frame, which is
 *                              how a clean sample starts sounding cheap. This
 *                              one is a preference, so `legal` is exempt: a
 *                              statutory alert is never dropped to protect the
 *                              texture of something else.
 */
const SAME_MS = 90;
const ANY_MS = 70;
let lastAt = -Infinity;
/** Keyed by FILE, not by name — the three-repeat rule is about samples, and
    `undo` and `failed` are two events sharing one recording. */
const lastBySrc = new Map<string, number>();

// Also keyed by file: two names on one recording share the element, so the
// browser fetches it once and neither can be heard twice on the same frame.
const cache = new Map<string, HTMLAudioElement>();

function get(name: SfxName): HTMLAudioElement {
  const src = FILES[name].src;
  let a = cache.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    cache.set(src, a);
  }
  return a;
}

export function preloadSfx() {
  (Object.keys(FILES) as SfxName[]).forEach(get);
}

/** The gain this name would actually play at right now, or 0 for silence. */
export function gainFor(name: SfxName): number {
  if (!getStore().settings.sound) return 0;
  const spec: Spec = FILES[name];
  // Coaching off silences the assistant for the length of the call — the
  // engine still flags, still records, still writes the card. Read live, so
  // flipping the switch mid-call takes effect on the next sign.
  if (callMode !== null && spec.call && !coachingOn()) return 0;
  if (callMode === "live") {
    if (LIVE_CALL_POLICY === "silent") return 0;
    if (LIVE_CALL_POLICY === "legal-only") {
      if (!spec.live) return 0;
      if (spec.call) return spec.vol * LIVE_ATTENUATION;
    }
  }
  return spec.vol;
}

/** Returns true when the sound was actually started, false when it was silenced. */
export function play(name: SfxName): boolean {
  const vol = gainFor(name);
  if (vol <= 0) return false;
  const now = performance.now();
  const src = FILES[name].src;
  if (now - (lastBySrc.get(src) ?? -Infinity) < SAME_MS) return false;
  if (name !== "legal" && now - lastAt < ANY_MS) return false;
  lastBySrc.set(src, now);
  lastAt = now;
  try {
    const a = get(name);
    a.volume = vol;
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    /* autoplay blocked until the first click — fine, the next one lands */
  }
  return true;
}

/**
 * One sound for a batch of signs, never a stack.
 *
 * Several signs can land off a single line. Playing one sound each turns the
 * most serious moment in the product into a rattle, and two files firing on
 * the same frame is how a clean sample starts sounding cheap. A legal sign in
 * the batch outranks everything: the batch gets the legal sound or nothing
 * else's.
 *
 * THE TIP BUDGET. `sign-tip.mp3` was measured at three separate firings in the
 * demo call and FOUR in 5 of the 42 archived demo runs (eval/demo-runs.json).
 * Four is over the line: no one file may sound more than three times in a
 * single stretch a person hears as one piece, and a call is that stretch. The
 * fourth tip is also the one that has stopped meaning anything — by then the
 * worker has learned the pattern, and every extra firing spends a little of
 * what makes the LEGAL sound different.
 *
 * So the tip is capped and the legal sign is not. A capped tip still draws its
 * card, still vibrates the phone, still announces to the screen reader; it
 * just stops interrupting. Losing a legal sign would cost the customer a
 * statutory right, so that one plays every time it fires.
 */
const TIPS_PER_CALL = 3;

export function playSigns(signs: readonly Pick<Sign, "kind">[]) {
  if (!signs.length) return;
  if (signs.some((s) => s.kind === "legal")) {
    play("legal");
    return;
  }
  if (tipsHeard >= TIPS_PER_CALL) return;
  // Counted only when the sound was actually started. A silenced call — sound
  // off, coaching off, a live call — must not spend the budget and leave the
  // next audible call short, and neither must the duplicate firing the guard
  // in `play` just swallowed.
  if (play("tip")) tipsHeard += 1;
}
