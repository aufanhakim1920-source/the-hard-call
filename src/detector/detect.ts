/**
 * Stage 2 + 3: turn candidates into flags, then resolve them against evidence.
 *
 * Two modes:
 *   "rules"  — deterministic only. No API calls, no cost, no rate limit.
 *              Fires only when both halves of the legal test are explicit.
 *   "hybrid" — same, but genuinely ambiguous candidates ("unclear") are sent to
 *              an adjudicator for the inability-vs-delay judgment. Clear cases
 *              still never hit the model, so quota goes on the hard calls only.
 */

import type { Adjudicator, Candidate, Flag, Resolution, Transcript, Turn, TurnRef } from "./types.js";
import { findCandidates, contextWindow } from "./lexicon.js";
import { RULES, ASKS_ABOUT_PROCESS, VARIATION_PROPOSED } from "./rules.js";

export type Mode = "rules" | "hybrid";

const ref = (t: Turn): TurnRef => ({ speaker: t.speaker, start_ms: t.start_ms });
const anyMatch = (text: string, ps: RegExp[]) => ps.some((p) => p.test(text));

function makeFlag(
  call_id: string,
  rule_id: string,
  raisedAt: Turn,
  confidence: number,
  seq: number
): Flag {
  const rule = RULES[rule_id];
  return {
    flag_id: `f_${call_id.replace(/^call_/, "")}_${String(seq).padStart(2, "0")}`,
    call_id,
    kind: rule.kind,
    persist: rule.persist,
    rule_id,
    raised_at: ref(raisedAt),
    obligation: rule.obligation,
    deadline_days: rule.deadline_days,
    deadline_from: rule.deadline_from,
    authority: rule.authority,
    confidence,
    staff_prompt: rule.staff_prompt,
  };
}

function confidenceFor(c: Candidate): number {
  // More independent signals in the triggering turn -> higher confidence.
  const signals = c.matched.difficulty.length + c.matched.mediumTerm.length;
  return Math.min(0.95, 0.7 + 0.06 * signals);
}

/** Which candidates count as a hardship notice, under the given mode. */
async function adjudicate(
  turns: Turn[],
  candidates: Candidate[],
  mode: Mode,
  adjudicator?: Adjudicator
): Promise<Candidate[]> {
  const accepted: Candidate[] = [];
  for (const c of candidates) {
    if (c.verdict === "inability") {
      accepted.push(c);
      continue;
    }
    if (c.verdict === "delay") continue;
    if (mode === "hybrid" && adjudicator) {
      const idx = turns.indexOf(c.turn);
      const verdict = await adjudicator(contextWindow(turns, idx), c.turn);
      if (verdict.is_hardship_notice && verdict.basis === "inability") accepted.push(c);
    }
    // mode "rules": "unclear" never fires. A missed notice is recoverable by a
    // human; a false notice on a customer who is fine is not.
  }
  return accepted;
}

/** Stage 3: settle each flag against what the staff member actually said. */
function resolve(flag: Flag, turns: Turn[]): Resolution {
  const rule = RULES[flag.rule_id];

  if (rule.unverifiableInCall) {
    return {
      status: "unverified",
      evidence: null,
      reason:
        "Discharged after the call by a system action, not by anything said on it. No in-call evidence can settle this.",
    };
  }

  const after = turns.filter((t) => t.speaker === "staff" && t.start_ms >= flag.raised_at.start_ms);
  const hit = after.find((t) => anyMatch(t.text, rule.satisfiedBy ?? []));

  if (hit) {
    return {
      status: "satisfied",
      evidence: ref(hit),
      reason: `Staff discharged the obligation at ${hit.start_ms}ms.`,
    };
  }
  return {
    status: "missed",
    evidence: null,
    reason: "The call ended and no staff turn discharged this obligation.",
  };
}

export async function detect(
  transcript: Transcript,
  opts: { mode?: Mode; adjudicator?: Adjudicator } = {}
): Promise<Flag[]> {
  const mode = opts.mode ?? "rules";
  const { call_id, turns } = transcript;

  const candidates = findCandidates(turns);
  const notices = await adjudicate(turns, candidates, mode, opts.adjudicator);
  const flags: Flag[] = [];
  let seq = 1;

  /* ---- request tier: low bar, fires before any legal claim is possible ----
   *
   * An explicit ask to change the repayment always qualifies, even alongside a
   * stated near-term recovery ("push it back, I get paid on the 20th") — that
   * is a real request and still not a statutory notice.
   *
   * Difficulty language on its own also qualifies, UNLESS the customer has
   * settled the question themselves by stating a near-term recovery and asking
   * for nothing. There is no threshold question left to ask in that case.
   */
  const firstNoticeAt = notices.length > 0 ? notices[0].turn.start_ms : Infinity;
  const requestCandidate = candidates.find(
    (c) =>
      (c.hasRequest || (c.hasDifficulty && c.verdict !== "delay")) &&
      // Only worth raising if it precedes the notice. A request and a notice on
      // the same turn is one event, not two prompts on screen at once.
      c.turn.start_ms < firstNoticeAt
  );
  let request: Flag | undefined;
  if (requestCandidate) {
    request = makeFlag(
      call_id,
      "HARDSHIP_REQUEST",
      requestCandidate.turn,
      requestCandidate.hasRequest ? 0.88 : 0.72,
      seq++
    );
    flags.push(request);
  }

  if (notices.length > 0) {
    // Debounce: one notice per call, raised at the first qualifying turn.
    const first = notices[0];
    const conf = confidenceFor(first);

    const notice = makeFlag(call_id, "NCC_72_ORAL_NOTICE", first.turn, conf, seq++);
    flags.push(notice);

    // A request that turned into a notice is one story, not two events.
    if (request && request.raised_at.start_ms <= notice.raised_at.start_ms) {
      request.superseded_by = notice.flag_id;
    }

    const inform = makeFlag(call_id, "ABA_INFORM_HARDSHIP_PROVISIONS", first.turn, conf, seq++);
    const asked = turns.find(
      (t) =>
        t.speaker === "customer" &&
        t.start_ms > first.turn.start_ms &&
        anyMatch(t.text, ASKS_ABOUT_PROCESS)
    );
    if (asked) inform.escalated_at = ref(asked);
    flags.push(inform);

    // Written-notice obligation only arms once a variation is on the table.
    const variation = turns.find(
      (t) =>
        t.speaker === "staff" &&
        t.start_ms > first.turn.start_ms &&
        anyMatch(t.text, VARIATION_PROPOSED)
    );
    if (variation) {
      flags.push(makeFlag(call_id, "NCC_72_WRITTEN_NOTICE_30D", variation, 0.64, seq++));
    }
  }

  for (const f of flags) f.resolution = resolve(f, turns);
  return flags;
}

/**
 * Live mode. Same functions, incremental input. Keeps a rolling buffer and
 * re-runs detection on each new turn, emitting only newly-raised flags so the
 * UI never shows the same obligation twice.
 */
export class LiveDetector {
  private turns: Turn[] = [];
  private emitted = new Set<string>();

  private call_id: string;
  private opts: { mode?: Mode; adjudicator?: Adjudicator };

  // Fields assigned explicitly rather than via constructor parameter
  // properties: this repo's tsconfig sets erasableSyntaxOnly (TS1294).
  constructor(call_id: string, opts: { mode?: Mode; adjudicator?: Adjudicator } = {}) {
    this.call_id = call_id;
    this.opts = opts;
  }

  async push(turn: Turn): Promise<Flag[]> {
    this.turns.push(turn);
    const flags = await detect({ call_id: this.call_id, turns: this.turns }, this.opts);
    const fresh = flags.filter((f) => !this.emitted.has(f.rule_id));
    fresh.forEach((f) => this.emitted.add(f.rule_id));
    // Live flags carry no resolution yet — the call is still running.
    return fresh.map(({ resolution, ...rest }) => rest as Flag);
  }

  /** Call once the audio ends to get the report-card payload. */
  async finalise(): Promise<Flag[]> {
    return detect({ call_id: this.call_id, turns: this.turns }, this.opts);
  }
}
