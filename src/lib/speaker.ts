/**
 * One normaliser for the whole repo. Shawn had a staff -> worker adapter and the
 * detector wanted worker -> staff; two adapters pointing opposite ways is how a
 * contract quietly breaks. So: a single canonical form, converted once at each
 * boundary.
 *
 * CANONICAL IS "staff". It is what docs/transcript-schema.md, the fixtures and
 * every flag already use. "worker" is the display/engine spelling used by
 * eval/cases.json and the sign engine.
 */

export type CanonicalSpeaker = "customer" | "staff";
export type WireSpeaker = CanonicalSpeaker | "worker" | "agent" | "bank";

const TO_CANONICAL: Record<string, CanonicalSpeaker> = {
  customer: "customer",
  caller: "customer",
  staff: "staff",
  worker: "staff",
  agent: "staff",
  bank: "staff",
};

/** Anything inbound -> canonical. Throws on an unknown value rather than guessing. */
export function toCanonicalSpeaker(s: string): CanonicalSpeaker {
  const hit = TO_CANONICAL[s?.trim().toLowerCase()];
  if (!hit) throw new Error(`Unknown speaker "${s}". Expected customer | staff | worker.`);
  return hit;
}

/** Canonical -> the engine's spelling, for anything that renders "worker". */
export const toWorkerSpeaker = (s: CanonicalSpeaker): WireSpeaker =>
  s === "staff" ? "worker" : "customer";

/** Normalise a whole transcript's speakers in place-safe fashion. */
export function normaliseTurns<T extends { speaker: string }>(
  turns: T[]
): Array<T & { speaker: CanonicalSpeaker }> {
  return turns.map((t) => ({ ...t, speaker: toCanonicalSpeaker(t.speaker) }));
}

/**
 * Convert one eval/cases.json case into a transcript the detector can read.
 * Cases have no timestamps, so turns are spaced on a synthetic 4s grid — enough
 * for ordering and for `raised_at` to point at the right turn.
 */
export function caseToTranscript(
  c: {
    id: string;
    context?: Array<{ speaker: string; text: string }>;
    line: { speaker: string; text: string };
  },
  stepMs = 4000
): { call_id: string; turns: Array<{ speaker: CanonicalSpeaker; start_ms: number; end_ms: number; text: string }> } {
  const raw = [...(c.context ?? []), c.line];
  return {
    call_id: c.id,
    turns: raw.map((t, i) => ({
      speaker: toCanonicalSpeaker(t.speaker),
      start_ms: i * stepMs,
      end_ms: i * stepMs + stepMs - 200,
      text: t.text,
    })),
  };
}
