// Everything the report's charts read comes from here, so a bar can never
// disagree with the row printed under it. Nothing is inferred: a number that
// cannot be measured from the call comes back undefined and the chart draws
// nothing rather than a zero.

import type { Report, ReportItem, Session, Verdict } from "../lib/types";

/** One sign's answer time: when it fired, when the worker's cited words landed. */
export interface Gap {
  item: ReportItem;
  /** ms after the call started */
  firedMs?: number;
  answeredMs?: number;
  /** answered − fired. Absent whenever either end is missing. */
  gapMs?: number;
}

export function responseGaps(session: Session, report: Report): Gap[] {
  const start = session.startedAt;
  return report.items.map((item) => {
    const sign =
      session.signs.find((s) => s.id === item.signId) ?? session.signs.find((s) => s.key === item.key);
    const firedMs = sign ? Math.max(0, sign.t - start) : undefined;
    // ⚠ A missed verdict CARRIES evidence too — the line where the worker spoke
    // and did not address the sign. Timing that would print "answered in 21 s"
    // over the word MISSED. Only a verdict that says the worker responded can
    // produce an answer time.
    const answered = item.verdict === "handled" || item.verdict === "partly";
    // The adjudicator only ever cites worker lines that follow the trigger, so
    // the earliest one is the answer. `>= firedMs` is belt and braces: a clock
    // that disagrees gives no gap rather than a negative one.
    const offsets = answered ? (item.evidence ?? []).map((e) => e.offsetMs).filter((n) => Number.isFinite(n)) : [];
    const answeredMs = offsets.length > 0 ? Math.min(...offsets) : undefined;
    const gapMs =
      firedMs !== undefined && answeredMs !== undefined && answeredMs >= firedMs ? answeredMs - firedMs : undefined;
    return { item, firedMs, answeredMs, gapMs };
  });
}

/** The call as one whole, because "3 of 4" is read faster than four percentages. */
export interface Ledger {
  total: number;
  /** handled + partly — the worker said something the transcript can point at */
  answered: number;
  partly: number;
  missed: number;
  /** verdicts the transcript could not support. Not the same as missed. */
  unknown: number;
}

export function ledger(items: ReportItem[]): Ledger {
  const count = (v: Verdict) => items.filter((i) => i.verdict === v).length;
  const partly = count("partly");
  return {
    total: items.length,
    answered: count("handled") + partly,
    partly,
    missed: count("missed"),
    unknown: count("unverified"),
  };
}

/** Round a span up to an axis end a person can read off. */
export function niceSpan(ms: number): number {
  const seconds = Math.max(1, ms / 1000);
  for (const step of [10, 15, 20, 30, 45, 60, 90, 120, 180, 300]) {
    if (seconds <= step) return step * 1000;
  }
  return Math.ceil(seconds / 60) * 60000;
}

/** Tick interval for an axis of that length, in ms. */
export function tickStep(spanMs: number): number {
  const seconds = spanMs / 1000;
  if (seconds <= 20) return 5000;
  if (seconds <= 60) return 10000;
  if (seconds <= 180) return 30000;
  return 60000;
}

/** A duration split into its number and its unit, so the unit can be set small
    and dim beside the reading rather than competing with it. */
export function gapParts(ms: number): [string, string] {
  if (ms < 60000) {
    const s = ms / 1000;
    return [s < 10 ? s.toFixed(1) : String(Math.round(s)), "s"];
  }
  const total = Math.round(ms / 1000);
  return [`${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`, "min"];
}

/** "6.6 s" under a minute, "1:12 min" over — for running text and tooltips. */
export function fmtGap(ms: number): string {
  const [value, unit] = gapParts(ms);
  return `${value} ${unit}`;
}

/** A LOCAL yyyy-mm-dd, so `fmtDate` can be reused on a timestamp. `toISOString`
    is UTC and quietly returns yesterday for anyone east of Greenwich in the
    evening — which is most of a working day in Melbourne. */
export function localISO(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days between two moments, counted from midnight so "21 days" is the
    number a person would count on a calendar, not a rounded duration. */
export function daysBetween(fromMs: number, toMs: number): number {
  const day = (ms: number) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  return Math.round((day(toMs) - day(fromMs)) / 86400000);
}
