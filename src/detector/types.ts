export type Speaker = "customer" | "staff";

export interface Turn {
  speaker: Speaker;
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface Transcript {
  call_id: string;
  turns: Turn[];
}

export type TurnRef = { speaker: Speaker; start_ms: number };

/**
 * Three kinds of event, because the threshold has to scale with the consequence.
 *
 *   "obligation" — a legal duty was triggered. ASSERTED. Carries a deadline and
 *                  a citable authority. High bar: inability must be established.
 *                  Persisted, and the only kind that enters the compliance record.
 *
 *   "request"    — the customer has asked for a change to their repayments, but
 *                  inability is not established. Low bar, because the consequence
 *                  is only a prompt to the staff member to ask. No deadline, no
 *                  legal claim. Persisted (it records what the customer asked
 *                  for, not anything about who they are). Escalates to an
 *                  obligation once inability is established.
 *
 *   "cue"        — a circumstance signal that routes the call in the moment
 *                  (safety, scam, gambling, health). NEVER PERSISTED. Shown to
 *                  the staff member live and discarded when the call ends. The
 *                  detector in this module emits none of these; the sign engine
 *                  does. The kind exists in the schema so consumers can filter
 *                  on it rather than on a list of rule ids.
 */
export type EventKind = "obligation" | "request" | "cue";

export type ResolutionStatus = "satisfied" | "missed" | "unverified";

export interface Resolution {
  status: ResolutionStatus;
  evidence: TurnRef | null;
  reason: string;
}

export interface Flag {
  flag_id: string;
  call_id: string;
  /** Which of the three tiers this is. Consumers MUST branch on this. */
  kind: EventKind;
  /**
   * False means this event must never reach a database, a report card, or any
   * summary. Always false for `kind: "cue"`. Check this field, not the kind, so
   * the rule still holds if new kinds are added.
   */
  persist: boolean;
  rule_id: string;
  raised_at: TurnRef;
  /** Set when a later turn makes an already-raised obligation more urgent
   *  (e.g. the customer directly asks whether a hardship process exists). */
  escalated_at?: TurnRef;
  /** Set on a `request` that later became an `obligation`. Points at the
   *  obligation's flag_id, so the UI can show the upgrade rather than two
   *  unrelated events. */
  superseded_by?: string;
  obligation: string;
  deadline_days: number | null;
  deadline_from: string | null;
  authority: string;
  confidence: number;
  staff_prompt: string;
  resolution?: Resolution;
}

/** What the deterministic pass concluded about one customer turn. */
export interface Candidate {
  turn: Turn;
  hasDifficulty: boolean;
  hasMediumTerm: boolean;
  hasRecoveryNearby: boolean;
  hasRequest: boolean;
  /** "inability" -> hardship notice. "delay" -> not a notice. "unclear" -> needs adjudication. */
  verdict: "inability" | "delay" | "unclear";
  matched: { difficulty: string[]; mediumTerm: string[]; recovery: string[]; request: string[] };
}

export type Adjudicator = (
  windowTurns: Turn[],
  candidate: Turn
) => Promise<{ is_hardship_notice: boolean; basis: "inability" | "delay"; confidence: number }>;
