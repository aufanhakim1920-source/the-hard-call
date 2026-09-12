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
    cue: "the customer states or clearly implies an INABILITY to meet the repayments, not a passing wobble. The legal test is inability, not distress: it must be a problem they cannot resolve in the near term — 'I can't make the repayments', 'not this month and not for a while', 'not until I'm back at work', a period of months, or an open-ended 'I don't know when'. The word 'hardship' is never used. Informal language the ABA trains staff on — 'struggling', 'can't afford', 'low on funds', 'strapped', 'money problems' — is the signal to START LISTENING, never the trigger on its own; ask yourself INABILITY, OR DELAY? Do NOT fire on a temporary timing gap where the customer names a recovery (a date, a payday, a new job starting) and confirms future repayments are manageable — that is not a hardship notice under s72 and firing on it is the single worst error this system can make. Fire on the turn where the inability is actually stated, not on the first hint of difficulty. TWO THINGS THAT ARE NOT A NOTICE, however sympathetic: (1) a CAUSE on its own — losing a job, an illness, surgery, reduced hours, a death, a separation — explains WHY someone may struggle but starts no clock; wait for what they say about the REPAYMENTS. (2) a single payment — 'I missed the last one', 'I don't think I'll make the next one' — is a near-term problem; the notice needs a PERIOD: 'not next month or the month after', 'not for a while', 'until I'm back at work', months, or no end stated.",
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
    key: "inform-hardship-provisions",
    kind: "tip",
    label: "Tell them the hardship process exists",
    cue: "a hardship notice has already been raised on this call and the worker has NOT yet told the customer that hardship provisions exist / that they can apply for hardship assistance. ABA financial difficulty guideline — the duty staff most often forget under pressure. Never fire before a hardship-request sign exists, and never if the worker has already mentioned hardship assistance, a hardship application, or a repayment arrangement process.",
    source: "ABA financial difficulty guideline",
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
