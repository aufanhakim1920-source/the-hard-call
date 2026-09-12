// Only references and offsets are persisted; transcript quotes stay in the session.
type Verdict = "handled" | "partly" | "missed" | "unverified";
interface Sign { id: string; key: string; title: string; kind: "legal" | "tip"; lineId?: string; t: number }
type SpeakerConfidence = "known" | "inferred" | "unknown";
interface Line { id: string; speaker: string; t: number; text: string; speakerConfidence?: SpeakerConfidence }

/** Absent is "known": every transcript written before the field existed. */
const attributed = (line: Line) => (line.speakerConfidence ?? "known") === "known";
interface Judgement { signId: string; verdict: Verdict; note: string; evidenceLineIds?: string[] }

export function buildReportItems(signs: Sign[], lines: Line[], raw: Judgement[], startedAt: number) {
  const judgements = Array.isArray(raw) ? raw : [];
  return signs.map((sign) => {
    const matches = judgements.filter((item) => item?.signId === sign.id);
    const item = matches.length === 1 ? matches[0] : undefined;
    const triggerIndex = lines.findIndex((line) => line.id === sign.lineId);
    const trigger = triggerIndex >= 0 ? lines[triggerIndex] : undefined;
    const responses = lines.filter((line, index) => line.speaker === "worker" && line.text.trim() &&
      (triggerIndex >= 0 ? index > triggerIndex : line.t >= sign.t));
    const ids = Array.isArray(item?.evidenceLineIds) ? item.evidenceLineIds : [];
    // Only a turn whose speaker is KNOWN can discharge a duty. A customer line
    // misread as staff would mark an obligation handled that nobody handled —
    // a false compliance record, and worse than recording a miss.
    const evidence = responses.filter((line) => attributed(line) && ids.includes(line.id))
      .map((line) => ({ lineId: line.id, offsetMs: Math.max(0, line.t - startedAt) }));
    const valid = item && ["handled", "partly", "missed", "unverified"].includes(item.verdict) &&
      typeof item.note === "string" && item.note.trim();
    // ...and only a known turn can have raised the obligation in the first
    // place. A staff line misread as the customer would put a statutory clock
    // on the bank's own words, so nothing definitive is said about it either
    // way — not handled, not partly, and not missed.
    const attributionKnown = !trigger || attributed(trigger);
    const supported = valid && responses.length > 0 && attributionKnown &&
      (!(item.verdict === "handled" || item.verdict === "partly") || evidence.length > 0);
    return {
      signId: sign.id, key: sign.key, title: sign.title, kind: sign.kind,
      verdict: supported ? item.verdict : "unverified" as Verdict,
      note: supported
        ? item.note
        : attributionKnown
          ? "Insufficient transcript evidence to verify the worker's response."
          : "The speaker of the triggering turn was not established, so no judgement is recorded either way.",
      evidence: supported ? evidence : [],
    };
  });
}
