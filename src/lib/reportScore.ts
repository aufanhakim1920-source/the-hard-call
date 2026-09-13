import type { Report } from "./types.ts";

// Use item verdicts as well as metadata: older cloud rows lack the optional
// verification fields, but still contain the unverified item verdicts.
export function hasVerifiedReportScore(report: Pick<Report, "score" | "scoreUnverified" | "degraded" | "items">): boolean {
  const scored = report.items.filter((item) => item.tier !== "request");
  return !report.scoreUnverified && !report.degraded && Number.isFinite(report.score) &&
    report.score >= 0 && report.score <= 100 && scored.length > 0 &&
    scored.every((item) => ["handled", "partly", "missed"].includes(item.verdict));
}
