// The scripted call used for the demo and the video. It runs through the
// REAL flag engine — nothing here is pre-flagged. Tom is the worker, Sarah
// the customer.
//
// TWO worker scripts, one customer.
//
// The demo's whole argument is running the same call twice and comparing the
// two report cards. That did not work with a single script: the worker's words
// were identical either way, so both runs scored the same and the only visible
// difference was whether cards appeared on screen. Measured over six runs —
// coached 3 of 4 answered, silent 3 of 4, every time.
//
// The customer says EXACTLY the same words in both, to the character, so the
// engine raises exactly the same signs at exactly the same moments. The only
// variable is what the worker does about them, which is the thing the product
// claims to change.
//
// ⚠️ This is a dramatisation and must always be described as one: it is two
// workers handling one call, not a recording of the tool changing someone's
// words live. Say "the same call, handled two ways".

import type { Speaker } from "./types";

export interface DemoLine {
  speaker: Speaker;
  text: string;
  /** seconds after the previous line */
  gap: number;
}

export const DEMO_CUSTOMER = { name: "Sarah M.", product: "home loan", direction: "outbound" as const };

/** What Sarah says. Identical in both runs — this is what the engine hears. */
const CUSTOMER: { text: string; gap: number }[] = [
  { text: "Yeah, sorry. Things have been a bit tight lately.", gap: 4 },
  { text: "Honestly, I'm a bit behind on everything.", gap: 4 },
  { text: "Maybe. I got laid off last month.", gap: 5 },
  { text: "I don't know. I'm really stressed about all of it.", gap: 5 },
  { text: "Just a few months without the full payment.", gap: 5 },
];

/**
 * Tom with the signs in front of him. He answers the hardship notice with a
 * repayment change, slows down when she says she is stressed, and names the
 * hardship process before the call ends.
 */
const WORKER_COACHED = [
  { text: "Hi Sarah, it's Tom from the bank. I'm calling about the missed payment on your home loan.", gap: 1 },
  { text: "I understand. Can you make the payment by Friday?", gap: 4 },
  { text: "Okay. Would it help if we looked at changing your repayments for a while?", gap: 6 },
  { text: "Right. Take your time — what would make things easier right now?", gap: 5 },
  { text: "That's exactly what our hardship team can set up. Let me take you through it.", gap: 6 },
  { text: "I'll send you the hardship form today and we'll go from there.", gap: 4 },
];

/**
 * The same Tom, without the prompts. He is not careless — he is doing what
 * people do under pressure: chasing the payment he rang about. He never offers
 * a repayment change, never mentions that hardship assistance exists, pushes
 * for a date straight after she says she lost her job, and closes the call by
 * writing it down instead of starting anything.
 *
 * Nothing here is a caricature. Every line is one a real worker says.
 */
const WORKER_SILENT = [
  { text: "Hi Sarah, it's Tom from the bank. I'm calling about the missed payment on your home loan.", gap: 1 },
  { text: "I understand. Can you make the payment by Friday?", gap: 4 },
  { text: "Right. Could you at least cover part of it this week?", gap: 6 },
  { text: "Okay. So when do you think you could pay the full amount?", gap: 5 },
  { text: "I see. I can give you a couple of weeks before the next reminder goes out.", gap: 6 },
  { text: "No worries, I'll put a note on the file and someone will be in touch.", gap: 4 },
];

function weave(worker: { text: string; gap: number }[]): DemoLine[] {
  const out: DemoLine[] = [];
  for (let i = 0; i < worker.length; i += 1) {
    out.push({ speaker: "worker", text: worker[i].text, gap: worker[i].gap });
    if (CUSTOMER[i]) out.push({ speaker: "customer", text: CUSTOMER[i].text, gap: CUSTOMER[i].gap });
  }
  return out;
}

/** Coaching on: the worker had the signs. */
export const DEMO_SCRIPT: DemoLine[] = weave(WORKER_COACHED);

/** Coaching off: the same call, the same customer, no prompts. */
export const DEMO_SCRIPT_SILENT: DemoLine[] = weave(WORKER_SILENT);

/** Both runs are the same length, so the two cards are comparable. */
export function demoScriptFor(coaching: boolean): DemoLine[] {
  return coaching ? DEMO_SCRIPT : DEMO_SCRIPT_SILENT;
}
