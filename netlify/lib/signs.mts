// The sign taxonomy. Shared by the flag engine, the report card and the eval.
//
// Two kinds:
//   legal — starts a clock the bank is legally on. Solid gold on screen.
//   tip   — changes how the worker should handle the next minute. Outlined.
//
// Sources for the legal ones:
//   hardship-request — National Credit Code s72: a hardship notice can be
//     spoken, needs no magic words, and the lender must reply in writing
//     within 21 days (or ask for more information within that time).
//   complaint — ASIC RG 271: an expression of dissatisfaction is a complaint
//     and needs a written response within 30 calendar days.

export type SignKind = "legal" | "tip";

export interface SignDef {
  key: string;
  kind: SignKind;
  label: string;
  /** what the model should look for */
  cue: string;
  /** days until the bank's written reply is due (legal only) */
  dueDays?: number;
  dueLabel?: string;
  source?: string;
}

export const SIGN_DEFS: SignDef[] = [
  {
    key: "hardship-request",
    kind: "legal",
    label: "Counts as a hardship request",
    cue: "the customer says or implies they are, or expect to be, unable to meet a repayment — 'a bit behind', 'can't make it this month', 'can I pause', 'things are tight', reduced hours, job loss, or asking for more time. The word 'hardship' is not required.",
    dueDays: 21,
    dueLabel: "Reply due",
    source: "National Credit Code s72",
  },
  {
    key: "complaint",
    kind: "legal",
    label: "This is a complaint",
    cue: "the customer expresses dissatisfaction with the bank, its staff, a fee, a decision or a delay — even mildly, even if they do not use the word complaint.",
    dueDays: 30,
    dueLabel: "Written response due",
    source: "ASIC RG 271",
  },
  {
    key: "job-loss",
    kind: "tip",
    label: "Income has changed",
    cue: "lost a job, laid off, redundant, hours cut, contract ended, business slowed, or expecting any of these.",
  },
  {
    key: "health",
    kind: "tip",
    label: "Mentioned a health issue",
    cue: "illness, injury, surgery, hospital, mental health, or caring for someone who is unwell. Never name a diagnosis in the title.",
  },
  {
    key: "bereavement",
    kind: "tip",
    label: "Someone has died",
    cue: "a death in the family or of a partner, or a recent funeral.",
  },
  {
    key: "separation",
    kind: "tip",
    label: "Relationship change",
    cue: "separation, divorce, a partner leaving, or a joint account or loan now being handled by one person.",
  },
  {
    key: "safety",
    kind: "tip",
    label: "Safety concern",
    cue: "any hint of family violence, control by another person over money, being unsafe at home, or asking that mail not be sent to the house. Treat as urgent, keep it gentle.",
  },
  {
    key: "gambling",
    kind: "tip",
    label: "Gambling mentioned",
    cue: "gambling, betting, pokies, losing money on apps, or asking to block gambling transactions.",
  },
  {
    key: "disaster",
    kind: "tip",
    label: "Disaster affected",
    cue: "flood, bushfire, cyclone, storm damage, or being displaced from home.",
  },
  {
    key: "stress",
    kind: "tip",
    label: "Sounds stressed",
    cue: "distress, crying, overwhelm, panic, 'I can't cope', long silences, or anger that reads as fear.",
  },
  {
    key: "scam",
    kind: "tip",
    label: "Possible scam",
    cue: "someone else is telling the customer what to do on the call, urgency to move money, a 'bank officer' who rang them, or gift cards / crypto.",
  },
];

export const SIGN_KEYS = SIGN_DEFS.map((d) => d.key);

export function signDef(key: string): SignDef | undefined {
  return SIGN_DEFS.find((d) => d.key === key);
}

/** ISO date (YYYY-MM-DD) that is `days` after `fromISO`, computed in plain calendar days. */
export function addDays(fromISO: string, days: number): string {
  const d = new Date(fromISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function taxonomyText(): string {
  return SIGN_DEFS.map(
    (d) => `- ${d.key} (${d.kind}): ${d.label}. Fire when ${d.cue}`,
  ).join("\n");
}
