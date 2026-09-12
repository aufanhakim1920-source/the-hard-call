// Three real, licensed sounds (Mixkit, see /public/sfx/ATTRIBUTION.md).
// Nothing is synthesised.

import { getStore } from "./store";

const BASE = import.meta.env.BASE_URL;
const FILES = {
  sign: { src: `${BASE}sfx/ui-message-pop.mp3`, vol: 0.45 },
  handled: { src: `${BASE}sfx/ui-success-soft.mp3`, vol: 0.35 },
  tap: { src: `${BASE}sfx/switch-tap.mp3`, vol: 0.22 },
} as const;

export type SfxName = keyof typeof FILES;

const cache = new Map<SfxName, HTMLAudioElement>();

function get(name: SfxName): HTMLAudioElement {
  let a = cache.get(name);
  if (!a) {
    a = new Audio(FILES[name].src);
    a.preload = "auto";
    a.volume = FILES[name].vol;
    cache.set(name, a);
  }
  return a;
}

export function preloadSfx() {
  (Object.keys(FILES) as SfxName[]).forEach(get);
}

export function play(name: SfxName) {
  if (!getStore().settings.sound) return;
  try {
    const a = get(name);
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    /* autoplay blocked until first click — fine */
  }
}
