/**
 * Demo replay driver.
 *
 * Replays a fixture transcript through the live coaching path on the turns' own
 * timestamps, so it looks like a real call. Two modes:
 *
 *   coaching: true   — events surface as they are raised, as the worker would see
 *   coaching: false  — events are still recorded for the report card, but nothing
 *                      is shown during the call
 *
 * The coaching switch changes only what is DISPLAYED. Both runs produce the
 * identical event stream, because the detector cannot see the switch. That is
 * what makes the A/B honest: the difference on screen is the worker's chance to
 * act, not a different analysis.
 *
 * Rules mode only. No model calls, so this cannot be killed by a 429.
 */

import { LiveDetector, detect } from "../detector/index.js";
import type { Flag, Transcript, Turn } from "../detector/index.js";

export interface ReplayHandlers {
  /** A turn has been spoken. */
  onTurn?: (turn: Turn, index: number) => void;
  /** An event was raised. Only called when coaching is on. */
  onFlag?: (flag: Flag) => void;
  /** The call ended. `flags` carry resolutions and are the report card input. */
  onEnd?: (flags: Flag[]) => void;
}

export interface ReplayOptions {
  coaching: boolean;
  /** 1 = real time. 4 = four times faster. */
  speed?: number;
  /** Injected for tests so they need no timers. */
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class DemoReplay {
  private cancelled = false;

  private transcript: Transcript;
  private handlers: ReplayHandlers;

  // Fields assigned explicitly: this repo's tsconfig sets erasableSyntaxOnly,
  // which rejects parameter properties (TS1294).
  constructor(transcript: Transcript, handlers: ReplayHandlers = {}) {
    this.transcript = transcript;
    this.handlers = handlers;
  }

  cancel() {
    this.cancelled = true;
  }

  async run(opts: ReplayOptions): Promise<Flag[]> {
    const speed = opts.speed && opts.speed > 0 ? opts.speed : 1;
    const sleep = opts.sleep ?? realSleep;
    const live = new LiveDetector(this.transcript.call_id, { mode: "rules" });

    let clock = 0;
    for (let i = 0; i < this.transcript.turns.length; i++) {
      if (this.cancelled) break;
      const turn = this.transcript.turns[i];

      const wait = Math.max(0, turn.start_ms - clock) / speed;
      if (wait > 0) await sleep(wait);
      clock = turn.start_ms;

      this.handlers.onTurn?.(turn, i);

      // Always push. The detector runs identically in both modes; only the
      // display is gated, so nothing about the analysis depends on the switch.
      const raised = await live.push(turn);
      if (opts.coaching) raised.forEach((f) => this.handlers.onFlag?.(f));
    }

    const flags = await live.finalise();
    this.handlers.onEnd?.(flags);
    return flags;
  }
}

/** Both runs at once, no timers. Used to prove the switch changes no analysis. */
export async function compareCoaching(transcript: Transcript): Promise<{
  flags: Flag[];
  shownWithCoaching: string[];
  shownWithoutCoaching: string[];
}> {
  const flags = await detect(transcript, { mode: "rules" });

  const collect = async (coaching: boolean) => {
    const shown: string[] = [];
    const replay = new DemoReplay(transcript, { onFlag: (f) => shown.push(f.rule_id) });
    await replay.run({ coaching, sleep: async () => {} });
    return shown;
  };

  return {
    flags,
    shownWithCoaching: await collect(true),
    shownWithoutCoaching: await collect(false),
  };
}

/** today + n days, for rendering a real deadline date on screen. */
export function deadlineDate(days: number | null, from = new Date()): string | null {
  if (days == null) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
