// Accessibility mode.
//
// The pattern is the one that worked on Peak & Pan and Biomate: an aria-live
// region so real screen readers get TEXT (not a synthesised voice they are
// already replacing), speech as a separate opt-in, a manual reduce-motion
// switch that does not depend on the OS setting, and every accessible name
// carrying the DATA rather than the colour.
//
// The one thing specific to this app: the worker is on a live phone call.
// Speaking a sign aloud can be heard by the customer through a headset, so
// "speak the sign" is off by default and says so.

import { useSyncExternalStore } from "react";

export interface A11y {
  bigText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  announce: boolean; // screen-reader announcements (free, on by default)
  speak: boolean; // spoken aloud (off by default — the customer may hear it)
  underlineLinks: boolean;
}

const KEY = "the-hard-call:a11y";
const DEFAULTS: A11y = {
  bigText: false,
  highContrast: false,
  reduceMotion: false,
  announce: true,
  speak: false,
  underlineLinks: false,
};

let state: A11y = load();
const listeners = new Set<() => void>();

function load(): A11y {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<A11y>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function commit(next: A11y) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode — keep it in memory */
  }
  apply();
  listeners.forEach((l) => l());
}

/** Put the switches on <html> so CSS can respond without prop-drilling. */
export function apply() {
  const r = document.documentElement;
  r.classList.toggle("big-text", state.bigText);
  r.classList.toggle("high-contrast", state.highContrast);
  r.classList.toggle("reduce-motion", state.reduceMotion);
  r.classList.toggle("underline-links", state.underlineLinks);
}

export function getA11y(): A11y {
  return state;
}

export function setA11y(patch: Partial<A11y>) {
  commit({ ...state, ...patch });
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

// ---- the announcer -------------------------------------------------------

let politeEl: HTMLElement | null = null;
let urgentEl: HTMLElement | null = null;

export function registerLiveRegions(polite: HTMLElement | null, urgent: HTMLElement | null) {
  politeEl = polite;
  urgentEl = urgent;
}

/**
 * Say something once. `urgent` interrupts the screen reader — reserve it for a
 * legal sign, where a missed second is a missed deadline.
 */
export function announce(text: string, urgent = false) {
  if (!state.announce || !text) return;
  const el = urgent ? urgentEl : politeEl;
  if (el) {
    // Clearing first makes a repeated string announce again.
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
      /* no voices on this machine */
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
