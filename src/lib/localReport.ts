import type { Session, Report } from "./types.ts";
type ReportPayload = Omit<Report, "mode" | "customer" | "at" | "scenarioId">;

/**
 * The report card the browser can build unaided. Everything in it was recorded
 * during the call; nothing is guessed. `scoreUnverified` stays true, because a
 * score without the model's judgement would be a number we invented.
 */
export function localReport(s: Session, err: unknown): ReportPayload {
  const raw = String(err instanceof Error ? err.message : err);
  const quota = /429|quota|rate.?limit|exhausted/i.test(raw);
  const items = s.signs.map((g) => ({
    signId: g.id,
    key: g.key,
    title: g.title,
    kind: g.kind,
    verdict: "unverified" as const,
    note: g.handled ? "Marked handled during the call." : "Not marked handled during the call.",
    evidence: [],
  }));
  return {
    callId: s.id,
    summary: quota
      ? "The written review is unavailable: the AI service returned a quota or rate-limit error. Everything below was recorded during the call itself."
      : "The written review is unavailable because the AI could not be reached. Everything below was recorded during the call itself.",
    items,
    missedByAI: [],
    tip: "",
    score: 0,
    scoreUnverified: true,
    // Obligations only, matching the server: a request is a prompt to ask, not
    // a duty to discharge. Ported from the copy that lived in api.ts before
    // this moved out, so the fix is not lost to the move.
    caught: s.signs.filter((g) => g.kind === "legal").length,
    handled: 0,
    partly: 0,
    unverified: items.length,
    missed: 0,
    deadlines: s.signs
      .filter((g) => g.kind === "legal" && g.dueDate)
      .map((g) => ({ key: g.key, label: g.dueLabel ?? "Due", date: g.dueDate as string, title: g.title, customer: s.customer.name, callId: s.id })),
    durationSec: Math.round(((s.endedAt ?? Date.now()) - s.startedAt) / 1000),
    model: "",
    degraded: true,
    degradedReason: quota ? "quota" : "unreachable",
  };
}

