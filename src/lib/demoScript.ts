// The scripted call used for the demo and the video. It runs through the
// REAL flag engine — nothing here is pre-flagged. Tom is the worker, Sarah
// the customer. Line 7 is the deliberate miss.

import type { Speaker } from "./types";

export interface DemoLine {
  speaker: Speaker;
  text: string;
  /** seconds after the previous line */
  gap: number;
}

export const DEMO_CUSTOMER = { name: "Sarah M.", product: "home loan", direction: "outbound" as const };

export const DEMO_SCRIPT: DemoLine[] = [
  { speaker: "worker", text: "Hi Sarah, it's Tom from the bank. I'm calling about the missed payment on your home loan.", gap: 1 },
  { speaker: "customer", text: "Yeah, sorry. Things have been a bit tight lately.", gap: 4 },
  { speaker: "worker", text: "I understand. Can you make the payment by Friday?", gap: 4 },
  { speaker: "customer", text: "Honestly, I'm a bit behind on everything.", gap: 4 },
  { speaker: "worker", text: "Okay. Would it help if we looked at changing your repayments for a while?", gap: 6 },
  { speaker: "customer", text: "Maybe. I got laid off last month.", gap: 5 },
  { speaker: "worker", text: "Right. So when do you think you could pay the full amount?", gap: 5 },
  { speaker: "customer", text: "I don't know. I'm really stressed about all of it.", gap: 5 },
  { speaker: "worker", text: "Take your time. What would make things easier right now?", gap: 6 },
  { speaker: "customer", text: "Just a few months without the full payment.", gap: 5 },
  { speaker: "worker", text: "Okay. I'll send you the hardship form today and we'll go from there.", gap: 4 },
];
