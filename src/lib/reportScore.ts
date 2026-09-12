import type { Report } from "./types.ts";

// Use item verdicts as well as metadata: older cloud rows lack the optional
// verification fields, but still contain the unverified item verdicts.
export function hasVerifiedReportScore(report: Pick<Report, "score" | "scoreUnverified" | "degraded" | "items">): boolean {
  return !report.scoreUnverified && !report.degraded && Number.isFinite(report.score) &&
    report.score >= 0 && report.score <= 100 && report.items.length > 0 &&
    report.items.every((item) => ["handled", "partly", "missed"].includes(item.verdict));
}
