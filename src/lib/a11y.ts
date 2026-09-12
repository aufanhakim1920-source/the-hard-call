// Settings: how the app reads, and how the assistant behaves.
//
// The accessibility set is copied from what established products actually
// ship, not invented:
//   text size in steps          BBC "My display", GOV.UK guidance
//   line spacing                WCAG 1.4.12 Text Spacing
//   a hyperlegible typeface     Atkinson Hyperlegible (Braille Institute)
//   light / dark ground         every OS; glare and low vision cut both ways
//   reduce transparency         macOS Accessibility → Display
//   bigger targets              WCAG 2.5.8, Android/iOS touch guidance
//   thicker focus ring          Windows "focus rectangle" thickness
//   less motion                 prefers-reduced-motion, plus a manual switch
//   announce / read aloud       VoiceOver + TalkBack behaviour, opt-in here
//
// Two rules specific to this app:
//   1. The worker is on a live call, so "read aloud" is OFF by default — a
//      headset leaks it to the customer.
//   2. A sign must never depend on colour alone: the legal one is a filled
//      ticket with a hatch, the tips are outlined. That is not a setting.
//
// `coaching` is not an accessibility control, it is a rollout mode: a bank can
// run the assistant silent for a month to measure what staff are missing, then
// turn the prompting on. Off suppresses only the LIVE surfacing — the engine
// still flags, still records, still writes the report card and the deadlines.

import { useSyncExternalStore } from "react";

export type TextSize = 0 | 1 | 2 | 3;

export interface A11y {
  coaching: boolean;
  textSize: TextSize;
  lineSpacing: boolean;
  hyperFont: boolean;
  theme: "dark" | "light";
  highContrast: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  bigTargets: boolean;
  thickFocus: boolean;
  underlineLinks: boolean;
  announce: boolean;
  speak: boolean;
}

const KEY = "the-hard-call:a11y";

/** The ground the OS is asking for. The panel promises we follow it, so we do. */
function systemTheme(): "dark" | "light" {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

// `theme` is the one default that is not a constant — it is whatever the OS
// wants, so "following the system" reads as zero settings changed rather than
// as one. It moves again below if the OS does.
const DEFAULTS: A11y = {
  coaching: true,
  textSize: 0,
  lineSpacing: false,
  hyperFont: false,
  theme: systemTheme(),
  highContrast: false,
  reduceMotion: false,
  reduceTransparency: false,
  bigTargets: false,
  thickFocus: false,
  underlineLinks: false,
  announce: true,
  speak: false,
};

export const TEXT_SIZE_LABELS = ["Default", "Large", "Larger", "Largest"];

let state: A11y = load();
const listeners = new Set<() => void>();

function load(): A11y {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<A11y> & { bigText?: boolean };
    // Migrate the first version's single "bigText" switch.
    if (parsed.bigText && parsed.textSize === undefined) parsed.textSize = 2;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function commit(next: A11y) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — memory only */
  }
  apply();
  listeners.forEach((l) => l());
}

/** Everything lands on <html> so CSS answers without prop-drilling. */
export function apply() {
  const r = document.documentElement;
  r.dataset.text = String(state.textSize);
  r.dataset.theme = state.theme;
  r.classList.toggle("line-spacing", state.lineSpacing);
  r.classList.toggle("hyper-font", state.hyperFont);
  r.classList.toggle("high-contrast", state.highContrast);
  r.classList.toggle("reduce-motion", state.reduceMotion);
  r.classList.toggle("reduce-transparency", state.reduceTransparency);
  r.classList.toggle("big-targets", state.bigTargets);
  r.classList.toggle("thick-focus", state.thickFocus);
  r.classList.toggle("underline-links", state.underlineLinks);
  r.classList.toggle("coaching-off", !state.coaching);
  // Let the browser paint form controls and scrollbars to match.
  r.style.colorScheme = state.theme;
}

// Keep following the OS until the worker picks a ground of their own. "Chose
// one" is simply "differs from what the system was asking for" — no extra flag
// to store, and no flag to fall out of step with the value it describes.
try {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", () => {
    const following = state.theme === DEFAULTS.theme;
    DEFAULTS.theme = mq.matches ? "light" : "dark";
    if (following) commit({ ...state, theme: DEFAULTS.theme });
  });
} catch {
  /* no matchMedia — the stored ground stands */
}

export function getA11y(): A11y {
  return state;
}
export function setA11y(patch: Partial<A11y>) {
  commit({ ...state, ...patch });
}
export function resetA11y() {
  commit({ ...DEFAULTS });
}
export function useA11y(): A11y {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** How many switches are away from their default — shown on the chip. */
export function changedCount(): number {
  return (Object.keys(DEFAULTS) as (keyof A11y)[]).filter((k) => state[k] !== DEFAULTS[k]).length;
}

/**
 * Whether the assistant may speak up DURING the call.
 *
 * Read at the moment a sign fires, not captured once, so flipping the switch
 * takes effect on the next line rather than on the next call. It gates the
 * three live surfaces — the card, the sound, the announcement — and nothing
 * upstream of them: the flag still runs and the sign is still recorded.
 */
export function coachingOn(): boolean {
  return state.coaching;
}

// ---- the announcer -------------------------------------------------------

let politeEl: HTMLElement | null = null;
let urgentEl: HTMLElement | null = null;

export function registerLiveRegions(polite: HTMLElement | null, urgent: HTMLElement | null) {
  politeEl = polite;
  urgentEl = urgent;
}

/** Say something once. `urgent` interrupts — reserve it for a legal sign. */
export function announce(text: string, urgent = false) {
  if (!state.announce || !text) return;
  const el = urgent ? urgentEl : politeEl;
  if (el) {
    el.textContent = "";
    window.setTimeout(() => {
      if (el) el.textContent = text;
    }, 60);
  }
  if (state.speak && typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.lang = "en-AU";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* no voices here */
    }
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* nothing to stop */
  }
}

/** True when motion should be suppressed: the OS setting OR the in-app switch. */
export function motionOff(): boolean {
  if (state.reduceMotion) return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
