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
  RG271_COMPLAINT_30D: {
    // Was missing, so the detector's complaint detection was dropped here and
    // the 30-day clock had no deterministic fallback if the model was
    // unavailable - which is the whole reason the detector runs first.
    // The app already owns this obligation under its own key, with the same
    // authority and the same 30 days, so this is a mapping rather than a new
    // idea.
    key: "complaint",
    kind: "legal",
    title: "This is a complaint",
    dueLabel: "Written response due",
  },
  // ON THE REQUEST TIER, checked rather than assumed after laural asked whether
  // mapping HARDSHIP_REQUEST to a "tip" loses it before the report card.
  //
  // It does not. `kind` here is the card's VISUAL class - legal or tip - and it
  // is not what decides persistence. The tier is derived from the KEY on the
  // server: `tierOf()` returns "request" for `ask-about-hardship`, and the
  // report input accepts `request` alongside `obligation` and `cue`. So a
  // request is persisted and reported, and it is scored as its own tier rather
  // than as an obligation. Verified in _shared/signs.ts and _shared/reportInput.ts.
  //
  // What genuinely has no home yet is `followup_days`. The detector now carries
  // 7 on a request - Tron's day-7 callback - and the client `Sign` type has no
  // field for a follow-up that is not a statutory deadline. Putting it in
  // `dueDate` would be wrong: it would render as a clock the law did not start,
  // which is the single error this product exists to avoid. It needs its own
  // field, which is a taxonomy change and belongs to whoever owns the type.
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
    .filter((l) => l.speaker !== "unknown" && (l.speakerConfidence ?? "known") === "known")
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
  const followUp = flag.followup_days ? addDays(todayISO(), flag.followup_days) : undefined;
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
    ...(flag.followup_days ? { followUpDays: flag.followup_days, followUpDate: followUp } : {}),
  };
}

/**
 * Run the deterministic pass over the call so far and return only the signs
 * that are not already on screen. Never throws: a fault in the fast path must
 * not stop the model pass that follows it.
 */
export async function localSigns(lines: Line[], _lineId: string, existingKeys: string[]): Promise<Sign[]> {
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
      const base = lines[0]?.t ?? 0;
      const source = lines.find((l) => l.speaker !== "unknown" && (l.speakerConfidence ?? "known") === "known" &&
        Math.max(0, l.t - base) === flag.raised_at.start_ms &&
        (l.speaker === "worker" ? "staff" : "customer") === flag.raised_at.speaker);
      if (!source || !raised) continue;
      const sign = toSign(flag, source.id, now, raised.text);
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
