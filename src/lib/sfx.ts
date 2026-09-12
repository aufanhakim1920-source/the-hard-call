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
// survive. All seven below come from those 18.
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
  /** A deadline ticked off in the list. Off-call, so it is allowed some body. */
  deadline: { src: `${BASE}sfx/deadline-done.mp3`, vol: 0.26, call: false, live: true },
  /** The report card arrived. The one sound that plays with nobody on the line. */
  report: { src: `${BASE}sfx/report-ready.mp3`, vol: 0.34, call: false, live: true },
  /** Switches, tabs, buttons. The smallest thing here, by design. */
  tap: { src: `${BASE}sfx/switch-tap.mp3`, vol: 0.16, call: false, live: false },

  /**
   * @deprecated One sound for every sign, which is what this set exists to end.
   * It is aliased to the LEGAL sound rather than the tip on purpose: until the
   * engine is switched to `playSigns`, a tip that sounds too serious is a
   * smaller failure than a legal sign that sounds like a tip. Delete this entry
   * once `play("sign")` is gone from engine.ts.
   */
  sign: { src: `${BASE}sfx/sign-legal.mp3`, vol: 0.22, call: true, live: true },
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

/** Call with the mode when a call starts, and with null when it ends. */
export function setCallMode(mode: CallMode | null) {
  callMode = mode;
}

const cache = new Map<SfxName, HTMLAudioElement>();

function get(name: SfxName): HTMLAudioElement {
  let a = cache.get(name);
  if (!a) {
    a = new Audio(FILES[name].src);
    a.preload = "auto";
    cache.set(name, a);
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

export function play(name: SfxName) {
  const vol = gainFor(name);
  if (vol <= 0) return;
  try {
    const a = get(name);
    a.volume = vol;
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    /* autoplay blocked until the first click — fine, the next one lands */
  }
}

/**
 * One sound for a batch of signs, never a stack.
 *
 * Several signs can land off a single line. Playing one sound each turns the
 * most serious moment in the product into a rattle, and two files firing on
 * the same frame is how a clean sample starts sounding cheap. A legal sign in
 * the batch outranks everything: the batch gets the legal sound or nothing
 * else's.
 */
export function playSigns(signs: readonly Pick<Sign, "kind">[]) {
  if (!signs.length) return;
  play(signs.some((s) => s.kind === "legal") ? "legal" : "tip");
}
