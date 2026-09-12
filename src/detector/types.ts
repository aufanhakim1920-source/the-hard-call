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

export type ResolutionStatus = "satisfied" | "missed" | "unverified";

export interface Resolution {
  status: ResolutionStatus;
  evidence: TurnRef | null;
  reason: string;
}

export interface Flag {
  flag_id: string;
  call_id: string;
  rule_id: string;
  raised_at: TurnRef;
  /** Set when a later turn makes an already-raised obligation more urgent
   *  (e.g. the customer directly asks whether a hardship process exists). */
  escalated_at?: TurnRef;
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
  /** "inability" -> hardship notice. "delay" -> not a notice. "unclear" -> needs adjudication. */
  verdict: "inability" | "delay" | "unclear";
  matched: { difficulty: string[]; mediumTerm: string[]; recovery: string[] };
}

export type Adjudicator = (
  windowTurns: Turn[],
  candidate: Turn
) => Promise<{ is_hardship_notice: boolean; basis: "inability" | "delay"; confidence: number }>;
