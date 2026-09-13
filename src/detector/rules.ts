/**
 * The rule table. The detector decides WHETHER an event was triggered; this
 * table decides WHAT it is. Deadlines are never produced by a model — they come
 * from here, so they are always citable.
 *
 * Source: docs/hardship-flag-rules.md
 */

import type { EventKind } from "./types.js";

export interface Rule {
  rule_id: string;
  kind: EventKind;
  /** False -> never reaches a database, report card, or summary. */
  persist: boolean;
  obligation: string;
  deadline_days: number | null;
  deadline_from: string | null;
  authority: string;
  staff_prompt: string;
  /** Days to chase an unresolved event. Requests only; never a legal deadline. */
  followup_days?: number;
  /** Staff-side patterns that discharge this obligation on the call. */
  satisfiedBy?: RegExp[];
  /** True when nothing said on the call can settle it (post-call system action). */
  unverifiableInCall?: boolean;
}

export const RULES: Record<string, Rule> = {
  /* ---------- obligations: asserted, deadline-bearing, persisted ---------- */

  NCC_72_ORAL_NOTICE: {
    rule_id: "NCC_72_ORAL_NOTICE",
    kind: "obligation",
    persist: true,
    obligation: "Assess the hardship notice and notify the customer of the decision",
    deadline_days: 21,
    deadline_from: "notice_received",
    authority: "National Credit Code s 72(4)",
    staff_prompt:
      "Hardship notice received. 21-day clock started. Tell the customer the hardship process exists and lodge it.",
    satisfiedBy: [
      /hardship\s+(notice|application|process|provision|arrangement|request)/i,
      /lodg(e|ing|ed)\s+(that|it|this|a\s+hardship)/i,
      /National\s+Credit\s+Code/i,
    ],
  },

  ABA_INFORM_HARDSHIP_PROVISIONS: {
    rule_id: "ABA_INFORM_HARDSHIP_PROVISIONS",
    kind: "obligation",
    persist: true,
    obligation: "Inform the customer that hardship provisions exist under the National Credit Code",
    deadline_days: null,
    deadline_from: null,
    authority: "ABA industry guideline — Banks' financial difficulty programs",
    staff_prompt: "Tell the customer hardship provisions exist. Most customers do not know.",
    satisfiedBy: [
      /hardship\s+(provision|process|notice|application)/i,
      /National\s+Credit\s+Code/i,
    ],
  },

  NCC_72_WRITTEN_NOTICE_30D: {
    rule_id: "NCC_72_WRITTEN_NOTICE_30D",
    kind: "obligation",
    persist: true,
    obligation:
      "If a variation deferring or reducing obligations for more than 90 days is agreed, send written notice of the contract changes",
    deadline_days: 30,
    deadline_from: "variation_agreed",
    authority: "National Credit Code s 72 / s 73",
    staff_prompt: "If a variation over 90 days is agreed, written notice is due within 30 days.",
    unverifiableInCall: true,
  },

  RG271_COMPLAINT_30D: {
    rule_id: "RG271_COMPLAINT_30D",
    kind: "obligation",
    persist: true,
    obligation: "Log the complaint and give the customer a written response",
    deadline_days: 30,
    deadline_from: "complaint_received",
    authority: "ASIC RG 271",
    staff_prompt:
      "That is a complaint under RG 271. 30-day clock started. Log it and tell the customer it has been logged.",
    satisfiedBy: [
      /\b(log|logged|logging|rais(e|ed|ing)|record(ed|ing)?)\s+(that|it|this)?\s*(as\s+)?a?\s*complaint/i,
      /\bcomplaints?\s+(team|process|reference)/i,
      /\binternal\s+dispute\s+resolution\b/i,
      /\bAFCA\b/,
    ],
  },

  /* ---------- request: low bar, no legal claim, prompts a question ---------- */

  HARDSHIP_REQUEST: {
    rule_id: "HARDSHIP_REQUEST",
    kind: "request",
    persist: true,
    obligation:
      "Customer has asked to change their repayments. Establish whether this is a timing problem or an inability to pay",
    deadline_days: null,
    deadline_from: null,
    // Tron's idea: if nobody asked, chase it at day 7 rather than losing the
    // signal. No clock is asserted, and 14 days of the window survive.
    followup_days: 7,
    authority: "National Credit Code s 72 (threshold question)",
    staff_prompt:
      "Customer has asked to change their repayments. Ask whether they can recover in the near term — if not, this is a hardship notice and the 21-day clock starts.",
    satisfiedBy: [
      // Discharged by the staff member actually asking the threshold question,
      // or by going straight to the hardship process.
      /\b(when|how\s+soon|how\s+long)\b.*\b(back|recover|paid|work|sorted|able)\b/i,
      /\bis\s+(this|that)\s+(going\s+to\s+be\s+)?(ongoing|longer\s+term|a\s+one[- ]off)/i,
      /\bhas\s+something\s+changed\b/i,
      /hardship\s+(provision|process|notice|application)/i,
      /\bcomfortable\s+that\b.*\bmanageable\b/i,
    ],
  },
};

/** Staff turns that propose a variation, which arms the written-notice obligation. */
export const VARIATION_PROPOSED = [
  /paus(e|ing)\s+(the\s+)?repayments?/i,
  /interest[- ]only/i,
  /defer(ring|ral)?\s+(the\s+)?(repayments?|payments?)/i,
  /options?\s+we\s+can\s+look\s+at/i,
];

/** Customer turns that directly ask whether a hardship process exists. */
export const ASKS_ABOUT_PROCESS = [
  /is\s+there\s+(a\s+)?(process|programme|program|scheme|something)/i,
  /anything\s+else,?\s+like/i,
  /what\s+(are\s+)?my\s+options/i,
  /can\s+(you|the\s+bank)\s+do\s+anything/i,
];
