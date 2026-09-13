// The scripted call used for the demo and the video. It runs through the
// REAL flag engine — nothing here is pre-flagged. Tom is the worker, Sarah
// the customer.
//
// TWO worker scripts, one customer.
//
// The demo's whole argument is running the same call twice and comparing the
// two report cards. That did not work with a single script: the worker's words
// were identical either way, so both runs scored the same and the only visible
// difference was whether cards appeared on screen.
//
// The customer says EXACTLY the same words in both, to the character, so the
// engine hears the same sentences both times. The only variable is what the
// worker does about them, which is the thing the product claims to change.
//
// ⚠️ The same words are not the same CONTEXT. The engine reads the last
// fourteen lines, so the worker's question is part of what it hears when the
// customer answers. Measured on the deployed engine: the statutory notice
// fired on Sarah's "I don't know. I'm really stressed about all of it." in 5
// of 6 silent runs, and on "Just a few months without the full payment." in
// 4 of 4 coached ones. Same key, same 21-day date, different moment — because
// the question it answers is different. The demo must not claim otherwise.
//
// WHY THE WORKER'S LINES READ AS FLATLY AS THEY DO. Nine full runs through the
// real engine (eval/demo-runs.ts) had the silent run's legal row come back
// MISSED seven times and PARTLY twice. The model's own note on a PARTLY:
// "You noted the file for someone to follow up." It was reading the closing
// line's promise of a callback, and a two-week pause on the reminder, as the
// worker partly discharging the obligation — which, on those words, is a fair
// reading. The two lines were rewritten to promise nothing, so the verdict
// stopped depending on which way the model leaned. Nothing was added to make
// him worse; two offers he never meant to make were taken away.
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
  // The sign-off exists in both scripts for one mechanical reason: a sign
  // raised on the last line of the call has no worker line after it, and the
  // report card is required to mark a verdict it cannot point at "unverified"
  // — which withholds the score for the whole card. Measured: the hardship-
  // process prompt landed on the final line in 2 of 4 silent runs and took the
  // card's number with it both times. It says nothing, so it can never be
  // cited as the worker handling anything.
  { text: "Alright. Bye for now, Sarah.", gap: 3 },
];

/**
 * The same Tom, without the prompts. He is not careless — he is doing what
 * people do under pressure: chasing the payment he rang about. He never offers
 * a repayment change, never mentions that hardship assistance exists, pushes
 * for a date straight after she says she lost her job, and closes the call by
 * writing it down instead of starting anything.
 *
 * Nothing here is a caricature. Every line is one a real worker says.
 *
 * ⚠️ Two lines promise nothing on purpose, and a rewrite that puts an offer
 * back into either of them will make the demo unrepeatable again — see the
 * header. The reminder line states what the system will do; it does not grant
 * a pause. The closing line records the call; it does not undertake that
 * anybody will ring her back.
 */
const WORKER_SILENT = [
  { text: "Hi Sarah, it's Tom from the bank. I'm calling about the missed payment on your home loan.", gap: 1 },
  { text: "I understand. Can you make the payment by Friday?", gap: 4 },
  { text: "Right. Could you at least cover part of it this week?", gap: 6 },
  { text: "Okay. So when do you think you could pay the full amount?", gap: 5 },
  { text: "I see. It stays overdue on the system until the full amount's in.", gap: 6 },
  { text: "No worries, I'll put a note on the file.", gap: 4 },
  { text: "Alright. Bye for now, Sarah.", gap: 3 },
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
