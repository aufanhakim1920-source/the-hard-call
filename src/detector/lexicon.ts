/**
 * Stage 1: deterministic candidate detection.
 *
 * The legal test (docs/hardship-flag-rules.md) has two halves, and BOTH must be
 * present in the same customer turn before anything fires:
 *
 *   1. DIFFICULTY  — the customer says they cannot meet the repayment.
 *   2. MEDIUM TERM — it is not resolvable in the near term.
 *
 * A RECOVERY signal anywhere in the surrounding window suppresses the flag:
 * "I'll be square once the 20th lands" is a timing problem, not a hardship
 * notice, no matter how much hardship vocabulary surrounds it.
 *
 * Note what is deliberately NOT in the difficulty list: illness, surgery, job
 * loss, being signed off work. Those are the CAUSE. We never classify the
 * cause — and keeping it out of the lexicon is what stops a life event from
 * being treated as a legal trigger on its own.
 */

import type { Turn, Candidate } from "./types.js";

/** Payment-inability language. Strictly about meeting the obligation. */
export const DIFFICULTY: RegExp[] = [
  /\b(can'?t|cannot|can\s+not)\s+(make|cover|meet|afford|manage|pay)\b/i,
  /\b(won'?t|will\s+not)\s+be\s+able\s+to\s+(pay|cover|make)\b/i,
  /\bcouldn'?t\s+afford\b/i,
  /\bunable\s+to\s+(pay|meet|cover)\b/i,
  /\bstruggl(e|ing)\b/i,
  /\b(missed|behind\s+on|behind\s+with)\s+(the\s+)?(payment|repayment|last\s+two|one)/i,
  /\bin\s+arrears\b/i,
  /\bno\s+income\b/i,
  /\bnothing\s+coming\s+in\b/i,
  /\bdon'?t\s+think\s+I'?m\s+going\s+to\s+make\b/i,
  /\blow\s+on\s+funds\b/i,
  /\bstrapped\b/i,
  /\bmoney\s+problems\b/i,
  // Added after cross-checking eval/cases.json. Each of these is a real way
  // customers phrase inability, and none of them fire on any hard negative in
  // that set — verified by eval/cross-check-cases.ts.
  /\bcan'?t\s+keep\s+up\b/i,
  /\bcan'?t\s+do\s+(the\s+)?(full\s+)?(amount|it)\b/i,
  /\bno\s+way\s+I\s+can\s+pay\b/i,
  /\bhaven'?t\s+got\s+it\b/i,
  /\bnothing\s+left\b/i,
  /\bgoing\s+to\s+miss\s+(this|the)\s+(one|payment|repayment)\b/i,
  /\bcleaned\s+me\s+out\b/i,
  /\bbehind\s+at\s+the\s+moment\b/i,
  /\bthings?\s+(are|is)\s+(pretty\s+|a\s+bit\s+)?tight\b/i,
  /\b(month|fortnight|week)'?s?\s+going\s+to\s+be\s+tight\b/i,
  /\bmoney'?s\s+stretched\b/i,
];

/** Signals that the problem runs past the near term. */
export const MEDIUM_TERM: RegExp[] = [
  /\bfor\s+a\s+while\b/i,
  /\b(four|five|six|3|4|5|6|several|a\s+few)\s*(,|\s|or\s)?\s*(three|four|five|six)?\s*months?\b/i,
  /\bmonths?\s+(away|at\s+best|or\s+more|at\s+least)\b/i,
  /\bnot\s+(this|next)\s+month\s*,?\s*(and\s+)?(not|honestly)\b/i,
  /\bnot\s+next\s+month\s*,?\s*not\s+the\s+month\s+after\b/i,
  /\bnot\s+before\s+(the\s+)?(new\s+year|christmas|\w+ary|\w+ober)\b/i,
  /\buntil\s+(at\s+least\s+)?(february|march|april|may|june|july|august|september|october|november|december|I'?m\s+cleared|further\s+notice)\b/i,
  /\bgoing\s+to\s+be\s+like\s+this\s+until\b/i,
  /\bindefinitel?y\b/i,
  /\bongoing\b/i,
  /\bmedium\s+term\b/i,
  /\bsigned\s+off\s+(work\s+)?until\b/i,
  // Added after Aufan's cross-check found MEDIUM_TERM matching 0 of 41 cases.
  // Both are the customer stating an open-ended period about their own
  // situation, which is what s72 turns on — not a cause, which never counts.
  /\bsince\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b(till|until)\s+I\s+(find|get)\s+(something|work|another|a\s+job)\b/i,
];

/** Signals the customer expects to recover shortly. Suppresses the flag. */
export const RECOVERY: RegExp[] = [
  /\bin\s+order\s+within\s+(a|the|one)\s+month\b/i,
  /\bwithin\s+(a|the|one)\s+month\b/i,
  /\bI'?ll\s+be\s+square\b/i,
  /\b(once|when)\s+the\s+\w+(th|st|nd|rd)?\s+(comes?\s+through|lands?|hits?|clears?)\b/i,
  /\b(lands?|comes?\s+through)\s+on\s+the\s+\w+(th|st|nd|rd)\b/i,
  /\bback\s+pay\b/i,
  /\bno\s+dramas\b/i,
  /\b(just|only)\s+this\s+one\s+month\b/i,
  /\bcatch(ing)?\s+(it\s+)?up\s+(after|on|by)\b/i,
  /\bpays?\s+(actually\s+)?more\b/i,
  /\bnext\s+month\s+the\s+normal\s+repayment\s+is\s+manageable\b/i,
];

/**
 * Explicit asks to change the repayment. These are what make a `request` event,
 * and the bar is deliberately low — the consequence is one clarifying question,
 * so a false positive is cheap. Note these fire even when the customer states a
 * near-term recovery: "push it back, I get paid on the 20th" is a real request
 * and still not a statutory notice.
 */
export const REQUEST_ASK: RegExp[] = [
  /\bpush\s+(the\s+)?(payment|repayment|it)\s*back\b/i,
  /\b(any\s+chance|is\s+there\s+any\s+way|any\s+way)\b/i,
  /\bpause\s+(it|the\s+(payment|repayment|loan))\b/i,
  /\b(need|want)\s+(a\s+bit\s+)?more\s+time\b/i,
  /\bcan\s+it\s+wait\b/i,
  /\bpay\s+half\b/i,
  /\bcatch\s+the\s+rest\s+up\b/i,
  /\bsomething\s+we\s+can\s+work\s+out\b/i,
  /\b(hold\s+off|defer|skip)\s+(the\s+)?(payment|repayment|it|this\s+one)\b/i,
  /\bmove\s+(the\s+)?(payment|repayment)\b/i,
  /\bextension\b/i,
  /\btill\s+the\s+next\s+one\b/i,
];

/**
 * Expressions of dissatisfaction. Under ASIC RG 271 these are complaints and
 * carry their own 30-day clock — a second statutory obligation, independent of
 * hardship. The bar is an explicit dissatisfaction marker; a fee question on
 * its own is not a complaint.
 */
export const COMPLAINT: RegExp[] = [
  /\b(I'?m\s+)?not\s+happy\b/i,
  /\bit'?s\s+a\s+joke\b/i,
  /\b(rung|called|phoned)\s+(you\s+)?(three|four|five|\d+|several)\s+times\b/i,
  /\bnobody'?s?\s+(called|got|come)\s+(me\s+)?back\b/i,
  /\bno\s?one'?s?\s+(called|got|come)\s+(me\s+)?back\b/i,
  /\bunacceptable\b/i,
  /\bridiculous\b/i,
  /\bfed\s+up\b/i,
  /\bwant\s+to\s+(make\s+)?a?\s*complain/i,
  /\bthis\s+is\s+(a\s+)?disgrace/i,
  /\bsick\s+of\b/i,
];

export const hasComplaint = (text: string) => COMPLAINT.some((p) => p.test(text));

function matches(text: string, patterns: RegExp[]): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) hits.push(m[0].trim());
  }
  return hits;
}

export const hasDifficulty = (text: string) => matches(text, DIFFICULTY).length > 0;
export const hasMediumTerm = (text: string) => matches(text, MEDIUM_TERM).length > 0;
export const hasRecovery = (text: string) => matches(text, RECOVERY).length > 0;

/** Customer turns within `lookahead` turns after (and 1 before) the candidate. */
export function contextWindow(turns: Turn[], index: number, lookahead = 4): Turn[] {
  const start = Math.max(0, index - 1);
  return turns.slice(start, index + lookahead + 1);
}

/**
 * Classify one customer turn. Returns null for turns with no difficulty
 * language at all — the overwhelming majority, which is the point: the
 * expensive adjudication step only ever sees a handful of turns per call.
 */
export function classifyTurn(turns: Turn[], index: number): Candidate | null {
  const turn = turns[index];
  if (turn.speaker !== "customer") return null;

  const difficulty = matches(turn.text, DIFFICULTY);
  const request = matches(turn.text, REQUEST_ASK);
  // A turn is only worth looking at if the customer either signalled difficulty
  // meeting the repayment, or asked to change it.
  if (difficulty.length === 0 && request.length === 0) return null;

  const mediumTerm = matches(turn.text, MEDIUM_TERM);
  const window = contextWindow(turns, index);
  const recovery = window
    .filter((t) => t.speaker === "customer")
    .flatMap((t) => matches(t.text, RECOVERY));

  let verdict: Candidate["verdict"];
  if (difficulty.length === 0) {
    verdict = "unclear"; // an ask with no stated difficulty settles nothing
  } else if (recovery.length > 0 && mediumTerm.length === 0) {
    verdict = "delay"; // stated near-term recovery, no long-run signal
  } else if (mediumTerm.length > 0 && recovery.length === 0) {
    verdict = "inability"; // clear on both halves of the test
  } else {
    verdict = "unclear"; // difficulty but no duration signal either way, or both
  }

  return {
    turn,
    hasDifficulty: difficulty.length > 0,
    hasMediumTerm: mediumTerm.length > 0,
    hasRecoveryNearby: recovery.length > 0,
    hasRequest: request.length > 0,
    verdict,
    matched: { difficulty, mediumTerm, recovery, request },
  };
}

export function findCandidates(turns: Turn[]): Candidate[] {
  const out: Candidate[] = [];
  turns.forEach((_, i) => {
    const c = classifyTurn(turns, i);
    if (c) out.push(c);
  });
  return out;
}
