// Adapter for docs/transcript-schema.md. Fixture annotations and resolution
// judgements are deliberately ignored: the report evaluates transcript evidence.
export type SpeakerConfidence = "known" | "inferred" | "unknown";
const CONFIDENCE: SpeakerConfidence[] = ["known", "inferred", "unknown"];

export interface Turn {
  speaker: "customer" | "staff";
  start_ms: number;
  end_ms: number;
  text: string;
  /** Optional, defaults to "known" so every existing fixture keeps its meaning. */
  speaker_confidence?: SpeakerConfidence;
}
export interface Transcript { call_id: string; turns: Turn[] }
export interface FlagEvent {
  flag_id: string;
  call_id: string;
  raised_at: { speaker: "customer" | "staff"; start_ms: number };
  rule_id: string;
  obligation: string;
  deadline_days: number | null;
  deadline_from: string | null;
  authority: string;
  confidence: number;
  staff_prompt: string;
  /**
   * Which tier this is. A "request" is a live prompt to the staff member: it
   * starts no clock and is never scored, because the worker was asked to ASK,
   * not to discharge an obligation. Only a "notice" is an obligation.
   * Absent means notice, so an older caller that predates the tier keeps
   * behaving exactly as it did.
   */
  tier?: "notice" | "request";
  kind?: "obligation" | "request" | "cue";
  persist?: boolean;
}
export interface TranscriptReportRequest { transcript: Transcript; flags: FlagEvent[] }

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function millis(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function adaptReportInput(input: unknown) {
  if (!record(input) || !record(input.transcript) || !Array.isArray(input.flags)) {
    throw new Error("Expected transcript and an explicit flags array (use [] when none).");
  }
  const transcript = input.transcript;
  if (!nonempty(transcript.call_id) || !Array.isArray(transcript.turns) || !transcript.turns.length) {
    throw new Error("Transcript requires call_id and non-empty turns.");
  }
  let previous = -1;
  const refs = new Map<string, string>();
  const lines = transcript.turns.map((turn: unknown, index: number) => {
    if (!record(turn) || !["customer", "staff"].includes(String(turn.speaker)) ||
        !millis(turn.start_ms) || !millis(turn.end_ms) || turn.end_ms < turn.start_ms ||
        turn.start_ms < previous || !nonempty(turn.text) ||
        // Absent is "known"; an unrecognised value is rejected rather than read
        // as the safe default, because silently trusting a typo is the failure
        // this field exists to prevent.
        !(turn.speaker_confidence === undefined || CONFIDENCE.includes(turn.speaker_confidence as SpeakerConfidence))) {
      throw new Error(`Invalid transcript turn at index ${index}.`);
    }
    previous = turn.start_ms;
    const ref = `${turn.speaker}:${turn.start_ms}`;
    if (refs.has(ref)) throw new Error(`Ambiguous transcript reference at index ${index}.`);
    const id = `t${index}`;
    refs.set(ref, id);
    return {
      id, speaker: turn.speaker === "staff" ? "worker" : "customer",
      t: turn.start_ms, text: turn.text, endMs: turn.end_ms,
      speakerConfidence: (turn.speaker_confidence ?? "known") as SpeakerConfidence,
    };
  });
  const ids = new Set<string>();
  const signs = input.flags.flatMap((flag: unknown, index: number) => {
    if (!record(flag) || !nonempty(flag.flag_id) || flag.call_id !== transcript.call_id ||
        !record(flag.raised_at) || !millis(flag.raised_at.start_ms) ||
        !nonempty(flag.rule_id) || !nonempty(flag.obligation) || !nonempty(flag.staff_prompt) ||
        !nonempty(flag.authority) || typeof flag.confidence !== "number" || !Number.isFinite(flag.confidence) ||
        flag.confidence < 0 || flag.confidence > 1 ||
        !(flag.deadline_days === null || (Number.isSafeInteger(flag.deadline_days) && (flag.deadline_days as number) > 0)) ||
        !(flag.deadline_from === null || nonempty(flag.deadline_from)) ||
        !(flag.tier === undefined || flag.tier === "notice" || flag.tier === "request") ||
        !(flag.kind === undefined || ["obligation", "request", "cue"].includes(String(flag.kind))) ||
        !(flag.persist === undefined || typeof flag.persist === "boolean") ||
        (flag.kind !== undefined && flag.tier !== undefined &&
          !(flag.kind === "obligation" && flag.tier === "notice") &&
          !(flag.kind === "request" && flag.tier === "request"))) {
      throw new Error(`Invalid flag at index ${index}.`);
    }
    const lineId = refs.get(`${flag.raised_at.speaker}:${flag.raised_at.start_ms}`);
    if (!lineId || ids.has(flag.flag_id)) throw new Error(`Invalid or duplicate flag reference at index ${index}.`);
    ids.add(flag.flag_id);
    // Requests can be recorded elsewhere but are never scored as obligations.
    // Transient cues and explicit non-persistence must not enter report output.
    if (flag.persist === false || flag.kind === "cue" || flag.kind === "request" || flag.tier === "request") return [];
    return [{
      id: flag.flag_id, key: flag.rule_id,
      kind: "legal" as const,
      title: flag.obligation, askNext: flag.staff_prompt, lineId,
      evidence: "", handled: false, t: flag.raised_at.start_ms,
      source: flag.authority, dueDays: flag.deadline_days,
      deadlineFrom: flag.deadline_from,
      // No calendar date can be inferred from relative transcript timestamps.
    }];
  });
  return {
    id: transcript.call_id, mode: "live" as const,
    customer: { name: "Customer", product: "Loan", direction: "inbound" },
    startedAt: 0, endedAt: Math.max(...lines.map((line) => line.endMs)),
    lines, signs,
  };
}
