// The deterministic detector, wired into the live call.
//
// WHY THIS EXISTS. The sign engine asks a model, which is what lets it read
// phrasing nobody wrote a rule for — and which is also why it can be slow,
// throttled, or unavailable at the exact moment it matters. laural's detector
// (src/detector) reaches the same conclusion from a word list and two rules,
// in the browser, with no network call at all.
//
// Measured on this tree, rules mode, no API: 40/41 agreement with
// eval/cases.json, 0 cases where it fires and the case expects silence, and
// 4/4 of its own fixtures. The single disagreement is c41, which the deployed
// engine also fails and whose own note argues with itself.
//
// So it is not a second opinion to reconcile — it is the same opinion,
// arriving earlier and for free. It runs FIRST; the model pass then adds the
// cue signs (stress, job loss, safety) the detector deliberately leaves alone,
// and dedupes on the key.
//
// ⚠️ The detector must never invent a key of its own. A sign card, a deadline
// and a report row are all addressed by key, so a rule id leaking through here
// would draw a second card for a notice that is already on screen.

import { detect } from "../detector/detect";
import type { Flag, Turn } from "../detector/types";
import { todayISO } from "./api";
import type { Line, Sign, SignKind } from "./types";
import { uid } from "./types";

/** Her rule ids -> the keys this app already draws, clocks and scores. */
const KEY_FOR: Record<string, { key: string; kind: SignKind; title: string; dueLabel?: string }> = {
  NCC_72_ORAL_NOTICE: {
    key: "hardship-request",
    kind: "legal",
    title: "Counts as a hardship request",
    dueLabel: "Reply due",
  },
  ABA_INFORM_HARDSHIP_PROVISIONS: {
    key: "inform-hardship-provisions",
    kind: "tip",
    title: "Tell them the hardship process exists",
  },
  HARDSHIP_REQUEST: {
    key: "ask-about-hardship",
    kind: "tip",
    title: "Worth asking about hardship",
  },
  // NCC_72_WRITTEN_NOTICE_30D is deliberately absent: it is armed by a
  // variation being agreed and nothing said on the call can settle it, so it
  // belongs to the post-call record, not to a card in front of the worker.
};

function addDays(fromISO: string, days: number): string {
  const [y, m, d] = fromISO.split("-").map(Number);
  const at = new Date(y, m - 1, d + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}`;
}

/**
 * Our lines -> her turns. Lines whose speaker is still "unknown" are dropped
 * rather than guessed: her rules read the staff side to decide whether an
 * obligation was discharged, so attributing a line to the wrong mouth would
 * mark a duty satisfied that nobody performed.
 */
function toTurns(lines: Line[]): Turn[] {
  const base = lines.length ? lines[0].t : 0;
  return lines
    .filter((l) => l.speaker !== "unknown")
    .map((l) => ({
      speaker: l.speaker === "worker" ? ("staff" as const) : ("customer" as const),
      start_ms: Math.max(0, l.t - base),
      end_ms: Math.max(0, l.t - base),
      text: l.text,
    }));
}

function toSign(flag: Flag, lineId: string, now: number, evidence: string): Sign | null {
  const map = KEY_FOR[flag.rule_id];
  if (!map) return null;
  const due = flag.deadline_days ? addDays(todayISO(), flag.deadline_days) : undefined;
  return {
    id: uid("sg"),
    key: map.key,
    kind: map.kind,
    title: map.title,
    detail: flag.obligation,
    askNext: flag.staff_prompt,
    evidence,
    confidence: flag.confidence,
    t: now,
    lineId,
    handled: false,
    ...(due ? { dueDate: due, dueLabel: map.dueLabel ?? "Reply due", dueDays: flag.deadline_days! } : {}),
    ...(flag.deadline_days ? { source: flag.authority } : {}),
  };
}

/**
 * Run the deterministic pass over the call so far and return only the signs
 * that are not already on screen. Never throws: a fault in the fast path must
 * not stop the model pass that follows it.
 */
export async function localSigns(lines: Line[], lineId: string, existingKeys: string[]): Promise<Sign[]> {
  try {
    const turns = toTurns(lines);
    if (turns.length === 0) return [];
    const flags = await detect({ call_id: "live", turns });
    const have = new Set(existingKeys);
    const now = Date.now();
    const out: Sign[] = [];
    for (const flag of flags) {
      const map = KEY_FOR[flag.rule_id];
      if (!map || have.has(map.key)) continue;
      const raised = turns.find((t) => t.start_ms === flag.raised_at.start_ms && t.speaker === flag.raised_at.speaker);
      const sign = toSign(flag, lineId, now, raised?.text ?? "");
      if (!sign) continue;
      have.add(sign.key);
      out.push(sign);
    }
    return out;
  } catch (err) {
    console.warn("local detector failed, falling back to the model pass", err);
    return [];
  }
}
