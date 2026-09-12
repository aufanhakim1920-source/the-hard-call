/**
 * The rule table. The detector decides WHETHER an obligation was triggered;
 * this table decides WHAT the obligation is. Deadlines are never produced by a
 * model — they come from here, so they are always citable.
 *
 * Source: docs/hardship-flag-rules.md
 */

export interface Rule {
  rule_id: string;
  obligation: string;
  deadline_days: number | null;
  deadline_from: string | null;
  authority: string;
  staff_prompt: string;
  /** Staff-side patterns that discharge this obligation on the call. */
  satisfiedBy?: RegExp[];
  /** True when nothing said on the call can settle it (post-call system action). */
  unverifiableInCall?: boolean;
}

export const RULES: Record<string, Rule> = {
  NCC_72_ORAL_NOTICE: {
    rule_id: "NCC_72_ORAL_NOTICE",
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
    obligation:
      "If a variation deferring or reducing obligations for more than 90 days is agreed, send written notice of the contract changes",
    deadline_days: 30,
    deadline_from: "variation_agreed",
    authority: "National Credit Code s 72 / s 73",
    staff_prompt: "If a variation over 90 days is agreed, written notice is due within 30 days.",
    unverifiableInCall: true,
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
