// Only references and offsets are persisted; transcript quotes stay in the session.
type Verdict = "handled" | "partly" | "missed" | "unverified";
interface Sign { id: string; key: string; title: string; kind: "legal" | "tip"; lineId?: string; t: number }
interface Line { id: string; speaker: string; t: number; text: string }
interface Judgement { signId: string; verdict: Verdict; note: string; evidenceLineIds?: string[] }

export function buildReportItems(signs: Sign[], lines: Line[], raw: Judgement[], startedAt: number) {
  const judgements = Array.isArray(raw) ? raw : [];
  return signs.map((sign) => {
    const matches = judgements.filter((item) => item?.signId === sign.id);
    const item = matches.length === 1 ? matches[0] : undefined;
    const triggerIndex = lines.findIndex((line) => line.id === sign.lineId);
    const responses = lines.filter((line, index) => line.speaker === "worker" && line.text.trim() &&
      (triggerIndex >= 0 ? index > triggerIndex : line.t >= sign.t));
    const ids = Array.isArray(item?.evidenceLineIds) ? item.evidenceLineIds : [];
    const evidence = responses.filter((line) => ids.includes(line.id))
      .map((line) => ({ lineId: line.id, offsetMs: Math.max(0, line.t - startedAt) }));
    const valid = item && ["handled", "partly", "missed", "unverified"].includes(item.verdict) &&
      typeof item.note === "string" && item.note.trim();
    const supported = valid && responses.length > 0 &&
      (!(item.verdict === "handled" || item.verdict === "partly") || evidence.length > 0);
    return {
      signId: sign.id, key: sign.key, title: sign.title, kind: sign.kind,
      verdict: supported ? item.verdict : "unverified" as Verdict,
      note: supported ? item.note : "Insufficient transcript evidence to verify the worker's response.",
      evidence: supported ? evidence : [],
    };
  });
}
